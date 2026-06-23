#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function usage() {
    console.error("usage: node sync/docs/verify-broium-cfg-fingerprint.js <reference.json> <broium-recapture.json> [report.json]");
}

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
    fs.mkdirSync(path.dirname(file), {
        recursive: true
    });
    fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function hasChromiumConfig(input) {
    return !!(input && input.chromium && input.chromium.config);
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
        browser.profileHash = "fnv1a32:" + fnv1a32Raw(JSON.stringify([
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
    if (runtime && runtime.v8 && browser.profileHash)
        runtime.v8.seedMaterialHash = browser.profileHash;
    return patched;
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

async function ensureChromiumConfig(input, martell) {
    if (hasChromiumConfig(input))
        return input;
    const source = cloneJson(input);
    delete source.broium;
    delete source.training;
    delete source.trainingDataset;
    const compiled = await martell.compile(source, {
        enableAsyncProfile: false
    });
    if (!hasChromiumConfig(compiled))
        throw new Error("Input does not contain a usable chromium config");
    return compiled;
}

function fnv1a32Raw(value) {
    value = String(value || "");
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
}

function fnv1a32(value) {
    return "fnv1a32:" + fnv1a32Raw(value);
}

function stableValue(value) {
    if (Array.isArray(value))
        return value.map(stableValue);
    if (value && "object" === typeof value) {
        const result = {};
        for (const key of Object.keys(value).sort()) {
            if ("undefined" !== typeof value[key])
                result[key] = stableValue(value[key]);
        }
        return result;
    }
    return value;
}

function stableJson(value) {
    return JSON.stringify(stableValue(value));
}

function summarize(value) {
    if ("undefined" === typeof value)
        return {
            missing: true
        };
    if (Array.isArray(value) && value.length > 16)
        return {
            count: value.length,
            hash: fnv1a32(stableJson(value)),
            sample: value.slice(0, 8)
        };
    if (value && "object" === typeof value) {
        const keys = Object.keys(value);
        if (keys.length > 16)
            return {
                keyCount: keys.length,
                hash: fnv1a32(stableJson(value)),
                sampleKeys: keys.sort().slice(0, 8)
            };
    }
    return stableValue(value);
}

function valueAt(root, pathParts) {
    let value = root;
    for (const part of pathParts) {
        if (!value || "object" !== typeof value || !(part in value))
            return void 0;
        value = value[part];
    }
    return value;
}

function valuesRoot(result) {
    const config = result.chromium.config || {};
    return {
        identity: config.identity && config.identity.values || {},
        navigator: config.navigator && config.navigator.values || {},
        screen: config.screen && config.screen.values || {},
        locale: config.locale && config.locale.values || {},
        runtime: config.runtime && config.runtime.values || {},
        graphics: config.graphics || {},
        audio: config.audio && config.audio.values || {},
        fonts: config.fonts && config.fonts.values || {},
        media: config.media && config.media.values || {},
        network: config.network && config.network.values || {},
        storage: config.storage && config.storage.values || {},
        security: config.security && config.security.values || {},
        apiSurface: config.apiSurface && config.apiSurface.values || {}
    };
}

function compareScalar(expected, actual, tolerance) {
    if (stableJson(expected) === stableJson(actual))
        return "exact";
    if ("number" === typeof tolerance &&
            "number" === typeof expected &&
            "number" === typeof actual) {
        return Math.abs(expected - actual) <= tolerance ? "tolerance" : "mismatch";
    }
    return "mismatch";
}

function makeField(surface, field, expected, actual, options) {
    options = options || {};
    const result = compareScalar(expected, actual, options.tolerance);
    let status = result;
    if ("mismatch" === result)
        status = options.knownGap ? "known-gap" : "regression";
    return {
        surface,
        field,
        status,
        expected: summarize(expected),
        actual: summarize(actual),
        tolerance: options.tolerance,
        reason: options.reason
    };
}

function addPathField(fields, roots, surface, field, pathParts, options) {
    fields.push(makeField(surface, field,
        valueAt(roots.reference, pathParts),
        valueAt(roots.broium, pathParts),
        options));
}

function arrayLength(value) {
    return Array.isArray(value) ? value.length : void 0;
}

function speechVoicesSummary(media) {
    const speech = media && media.speechVoices;
    if (Array.isArray(speech))
        return {
            count: speech.length,
            hash: fnv1a32(stableJson(speech))
        };
    if (speech && "object" === typeof speech) {
        const voices = Array.isArray(speech.voices) ? speech.voices : [];
        return {
            count: Number.isFinite(speech.count) ? speech.count : voices.length,
            hash: speech.hash || (voices.length ? fnv1a32(stableJson(voices)) : void 0)
        };
    }
    return void 0;
}

function webRtcSummary(network) {
    const webrtc = network && network.webrtc || {};
    return {
        candidateCount: arrayLength(webrtc.candidates),
        candidatePolicy: webrtc.candidatePolicy,
        recommendedIpHandlingPolicy: webrtc.recommendedIpHandlingPolicy
    };
}

function permissionQuerySurface(security) {
    const surface = security && security.permissionSurface || {};
    const permissions = security && security.permissions || {};
    const query = {};
    for (const name of Object.keys(permissions).sort()) {
        const status = String(permissions[name] || "").toLowerCase();
        if ("granted" === status || "denied" === status || "prompt" === status)
            query[name] = status;
    }
    return {
        permissionsApi: !!surface.permissionsApi,
        queryFunction: !!surface.queryFunction,
        statusNotQueried: !!surface.statusNotQueried,
        query
    };
}

function fontSummary(fonts) {
    return {
        profile: fonts && fonts.profile,
        detectedHash: fonts && fonts.detectedHash,
        detectedCount: arrayLength(fonts && fonts.detected),
        maybeDetectedCount: arrayLength(fonts && fonts.maybeDetected),
        checkedCount: fonts && fonts.checkedCount
    };
}

function mediaPluginSummary(media) {
    return {
        mimeTypeCount: arrayLength(media && media.mimeTypes),
        pluginCount: arrayLength(media && media.plugins),
        pluginsHash: media && media.plugins ? fnv1a32(stableJson(media.plugins)) : void 0,
        mimeTypesHash: media && media.mimeTypes ? fnv1a32(stableJson(media.mimeTypes)) : void 0
    };
}

function mediaCapabilitiesDecodingSummary(media) {
    const capabilities = media && media.capabilities || {};
    const decoding = Array.isArray(capabilities.decoding)
        ? capabilities.decoding
        : [];
    return stableValue(decoding.map((item) => ({
        name: item && item.name || "",
        supported: !!(item && item.result && item.result.supported),
        smooth: !!(item && item.result && item.result.smooth),
        powerEfficient: !!(item && item.result && item.result.powerEfficient),
        error: item && item.error || void 0
    })).sort((left, right) => left.name.localeCompare(right.name)));
}

function webGpuSummary(graphics) {
    const webgpu = graphics && graphics.webgpu && graphics.webgpu.values || {};
    return stableValue({
        available: webgpu.available,
        isFallbackAdapter: webgpu.isFallbackAdapter,
        featureCount: arrayLength(webgpu.features),
        featuresHash: webgpu.features ? fnv1a32(stableJson(webgpu.features)) : void 0,
        limitsHash: webgpu.limits ? fnv1a32(stableJson(webgpu.limits)) : void 0,
        info: webgpu.info,
        infoError: webgpu.infoError,
        error: webgpu.error
    });
}

function apiSurfaceCategorySummary(apiSurface) {
    const result = {};
    for (const name of Object.keys(apiSurface || {}).sort()) {
        const value = apiSurface[name];
        if (!value || "object" !== typeof value || Array.isArray(value)) {
            result[name] = value;
            continue;
        }
        const keys = Object.keys(value).sort();
        const present = keys.filter((key) => !!value[key]);
        result[name] = {
            keyCount: keys.length,
            presentCount: present.length,
            presentHash: fnv1a32(stableJson(present))
        };
    }
    return stableValue(result);
}

function collectFields(referenceRoot, broiumRoot) {
    const roots = {
        reference: referenceRoot,
        broium: broiumRoot
    };
    const fields = [];
    const exact = {};
    const gap = {
        knownGap: true
    };
    const visualTolerance = {
        tolerance: 2
    };
    const captureEnvironmentGap = {
        knownGap: true,
        reason: "This normalization metadata documents the source capture environment; Broium recapture does not need to reproduce the original docked/remote capture reason verbatim"
    };
    const canvasExactReplayGap = {
        knownGap: true,
        reason: "Canvas2D native shaping covers toDataURL/toBlob/getImageData, but exact observed bitmap/hash replay remains a documented partial-native gap"
    };
    const fontExactReplayGap = {
        knownGap: true,
        reason: "font profile and family allow-list are native-consumed, but exact host font availability/metrics hash replay remains a documented partial-native gap"
    };
    const networkTypeExposureGap = {
        knownGap: true,
        reason: "NetworkInformation.type exact replay is pending; enabling downlinkMax exposes Chromium's current connection-type enum when the reference capture did not expose a stable type value"
    };
    const smallFloatTolerance = {
        tolerance: 0.02
    };
    const networkFloatTolerance = {
        tolerance: 0.2
    };
    const networkRttTolerance = {
        tolerance: 50
    };

    [
        ["browser.product", ["identity", "browser", "product"]],
        ["browser.brand", ["identity", "browser", "brand"]],
        ["browser.version", ["identity", "browser", "version"]],
        ["browser.major", ["identity", "browser", "major"]],
        ["browser.platform", ["identity", "browser", "platform"]],
        ["browser.platformVersion", ["identity", "browser", "platformVersion"]],
        ["browser.architecture", ["identity", "browser", "architecture"]],
        ["browser.bitness", ["identity", "browser", "bitness"]],
        ["userAgent", ["identity", "userAgent"]],
        ["appVersion", ["identity", "appVersion"]],
        ["appName", ["identity", "appName"]],
        ["appCodeName", ["identity", "appCodeName"]],
        ["product", ["identity", "product"]],
        ["productSub", ["identity", "productSub"]],
        ["vendor", ["identity", "vendor"]],
        ["vendorSub", ["identity", "vendorSub"]],
        ["platform", ["identity", "platform"]],
        ["pdfViewerEnabled", ["identity", "pdfViewerEnabled"]],
        ["cookieEnabled", ["identity", "cookieEnabled"]],
        ["uaData.brands", ["identity", "userAgentData", "brands"]],
        ["uaData.fullVersionList", ["identity", "userAgentData", "fullVersionList"]],
        ["uaData.mobile", ["identity", "userAgentData", "mobile"]],
        ["uaData.model", ["identity", "userAgentData", "model"]],
        ["uaData.platform", ["identity", "userAgentData", "platform"]],
        ["uaData.platformVersion", ["identity", "userAgentData", "platformVersion"]],
        ["uaData.architecture", ["identity", "userAgentData", "architecture"]],
        ["uaData.bitness", ["identity", "userAgentData", "bitness"]],
        ["uaData.wow64", ["identity", "userAgentData", "wow64"]],
        ["uaData.formFactors", ["identity", "userAgentData", "formFactors"]]
    ].forEach((item) => addPathField(fields, roots, "identity", item[0], item[1], exact));

    [
        ["hardwareConcurrency", ["navigator", "hardwareConcurrency"]],
        ["deviceMemory", ["navigator", "deviceMemory"]],
        ["maxTouchPoints", ["navigator", "maxTouchPoints"]],
        ["language", ["navigator", "language"]],
        ["languages", ["navigator", "languages"]],
        ["doNotTrack", ["navigator", "doNotTrack"]],
        ["msDoNotTrack", ["navigator", "msDoNotTrack"]],
        ["webdriver", ["navigator", "webdriver"]],
        ["onLine", ["navigator", "onLine"]],
        ["buildID", ["navigator", "buildID"]],
        ["oscpu", ["navigator", "oscpu"]]
    ].forEach((item) => addPathField(fields, roots, "navigator", item[0], item[1], exact));

    [
        ["timeZone", ["locale", "timeZone"]],
        ["timezoneOffsetMinutes", ["locale", "timezoneOffsetMinutes"]],
        ["locale", ["locale", "locale"]],
        ["language", ["locale", "language"]],
        ["languages", ["locale", "languages"]],
        ["intl.dateTimeFormat", ["locale", "intl", "dateTimeFormat"]],
        ["intl.numberFormat.locale", ["locale", "intl", "numberFormat", "locale"]],
        ["intl.collator.locale", ["locale", "intl", "collator", "locale"]]
    ].forEach((item) => addPathField(fields, roots, "locale", item[0], item[1], exact));

    [
        ["width", ["screen", "width"], exact],
        ["height", ["screen", "height"], exact],
        ["availWidth", ["screen", "availWidth"], exact],
        ["availHeight", ["screen", "availHeight"], exact],
        ["colorDepth", ["screen", "colorDepth"], exact],
        ["pixelDepth", ["screen", "pixelDepth"], exact],
        ["devicePixelRatio", ["screen", "devicePixelRatio"], exact],
        ["orientationType", ["screen", "orientationType"], exact],
        ["window.outerWidth", ["screen", "window", "outerWidth"], visualTolerance],
        ["window.outerHeight", ["screen", "window", "outerHeight"], visualTolerance],
        ["window.innerWidth", ["screen", "window", "innerWidth"], visualTolerance],
        ["window.innerHeight", ["screen", "window", "innerHeight"], visualTolerance],
        ["window.screenX", ["screen", "window", "screenX"], visualTolerance],
        ["window.screenY", ["screen", "window", "screenY"], visualTolerance],
        ["documentClientWidth", ["screen", "window", "documentClientWidth"], visualTolerance],
        ["documentClientHeight", ["screen", "window", "documentClientHeight"], visualTolerance],
        ["viewport.screen.width", ["screen", "viewport", "screen", "width"], exact],
        ["viewport.screen.height", ["screen", "viewport", "screen", "height"], exact],
        ["viewport.screen.availWidth", ["screen", "viewport", "screen", "availWidth"], exact],
        ["viewport.screen.availHeight", ["screen", "viewport", "screen", "availHeight"], exact],
        ["viewport.screen.colorDepth", ["screen", "viewport", "screen", "colorDepth"], exact],
        ["viewport.screen.pixelDepth", ["screen", "viewport", "screen", "pixelDepth"], exact],
        ["viewport.window.outerWidth", ["screen", "viewport", "window", "outerWidth"], visualTolerance],
        ["viewport.window.outerHeight", ["screen", "viewport", "window", "outerHeight"], visualTolerance],
        ["viewport.window.innerWidth", ["screen", "viewport", "window", "innerWidth"], visualTolerance],
        ["viewport.window.innerHeight", ["screen", "viewport", "window", "innerHeight"], visualTolerance],
        ["viewport.window.screenX", ["screen", "viewport", "window", "screenX"], visualTolerance],
        ["viewport.window.screenY", ["screen", "viewport", "window", "screenY"], visualTolerance],
        ["viewport.window.pageXOffset", ["screen", "viewport", "window", "pageXOffset"], visualTolerance],
        ["viewport.window.pageYOffset", ["screen", "viewport", "window", "pageYOffset"], visualTolerance],
        ["viewport.window.devicePixelRatio", ["screen", "viewport", "window", "devicePixelRatio"], smallFloatTolerance],
        ["documentElement.clientWidth", ["screen", "viewport", "documentElement", "clientWidth"], visualTolerance],
        ["documentElement.clientHeight", ["screen", "viewport", "documentElement", "clientHeight"], visualTolerance],
        ["documentElement.scrollWidth", ["screen", "viewport", "documentElement", "scrollWidth"], visualTolerance],
        ["documentElement.scrollHeight", ["screen", "viewport", "documentElement", "scrollHeight"], visualTolerance],
        ["visualViewport.width", ["screen", "viewport", "visualViewport", "width"], visualTolerance],
        ["visualViewport.height", ["screen", "viewport", "visualViewport", "height"], visualTolerance],
        ["visualViewport.scale", ["screen", "viewport", "visualViewport", "scale"], smallFloatTolerance],
        ["visualViewport.offsetLeft", ["screen", "viewport", "visualViewport", "offsetLeft"], visualTolerance],
        ["visualViewport.offsetTop", ["screen", "viewport", "visualViewport", "offsetTop"], visualTolerance],
        ["visualViewport.pageLeft", ["screen", "viewport", "visualViewport", "pageLeft"], visualTolerance],
        ["visualViewport.pageTop", ["screen", "viewport", "visualViewport", "pageTop"], visualTolerance],
        ["mediaQueries.colorGamutP3", ["screen", "viewport", "mediaQueries", "colorGamutP3"], exact],
        ["mediaQueries.colorGamutRec2020", ["screen", "viewport", "mediaQueries", "colorGamutRec2020"], exact],
        ["mediaQueries.dynamicRangeHigh", ["screen", "viewport", "mediaQueries", "dynamicRangeHigh"], exact],
        ["mediaQueries.prefersColorSchemeDark", ["screen", "viewport", "mediaQueries", "prefersColorSchemeDark"], exact],
        ["mediaQueries.prefersReducedMotion", ["screen", "viewport", "mediaQueries", "prefersReducedMotion"], exact],
        ["mediaQueries.forcedColors", ["screen", "viewport", "mediaQueries", "forcedColors"], exact],
        ["mediaQueries.invertedColors", ["screen", "viewport", "mediaQueries", "invertedColors"], exact],
        ["mediaQueries.hover", ["screen", "viewport", "mediaQueries", "hover"], exact],
        ["mediaQueries.anyHover", ["screen", "viewport", "mediaQueries", "anyHover"], exact],
        ["mediaQueries.pointerFine", ["screen", "viewport", "mediaQueries", "pointerFine"], exact],
        ["mediaQueries.anyPointerFine", ["screen", "viewport", "mediaQueries", "anyPointerFine"], exact],
        ["normalization.windowGeometry.profile", ["screen", "viewport", "normalization", "windowGeometry", "profile"], captureEnvironmentGap],
        ["normalization.windowGeometry.reason", ["screen", "viewport", "normalization", "windowGeometry", "reason"], captureEnvironmentGap],
        ["normalization.inputDeviceProfile.profile", ["screen", "viewport", "normalization", "inputDeviceProfile", "profile"], captureEnvironmentGap],
        ["normalization.inputDeviceProfile.reason", ["screen", "viewport", "normalization", "inputDeviceProfile", "reason"], captureEnvironmentGap]
    ].forEach((item) => addPathField(fields, roots, "screen", item[0], item[1], item[2]));

    fields.push(makeField("fonts", "summary",
        fontSummary(referenceRoot.fonts), fontSummary(broiumRoot.fonts), fontExactReplayGap));

    [
        ["storage.usage", ["storage", "async", "estimate", "usage"]],
        ["storage.quota", ["storage", "async", "estimate", "quota"]],
        ["storage.persisted", ["storage", "async", "persisted"]]
    ].forEach((item) => addPathField(fields, roots, "storage", item[0], item[1], exact));

    [
        ["connection.type", ["network", "connection", "type"], networkTypeExposureGap],
        ["connection.effectiveType", ["network", "connection", "effectiveType"], exact],
        ["connection.downlinkMax", ["network", "connection", "downlinkMax"], networkFloatTolerance],
        ["connection.downlink", ["network", "connection", "downlink"], networkFloatTolerance],
        ["connection.rtt", ["network", "connection", "rtt"], networkRttTolerance],
        ["connection.saveData", ["network", "connection", "saveData"], exact]
    ].forEach((item) => addPathField(fields, roots, "network", item[0], item[1], item[2]));

    fields.push(makeField("network.webrtc", "policy",
        {
            candidatePolicy: referenceRoot.network && referenceRoot.network.webrtc && referenceRoot.network.webrtc.candidatePolicy,
            recommendedIpHandlingPolicy: referenceRoot.network && referenceRoot.network.webrtc && referenceRoot.network.webrtc.recommendedIpHandlingPolicy
        },
        {
            candidatePolicy: broiumRoot.network && broiumRoot.network.webrtc && broiumRoot.network.webrtc.candidatePolicy,
            recommendedIpHandlingPolicy: broiumRoot.network && broiumRoot.network.webrtc && broiumRoot.network.webrtc.recommendedIpHandlingPolicy
        }, {
            knownGap: true,
            reason: "WebRTC native policy gate exists, but Martell policy labels reflect observed candidates and exact candidate/profile replay is still pending"
        }));
    fields.push(makeField("network.webrtc", "candidateSummary",
        webRtcSummary(referenceRoot.network), webRtcSummary(broiumRoot.network), {
            knownGap: true,
            reason: "WebRTC native policy gate exists, but exact candidate count/order/profile replay is still pending"
        }));

    [
        ["preferredContext", ["graphics", "webgl", "values", "preferredContext"], exact],
        ["suggestedProfile", ["graphics", "webgl", "values", "suggestedProfile"], exact],
        ["observed.version", ["graphics", "webgl", "values", "observed", "version"], exact],
        ["observed.vendor", ["graphics", "webgl", "values", "observed", "vendor"], exact],
        ["observed.renderer", ["graphics", "webgl", "values", "observed", "renderer"], exact],
        ["observed.unmaskedRenderer", ["graphics", "webgl", "values", "observed", "unmaskedRenderer"], exact],
        ["observed.unmaskedVendor", ["graphics", "webgl", "values", "observed", "unmaskedVendor"], exact],
        ["observed.extensionCount", ["graphics", "webgl", "values", "observed", "extensionCount"], exact],
        ["observed.canvasHashes", ["graphics", "webgl", "values", "observed", "canvasHashes"], {
            knownGap: true,
            reason: "WebGL readback/dataURL exact hash replay is still a known partial-native gap"
        }]
    ].forEach((item) => addPathField(fields, roots, "graphics.webgl", item[0], item[1], item[2]));

    [
        ["supported", ["graphics", "canvas2d", "values", "supported"], exact],
        ["dataUrlLength", ["graphics", "canvas2d", "values", "dataUrlLength"], canvasExactReplayGap],
        ["dataUrlHash", ["graphics", "canvas2d", "values", "dataUrlHash"], canvasExactReplayGap],
        ["imageDataHash", ["graphics", "canvas2d", "values", "imageDataHash"], canvasExactReplayGap],
        ["textMetrics", ["graphics", "canvas2d", "values", "textMetrics"], {
            knownGap: true,
            reason: "Canvas2D native shaping currently covers toDataURL/toBlob/getImageData; exact measureText replay is still pending"
        }]
    ].forEach((item) => addPathField(fields, roots, "graphics.canvas2d", item[0], item[1], item[2]));

    [
        ["context.sampleRate", ["audio", "context", "sampleRate"], exact],
        ["context.baseLatency", ["audio", "context", "baseLatency"], smallFloatTolerance],
        ["context.outputLatency", ["audio", "context", "outputLatency"], smallFloatTolerance],
        ["offline.hash", ["audio", "offline", "hash"], {
            knownGap: true,
            reason: "exact OfflineAudioContext hash replay is a known partial-native gap"
        }]
    ].forEach((item) => addPathField(fields, roots, "audio", item[0], item[1], item[2]));

    fields.push(makeField("media.speech", "voices",
        speechVoicesSummary(referenceRoot.media), speechVoicesSummary(broiumRoot.media), exact));
    fields.push(makeField("media.plugins", "summary",
        mediaPluginSummary(referenceRoot.media), mediaPluginSummary(broiumRoot.media), {
            knownGap: true,
            reason: "plugins, mimeTypes, devices, and codecs do not have full native replay yet"
        }));
    fields.push(makeField("media.capabilities", "decoding",
        mediaCapabilitiesDecodingSummary(referenceRoot.media),
        mediaCapabilitiesDecodingSummary(broiumRoot.media),
        exact));

    fields.push(makeField("graphics.webgpu", "summary",
        webGpuSummary(referenceRoot.graphics), webGpuSummary(broiumRoot.graphics), {
            knownGap: true,
            reason: "WebGPU adapter info, feature set, limits, and fallback state do not have a Broium native replay surface yet"
        }));
    fields.push(makeField("apiSurface", "summary",
        apiSurfaceCategorySummary(referenceRoot.apiSurface),
        apiSurfaceCategorySummary(broiumRoot.apiSurface), {
            knownGap: true,
            reason: "API surface gating and descriptor/toString coherence do not have a Broium native replay surface yet"
        }));

    fields.push(makeField("security.permissions", "permissionSurface",
        permissionQuerySurface(referenceRoot.security),
        permissionQuerySurface(broiumRoot.security),
        exact));

    return fields;
}

function aggregateSurfaceStatus(fields) {
    const rank = {
        exact: 0,
        tolerance: 1,
        "known-gap": 2,
        regression: 3
    };
    const bySurface = {};
    for (const field of fields) {
        const current = bySurface[field.surface];
        if (!current || rank[field.status] > rank[current.status]) {
            bySurface[field.surface] = {
                surface: field.surface,
                status: field.status,
                fields: 0
            };
        }
        bySurface[field.surface].fields++;
    }
    return Object.keys(bySurface).sort().map((surface) => bySurface[surface]);
}

function buildSummary(fields) {
    const summary = {
        total: fields.length,
        exact: 0,
        tolerance: 0,
        knownGap: 0,
        regression: 0
    };
    for (const field of fields) {
        if ("known-gap" === field.status)
            summary.knownGap++;
        else if (field.status in summary)
            summary[field.status]++;
    }
    return summary;
}

async function main() {
    const repoRoot = path.resolve(__dirname, "..", "..");
    const referencePath = process.argv[2];
    const broiumPath = process.argv[3];
    const outputPath = process.argv[4];
    if (!referencePath || !broiumPath) {
        usage();
        process.exit(2);
    }

    const martell = loadMartellApi(repoRoot);
    const runtimeVersion = process.env.BROIUM_TARGET_VERSION || readChromiumVersion(repoRoot);
    const reference = patchProfileForRuntimeVersion(
        await ensureChromiumConfig(readJson(path.resolve(repoRoot, referencePath)), martell),
        runtimeVersion);
    const broium = patchProfileForRuntimeVersion(
        await ensureChromiumConfig(readJson(path.resolve(repoRoot, broiumPath)), martell),
        runtimeVersion);
    const referenceRoot = valuesRoot(reference);
    const broiumRoot = valuesRoot(broium);
    const fields = collectFields(referenceRoot, broiumRoot);
    const report = {
        schema: "broium.fingerprint-diff.v1",
        generatedAt: new Date().toISOString(),
        inputs: {
            reference: path.relative(repoRoot, path.resolve(repoRoot, referencePath)),
            broium: path.relative(repoRoot, path.resolve(repoRoot, broiumPath))
        },
        summary: buildSummary(fields),
        surfaces: aggregateSurfaceStatus(fields),
        fields: fields.sort((left, right) =>
            (left.surface + "." + left.field).localeCompare(right.surface + "." + right.field))
    };

    if (outputPath)
        writeJson(path.resolve(repoRoot, outputPath), report);
    console.log("schema=" + report.schema);
    console.log("summary.total=" + report.summary.total);
    console.log("summary.exact=" + report.summary.exact);
    console.log("summary.tolerance=" + report.summary.tolerance);
    console.log("summary.knownGap=" + report.summary.knownGap);
    console.log("summary.regression=" + report.summary.regression);
    if (outputPath)
        console.log("wrote " + path.relative(repoRoot, path.resolve(repoRoot, outputPath)));
    if (report.summary.regression > 0)
        process.exitCode = 1;
}

main().catch((error) => {
    console.error(error && error.stack || error);
    process.exit(1);
});
