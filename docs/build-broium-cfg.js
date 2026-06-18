#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readChromiumVersion(repoRoot) {
    const versionPath = path.join(repoRoot, "src", "chrome", "VERSION");
    const values = {};
    for (const line of fs.readFileSync(versionPath, "utf8").split(/\r?\n/)) {
        const match = /^([A-Z]+)=(\d+)$/.exec(line.trim());
        if (match)
            values[match[1]] = match[2];
    }
    if (!values.MAJOR || !values.MINOR || !values.BUILD || !values.PATCH)
        throw new Error("Unable to read Chromium version from " + versionPath);
    return [values.MAJOR, values.MINOR, values.BUILD, values.PATCH].join(".");
}

function majorVersion(version) {
    return String(version || "").split(".")[0] || "";
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function findBrandItem(list, brandName) {
    return Array.isArray(list)
        ? list.find((item) => Array.isArray(item) && item[0] === brandName)
        : null;
}

function chromiumGreaseBrandVersion(major, fullVersion) {
    const seed = Number.parseInt(major, 10);
    const greaseChars = [" ", "(", ":", "-", ".", "/", ")", ";", "=", "?", "_"];
    const greaseVersions = ["8", "99", "24"];
    if (!Number.isFinite(seed))
        return ["Not)A;Brand", fullVersion ? "8.0.0.0" : "8"];
    const greaseMajor = greaseVersions[seed % greaseVersions.length];
    const brand = "Not" + greaseChars[seed % greaseChars.length] +
        "A" + greaseChars[(seed + 1) % greaseChars.length] + "Brand";
    return [brand, fullVersion ? greaseMajor + ".0.0.0" : greaseMajor];
}

function chromiumBrandOrder(seed) {
    const orders = [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0]
    ];
    return orders[seed % orders.length] || orders[0];
}

function buildChromiumBrandList(brandName, version, major, fullVersion) {
    const seed = Number.parseInt(major, 10);
    const brandVersion = fullVersion ? version : major;
    const items = [
        chromiumGreaseBrandVersion(major, fullVersion),
        ["Chromium", brandVersion]
    ];
    if (brandName)
        items.push([brandName, brandVersion]);
    if (3 !== items.length || !Number.isFinite(seed))
        return items;
    return chromiumBrandOrder(seed).map((index) => items[index]);
}

function replaceBrandList(list, items) {
    if (!Array.isArray(list))
        return;
    list.splice(0, list.length, ...items.map((item) => item.slice()));
}

function patchProfileForRuntimeVersion(input, runtimeVersion) {
    const patched = cloneJson(input);
    const runtimeMajor = majorVersion(runtimeVersion);
    const profile = patched.profile || {};
    const chromium = patched.chromium || {};
    const browser = chromium.browser || {};
    const brandName = browser.brand ||
        findBrandItem(profile.clientHints && profile.clientHints.fullVersionList, "Google Chrome")?.[0] ||
        "Google Chrome";
    const uaMajor = runtimeMajor || majorVersion(browser.version);
    const uaVersion = runtimeVersion || browser.version;
    const reducedUaVersion = uaMajor ? uaMajor + ".0.0.0" : "";
    function patchUa(value) {
        return "string" === typeof value && reducedUaVersion
            ? value.replace(/(?:Chrome|Edg)\/\d+(?:\.\d+){3}/g, (token) => {
                const prefix = token.split("/")[0];
                return prefix + "/" + reducedUaVersion;
            })
            : value;
    }
    if (profile.navigator) {
        profile.navigator.userAgent = patchUa(profile.navigator.userAgent);
        profile.navigator.appVersion = patchUa(profile.navigator.appVersion);
        if (profile.navigator.direct) {
            profile.navigator.direct.userAgent = patchUa(profile.navigator.direct.userAgent);
            profile.navigator.direct.appVersion = patchUa(profile.navigator.direct.appVersion);
        }
    }
    if (profile.clientHints) {
        replaceBrandList(profile.clientHints.brands,
            buildChromiumBrandList(brandName, uaVersion, uaMajor, false));
        replaceBrandList(profile.clientHints.fullVersionList,
            buildChromiumBrandList(brandName, uaVersion, uaMajor, true));
        if (profile.clientHints.direct) {
            replaceBrandList(profile.clientHints.direct.brands,
                buildChromiumBrandList(brandName, uaVersion, uaMajor, false));
            replaceBrandList(profile.clientHints.direct.fullVersionList,
                buildChromiumBrandList(brandName, uaVersion, uaMajor, true));
        }
    }
    if (browser.version) {
        browser.version = uaVersion;
        browser.major = uaMajor;
        browser.profileHash = "fnv1a32:" + fnv1a32(JSON.stringify([
            profile.navigator && profile.navigator.userAgent,
            profile.clientHints && profile.clientHints.fullVersionList,
            profile.screen && profile.screen.width,
            profile.screen && profile.screen.height,
            profile.locale && profile.locale.timeZone,
            profile.webgl && profile.webgl.unmaskedRenderer
        ]));
    }
    const identity = chromium.config && chromium.config.identity &&
        chromium.config.identity.values || null;
    if (identity) {
        identity.userAgent = patchUa(identity.userAgent);
        identity.appVersion = patchUa(identity.appVersion);
        if (identity.browser) {
            identity.browser.version = uaVersion;
            identity.browser.major = uaMajor;
        }
        if (identity.userAgentData) {
            replaceBrandList(identity.userAgentData.brands,
                buildChromiumBrandList(brandName, uaVersion, uaMajor, false));
            replaceBrandList(identity.userAgentData.fullVersionList,
                buildChromiumBrandList(brandName, uaVersion, uaMajor, true));
        }
    }
    const runtime = chromium.config && chromium.config.runtime &&
        chromium.config.runtime.values || null;
    if (runtime && runtime.v8 && browser.profileHash) {
        runtime.v8.seedMaterialHash = browser.profileHash;
    }
    return patched;
}

function fnv1a32(value) {
    value = String(value || "");
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}

function loadMartellApi(repoRoot) {
    const sourcePath = path.join(repoRoot, "sync", "docs", "martell-cdp-fingerprint.js");
    const source = fs.readFileSync(sourcePath, "utf8");
    const sandbox = {
        Buffer,
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
    const runtimeVersion = process.env.BROIUM_TARGET_VERSION || readChromiumVersion(repoRoot);
    const martell = loadMartellApi(repoRoot);
    const input = readJson(inputPath);
    const source = cloneJson(input);
    delete source.chromium;
    delete source.broium;
    delete source.training;
    delete source.trainingDataset;
    const compiled = await martell.compile(source, {
        enableAsyncProfile: false
    });
    const patched = patchProfileForRuntimeVersion(compiled || input, runtimeVersion);
    const broium = martell.buildBroiumLaunchConfig(patched && patched.chromium || input.chromium || input);
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
