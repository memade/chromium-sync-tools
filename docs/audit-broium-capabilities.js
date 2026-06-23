"use strict";

const fs = require("fs");
const path = require("path");

const ALLOWED_STATUSES = new Set([
    "native-supported",
    "partial-native",
    "observed-only",
    "observed/launch-policy",
    "planned",
    "not-observed",
    "disabled"
]);

const IMPLEMENTED_STATUSES = new Set([
    "native-supported",
    "partial-native"
]);

const GAP_STATUSES = new Set([
    "partial-native",
    "observed-only",
    "observed/launch-policy",
    "planned"
]);

const REQUIRED_SURFACES = [
    "identity",
    "navigator",
    "screen",
    "pointer",
    "locale",
    "runtime",
    "fonts",
    "graphics.webgl",
    "graphics.canvas2d",
    "audio",
    "media",
    "network",
    "network.webrtc",
    "storage",
    "security",
    "security.permissions",
    "apiSurface",
    "graphics.webgpu"
];

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function usage() {
    console.error("usage: node sync/docs/audit-broium-capabilities.js <broium-cfg.json>");
    process.exit(2);
}

function capabilityList(document) {
    if (Array.isArray(document && document.capabilities))
        return document.capabilities;
    if (Array.isArray(document && document.cfg && document.cfg.capabilities))
        return document.cfg.capabilities;
    if (Array.isArray(document && document.broium && document.broium.capabilities))
        return document.broium.capabilities;
    if (Array.isArray(document && document.broium && document.broium.cfg &&
            document.broium.cfg.capabilities))
        return document.broium.cfg.capabilities;
    return [];
}

function isNonEmptyString(value) {
    return "string" === typeof value && "" !== value.trim();
}

function hasNotes(capability) {
    return Array.isArray(capability.notes) &&
        capability.notes.some(isNonEmptyString);
}

function main() {
    const input = process.argv[2];
    if (!input)
        usage();

    const repoRoot = path.resolve(__dirname, "..", "..");
    const document = readJson(path.resolve(input));
    const capabilities = capabilityList(document);
    const seen = new Set();
    const failures = [];

    function fail(message) {
        failures.push(message);
    }

    if (!Array.isArray(capabilities) || 0 === capabilities.length)
        fail("capabilities array is missing");

    for (const capability of capabilities) {
        if (!capability || "object" !== typeof capability) {
            fail("capability entry is not an object");
            continue;
        }

        const surface = String(capability.surface || "");
        const label = surface || "<missing-surface>";
        if (!isNonEmptyString(surface))
            fail(label + " missing surface");
        if (seen.has(surface))
            fail(label + " duplicated surface");
        seen.add(surface);

        if (!isNonEmptyString(capability.status) ||
                !ALLOWED_STATUSES.has(capability.status)) {
            fail(label + " invalid status " + JSON.stringify(capability.status));
        }
        if (!isNonEmptyString(capability.source))
            fail(label + " missing source");
        if (!isNonEmptyString(capability.runtimeConsumer))
            fail(label + " missing runtimeConsumer");
        if (!Array.isArray(capability.consumerFiles))
            fail(label + " consumerFiles must be an array");

        const consumerFiles = Array.isArray(capability.consumerFiles)
            ? capability.consumerFiles
            : [];
        const plannedFiles = Array.isArray(capability.plannedConsumerFiles)
            ? capability.plannedConsumerFiles
            : [];

        if (IMPLEMENTED_STATUSES.has(capability.status) &&
                0 === consumerFiles.length) {
            fail(label + " implemented status without consumerFiles");
        }
        if ("planned" === capability.status && 0 === plannedFiles.length) {
            fail(label + " planned status without plannedConsumerFiles");
        }
        if ("not-observed" === capability.status &&
                (consumerFiles.length || plannedFiles.length)) {
            fail(label + " not-observed should not advertise consumer files");
        }
        if ("native-supported" === capability.status && plannedFiles.length) {
            fail(label + " native-supported should not carry plannedConsumerFiles");
        }
        if (GAP_STATUSES.has(capability.status) && !hasNotes(capability)) {
            fail(label + " gap status requires notes");
        }

        for (const file of consumerFiles) {
            if (!isNonEmptyString(file)) {
                fail(label + " has empty consumer file path");
                continue;
            }
            const absolute = path.join(repoRoot, file);
            if (!fs.existsSync(absolute))
                fail(label + " consumer file does not exist: " + file);
        }
        for (const file of plannedFiles) {
            if (!isNonEmptyString(file))
                fail(label + " has empty planned consumer file path");
        }
    }

    for (const surface of REQUIRED_SURFACES) {
        if (!seen.has(surface))
            fail("missing required capability surface: " + surface);
    }

    console.log("capabilities=" + capabilities.length);
    console.log("surfaces=" + Array.from(seen).sort().join(","));
    if (failures.length) {
        for (const failure of failures)
            console.error("FAIL " + failure);
        process.exit(1);
    }
    console.log("capability-audit=ok");
}

main();
