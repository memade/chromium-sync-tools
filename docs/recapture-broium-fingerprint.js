#!/usr/bin/env node
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const {spawn, spawnSync} = require("child_process");

function usage() {
    console.error("usage: node sync/docs/recapture-broium-fingerprint.js <reference.json> <output-dir> [chrome-exe] [--full-martell]");
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

function removePath(file) {
    try {
        fs.rmSync(file, {
            recursive: true,
            force: true
        });
    } catch (error) {}
}

function startCaptureServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((request, response) => {
            response.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "cache-control": "no-store"
            });
            response.end("<!doctype html><meta charset=\"utf-8\"><title>Broium recapture</title><style>html,body{margin:0;width:100vw;height:100vh;overflow:hidden}</style><body></body>");
        });
        server.on("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            resolve({
                server,
                url: `http://127.0.0.1:${address.port}/`
            });
        });
    });
}

function closeServer(server) {
    return new Promise((resolve) => {
        if (!server)
            return resolve();
        server.close(() => resolve());
    });
}

function quoteArg(value) {
    return /\s/.test(value) ? `"${value}"` : value;
}

function switchName(arg) {
    if ("string" !== typeof arg || !arg.startsWith("--"))
        return "";
    const match = /^--([^=\s]+)/.exec(arg.trim());
    return match ? match[1].toLowerCase() : "";
}

function mergeSwitchArgs(...groups) {
    const result = [];
    const seen = new Set();
    for (const group of groups) {
        for (const arg of group || []) {
            if ("string" !== typeof arg || !arg.startsWith("--"))
                continue;
            const name = switchName(arg);
            if (!name || seen.has(name))
                continue;
            seen.add(name);
            result.push(arg);
        }
    }
    return result;
}

function runNode(repoRoot, args, options = {}) {
    const result = spawnSync(process.execPath, args, {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: options.stdio || "pipe"
    });
    if (result.status !== 0) {
        if (result.stdout)
            process.stdout.write(result.stdout);
        if (result.stderr)
            process.stderr.write(result.stderr);
        throw new Error("node " + args.join(" ") + " failed with " + result.status);
    }
    if (result.stdout && options.printStdout)
        process.stdout.write(result.stdout);
    return result.stdout || "";
}

async function compileProfileWithMartell(repoRoot, profile) {
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
    require("vm").runInNewContext(source, sandbox, {
        filename: sourcePath
    });
    if (!sandbox.MartellFingerprint || "function" !== typeof sandbox.MartellFingerprint.compile)
        throw new Error("MartellFingerprint.compile is unavailable");
    const compiled = await sandbox.MartellFingerprint.compile({
        schema: "broium.profile-lite-recapture.v1",
        profile
    }, {
        enableAsyncProfile: false
    });
    if (!compiled || !compiled.chromium || !compiled.chromium.config)
        throw new Error("Profile-lite compile did not produce chromium.config");
    return compiled;
}

function findChromeExe(repoRoot, explicitPath) {
    const candidates = [
        explicitPath,
        path.join(repoRoot, "src", "out", "debug", "chrome.exe"),
        path.join(repoRoot, "src", "out", "Default", "chrome.exe")
    ].filter(Boolean);
    for (const candidate of candidates) {
        if (fs.existsSync(candidate))
            return path.resolve(candidate);
    }
    throw new Error("Unable to find chrome.exe; pass it as the third argument");
}

async function waitForDevToolsEndpoint(userDataDir, timeoutMs, getChromeExit) {
    const portFile = path.join(userDataDir, "DevToolsActivePort");
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const chromeExit = getChromeExit && getChromeExit();
        if (chromeExit) {
            throw new Error("Chrome exited before DevTools was ready: code=" +
                chromeExit.code + " signal=" + chromeExit.signal);
        }
        if (fs.existsSync(portFile)) {
            const lines = fs.readFileSync(portFile, "utf8").trim().split(/\r?\n/);
            const port = Number.parseInt(lines[0], 10);
            if (Number.isFinite(port) && port > 0) {
                return {
                    port,
                    browserPath: lines[1] || ""
                };
            }
        }
        await sleep(100);
    }
    throw new Error("Timed out waiting for DevToolsActivePort in " + userDataDir);
}

async function fetchJson(url, options = {}) {
    const {
        timeoutMs = 10000,
        ...fetchOptions
    } = options;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal
        });
        if (!response.ok) {
            const body = await response.text().catch(() => "");
            throw new Error(url + " returned HTTP " + response.status +
                (body ? ": " + body.slice(0, 300) : ""));
        }
        return response.json();
    } finally {
        clearTimeout(timeout);
    }
}

class CdpClient {
    constructor(url) {
        this.url = url;
        this.nextId = 1;
        this.pending = new Map();
        this.events = new Map();
        this.socket = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            const socket = new WebSocket(this.url);
            this.socket = socket;
            socket.addEventListener("open", () => resolve());
            socket.addEventListener("error", () => reject(new Error("CDP websocket error")));
            socket.addEventListener("message", (event) => {
                this.onMessage(event.data).catch((error) => {
                    for (const pending of this.pending.values()) {
                        clearTimeout(pending.timeout);
                        pending.reject(error);
                    }
                    this.pending.clear();
                });
            });
            socket.addEventListener("close", () => {
                for (const pending of this.pending.values()) {
                    clearTimeout(pending.timeout);
                    pending.reject(new Error("CDP websocket closed"));
                }
                this.pending.clear();
            });
        });
    }

    async onMessage(data) {
        if ("string" !== typeof data) {
            if (data instanceof ArrayBuffer)
                data = Buffer.from(data).toString("utf8");
            else if (ArrayBuffer.isView(data))
                data = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
            else if ("undefined" !== typeof Blob && data instanceof Blob)
                data = await data.text();
            else
                data = String(data);
        }
        const message = JSON.parse(data);
        if (message.id && this.pending.has(message.id)) {
            const pending = this.pending.get(message.id);
            this.pending.delete(message.id);
            clearTimeout(pending.timeout);
            if (message.error)
                pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
            else
                pending.resolve(message.result);
            return;
        }
        if (message.method && this.events.has(message.method)) {
            for (const handler of this.events.get(message.method))
                handler(message.params || {});
        }
    }

    send(method, params = {}, timeoutMs = 30000) {
        const id = this.nextId++;
        this.socket.send(JSON.stringify({
            id,
            method,
            params
        }));
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error("CDP " + method + " timed out after " + timeoutMs + "ms"));
            }, timeoutMs);
            this.pending.set(id, {
                resolve,
                reject,
                timeout
            });
        });
    }

    on(method, handler) {
        if (!this.events.has(method))
            this.events.set(method, []);
        this.events.get(method).push(handler);
    }

    close() {
        if (this.socket)
            this.socket.close();
    }
}

async function createPage(port) {
    const url = `http://127.0.0.1:${port}/json/new?about:blank`;
    let target;
    try {
        target = await fetchJson(url, {
            method: "PUT"
        });
    } catch (error) {
        if (!/HTTP 405|HTTP 404|fetch failed|aborted|terminated/i.test(error.message))
            throw error;
        target = await fetchJson(url);
    }
    if (!target.webSocketDebuggerUrl)
        throw new Error("CDP target did not include webSocketDebuggerUrl");
    const client = new CdpClient(target.webSocketDebuggerUrl);
    await client.connect();
    return client;
}

async function waitForLoad(client, url, timeoutMs) {
    let loaded = false;
    client.on("Page.loadEventFired", () => {
        loaded = true;
    });
    await client.send("Page.enable", {}, 10000);
    await client.send("Runtime.enable", {}, 10000);
    await client.send("Page.navigate", {
        url
    }, 10000);
    const deadline = Date.now() + timeoutMs;
    while (!loaded && Date.now() < deadline)
        await sleep(50);
}

function runtimeExpression(source, options) {
    const hardTimeoutMs = Math.max(1000, Number(options && options.hardTimeoutMs) || 20000);
    return `
        (() => {
          window.__MARTELL_FINGERPRINT_OPTIONS__ = ${JSON.stringify(options || {})};
          ${source}
          const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => resolve(JSON.stringify({
              error: "recapture-hard-timeout",
              errorText: "recapture-hard-timeout",
              payload: "",
              features: "",
              values: [],
              count: 0,
              endpoints: window.__MARTELL_FINGERPRINT_OPTIONS__.endpoints || {},
              recaptureWarning: "Runtime.evaluate hard timeout"
            })), ${hardTimeoutMs});
          });
          return Promise.race([
            Promise.resolve(window.__MARTELL_FINGERPRINT_LAST_PROMISE__)
            .then((result) => JSON.stringify(result)),
            timeoutPromise
          ]);
        })()
    `;
}

async function collectMartell(client, source, options) {
    const cdpTimeoutMs = Math.max(5000, Number(options && options.hardTimeoutMs) || 30000) + 5000;
    const result = await client.send("Runtime.evaluate", {
        expression: runtimeExpression(source, options),
        awaitPromise: true,
        returnByValue: true,
        timeout: cdpTimeoutMs
    }, cdpTimeoutMs + 5000);
    if (result.exceptionDetails)
        throw new Error("Martell evaluation failed: " + JSON.stringify(result.exceptionDetails));
    if (!result.result || "string" !== typeof result.result.value)
        throw new Error("Martell evaluation did not return a JSON string");
    return JSON.parse(result.result.value);
}

function stageExpression(body) {
    return `
        (async () => {
          try {
            const result = await (async () => {
              ${body}
            })();
            return JSON.stringify({ok: true, result});
          } catch (error) {
            return JSON.stringify({
              ok: false,
              error: error && (error.stack || error.message) || String(error)
            });
          }
        })()
    `;
}

async function evaluateProfileLiteStage(client, name, body, timeoutMs = 10000) {
    try {
        const result = await client.send("Runtime.evaluate", {
            expression: stageExpression(body),
            awaitPromise: true,
            returnByValue: true,
            timeout: timeoutMs
        }, timeoutMs + 5000);
        if (result.exceptionDetails)
            throw new Error(JSON.stringify(result.exceptionDetails));
        if (!result.result || "string" !== typeof result.result.value)
            throw new Error("stage did not return a JSON string");
        const parsed = JSON.parse(result.result.value);
        if (!parsed.ok)
            throw new Error(parsed.error || "stage returned error");
        return parsed.result;
    } catch (error) {
        throw new Error("profile-lite stage " + name + " failed: " +
            (error && error.message || String(error)));
    }
}

function profileLiteExpression() {
    return `
        (async () => {
          const fnvString = (value) => {
            value = String(value || "");
            let hash = 2166136261;
            for (let index = 0; index < value.length; index++) {
              hash ^= value.charCodeAt(index);
              hash = Math.imul(hash, 16777619);
            }
            return (hash >>> 0).toString(16).padStart(8, "0");
          };
          const fnvBytes = (value) => {
            let hash = 2166136261;
            value = value || [];
            for (let index = 0; index < value.length; index++) {
              hash ^= value[index] & 255;
              hash = Math.imul(hash, 16777619);
            }
            return (hash >>> 0).toString(16).padStart(8, "0");
          };
          const plain = (value) => {
            if (value === undefined || value === null)
              return value;
            try {
              return JSON.parse(JSON.stringify(value));
            } catch (error) {
              return String(value);
            }
          };
          const media = (query) => {
            try {
              return typeof matchMedia === "function" ? !!matchMedia(query).matches : null;
            } catch (error) {
              return null;
            }
          };
          const cssSupports = (property, value) => {
            try {
              return CSS && typeof CSS.supports === "function" ? !!CSS.supports(property, value) : null;
            } catch (error) {
              return null;
            }
          };
          const nav = navigator || {};
          const uaData = nav.userAgentData;
          let clientHintsDirect = null;
          if (uaData) {
            clientHintsDirect = {
              brands: plain(uaData.brands || []),
              mobile: "mobile" in uaData ? !!uaData.mobile : null,
              platform: String(uaData.platform || "")
            };
            if (typeof uaData.getHighEntropyValues === "function") {
              try {
                Object.assign(clientHintsDirect, plain(await uaData.getHighEntropyValues([
                  "architecture", "bitness", "model", "platformVersion",
                  "fullVersionList", "wow64", "formFactors"
                ])));
              } catch (error) {
                clientHintsDirect.error = String(error && error.message || error);
              }
            }
          }
          const screenObj = window.screen;
          const visual = window.visualViewport || {};
          const element = document.documentElement || {};
          function collectCanvas() {
            const canvas = document.createElement("canvas");
            canvas.width = 280;
            canvas.height = 80;
            const ctx = canvas.getContext("2d", {willReadFrequently: true}) || canvas.getContext("2d");
            if (!ctx)
              return {supported: false};
            ctx.textBaseline = "top";
            ctx.font = "16px Arial";
            ctx.fillStyle = "#f60";
            ctx.fillRect(0, 0, 280, 80);
            ctx.fillStyle = "#069";
            ctx.fillText("Martell fingerprint 12345", 4, 6);
            ctx.fillStyle = "rgba(102, 204, 0, 0.75)";
            ctx.font = "18px Times New Roman";
            ctx.fillText("AaBbCcXxYyZz @#$%", 8, 32);
            ctx.globalCompositeOperation = "multiply";
            ctx.fillStyle = "rgb(255,0,255)";
            ctx.beginPath();
            ctx.arc(210, 32, 24, 0, Math.PI * 2, true);
            ctx.fill();
            const dataUrl = canvas.toDataURL();
            const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const metrics = ctx.measureText("Martell fingerprint 12345");
            const textMetrics = {};
            ["width", "actualBoundingBoxLeft", "actualBoundingBoxRight", "actualBoundingBoxAscent", "actualBoundingBoxDescent", "fontBoundingBoxAscent", "fontBoundingBoxDescent"].forEach((key) => {
              if (key in metrics)
                textMetrics[key] = metrics[key];
            });
            return {
              supported: true,
              width: canvas.width,
              height: canvas.height,
              dataUrlLength: dataUrl.length,
              dataUrlHash: "fnv1a32:" + fnvString(dataUrl),
              imageDataHash: "fnv1a32:" + fnvBytes(image.data),
              textMetrics
            };
          }
          function webglParameter(gl, key) {
            try {
              return plain(gl.getParameter(key));
            } catch (error) {
              return {error: String(error && error.message || error)};
            }
          }
          function webglContext(name) {
            const canvas = document.createElement("canvas");
            canvas.width = 64;
            canvas.height = 64;
            let gl = null;
            try {
              gl = canvas.getContext(name, {
                alpha: true,
                antialias: true,
                depth: true,
                failIfMajorPerformanceCaveat: false,
                preserveDrawingBuffer: true,
                stencil: true
              });
            } catch (error) {}
            if (!gl)
              return {context: name, supported: false};
            const parameters = {};
            [
              "VERSION", "SHADING_LANGUAGE_VERSION", "VENDOR", "RENDERER",
              "ALIASED_LINE_WIDTH_RANGE", "ALIASED_POINT_SIZE_RANGE",
              "ALPHA_BITS", "BLUE_BITS", "DEPTH_BITS", "GREEN_BITS",
              "RED_BITS", "STENCIL_BITS", "MAX_COMBINED_TEXTURE_IMAGE_UNITS",
              "MAX_CUBE_MAP_TEXTURE_SIZE", "MAX_FRAGMENT_UNIFORM_VECTORS",
              "MAX_RENDERBUFFER_SIZE", "MAX_TEXTURE_IMAGE_UNITS",
              "MAX_TEXTURE_SIZE", "MAX_VARYING_VECTORS", "MAX_VERTEX_ATTRIBS",
              "MAX_VERTEX_TEXTURE_IMAGE_UNITS", "MAX_VERTEX_UNIFORM_VECTORS",
              "MAX_VIEWPORT_DIMS"
            ].forEach((key) => {
              if (key in gl)
                parameters[key] = webglParameter(gl, gl[key]);
            });
            try {
              const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
              if (debugInfo) {
                parameters.UNMASKED_VENDOR_WEBGL = webglParameter(gl, debugInfo.UNMASKED_VENDOR_WEBGL);
                parameters.UNMASKED_RENDERER_WEBGL = webglParameter(gl, debugInfo.UNMASKED_RENDERER_WEBGL);
              }
            } catch (error) {}
            let extensions = [];
            try {
              extensions = gl.getSupportedExtensions() || [];
            } catch (error) {}
            let clearPixelsHash = "";
            try {
              gl.viewport(0, 0, canvas.width, canvas.height);
              gl.clearColor(0.123, 0.456, 0.789, 1);
              gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
              const pixels = new Uint8Array(canvas.width * canvas.height * 4);
              gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
              clearPixelsHash = "fnv1a32:" + fnvBytes(pixels);
            } catch (error) {}
            return {
              context: name,
              supported: true,
              constructorName: gl.constructor && gl.constructor.name || "",
              contextAttributes: typeof gl.getContextAttributes === "function" ? plain(gl.getContextAttributes()) : null,
              parameters,
              supportedExtensions: extensions,
              supportedExtensionsHash: "fnv1a32:" + fnvString(extensions.join("|")),
              clearPixelsHash
            };
          }
          function pluginSummary() {
            const plugins = [];
            const mimeTypes = [];
            try {
              for (let index = 0; nav.plugins && index < nav.plugins.length; index++) {
                const plugin = nav.plugins[index];
                plugins.push([String(plugin.name || ""), String(plugin.description || ""), String(plugin.filename || "")]);
              }
            } catch (error) {}
            try {
              for (let index = 0; nav.mimeTypes && index < nav.mimeTypes.length; index++) {
                const mime = nav.mimeTypes[index];
                mimeTypes.push([String(mime.type || ""), String(mime.description || "")]);
              }
            } catch (error) {}
            return {plugins, mimeTypes};
          }
          async function storageAsync() {
            const result = {};
            if (nav.storage && typeof nav.storage.estimate === "function") {
              try {
                result.estimate = plain(await nav.storage.estimate());
              } catch (error) {
                result.estimateError = String(error && error.message || error);
              }
            }
            if (nav.storage && typeof nav.storage.persisted === "function") {
              try {
                result.persisted = !!(await nav.storage.persisted());
              } catch (error) {
                result.persistedError = String(error && error.message || error);
              }
            }
            if (nav.storage && typeof nav.storage.getDirectory === "function")
              result.hasStorageFoundationDirectory = true;
            return result;
          }
          async function audioProfile() {
            const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextCtor)
              return {};
            try {
              const audioContext = new AudioContextCtor();
              const result = {
                sampleRate: audioContext.sampleRate,
                baseLatency: "baseLatency" in audioContext ? audioContext.baseLatency : null,
                outputLatency: "outputLatency" in audioContext ? audioContext.outputLatency : null,
                state: String(audioContext.state || "")
              };
              if (typeof audioContext.close === "function")
                audioContext.close().catch(() => {});
              return result;
            } catch (error) {
              return {error: String(error && error.message || error)};
            }
          }
          async function mediaCapabilitiesProfile() {
            const capabilities = nav.mediaCapabilities;
            if (!capabilities || typeof capabilities.decodingInfo !== "function")
              return null;
            const queries = [
              {name: "h264_1080p", config: {type: "file", video: {contentType: 'video/mp4; codecs="avc1.42E01E"', width: 1920, height: 1080, bitrate: 5000000, framerate: 30}}},
              {name: "vp9_1080p", config: {type: "file", video: {contentType: 'video/webm; codecs="vp09.00.10.08"', width: 1920, height: 1080, bitrate: 5000000, framerate: 30}}},
              {name: "av1_1080p", config: {type: "file", video: {contentType: 'video/mp4; codecs="av01.0.05M.08"', width: 1920, height: 1080, bitrate: 5000000, framerate: 30}}},
              {name: "aac", config: {type: "file", audio: {contentType: 'audio/mp4; codecs="mp4a.40.2"', channels: 2, bitrate: 132700, samplerate: 48000}}},
              {name: "opus", config: {type: "file", audio: {contentType: 'audio/webm; codecs="opus"', channels: 2, bitrate: 128000, samplerate: 48000}}}
            ];
            const decoding = [];
            for (const query of queries) {
              try {
                decoding.push({name: query.name, result: plain(await capabilities.decodingInfo(query.config))});
              } catch (error) {
                decoding.push({name: query.name, error: String(error && error.message || error)});
              }
            }
            return {decoding, hash: "fnv1a32:" + fnvString(JSON.stringify(decoding))};
          }
          function apiSurfaceProfile() {
            return {
              runtime: {
                bigInt: typeof BigInt === "function",
                atomics: typeof Atomics === "object",
                sharedArrayBuffer: typeof SharedArrayBuffer === "function",
                crossOriginIsolated: !!crossOriginIsolated,
                webAssembly: typeof WebAssembly === "object",
                finalizationRegistry: typeof FinalizationRegistry === "function",
                weakRef: typeof WeakRef === "function",
                structuredClone: typeof structuredClone === "function"
              },
              browserGlobals: {chrome: "chrome" in window, trustedTypes: "trustedTypes" in window, scheduler: "scheduler" in window, caches: "caches" in window, cookieStore: "cookieStore" in window, launchQueue: "launchQueue" in window, navigation: "navigation" in window, portalHost: "portalHost" in window},
              crypto: {crypto: "crypto" in window, subtle: !!(crypto && crypto.subtle), randomUUID: !!(crypto && crypto.randomUUID)},
              streamsAndCodecs: {compressionStream: "CompressionStream" in window, decompressionStream: "DecompressionStream" in window, textEncoderStream: "TextEncoderStream" in window, textDecoderStream: "TextDecoderStream" in window, audioDecoder: "AudioDecoder" in window, audioEncoder: "AudioEncoder" in window, videoDecoder: "VideoDecoder" in window, videoEncoder: "VideoEncoder" in window, imageDecoder: "ImageDecoder" in window},
              graphics: {webgl: "WebGLRenderingContext" in window, webgl2: "WebGL2RenderingContext" in window, webgpu: !!nav.gpu, offscreenCanvas: "OffscreenCanvas" in window, createImageBitmap: "createImageBitmap" in window},
              devices: {mediaDevices: !!nav.mediaDevices, bluetooth: !!nav.bluetooth, usb: !!nav.usb, hid: !!nav.hid, serial: !!nav.serial, keyboard: !!nav.keyboard, virtualKeyboard: !!nav.virtualKeyboard, wakeLock: !!nav.wakeLock, locks: !!nav.locks, contacts: !!nav.contacts, credentials: !!nav.credentials, getGamepads: typeof nav.getGamepads === "function", requestMIDIAccess: typeof nav.requestMIDIAccess === "function"},
              sensors: {absoluteOrientationSensor: "AbsoluteOrientationSensor" in window, accelerometer: "Accelerometer" in window, ambientLightSensor: "AmbientLightSensor" in window, gyroscope: "Gyroscope" in window, magnetometer: "Magnetometer" in window, relativeOrientationSensor: "RelativeOrientationSensor" in window},
              paymentsAndCredentials: {paymentRequest: "PaymentRequest" in window, applePaySession: "ApplePaySession" in window, publicKeyCredential: "PublicKeyCredential" in window, identityCredential: "IdentityCredential" in window, fedCm: !!(nav.credentials && typeof nav.credentials.get === "function")}
            };
          }
          const plugins = pluginSummary();
          const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
          const profile = {
            schema: "broium.browser-profile.v1",
            collector: {
              name: "broium-profile-lite-recapture",
              version: 1,
              brand: "martell",
              collectedAt: new Date().toISOString(),
              count: 0,
              valueIndexMapVersion: "profile-lite-v1",
              payloadHash: "fnv1a32:" + fnvString(location.href)
            },
            page: {url: location.href, title: document.title, visibilityState: document.visibilityState, referrer: document.referrer},
            navigator: {
              userAgent: String(nav.userAgent || ""),
              appVersion: String(nav.appVersion || ""),
              appCodeName: String(nav.appCodeName || ""),
              product: String(nav.product || ""),
              productSub: String(nav.productSub || ""),
              vendor: String(nav.vendor || ""),
              vendorSub: String(nav.vendorSub || ""),
              platform: String(nav.platform || ""),
              hardwareConcurrency: "hardwareConcurrency" in nav ? nav.hardwareConcurrency : null,
              deviceMemory: "deviceMemory" in nav ? nav.deviceMemory : null,
              maxTouchPoints: "maxTouchPoints" in nav ? nav.maxTouchPoints : null,
              language: String(nav.language || ""),
              languages: Array.isArray(nav.languages) ? Array.from(nav.languages) : [],
              onLine: "onLine" in nav ? !!nav.onLine : null,
              doNotTrack: String(nav.doNotTrack || ""),
              msDoNotTrack: String(nav.msDoNotTrack || ""),
              cookieEnabled: "cookieEnabled" in nav ? !!nav.cookieEnabled : null,
              pdfViewerEnabled: "pdfViewerEnabled" in nav ? !!nav.pdfViewerEnabled : null,
              direct: {}
            },
            clientHints: clientHintsDirect ? Object.assign({}, clientHintsDirect, {direct: clientHintsDirect}) : {},
            screen: {
              width: screenObj ? screenObj.width : null,
              height: screenObj ? screenObj.height : null,
              availWidth: screenObj ? screenObj.availWidth : null,
              availHeight: screenObj ? screenObj.availHeight : null,
              colorDepth: screenObj ? screenObj.colorDepth : null,
              pixelDepth: screenObj ? screenObj.pixelDepth : null,
              devicePixelRatio: window.devicePixelRatio,
              orientationType: screenObj && screenObj.orientation ? screenObj.orientation.type : "",
              window: {outerWidth: window.outerWidth, outerHeight: window.outerHeight, screenX: window.screenX, screenY: window.screenY, innerWidth: window.innerWidth, innerHeight: window.innerHeight, documentClientWidth: element.clientWidth || null, documentClientHeight: element.clientHeight || null, source: "profile-lite-v1"},
              viewport: {
                screen: screenObj ? {width: screenObj.width, height: screenObj.height, availWidth: screenObj.availWidth, availHeight: screenObj.availHeight, colorDepth: screenObj.colorDepth, pixelDepth: screenObj.pixelDepth, orientation: screenObj.orientation ? {type: screenObj.orientation.type, angle: screenObj.orientation.angle} : null} : null,
                window: {innerWidth: window.innerWidth, innerHeight: window.innerHeight, outerWidth: window.outerWidth, outerHeight: window.outerHeight, screenX: window.screenX, screenY: window.screenY, pageXOffset: window.pageXOffset, pageYOffset: window.pageYOffset, devicePixelRatio: window.devicePixelRatio},
                documentElement: {clientWidth: element.clientWidth || null, clientHeight: element.clientHeight || null, scrollWidth: element.scrollWidth || null, scrollHeight: element.scrollHeight || null},
                visualViewport: "width" in visual ? {width: visual.width, height: visual.height, scale: visual.scale, offsetLeft: visual.offsetLeft, offsetTop: visual.offsetTop, pageLeft: visual.pageLeft, pageTop: visual.pageTop} : null,
                mediaQueries: {colorGamutP3: media("(color-gamut: p3)"), colorGamutRec2020: media("(color-gamut: rec2020)"), dynamicRangeHigh: media("(dynamic-range: high)"), prefersColorSchemeDark: media("(prefers-color-scheme: dark)"), prefersReducedMotion: media("(prefers-reduced-motion: reduce)"), forcedColors: media("(forced-colors: active)"), invertedColors: media("(inverted-colors: inverted)"), hover: media("(hover: hover)"), anyHover: media("(any-hover: hover)"), pointerFine: media("(pointer: fine)"), anyPointerFine: media("(any-pointer: fine)")},
                cssSupports: {webkitAppearance: cssSupports("-webkit-appearance", "none"), backdropFilter: cssSupports("backdrop-filter", "blur(1px)"), colorP3: cssSupports("color", "color(display-p3 1 0 0)"), fontVariationSettings: cssSupports("font-variation-settings", "\\"wght\\" 500"), scrollbarGutter: cssSupports("scrollbar-gutter", "stable")}
              }
            },
            locale: {
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
              locale: Intl.DateTimeFormat().resolvedOptions().locale || "",
              language: String(nav.language || ""),
              languages: Array.isArray(nav.languages) ? Array.from(nav.languages) : [],
              timezoneOffsetMinutes: new Date().getTimezoneOffset(),
              intl: {dateTimeFormat: Intl.DateTimeFormat().resolvedOptions(), numberFormat: Intl.NumberFormat().resolvedOptions(), collator: Intl.Collator().resolvedOptions()}
            },
            hardware: {cpuCores: nav.hardwareConcurrency || null, memoryGb: "deviceMemory" in nav ? nav.deviceMemory : null, platform: String(nav.platform || ""), architecture: clientHintsDirect && clientHintsDirect.architecture || "", bitness: clientHintsDirect && clientHintsDirect.bitness || ""},
            webgl: {context: "", extended: {contexts: [webglContext("webgl2"), webglContext("webgl"), webglContext("experimental-webgl")]}},
            canvas: collectCanvas(),
            audio: await audioProfile(),
            media: {mimeTypes: plugins.mimeTypes, plugins: plugins.plugins, capabilities: await mediaCapabilitiesProfile()},
            storage: {direct: {cookieEnabled: !!nav.cookieEnabled, localStorage: {available: "localStorage" in window, length: window.localStorage ? window.localStorage.length : null}, sessionStorage: {available: "sessionStorage" in window, length: window.sessionStorage ? window.sessionStorage.length : null}, indexedDB: "indexedDB" in window, caches: "caches" in window, serviceWorker: !!nav.serviceWorker, webkitRequestFileSystem: "webkitRequestFileSystem" in window, openDatabase: "openDatabase" in window}, async: await storageAsync()},
            network: {online: "onLine" in nav ? !!nav.onLine : null, connectionType: connection && String(connection.type || ""), effectiveType: connection && String(connection.effectiveType || ""), downlinkMax: connection && "downlinkMax" in connection ? connection.downlinkMax : null, downlink: connection && "downlink" in connection ? connection.downlink : null, rtt: connection && "rtt" in connection ? connection.rtt : null, saveData: connection && "saveData" in connection ? !!connection.saveData : null, webrtcCandidates: []},
            security: {isSecureContext: window.isSecureContext, automationSignal: "", permissionSurface: {permissionsApi: !!nav.permissions, queryFunction: !!(nav.permissions && typeof nav.permissions.query === "function"), statusNotQueried: true}},
            apiSurface: apiSurfaceProfile(),
            quality: {valid: true, warnings: ["profile-lite-recapture"], payloadLength: 0, asyncWarnings: []}
          };
          profile.navigator.direct = Object.assign({}, profile.navigator, {direct: undefined});
          const preferred = profile.webgl.extended.contexts.find((item) => item.supported);
          if (preferred) {
            profile.webgl.context = preferred.context;
            profile.webgl.contextConstructor = preferred.constructorName;
            profile.webgl.version = preferred.parameters.VERSION || "";
            profile.webgl.shadingLanguageVersion = preferred.parameters.SHADING_LANGUAGE_VERSION || "";
            profile.webgl.vendor = preferred.parameters.VENDOR || "";
            profile.webgl.renderer = preferred.parameters.RENDERER || "";
            profile.webgl.unmaskedRenderer = preferred.parameters.UNMASKED_RENDERER_WEBGL || "";
            profile.webgl.unmaskedVendor = preferred.parameters.UNMASKED_VENDOR_WEBGL || "";
            profile.webgl.extensionCount = preferred.supportedExtensions.length;
          }
          return JSON.stringify(profile);
        })()
    `;
}

async function collectProfileLite(client) {
    const base = await evaluateProfileLiteStage(client, "base", `
        const plain = (value) => {
          if (value === undefined || value === null)
            return value;
          try { return JSON.parse(JSON.stringify(value)); }
          catch (error) { return String(value); }
        };
        const nav = navigator || {};
        const uaData = nav.userAgentData;
        let clientHints = {};
        if (uaData) {
          clientHints = {
            brands: plain(uaData.brands || []),
            mobile: "mobile" in uaData ? !!uaData.mobile : null,
            platform: String(uaData.platform || "")
          };
          if (typeof uaData.getHighEntropyValues === "function") {
            try {
              Object.assign(clientHints, plain(await uaData.getHighEntropyValues([
                "architecture", "bitness", "model", "platformVersion",
                "fullVersionList", "wow64", "formFactors"
              ])));
            } catch (error) {
              clientHints.error = String(error && error.message || error);
            }
          }
        }
        const navigatorProfile = {
          userAgent: String(nav.userAgent || ""),
          appVersion: String(nav.appVersion || ""),
          appName: String(nav.appName || ""),
          appCodeName: String(nav.appCodeName || ""),
          product: String(nav.product || ""),
          productSub: String(nav.productSub || ""),
          vendor: String(nav.vendor || ""),
          vendorSub: String(nav.vendorSub || ""),
          platform: String(nav.platform || ""),
          hardwareConcurrency: "hardwareConcurrency" in nav ? nav.hardwareConcurrency : null,
          deviceMemory: "deviceMemory" in nav ? nav.deviceMemory : null,
          maxTouchPoints: "maxTouchPoints" in nav ? nav.maxTouchPoints : null,
          language: String(nav.language || ""),
          languages: Array.isArray(nav.languages) ? Array.from(nav.languages) : [],
          onLine: "onLine" in nav ? !!nav.onLine : null,
          doNotTrack: String(nav.doNotTrack || ""),
          msDoNotTrack: String(nav.msDoNotTrack || ""),
          webdriver: "webdriver" in nav ? !!nav.webdriver : false,
          buildID: "buildID" in nav ? String(nav.buildID || "") : "",
          oscpu: "oscpu" in nav ? String(nav.oscpu || "") : "",
          cookieEnabled: "cookieEnabled" in nav ? !!nav.cookieEnabled : null,
          pdfViewerEnabled: "pdfViewerEnabled" in nav ? !!nav.pdfViewerEnabled : null
        };
        navigatorProfile.direct = Object.assign({}, navigatorProfile);
        return {
          page: {
            url: location.href,
            title: document.title,
            visibilityState: document.visibilityState,
            referrer: document.referrer
          },
          navigator: navigatorProfile,
          clientHints: Object.assign({}, clientHints, {direct: clientHints})
        };
    `);

    const screenLocale = await evaluateProfileLiteStage(client, "screen-locale", `
        const media = (query) => {
          try { return typeof matchMedia === "function" ? !!matchMedia(query).matches : null; }
          catch (error) { return null; }
        };
        const cssSupports = (property, value) => {
          try { return CSS && typeof CSS.supports === "function" ? !!CSS.supports(property, value) : null; }
          catch (error) { return null; }
        };
        const screenObj = window.screen;
        const visual = window.visualViewport || {};
        const element = document.documentElement || {};
        return {
          screen: {
            width: screenObj ? screenObj.width : null,
            height: screenObj ? screenObj.height : null,
            availWidth: screenObj ? screenObj.availWidth : null,
            availHeight: screenObj ? screenObj.availHeight : null,
            colorDepth: screenObj ? screenObj.colorDepth : null,
            pixelDepth: screenObj ? screenObj.pixelDepth : null,
            devicePixelRatio: window.devicePixelRatio,
            orientationType: screenObj && screenObj.orientation ? screenObj.orientation.type : "",
            window: {
              outerWidth: window.outerWidth,
              outerHeight: window.outerHeight,
              screenX: window.screenX,
              screenY: window.screenY,
              innerWidth: window.innerWidth,
              innerHeight: window.innerHeight,
              documentClientWidth: element.clientWidth || null,
              documentClientHeight: element.clientHeight || null,
              source: "profile-lite-v1"
            },
            viewport: {
              screen: screenObj ? {
                width: screenObj.width,
                height: screenObj.height,
                availWidth: screenObj.availWidth,
                availHeight: screenObj.availHeight,
                colorDepth: screenObj.colorDepth,
                pixelDepth: screenObj.pixelDepth,
                orientation: screenObj.orientation ? {
                  type: screenObj.orientation.type,
                  angle: screenObj.orientation.angle
                } : null
              } : null,
              window: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                outerWidth: window.outerWidth,
                outerHeight: window.outerHeight,
                screenX: window.screenX,
                screenY: window.screenY,
                pageXOffset: window.pageXOffset,
                pageYOffset: window.pageYOffset,
                devicePixelRatio: window.devicePixelRatio
              },
              documentElement: {
                clientWidth: element.clientWidth || null,
                clientHeight: element.clientHeight || null,
                scrollWidth: element.scrollWidth || null,
                scrollHeight: element.scrollHeight || null
              },
              visualViewport: "width" in visual ? {
                width: visual.width,
                height: visual.height,
                scale: visual.scale,
                offsetLeft: visual.offsetLeft,
                offsetTop: visual.offsetTop,
                pageLeft: visual.pageLeft,
                pageTop: visual.pageTop
              } : null,
              mediaQueries: {
                colorGamutP3: media("(color-gamut: p3)"),
                colorGamutRec2020: media("(color-gamut: rec2020)"),
                dynamicRangeHigh: media("(dynamic-range: high)"),
                prefersColorSchemeDark: media("(prefers-color-scheme: dark)"),
                prefersReducedMotion: media("(prefers-reduced-motion: reduce)"),
                forcedColors: media("(forced-colors: active)"),
                invertedColors: media("(inverted-colors: inverted)"),
                hover: media("(hover: hover)"),
                anyHover: media("(any-hover: hover)"),
                pointerFine: media("(pointer: fine)"),
                anyPointerFine: media("(any-pointer: fine)")
              },
              cssSupports: {
                webkitAppearance: cssSupports("-webkit-appearance", "none"),
                backdropFilter: cssSupports("backdrop-filter", "blur(1px)"),
                colorP3: cssSupports("color", "color(display-p3 1 0 0)"),
                fontVariationSettings: cssSupports("font-variation-settings", "\\"wght\\" 500"),
                scrollbarGutter: cssSupports("scrollbar-gutter", "stable")
              }
            }
          },
          locale: {
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
            locale: Intl.DateTimeFormat().resolvedOptions().locale || "",
            language: String(navigator.language || ""),
            languages: Array.isArray(navigator.languages) ? Array.from(navigator.languages) : [],
            timezoneOffsetMinutes: new Date().getTimezoneOffset(),
            intl: {
              dateTimeFormat: Intl.DateTimeFormat().resolvedOptions(),
              numberFormat: Intl.NumberFormat().resolvedOptions(),
              collator: Intl.Collator().resolvedOptions()
            }
          }
        };
    `);

    const storage = await evaluateProfileLiteStage(client, "storage", `
        const plain = (value) => {
          if (value === undefined || value === null)
            return value;
          try { return JSON.parse(JSON.stringify(value)); }
          catch (error) { return String(value); }
        };
        const nav = navigator || {};
        const asyncInfo = {};
        if (nav.storage && typeof nav.storage.estimate === "function") {
          try { asyncInfo.estimate = plain(await nav.storage.estimate()); }
          catch (error) { asyncInfo.estimateError = String(error && error.message || error); }
        }
        if (nav.storage && typeof nav.storage.persisted === "function") {
          try { asyncInfo.persisted = !!(await nav.storage.persisted()); }
          catch (error) { asyncInfo.persistedError = String(error && error.message || error); }
        }
        if (nav.storage && typeof nav.storage.getDirectory === "function")
          asyncInfo.hasStorageFoundationDirectory = true;
        return {
          direct: {
            cookieEnabled: !!nav.cookieEnabled,
            localStorage: {
              available: "localStorage" in window,
              length: window.localStorage ? window.localStorage.length : null
            },
            sessionStorage: {
              available: "sessionStorage" in window,
              length: window.sessionStorage ? window.sessionStorage.length : null
            },
            indexedDB: "indexedDB" in window,
            caches: "caches" in window,
            serviceWorker: !!nav.serviceWorker,
            webkitRequestFileSystem: "webkitRequestFileSystem" in window,
            openDatabase: "openDatabase" in window
          },
          async: asyncInfo
        };
    `);

    const canvas = await evaluateProfileLiteStage(client, "canvas", `
        const fnvString = (value) => {
          value = String(value || "");
          let hash = 2166136261;
          for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
          }
          return (hash >>> 0).toString(16).padStart(8, "0");
        };
        const fnvBytes = (value) => {
          let hash = 2166136261;
          value = value || [];
          for (let index = 0; index < value.length; index++) {
            hash ^= value[index] & 255;
            hash = Math.imul(hash, 16777619);
          }
          return (hash >>> 0).toString(16).padStart(8, "0");
        };
        const canvas = document.createElement("canvas");
        canvas.width = 280;
        canvas.height = 80;
        const ctx = canvas.getContext("2d", {willReadFrequently: true}) || canvas.getContext("2d");
        if (!ctx)
          return {supported: false};
        ctx.textBaseline = "top";
        ctx.font = "16px Arial";
        ctx.fillStyle = "#f60";
        ctx.fillRect(0, 0, 280, 80);
        ctx.fillStyle = "#069";
        ctx.fillText("Martell fingerprint 12345", 4, 6);
        ctx.fillStyle = "rgba(102, 204, 0, 0.75)";
        ctx.font = "18px Times New Roman";
        ctx.fillText("AaBbCcXxYyZz @#$%", 8, 32);
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "rgb(255,0,255)";
        ctx.beginPath();
        ctx.arc(210, 32, 24, 0, Math.PI * 2, true);
        ctx.fill();
        const dataUrl = canvas.toDataURL();
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const metrics = ctx.measureText("Martell fingerprint 12345");
        const textMetrics = {};
        ["width", "actualBoundingBoxLeft", "actualBoundingBoxRight", "actualBoundingBoxAscent", "actualBoundingBoxDescent", "fontBoundingBoxAscent", "fontBoundingBoxDescent"].forEach((key) => {
          if (key in metrics)
            textMetrics[key] = metrics[key];
        });
        return {
          supported: true,
          width: canvas.width,
          height: canvas.height,
          dataUrlLength: dataUrl.length,
          dataUrlHash: "fnv1a32:" + fnvString(dataUrl),
          imageDataHash: "fnv1a32:" + fnvBytes(image.data),
          textMetrics
        };
    `);

    const audio = await evaluateProfileLiteStage(client, "audio", `
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor)
          return {};
        try {
          const audioContext = new AudioContextCtor();
          const result = {
            sampleRate: audioContext.sampleRate,
            baseLatency: "baseLatency" in audioContext ? audioContext.baseLatency : null,
            outputLatency: "outputLatency" in audioContext ? audioContext.outputLatency : null,
            state: String(audioContext.state || "")
          };
          if (typeof audioContext.close === "function")
            audioContext.close().catch(() => {});
          return result;
        } catch (error) {
          return {error: String(error && error.message || error)};
        }
    `);

    const media = await evaluateProfileLiteStage(client, "media", `
        const plain = (value) => {
          if (value === undefined || value === null)
            return value;
          try { return JSON.parse(JSON.stringify(value)); }
          catch (error) { return String(value); }
        };
        const fnvString = (value) => {
          value = String(value || "");
          let hash = 2166136261;
          for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
          }
          return (hash >>> 0).toString(16).padStart(8, "0");
        };
        const nav = navigator || {};
        const plugins = [];
        const mimeTypes = [];
        try {
          for (let index = 0; nav.plugins && index < nav.plugins.length; index++) {
            const plugin = nav.plugins[index];
            plugins.push([String(plugin.name || ""), String(plugin.description || ""), String(plugin.filename || "")]);
          }
        } catch (error) {}
        try {
          for (let index = 0; nav.mimeTypes && index < nav.mimeTypes.length; index++) {
            const mime = nav.mimeTypes[index];
            mimeTypes.push([String(mime.type || ""), String(mime.description || "")]);
          }
        } catch (error) {}
        let speechVoices = null;
        if (window.speechSynthesis && typeof speechSynthesis.getVoices === "function") {
          const readVoices = () => speechSynthesis.getVoices().map((voice) => ({
            default: !!voice.default,
            lang: String(voice.lang || ""),
            localService: !!voice.localService,
            name: String(voice.name || ""),
            voiceURI: String(voice.voiceURI || "")
          }));
          let voices = readVoices();
          if (!voices.length) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            voices = readVoices();
          }
          speechVoices = {
            voices,
            count: voices.length,
            hash: "fnv1a32:" + fnvString(JSON.stringify(voices))
          };
        }
        let capabilities = null;
        if (nav.mediaCapabilities && typeof nav.mediaCapabilities.decodingInfo === "function") {
          const queries = [
            {name: "h264_1080p", config: {type: "file", video: {contentType: 'video/mp4; codecs="avc1.42E01E"', width: 1920, height: 1080, bitrate: 5000000, framerate: 30}}},
            {name: "vp9_1080p", config: {type: "file", video: {contentType: 'video/webm; codecs="vp09.00.10.08"', width: 1920, height: 1080, bitrate: 5000000, framerate: 30}}},
            {name: "av1_1080p", config: {type: "file", video: {contentType: 'video/mp4; codecs="av01.0.05M.08"', width: 1920, height: 1080, bitrate: 5000000, framerate: 30}}},
            {name: "aac", config: {type: "file", audio: {contentType: 'audio/mp4; codecs="mp4a.40.2"', channels: 2, bitrate: 132700, samplerate: 48000}}},
            {name: "opus", config: {type: "file", audio: {contentType: 'audio/webm; codecs="opus"', channels: 2, bitrate: 128000, samplerate: 48000}}}
          ];
          const decoding = [];
          for (const query of queries) {
            try { decoding.push({name: query.name, result: plain(await nav.mediaCapabilities.decodingInfo(query.config))}); }
            catch (error) { decoding.push({name: query.name, error: String(error && error.message || error)}); }
          }
          capabilities = {
            decoding,
            hash: "fnv1a32:" + fnvString(JSON.stringify(decoding))
          };
        }
        return {plugins, mimeTypes, speechVoices, capabilities};
    `, 15000);

    const fonts = await evaluateProfileLiteStage(client, "fonts", `
        const fnvString = (value) => {
          value = String(value || "");
          let hash = 2166136261;
          for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
          }
          return (hash >>> 0).toString(16).padStart(8, "0");
        };
        const candidates = [
          "Arial", "Arial Black", "Calibri", "Cambria", "Candara", "Comic Sans MS", "Consolas", "Constantia", "Courier New", "Georgia", "Impact", "Lucida Console", "Lucida Sans Unicode", "Microsoft Sans Serif", "Segoe UI", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana",
          "Microsoft YaHei", "Microsoft JhengHei", "SimSun", "NSimSun", "SimHei", "KaiTi", "FangSong", "DengXian", "Meiryo", "Yu Gothic", "Malgun Gothic",
          "Helvetica", "Helvetica Neue", "Avenir", "Avenir Next", "Menlo", "Monaco", "PingFang SC", "PingFang TC", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Songti SC", "STHeiti", "STKaiti", "Geeza Pro",
          "Noto Sans", "Noto Sans CJK SC", "Noto Sans CJK TC", "Noto Serif", "Roboto", "Ubuntu", "Cantarell", "DejaVu Sans", "DejaVu Serif", "Liberation Sans", "Liberation Serif"
        ];
        const text = "mmmmmmmmmmlliWW@@@12345";
        const canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 40;
        const ctx = canvas.getContext && canvas.getContext("2d");
        if (!ctx)
          return null;
        const generics = ["monospace", "sans-serif", "serif"];
        const base = {};
        generics.forEach((generic) => {
          ctx.font = "72px " + generic;
          base[generic] = ctx.measureText(text).width;
        });
        const detected = [];
        const checked = [];
        candidates.forEach((font) => {
          const widths = {};
          let available = false;
          generics.forEach((generic) => {
            ctx.font = "72px \\"" + font + "\\"," + generic;
            widths[generic] = ctx.measureText(text).width;
            if (Math.abs(widths[generic] - base[generic]) > 0.01)
              available = true;
          });
          let cssCheck = null;
          try {
            cssCheck = document.fonts && typeof document.fonts.check === "function" ? document.fonts.check("12px \\"" + font + "\\"") : null;
          } catch (error) {}
          if (available)
            detected.push(font);
          checked.push({
            name: font,
            availableByCanvas: available,
            cssCheck,
            widths
          });
        });
        return {
          method: "canvas-width-diff",
          candidates,
          detected,
          detectedHash: "fnv1a32:" + fnvString(detected.join("|")),
          checked
        };
    `, 15000);

    const webgl = await evaluateProfileLiteStage(client, "webgl", `
        const plain = (value) => {
          if (value === undefined || value === null)
            return value;
          try { return JSON.parse(JSON.stringify(value)); }
          catch (error) { return String(value); }
        };
        const fnvString = (value) => {
          value = String(value || "");
          let hash = 2166136261;
          for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
          }
          return (hash >>> 0).toString(16).padStart(8, "0");
        };
        function webglParameter(gl, key) {
          try { return plain(gl.getParameter(key)); }
          catch (error) { return {error: String(error && error.message || error)}; }
        }
        function webglContext(name) {
          const canvas = document.createElement("canvas");
          canvas.width = 64;
          canvas.height = 64;
          let gl = null;
          try {
            gl = canvas.getContext(name, {
              alpha: true,
              antialias: true,
              depth: true,
              failIfMajorPerformanceCaveat: false,
              preserveDrawingBuffer: true,
              stencil: true
            });
          } catch (error) {}
          if (!gl)
            return {context: name, supported: false};
          const parameters = {};
          [
            "VERSION", "SHADING_LANGUAGE_VERSION", "VENDOR", "RENDERER",
            "ALIASED_LINE_WIDTH_RANGE", "ALIASED_POINT_SIZE_RANGE",
            "ALPHA_BITS", "BLUE_BITS", "DEPTH_BITS", "GREEN_BITS",
            "RED_BITS", "STENCIL_BITS", "MAX_COMBINED_TEXTURE_IMAGE_UNITS",
            "MAX_CUBE_MAP_TEXTURE_SIZE", "MAX_FRAGMENT_UNIFORM_VECTORS",
            "MAX_RENDERBUFFER_SIZE", "MAX_TEXTURE_IMAGE_UNITS",
            "MAX_TEXTURE_SIZE", "MAX_VARYING_VECTORS", "MAX_VERTEX_ATTRIBS",
            "MAX_VERTEX_TEXTURE_IMAGE_UNITS", "MAX_VERTEX_UNIFORM_VECTORS",
            "MAX_VIEWPORT_DIMS"
          ].forEach((key) => {
            if (key in gl)
              parameters[key] = webglParameter(gl, gl[key]);
          });
          try {
            const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
            if (debugInfo) {
              parameters.UNMASKED_VENDOR_WEBGL = webglParameter(gl, debugInfo.UNMASKED_VENDOR_WEBGL);
              parameters.UNMASKED_RENDERER_WEBGL = webglParameter(gl, debugInfo.UNMASKED_RENDERER_WEBGL);
            }
          } catch (error) {}
          let extensions = [];
          try { extensions = gl.getSupportedExtensions() || []; }
          catch (error) {}
          return {
            context: name,
            supported: true,
            constructorName: gl.constructor && gl.constructor.name || "",
            contextAttributes: typeof gl.getContextAttributes === "function" ? plain(gl.getContextAttributes()) : null,
            parameters,
            supportedExtensions: extensions,
            supportedExtensionsHash: "fnv1a32:" + fnvString(extensions.join("|"))
          };
        }
        function detectWebglProfile(webgl) {
          const renderer = webgl && webgl.unmaskedRenderer || "";
          if (/UHD Graphics 770/i.test(renderer) && /Direct3D11/i.test(renderer))
            return "windows_intel_uhd_770_d3d11";
          if (/Intel/i.test(renderer) && /Direct3D11/i.test(renderer))
            return "windows_intel_d3d11";
          if (/SwiftShader/i.test(renderer))
            return "swiftshader";
          return "";
        }
        const contexts = [webglContext("webgl2"), webglContext("webgl"), webglContext("experimental-webgl")];
        const preferred = contexts.find((item) => item.supported);
        const result = {context: "", extended: {contexts}};
        if (preferred) {
          result.context = preferred.context;
          result.contextConstructor = preferred.constructorName;
          result.version = preferred.parameters.VERSION || "";
          result.shadingLanguageVersion = preferred.parameters.SHADING_LANGUAGE_VERSION || "";
          result.vendor = preferred.parameters.VENDOR || "";
          result.renderer = preferred.parameters.RENDERER || "";
          result.unmaskedRenderer = preferred.parameters.UNMASKED_RENDERER_WEBGL || "";
          result.unmaskedVendor = preferred.parameters.UNMASKED_VENDOR_WEBGL || "";
          result.extensionCount = preferred.supportedExtensions.length;
          result.suggestedProfile = detectWebglProfile(result);
        }
        return result;
    `, 15000);

    const apiSecurity = await evaluateProfileLiteStage(client, "api-security", `
        const nav = navigator || {};
        return {
          security: {
            isSecureContext: window.isSecureContext,
            automationSignal: "",
            permissionSurface: {
              permissionsApi: !!nav.permissions,
              queryFunction: !!(nav.permissions && typeof nav.permissions.query === "function"),
              statusNotQueried: true
            }
          },
          apiSurface: {
            runtime: {bigInt: typeof BigInt === "function", atomics: typeof Atomics === "object", sharedArrayBuffer: typeof SharedArrayBuffer === "function", crossOriginIsolated: !!crossOriginIsolated, webAssembly: typeof WebAssembly === "object", finalizationRegistry: typeof FinalizationRegistry === "function", weakRef: typeof WeakRef === "function", structuredClone: typeof structuredClone === "function"},
            browserGlobals: {chrome: "chrome" in window, trustedTypes: "trustedTypes" in window, scheduler: "scheduler" in window, caches: "caches" in window, cookieStore: "cookieStore" in window, launchQueue: "launchQueue" in window, navigation: "navigation" in window, portalHost: "portalHost" in window},
            crypto: {crypto: "crypto" in window, subtle: !!(window.crypto && crypto.subtle), randomUUID: !!(window.crypto && crypto.randomUUID)},
            streamsAndCodecs: {compressionStream: "CompressionStream" in window, decompressionStream: "DecompressionStream" in window, textEncoderStream: "TextEncoderStream" in window, textDecoderStream: "TextDecoderStream" in window, audioDecoder: "AudioDecoder" in window, audioEncoder: "AudioEncoder" in window, videoDecoder: "VideoDecoder" in window, videoEncoder: "VideoEncoder" in window, imageDecoder: "ImageDecoder" in window},
            graphics: {webgl: "WebGLRenderingContext" in window, webgl2: "WebGL2RenderingContext" in window, webgpu: !!nav.gpu, offscreenCanvas: "OffscreenCanvas" in window, createImageBitmap: "createImageBitmap" in window},
            devices: {mediaDevices: !!nav.mediaDevices, bluetooth: !!nav.bluetooth, usb: !!nav.usb, hid: !!nav.hid, serial: !!nav.serial, keyboard: !!nav.keyboard, virtualKeyboard: !!nav.virtualKeyboard, wakeLock: !!nav.wakeLock, locks: !!nav.locks, contacts: !!nav.contacts, credentials: !!nav.credentials, getGamepads: typeof nav.getGamepads === "function", requestMIDIAccess: typeof nav.requestMIDIAccess === "function"},
            sensors: {absoluteOrientationSensor: "AbsoluteOrientationSensor" in window, accelerometer: "Accelerometer" in window, ambientLightSensor: "AmbientLightSensor" in window, gyroscope: "Gyroscope" in window, magnetometer: "Magnetometer" in window, relativeOrientationSensor: "RelativeOrientationSensor" in window},
            paymentsAndCredentials: {paymentRequest: "PaymentRequest" in window, applePaySession: "ApplePaySession" in window, publicKeyCredential: "PublicKeyCredential" in window, identityCredential: "IdentityCredential" in window, fedCm: !!(nav.credentials && typeof nav.credentials.get === "function")}
          }
        };
    `);

    const connection = await evaluateProfileLiteStage(client, "network", `
        const nav = navigator || {};
        const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
        return {
          online: "onLine" in nav ? !!nav.onLine : null,
          connection: {
            type: connection && String(connection.type || ""),
            effectiveType: connection && String(connection.effectiveType || ""),
            downlinkMax: connection && "downlinkMax" in connection ? connection.downlinkMax : null,
            downlink: connection && "downlink" in connection ? connection.downlink : null,
            rtt: connection && "rtt" in connection ? connection.rtt : null,
            saveData: connection && "saveData" in connection ? !!connection.saveData : null
          },
          connectionType: connection && String(connection.type || ""),
          effectiveType: connection && String(connection.effectiveType || ""),
          downlinkMax: connection && "downlinkMax" in connection ? connection.downlinkMax : null,
          downlink: connection && "downlink" in connection ? connection.downlink : null,
          rtt: connection && "rtt" in connection ? connection.rtt : null,
          saveData: connection && "saveData" in connection ? !!connection.saveData : null,
          webrtcCandidates: []
        };
    `);

    return {
        schema: "broium.browser-profile.v1",
        collector: {
            name: "broium-profile-lite-recapture",
            version: 1,
            brand: "martell",
            collectedAt: new Date().toISOString(),
            count: 0,
            valueIndexMapVersion: "profile-lite-v1",
            payloadHash: "fnv1a32:profile-lite"
        },
        page: base.page,
        navigator: base.navigator,
        clientHints: base.clientHints,
        screen: screenLocale.screen,
        locale: screenLocale.locale,
        hardware: {
            cpuCores: base.navigator.hardwareConcurrency,
            memoryGb: base.navigator.deviceMemory,
            platform: base.navigator.platform,
            architecture: base.clientHints.architecture || "",
            bitness: base.clientHints.bitness || ""
        },
        webgl,
        fonts,
        canvas,
        audio,
        media: {
            mimeTypes: media.mimeTypes,
            plugins: media.plugins,
            speechVoicesDetailed: media.speechVoices,
            capabilities: media.capabilities
        },
        storage,
        network: connection,
        security: apiSecurity.security,
        apiSurface: apiSecurity.apiSurface,
        quality: {
            valid: true,
            warnings: ["profile-lite-recapture"],
            payloadLength: 0,
            asyncWarnings: []
        }
    };
}

async function main() {
    const repoRoot = path.resolve(__dirname, "..", "..");
    const referencePath = process.argv[2];
    const outputDirArg = process.argv[3];
    const extraArgs = process.argv.slice(4);
    const fullMartell = extraArgs.includes("--full-martell");
    const chromeArg = extraArgs.find((arg) => arg !== "--full-martell");
    if (!referencePath || !outputDirArg) {
        usage();
        process.exit(2);
    }

    const referenceAbs = path.resolve(repoRoot, referencePath);
    if (!fs.existsSync(referenceAbs))
        throw new Error("Reference file not found: " + referenceAbs);

    const outputDir = path.resolve(repoRoot, outputDirArg);
    fs.mkdirSync(outputDir, {
        recursive: true
    });
    const cfgPath = path.join(outputDir, "broium-cfg.json");
    const userDataDir = path.join(outputDir, "profile");
    const tempDir = path.join(outputDir, "chrome-temp");
    const profileLitePath = path.join(outputDir, "broium-profile-lite.json");
    const recapturePath = path.join(outputDir, "broium-recapture.json");
    const reportPath = path.join(outputDir, "broium-diff.json");
    const errorPath = path.join(outputDir, "recapture-error.json");
    removePath(userDataDir);
    removePath(tempDir);
    removePath(profileLitePath);
    removePath(recapturePath);
    removePath(reportPath);
    removePath(errorPath);
    fs.mkdirSync(tempDir, {
        recursive: true
    });

    runNode(repoRoot, [
        path.join("sync", "docs", "build-broium-cfg.js"),
        path.relative(repoRoot, referenceAbs),
        path.relative(repoRoot, cfgPath)
    ], {
        printStdout: true
    });

    const broiumLaunchConfig = readJson(cfgPath);
    const compiledArgs = Array.isArray(broiumLaunchConfig.cfg && broiumLaunchConfig.cfg.args)
        ? broiumLaunchConfig.cfg.args
        : [];
    const chromeExe = findChromeExe(repoRoot, chromeArg && path.resolve(repoRoot, chromeArg));
    const capture = await startCaptureServer();
    const fixedArgs = [
        `--brofp-cfg=${cfgPath}`,
        `--user-data-dir=${userDataDir}`,
        "--remote-debugging-port=0",
        "--no-sandbox",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking"
    ];
    const args = mergeSwitchArgs(compiledArgs, fixedArgs);
    args.push(capture.url);
    console.log("launch " + quoteArg(chromeExe));
    const chrome = spawn(chromeExe, args, {
        cwd: path.dirname(chromeExe),
        env: Object.assign({}, process.env, {
            TEMP: tempDir,
            TMP: tempDir
        }),
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
    });
    let stderr = "";
    let chromeExit = null;
    chrome.on("exit", (code, signal) => {
        chromeExit = {
            code,
            signal
        };
    });
    chrome.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
    });

    let client = null;
    try {
        const endpoint = await waitForDevToolsEndpoint(userDataDir, 30000, () => chromeExit);
        client = await createPage(endpoint.port);
        await waitForLoad(client, capture.url, 15000);
        let recapture;
        if (fullMartell) {
            const source = fs.readFileSync(path.join(repoRoot, "sync", "docs", "martell-cdp-fingerprint.js"), "utf8");
            recapture = await collectMartell(client, source, {
                timeout: 7000,
                settleGraceMs: 350,
                enableAsyncProfile: true,
                profileExtraTimeout: 3500,
                hardTimeoutMs: 20000,
                endpoints: {
                    publicOrigin: capture.url,
                    centralOrigin: capture.url
                },
                quiet: true
            });
        } else {
            const profile = await collectProfileLite(client);
            writeJson(profileLitePath, profile);
            console.log("wrote " + path.relative(repoRoot, profileLitePath));
            recapture = await compileProfileWithMartell(repoRoot, profile);
        }
        writeJson(recapturePath, recapture);
        console.log("wrote " + path.relative(repoRoot, recapturePath));
        runNode(repoRoot, [
            path.join("sync", "docs", "verify-broium-cfg-fingerprint.js"),
            path.relative(repoRoot, referenceAbs),
            path.relative(repoRoot, recapturePath),
            path.relative(repoRoot, reportPath)
        ], {
            printStdout: true
        });
    } catch (error) {
        writeJson(errorPath, {
            message: error && error.message || String(error),
            stack: error && error.stack || "",
            chromeExit,
            stderrTail: stderr.slice(-4000)
        });
        throw error;
    } finally {
        if (client)
            client.close();
        if (!chrome.killed)
            chrome.kill();
        await sleep(500);
        if (chrome.exitCode === null && !chrome.killed)
            chrome.kill("SIGKILL");
        await closeServer(capture.server);
    }

    if (stderr.trim()) {
        fs.writeFileSync(path.join(outputDir, "chrome-stderr.log"), stderr);
    }
}

main().catch((error) => {
    console.error(error && error.stack || error);
    process.exit(1);
});
