#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadMartellApi(repoRoot) {
    const sourcePath = path.join(repoRoot, "sync", "docs", "martell-cdp-fingerprint.js");
    const source = fs.readFileSync(sourcePath, "utf8");
    const sandbox = {
        console,
        setTimeout,
        clearTimeout,
        performance: {
            now: () => Date.now()
        }
    };
    sandbox.globalThis = sandbox;
    sandbox.window = sandbox;
    vm.runInNewContext(source, sandbox, {
        filename: sourcePath
    });
    if (!sandbox.MartellFingerprint || "function" !== typeof sandbox.MartellFingerprint.compile)
        throw new Error("MartellFingerprint.compile is unavailable");
    return sandbox.MartellFingerprint;
}

async function main() {
    const repoRoot = path.resolve(__dirname, "..", "..");
    const inputPath = path.resolve(repoRoot, process.argv[2] || path.join("sync", "docs", "windows-amd64.json"));
    const outputPath = path.resolve(repoRoot, process.argv[3] || path.join("src", "chromium", "docs", "cfg.json"));
    const martell = loadMartellApi(repoRoot);
    const input = readJson(inputPath);
    const compiled = await martell.compile(input, {
        enableAsyncProfile: false
    });
    const broium = compiled && compiled.broium
        ? compiled.broium
        : martell.buildBroiumLaunchConfig(compiled && compiled.chromium || input.chromium || input);
    fs.mkdirSync(path.dirname(outputPath), {
        recursive: true
    });
    fs.writeFileSync(outputPath, JSON.stringify(broium, null, 2) + "\n");
    console.log("wrote " + path.relative(repoRoot, outputPath));
}

main().catch((error) => {
    console.error(error && error.stack || error);
    process.exit(1);
});
