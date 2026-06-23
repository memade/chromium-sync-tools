#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const {performance} = require("perf_hooks");

const repoRoot = path.resolve(__dirname, "..", "..");
const sourcePath = path.join(repoRoot, "sync", "docs", "martell-cdp-fingerprint.js");
const samplePaths = [
    path.join(repoRoot, "sync", "docs", "windows-amd64.json"),
    path.join(repoRoot, "sync", "docs", "broium-138.json"),
    path.join(repoRoot, "sync", "docs", "macos-arm64.json")
].filter((file) => fs.existsSync(file));

const rounds = readPositiveInteger(process.env.MARTELL_STRESS_ROUNDS, 25);
const concurrency = readPositiveInteger(process.env.MARTELL_STRESS_CONCURRENCY, 8);
const timeoutMs = readPositiveInteger(process.env.MARTELL_STRESS_TIMEOUT_MS, 2);

function readPositiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadApi(overrides = {}) {
    const source = fs.readFileSync(sourcePath, "utf8");
    const sandbox = Object.assign({
        Buffer,
        console,
        setTimeout,
        clearTimeout,
        performance: {
            now: () => Date.now()
        }
    }, overrides);
    sandbox.globalThis = sandbox;
    sandbox.window = sandbox;
    vm.runInNewContext(source, sandbox, {
        filename: sourcePath
    });
    assert(sandbox.MartellFingerprint, "MartellFingerprint API missing");
    assert("function" === typeof sandbox.MartellFingerprint.collect, "collect missing");
    assert("function" === typeof sandbox.MartellFingerprint.compile, "compile missing");
    assert("function" === typeof sandbox.MartellFingerprint.buildBroiumLaunchConfig, "buildBroiumLaunchConfig missing");
    return {
        api: sandbox.MartellFingerprint,
        sandbox
    };
}

function hasOwnDebugHook(sandbox) {
    return Object.prototype.hasOwnProperty.call(sandbox, "MartellFingerprintDebugWrite");
}

async function runCase(name, fn) {
    const started = performance.now();
    await fn();
    const duration = Math.round(performance.now() - started);
    console.log("ok " + name + " " + duration + "ms");
}

async function stressApiLoad() {
    for (let index = 0; index < rounds; index++) {
        const {api} = loadApi();
        assert(api.endpoints && "off" === api.endpoints.networkMode, "unexpected endpoint defaults");
    }
}

async function stressCompileSamples() {
    assert(samplePaths.length, "no JSON samples found");
    const {api} = loadApi();
    const samples = samplePaths.map(readJson);
    for (let index = 0; index < rounds; index++) {
        const input = samples[index % samples.length];
        const result = await api.compile(input, {
            enableAsyncProfile: false
        });
        assert(result && result.chromium && result.chromium.config, "compile missing chromium config");
        assert(result.broium && result.broium.cfg, "compile missing broium cfg");
        const launch = api.buildBroiumLaunchConfig(result.chromium);
        assert(launch && launch.cfg && launch.cfg.v8Keys, "launch config missing v8Keys");
    }
}

async function stressRawCompileFallback() {
    const {api} = loadApi();
    const input = cloneJson(readJson(samplePaths[0]));
    delete input.chromium;
    delete input.broium;
    delete input.training;
    delete input.trainingDataset;
    for (let index = 0; index < Math.max(3, Math.ceil(rounds / 5)); index++) {
        const result = await api.compile(input, {
            enableAsyncProfile: false
        });
        assert(result && result.chromium && result.chromium.config, "raw compile missing chromium config");
        assert(result.profile && result.profile.quality, "raw compile missing profile quality");
    }
}

async function stressCollectInitError() {
    for (let index = 0; index < rounds; index++) {
        const {api, sandbox} = loadApi();
        const hadDebugHook = hasOwnDebugHook(sandbox);
        sandbox.MartellFingerprintInit = function() {
            throw new Error("boom");
        };
        const result = await api.collect({
            timeout: timeoutMs,
            settleGraceMs: timeoutMs,
            enableAsyncProfile: false
        });
        assert(1 === result.error, "init-error collect should return error result");
        assert(/^init:/.test(result.errorText || ""), "init-error result missing errorText");
        assert(result.profile && result.chromium, "init-error result should still be augmented");
        assert(hadDebugHook === hasOwnDebugHook(sandbox), "debug hook not restored after init error");
    }
}

async function stressCollectTimeoutWithDebugSnapshot() {
    for (let index = 0; index < rounds; index++) {
        const {api, sandbox} = loadApi();
        sandbox.MartellFingerprintInit = function(unused, options) {
            sandbox.MartellFingerprintDebugWrite("features", JSON.stringify(["sentinel", index]));
            sandbox.MartellFingerprintDebugWrite("payload", "payload-" + index);
        };
        const result = await api.collect({
            timeout: timeoutMs,
            settleGraceMs: timeoutMs,
            enableAsyncProfile: false
        });
        assert(1 === result.error, "timeout collect should return error result");
        assert("collection-timeout" === result.errorText, "timeout result missing errorText");
        assert(Array.isArray(result.values) && "sentinel" === result.values[0], "timeout result lost debug features");
        assert("payload-" + index === result.payload, "timeout result lost debug payload");
        assert(!hasOwnDebugHook(sandbox), "debug hook not restored after timeout");
    }
}

async function stressCollectPreservesExistingDebugHook() {
    for (let index = 0; index < rounds; index++) {
        const calls = [];
        const existing = function(name, value) {
            calls.push([name, value]);
        };
        const {api, sandbox} = loadApi({
            MartellFingerprintDebugWrite: existing
        });
        const before = Object.getOwnPropertyDescriptor(sandbox, "MartellFingerprintDebugWrite");
        sandbox.MartellFingerprintInit = function(unused, options) {
            sandbox.MartellFingerprintDebugWrite("features", "[]");
            options.onFingerprint({
                error: 0,
                payload: "",
                features: "[]",
                values: [],
                count: 0,
                endpoints: options.endpoints
            });
        };
        const result = await api.collect({
            timeout: Math.max(20, timeoutMs),
            settleGraceMs: timeoutMs,
            enableAsyncProfile: false
        });
        const after = Object.getOwnPropertyDescriptor(sandbox, "MartellFingerprintDebugWrite");
        assert(0 === result.error, "existing debug hook success returned error");
        assert(after && after.value === before.value, "existing debug hook value not restored");
        assert(after.enumerable === before.enumerable, "existing debug hook descriptor not restored");
        assert(calls.length > 0, "existing debug hook was not called");
    }
}

async function stressLateDebugWriteIsolation() {
    const {api, sandbox} = loadApi();
    let calls = 0;
    sandbox.MartellFingerprintInit = function() {
        calls++;
        if (1 === calls) {
            setTimeout(function() {
                if ("function" === typeof sandbox.MartellFingerprintDebugWrite)
                    sandbox.MartellFingerprintDebugWrite("features", JSON.stringify(["late-first"]));
            }, timeoutMs * 3);
            return;
        }
        sandbox.MartellFingerprintDebugWrite("features", JSON.stringify(["second"]));
    };
    const first = await api.collect({
        timeout: timeoutMs,
        settleGraceMs: timeoutMs,
        enableAsyncProfile: false
    });
    const second = await api.collect({
        timeout: timeoutMs * 8,
        settleGraceMs: timeoutMs,
        enableAsyncProfile: false
    });
    assert("collection-timeout" === first.errorText, "first collect should time out");
    assert("collection-timeout" === second.errorText, "second collect should time out");
    assert(Array.isArray(second.values) && "second" === second.values[0], "late debug write polluted next collect");
}

async function stressLateOnFingerprintIgnored() {
    const {api, sandbox} = loadApi();
    let calls = 0;
    sandbox.MartellFingerprintInit = function(unused, options) {
        calls++;
        if (1 === calls) {
            setTimeout(function() {
                options.onFingerprint({
                    error: 0,
                    payload: "",
                    features: JSON.stringify(["late-success"]),
                    values: ["late-success"],
                    count: 1,
                    endpoints: options.endpoints
                });
            }, timeoutMs * 8);
            return;
        }
        options.onFingerprint({
            error: 0,
            payload: "",
            features: JSON.stringify(["second-success"]),
            values: ["second-success"],
            count: 1,
            endpoints: options.endpoints
        });
    };
    const first = await api.collect({
        timeout: timeoutMs,
        settleGraceMs: timeoutMs,
        enableAsyncProfile: false
    });
    const second = await api.collect({
        timeout: Math.max(20, timeoutMs),
        settleGraceMs: timeoutMs,
        enableAsyncProfile: false
    });
    await new Promise((resolve) => setTimeout(resolve, timeoutMs * 10));
    assert("collection-timeout" === first.errorText, "first collect should time out before late onFingerprint");
    assert(0 === second.error, "second collect should succeed");
    assert(Array.isArray(second.values) && "second-success" === second.values[0], "late onFingerprint changed second result");
    assert(sandbox.__MARTELL_FINGERPRINT_LAST_RESULT__ && "second-success" === sandbox.__MARTELL_FINGERPRINT_LAST_RESULT__.values[0], "late onFingerprint overwrote last result");
}

async function stressCollectSuccess() {
    for (let index = 0; index < rounds; index++) {
        const {api, sandbox} = loadApi();
        sandbox.MartellFingerprintInit = function(unused, options) {
            setTimeout(function() {
                options.onFingerprint({
                    error: 0,
                    payload: "",
                    features: "[]",
                    values: [],
                    count: 0,
                    endpoints: options.endpoints
                });
            }, 0);
        };
        const result = await api.collect({
            timeout: Math.max(20, timeoutMs),
            settleGraceMs: timeoutMs,
            enableAsyncProfile: false
        });
        assert(0 === result.error, "success collect returned error");
        assert(result.profile && result.chromium && result.broium, "success collect missing augmented output");
        assert(!hasOwnDebugHook(sandbox), "debug hook not restored after success");
    }
}

async function stressAsyncProfileTimeout() {
    for (let index = 0; index < Math.max(3, Math.ceil(rounds / 5)); index++) {
        const {api, sandbox} = loadApi();
        sandbox.navigator = {
            storage: {
                estimate: function() {
                    return new Promise(function() {});
                },
                persisted: function() {
                    return new Promise(function() {});
                }
            },
            mediaDevices: {
                enumerateDevices: function() {
                    return new Promise(function() {});
                }
            }
        };
        sandbox.MartellFingerprintInit = function(unused, options) {
            options.onFingerprint({
                error: 0,
                payload: "",
                features: "[]",
                values: [],
                count: 0,
                endpoints: options.endpoints
            });
        };
        const started = performance.now();
        const result = await api.collect({
            timeout: Math.max(20, timeoutMs),
            settleGraceMs: timeoutMs,
            enableAsyncProfile: true,
            profileExtraTimeout: timeoutMs
        });
        const duration = performance.now() - started;
        assert(duration < 1000, "async timeout waited too long: " + Math.round(duration) + "ms");
        assert(result.profile && result.profile.collector && result.profile.collector.asyncProfile, "async profile metadata missing");
        assert(false === result.profile.collector.asyncProfile.completed, "async profile timeout should mark incomplete");
        assert(result.profile.quality && result.profile.quality.asyncWarnings.indexOf("async-profile-timeout") >= 0, "async timeout warning missing");
    }
}

async function stressCollectConcurrency() {
    const {api, sandbox} = loadApi();
    let active = 0;
    let maxActive = 0;
    let calls = 0;
    sandbox.MartellFingerprintInit = function(unused, options) {
        active++;
        calls++;
        maxActive = Math.max(maxActive, active);
        setTimeout(function() {
            options.onFingerprint({
                error: 0,
                payload: "",
                features: "[]",
                values: [],
                count: 0,
                endpoints: options.endpoints
            });
            active--;
        }, timeoutMs);
    };
    const tasks = [];
    for (let index = 0; index < concurrency; index++) {
        tasks.push(api.collect({
            timeout: Math.max(50, timeoutMs * 5),
            settleGraceMs: timeoutMs,
            enableAsyncProfile: false
        }));
    }
    const results = await Promise.all(tasks);
    assert(concurrency === calls, "not all concurrent collect calls started");
    assert(results.every((result) => 0 === result.error && result.profile && result.chromium), "concurrent collect result invalid");
    assert(1 === maxActive, "collect should serialize MartellFingerprintInit calls; maxActive=" + maxActive);
    assert(!hasOwnDebugHook(sandbox), "debug hook not restored after concurrency test");
}

async function main() {
    console.log("martell stress rounds=" + rounds + " concurrency=" + concurrency + " timeoutMs=" + timeoutMs);
    await runCase("api-load", stressApiLoad);
    await runCase("compile-samples", stressCompileSamples);
    await runCase("raw-compile-fallback", stressRawCompileFallback);
    await runCase("collect-init-error", stressCollectInitError);
    await runCase("collect-timeout-debug-snapshot", stressCollectTimeoutWithDebugSnapshot);
    await runCase("collect-preserves-existing-debug-hook", stressCollectPreservesExistingDebugHook);
    await runCase("late-debug-write-isolation", stressLateDebugWriteIsolation);
    await runCase("late-onfingerprint-ignored", stressLateOnFingerprintIgnored);
    await runCase("collect-success", stressCollectSuccess);
    await runCase("async-profile-timeout", stressAsyncProfileTimeout);
    await runCase("collect-concurrency", stressCollectConcurrency);
}

main().catch((error) => {
    console.error(error && error.stack || error);
    process.exit(1);
});
