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
    if (!Array.isArray(list))
        return null;
    for (const item of list) {
        const brand = Array.isArray(item) ? item[0] :
            item && "object" === typeof item ? item.brand : "";
        const version = Array.isArray(item) ? item[1] :
            item && "object" === typeof item ? item.version : "";
        if (brand === brandName)
            return [brand, version];
    }
    return null;
}

function productNameFromBrand(brand) {
    if (/Microsoft Edge/i.test(brand || ""))
        return "Microsoft Edge";
    if (/Google Chrome/i.test(brand || ""))
        return "Google Chrome";
    if (/Chromium/i.test(brand || ""))
        return "Chromium";
    return brand || "Chromium";
}

function preferredBrandName(profile, browser) {
    const hints = profile.clientHints || {};
    const profileBrand =
        findBrandItem(hints.fullVersionList, "Google Chrome") ||
        findBrandItem(hints.brands, "Google Chrome") ||
        findBrandItem(hints.fullVersionList, "Microsoft Edge") ||
        findBrandItem(hints.brands, "Microsoft Edge");
    if (profileBrand)
        return profileBrand[0];
    if (browser.brand && browser.brand !== "Chromium")
        return browser.brand;
    return browser.brand || "Google Chrome";
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

function hasChromiumConfig(input) {
    return !!(input && input.chromium && input.chromium.config);
}

function patchProfileForRuntimeVersion(input, runtimeVersion) {
    const patched = cloneJson(input);
    const runtimeMajor = majorVersion(runtimeVersion);
    const profile = patched.profile || {};
    const chromium = patched.chromium || {};
    const browser = chromium.browser || {};
    const brandName = preferredBrandName(profile, browser);
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
        browser.brand = brandName;
        browser.product = productNameFromBrand(brandName);
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
            identity.browser.brand = brandName;
            identity.browser.product = productNameFromBrand(brandName);
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

function sortedKeys(value) {
    return value && "object" === typeof value && !Array.isArray(value)
        ? Object.keys(value).sort()
        : [];
}

function capabilityKnownGaps(broium) {
    const gaps = [];
    const capabilities = broium && broium.capabilities || [];
    if (!Array.isArray(capabilities))
        return gaps;
    for (const capability of capabilities) {
        if (!capability || "object" !== typeof capability)
            continue;
        const status = String(capability.status || "");
        if (!/^(observed-only|observed\/launch-policy|planned|partial-native)$/.test(status))
            continue;
        const consumerFiles = Array.isArray(capability.consumerFiles)
            ? capability.consumerFiles
            : [];
        const plannedConsumerFiles = Array.isArray(capability.plannedConsumerFiles)
            ? capability.plannedConsumerFiles
            : [];
        const isKnownGap = status === "observed-only" ||
            status === "observed/launch-policy" ||
            status === "planned" ||
            !consumerFiles.length ||
            plannedConsumerFiles.length > 0;
        if (isKnownGap)
            gaps.push(String(capability.surface || "unknown") + ":" + status);
    }
    return gaps.sort();
}

function printBroiumSummary(broium) {
    const cfg = broium && broium.cfg || {};
    const structuredKeys = sortedKeys(cfg).filter((key) => {
        const value = cfg[key];
        return value && "object" === typeof value && !Array.isArray(value) &&
            key !== "switches" && key !== "nativeSurfaces" &&
            key !== "capabilities";
    });
    console.log("summary.schema=" + (broium && broium.schema || ""));
    console.log("summary.cfgKeys=" + sortedKeys(cfg).join(","));
    console.log("summary.switchKeys=" + sortedKeys(cfg.switches || broium.switches).join(","));
    console.log("summary.structuredKeys=" + structuredKeys.join(","));
    console.log("summary.nativeActive=" + ((cfg.nativeSurfaces && cfg.nativeSurfaces.active || []).slice().sort().join(",")));
    console.log("summary.nativePlanned=" + ((cfg.nativeSurfaces && cfg.nativeSurfaces.planned || []).slice().sort().join(",")));
    console.log("summary.knownGaps=" + capabilityKnownGaps(broium).join(","));
}

async function main() {
    const repoRoot = path.resolve(__dirname, "..", "..");
    const inputPath = path.resolve(repoRoot, process.argv[2] || path.join("sync", "docs", "windows-amd64.json"));
    const outputPath = path.resolve(repoRoot, process.argv[3] || path.join("src", "chromium", "docs", "cfg.json"));
    const runtimeVersion = process.env.BROIUM_TARGET_VERSION || readChromiumVersion(repoRoot);
    const martell = loadMartellApi(repoRoot);
    const input = readJson(inputPath);
    let source = input;
    let inputMode = "chromium";
    if (!hasChromiumConfig(input)) {
        inputMode = "martell-raw";
        source = cloneJson(input);
        delete source.broium;
        delete source.training;
        delete source.trainingDataset;
        source = await martell.compile(source, {
            enableAsyncProfile: false
        }) || input;
        if (!hasChromiumConfig(source))
            throw new Error("Input does not contain a usable chromium config: " + inputPath);
    }
    const patched = patchProfileForRuntimeVersion(source, runtimeVersion);
    const broium = martell.buildBroiumLaunchConfig(patched && patched.chromium || input.chromium || input);
    fs.mkdirSync(path.dirname(outputPath), {
        recursive: true
    });
    fs.writeFileSync(outputPath, JSON.stringify(broium, null, 2) + "\n");
    console.log("wrote " + path.relative(repoRoot, outputPath) + " from " + inputMode);
    printBroiumSummary(broium);
}

main().catch((error) => {
    console.error(error && error.stack || error);
    process.exit(1);
});
