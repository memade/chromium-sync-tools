(function(global) {
    "use strict";

    const MARTELL_FINGERPRINT_ENDPOINTS = Object.freeze({
        brand: "martell",
        owner: Object.freeze({
            githubUsername: "memade",
            githubUrl: "https://github.com/memade"
        }),
        networkMode: "off",
        protocols: Object.freeze({
            http: "http://",
            https: "https://"
        }),
        hosts: Object.freeze({
            primary: Object.freeze([""]),
            ipv6: Object.freeze([""])
        }),
        publicOrigin: "about:blank",
        centralOrigin: "about:blank",
        centralHostPattern: /^$/,
        beacons: Object.freeze({
            debug: "",
            error: ""
        }),
        probes: Object.freeze({
            ipv4Primary: "",
            ipv4Alt: "",
            ipv6Primary: "",
            ipv6Alt: "",
            dynamicBase: ""
        }),
        stunUrls: Object.freeze([]),
        chromePdfViewerProbe: ""
    });

    const MARTELL_FINGERPRINT_DEFAULTS = Object.freeze({
        timeout: 10000,
        settleGraceMs: 750,
        lite: false,
        ipv6Priority: false,
        networkMode: "off",
        quiet: true,
        enableDrmProbe: false,
        enableChromePdfProbe: false,
        enableIsolatedFrameProbe: false,
        enableConsoleProbe: false,
        enableWorkerScheduler: false,
        enableEvalProbe: false,
        enableAsyncProfile: true,
        profileExtraTimeout: 3500,
        enableFontProfile: true,
        enableOfflineAudioProfile: true,
        enableWebglProfile: true,
        enablePermissionStatusProfile: false
    });

    function martellArrayOption(value, fallback) {
        return Object.freeze((Array.isArray(value) ? value : fallback).slice());
    }

    function martellNormalizeEndpoints(options) {
        options = options && typeof options === "object" ? options : {};
        var hosts = options.hosts && typeof options.hosts === "object" ? options.hosts : {};
        var probes = options.probeEndpoints && typeof options.probeEndpoints === "object" ? options.probeEndpoints : {};
        var beacons = options.beacons && typeof options.beacons === "object" ? options.beacons : {};
        return Object.freeze({
            brand: MARTELL_FINGERPRINT_ENDPOINTS.brand,
            owner: MARTELL_FINGERPRINT_ENDPOINTS.owner,
            networkMode: options.networkMode === "local" ? "local" : "off",
            protocols: MARTELL_FINGERPRINT_ENDPOINTS.protocols,
            hosts: Object.freeze({
                primary: martellArrayOption(hosts.primary, MARTELL_FINGERPRINT_ENDPOINTS.hosts.primary),
                ipv6: martellArrayOption(hosts.ipv6, MARTELL_FINGERPRINT_ENDPOINTS.hosts.ipv6)
            }),
            publicOrigin: typeof options.publicOrigin === "string" ? options.publicOrigin : MARTELL_FINGERPRINT_ENDPOINTS.publicOrigin,
            centralOrigin: typeof options.centralOrigin === "string" ? options.centralOrigin : MARTELL_FINGERPRINT_ENDPOINTS.centralOrigin,
            centralHostPattern: options.centralHostPattern instanceof RegExp ? options.centralHostPattern : MARTELL_FINGERPRINT_ENDPOINTS.centralHostPattern,
            beacons: Object.freeze({
                debug: typeof beacons.debug === "string" ? beacons.debug : MARTELL_FINGERPRINT_ENDPOINTS.beacons.debug,
                error: typeof beacons.error === "string" ? beacons.error : MARTELL_FINGERPRINT_ENDPOINTS.beacons.error
            }),
            probes: Object.freeze({
                ipv4Primary: typeof probes.ipv4Primary === "string" ? probes.ipv4Primary : MARTELL_FINGERPRINT_ENDPOINTS.probes.ipv4Primary,
                ipv4Alt: typeof probes.ipv4Alt === "string" ? probes.ipv4Alt : MARTELL_FINGERPRINT_ENDPOINTS.probes.ipv4Alt,
                ipv6Primary: typeof probes.ipv6Primary === "string" ? probes.ipv6Primary : MARTELL_FINGERPRINT_ENDPOINTS.probes.ipv6Primary,
                ipv6Alt: typeof probes.ipv6Alt === "string" ? probes.ipv6Alt : MARTELL_FINGERPRINT_ENDPOINTS.probes.ipv6Alt,
                dynamicBase: typeof probes.dynamicBase === "string" ? probes.dynamicBase : MARTELL_FINGERPRINT_ENDPOINTS.probes.dynamicBase
            }),
            stunUrls: martellArrayOption(options.stunUrls, MARTELL_FINGERPRINT_ENDPOINTS.stunUrls),
            chromePdfViewerProbe: typeof options.chromePdfViewerProbe === "string" ? options.chromePdfViewerProbe : MARTELL_FINGERPRINT_ENDPOINTS.chromePdfViewerProbe
        });
    }

    function martellNormalizeOptions(options) {
        options = options && typeof options === "object" ? options : {};
        var endpoints = martellNormalizeEndpoints(options);
        return {
            timeout: Number.isFinite(+options.timeout) ? +options.timeout : MARTELL_FINGERPRINT_DEFAULTS.timeout,
            settleGraceMs: Number.isFinite(+options.settleGraceMs) ? +options.settleGraceMs : MARTELL_FINGERPRINT_DEFAULTS.settleGraceMs,
            lite: !!options.lite,
            ipv6Priority: !!options.ipv6Priority,
            networkMode: endpoints.networkMode,
            quiet: "quiet" in options ? !!options.quiet : MARTELL_FINGERPRINT_DEFAULTS.quiet,
            enableDrmProbe: !!options.enableDrmProbe,
            enableChromePdfProbe: !!options.enableChromePdfProbe,
            enableIsolatedFrameProbe: !!options.enableIsolatedFrameProbe,
            enableConsoleProbe: !!options.enableConsoleProbe,
            enableWorkerScheduler: !!options.enableWorkerScheduler,
            enableEvalProbe: !!options.enableEvalProbe,
            enableAsyncProfile: "enableAsyncProfile" in options ? !!options.enableAsyncProfile : MARTELL_FINGERPRINT_DEFAULTS.enableAsyncProfile,
            profileExtraTimeout: Number.isFinite(+options.profileExtraTimeout) ? Math.max(0, +options.profileExtraTimeout) : MARTELL_FINGERPRINT_DEFAULTS.profileExtraTimeout,
            enableFontProfile: "enableFontProfile" in options ? !!options.enableFontProfile : MARTELL_FINGERPRINT_DEFAULTS.enableFontProfile,
            enableOfflineAudioProfile: "enableOfflineAudioProfile" in options ? !!options.enableOfflineAudioProfile : MARTELL_FINGERPRINT_DEFAULTS.enableOfflineAudioProfile,
            enableWebglProfile: "enableWebglProfile" in options ? !!options.enableWebglProfile : MARTELL_FINGERPRINT_DEFAULTS.enableWebglProfile,
            enablePermissionStatusProfile: "enablePermissionStatusProfile" in options ? !!options.enablePermissionStatusProfile : MARTELL_FINGERPRINT_DEFAULTS.enablePermissionStatusProfile,
            endpoints: endpoints
        };
    }

    function martellProfileValue(values, index, fallback) {
        return Array.isArray(values) && index < values.length && "undefined" !== typeof values[index] ? values[index] : fallback;
    }

    function martellNumber(value, fallback) {
        var number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function martellInteger(value, fallback) {
        var number = martellNumber(value, fallback);
        return Number.isFinite(number) ? Math.round(number) : fallback;
    }

    function martellString(value) {
        return "undefined" === typeof value || null === value ? "" : String(value);
    }

    function martellBooleanString(value) {
        if (true === value || "1" === value || 1 === value || "true" === value)
            return true;
        if (false === value || "0" === value || 0 === value || "false" === value)
            return false;
        return null;
    }

    function martellSplitList(value) {
        value = martellString(value);
        return value ? value.split(",").map(function(item) {
            return item.trim();
        }).filter(Boolean) : [];
    }

    function martellHashString(value) {
        value = martellString(value);
        var hash = 2166136261;
        for (var index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).padStart(8, "0");
    }

    function martellFindBrand(brands, preferred) {
        if (!Array.isArray(brands))
            return null;
        for (var index = 0; index < brands.length; index++) {
            var item = brands[index];
            if (!Array.isArray(item) || item.length < 2)
                continue;
            var brand = martellString(item[0]);
            if (!brand || /not\)?a.?brand/i.test(brand))
                continue;
            if (preferred && brand !== preferred)
                continue;
            return {
                brand: brand,
                version: martellString(item[1])
            };
        }
        return null;
    }

    function martellDetectWebglProfile(webgl) {
        var renderer = webgl && webgl.unmaskedRenderer || "";
        if (/UHD Graphics 770/i.test(renderer) && /Direct3D11/i.test(renderer))
            return "windows_intel_uhd_770_d3d11";
        if (/Intel/i.test(renderer) && /Direct3D11/i.test(renderer))
            return "windows_intel_d3d11";
        if (/SwiftShader/i.test(renderer))
            return "swiftshader";
        return "";
    }

    function martellClonePlain(value) {
        if (null === value || "undefined" === typeof value)
            return value;
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (error) {}
        return value;
    }

    function martellBuildQuality(result, featuresValues) {
        var warnings = [];
        var payload = martellString(result && result.payload);
        var serialized = "";
        try {
            serialized = JSON.stringify(result || {});
        } catch (error) {}
        if (!result || 0 !== result.error)
            warnings.push("result-error");
        if (!Array.isArray(result && result.values))
            warnings.push("values-missing");
        if (Array.isArray(result && result.values) && result.count !== result.values.length)
            warnings.push("count-values-mismatch");
        if (featuresValues && Array.isArray(result && result.values) && JSON.stringify(featuresValues) !== JSON.stringify(result.values))
            warnings.push("features-values-mismatch");
        if (-1 !== serialized.indexOf("__MARTELL_"))
            warnings.push("self-observation");
        if (-1 !== serialized.indexOf("TrustedScript"))
            warnings.push("trusted-types-warning");
        if (-1 !== serialized.indexOf("https:///"))
            warnings.push("empty-endpoint-url");
        if (/TypeError:[\s\S]*\n\s+at /.test(serialized))
            warnings.push("long-error-stack");
        return {
            valid: 0 === warnings.length,
            warnings: warnings,
            payloadLength: payload.length
        };
    }

    function martellBuildBrowserProfile(result, options) {
        result = result && typeof result === "object" ? result : {};
        var values = Array.isArray(result.values) ? result.values : [];
        var featuresValues = null;
        if ("string" === typeof result.features && result.features) {
            try {
                featuresValues = JSON.parse(result.features);
            } catch (error) {}
        }
        var uaHighEntropy = martellProfileValue(values, 246, []);
        uaHighEntropy = Array.isArray(uaHighEntropy) ? uaHighEntropy : [];
        var brands = Array.isArray(uaHighEntropy[2]) ? uaHighEntropy[2] : [];
        var fullVersionList = Array.isArray(uaHighEntropy[3]) ? uaHighEntropy[3] : [];
        var brand = martellPrimaryChromiumBrand(fullVersionList, brands) || {};
        var webglSummary = martellProfileValue(values, 214, []);
        webglSummary = Array.isArray(webglSummary) ? webglSummary : [];
        var audioInfo = martellProfileValue(values, 218, []);
        audioInfo = Array.isArray(audioInfo) ? audioInfo : [];
        var navigatorProfile = {
            userAgent: martellString(martellProfileValue(values, 98, "")),
            appVersion: martellString(martellProfileValue(values, 99, "")),
            appCodeName: martellString(martellProfileValue(values, 100, "")),
            product: martellString(martellProfileValue(values, 102, "")),
            productSub: martellString(martellProfileValue(values, 103, "")),
            vendor: martellString(martellProfileValue(values, 104, "")),
            vendorSub: martellString(martellProfileValue(values, 105, "")),
            platform: martellString(martellProfileValue(values, 107, "")),
            hardwareConcurrency: martellInteger(martellProfileValue(values, 110, null), null),
            maxTouchPoints: martellInteger(martellProfileValue(values, 111, null), null),
            language: martellString(martellProfileValue(values, 113, "")),
            languages: martellSplitList(martellProfileValue(values, 114, "")),
            onLine: martellBooleanString(martellProfileValue(values, 118, null)),
            deviceMemory: martellNumber(martellProfileValue(values, 119, null), null),
            doNotTrack: martellString(martellProfileValue(values, 120, "")),
            msDoNotTrack: martellString(martellProfileValue(values, 121, "")),
            cookieEnabled: martellBooleanString(martellProfileValue(values, 122, null)),
            pdfViewerEnabled: martellBooleanString(martellProfileValue(values, 195, null))
        };
        var screenProfile = {
            width: martellInteger(martellProfileValue(values, 89, null), null),
            height: martellInteger(martellProfileValue(values, 90, null), null),
            availWidth: martellInteger(martellProfileValue(values, 91, null), null),
            availHeight: martellInteger(martellProfileValue(values, 92, null), null),
            colorDepth: martellInteger(martellProfileValue(values, 93, null), null),
            pixelDepth: martellInteger(martellProfileValue(values, 94, null), null),
            devicePixelRatio: martellNumber(martellProfileValue(values, 97, 1), 1),
            orientationType: martellString(martellProfileValue(values, 84, "")),
            window: {
                outerWidth: martellInteger(martellProfileValue(values, 75, null), null),
                outerHeight: martellInteger(martellProfileValue(values, 76, null), null),
                screenX: martellInteger(martellProfileValue(values, 73, null), null),
                screenY: martellInteger(martellProfileValue(values, 74, null), null),
                innerWidth: martellInteger(martellProfileValue(values, 71, null), null),
                innerHeight: martellInteger(martellProfileValue(values, 72, null), null),
                documentClientWidth: martellInteger(martellProfileValue(values, 77, null), null),
                documentClientHeight: martellInteger(martellProfileValue(values, 78, null), null),
                source: "martell-values-window-map-v2"
            }
        };
        var webglProfile = {
            context: Array.isArray(martellProfileValue(values, 11, null)) ? martellString(martellProfileValue(values, 11, [])[0]) : "",
            contextConstructor: Array.isArray(martellProfileValue(values, 11, null)) ? martellString(martellProfileValue(values, 11, [])[1]) : "",
            contextCreationMs: Array.isArray(martellProfileValue(values, 11, null)) ? martellNumber(martellProfileValue(values, 11, [])[2], null) : null,
            version: martellString(webglSummary[1]),
            shadingLanguageVersion: martellString(webglSummary[2]),
            vendor: martellString(webglSummary[3]),
            renderer: martellString(webglSummary[4]),
            unmaskedRenderer: martellString(webglSummary[5]),
            unmaskedVendor: martellString(webglSummary[6]),
            extensionCount: martellInteger(webglSummary[7], null),
            canvasHashes: {
                twoD: martellProfileValue(values, 215, []),
                webgl: martellProfileValue(values, 216, [])
            }
        };
        webglProfile.suggestedProfile = martellDetectWebglProfile(webglProfile);
        var profile = {
            schema: "broium.browser-profile.v1",
            collector: {
                name: "martell-cdp-fingerprint",
                version: 1,
                brand: options.endpoints.brand,
                owner: options.endpoints.owner,
                collectedAt: (new Date).toISOString(),
                count: result.count || values.length,
                valueIndexMapVersion: "martell-values-v1",
                payloadHash: "fnv1a32:" + martellHashString(result.payload || "")
            },
            page: {
                url: martellString(martellProfileValue(values, 45, "")),
                title: martellString(martellProfileValue(values, 200, "")),
                visibilityState: martellString(martellProfileValue(values, 47, "")),
                referrer: martellString(martellProfileValue(values, 67, ""))
            },
            navigator: navigatorProfile,
            clientHints: {
                architecture: martellString(uaHighEntropy[0]),
                bitness: martellString(uaHighEntropy[1]),
                brands: brands,
                fullVersionList: fullVersionList,
                mobile: martellBooleanString(uaHighEntropy[4]),
                model: martellString(uaHighEntropy[5]),
                platform: martellString(uaHighEntropy[6]),
                platformVersion: martellString(uaHighEntropy[7]),
                wow64: martellBooleanString(uaHighEntropy[8]),
                formFactors: Array.isArray(uaHighEntropy[9]) ? uaHighEntropy[9] : []
            },
            screen: screenProfile,
            locale: {
                timeZone: martellString(martellProfileValue(values, 193, "")),
                locale: martellString(martellProfileValue(values, 194, "")),
                language: navigatorProfile.language,
                languages: navigatorProfile.languages,
                timezoneOffsetMinutes: martellNumber(martellProfileValue(values, 137, null), null)
            },
            hardware: {
                cpuCores: navigatorProfile.hardwareConcurrency,
                memoryGb: navigatorProfile.deviceMemory,
                platform: navigatorProfile.platform,
                architecture: martellString(uaHighEntropy[0]),
                bitness: martellString(uaHighEntropy[1])
            },
            webgl: webglProfile,
            audio: {
                baseLatency: martellNumber(audioInfo[0], null),
                outputLatency: martellNumber(audioInfo[1], null),
                sampleRate: martellNumber(audioInfo[2], null),
                state: martellString(audioInfo[3])
            },
            media: {
                mimeTypes: martellProfileValue(values, 30, []),
                plugins: martellProfileValue(values, 35, []),
                speechVoices: martellProfileValue(values, 243, [])
            },
            storage: {
                quota: Array.isArray(martellProfileValue(values, 244, null)) ? martellProfileValue(values, 244, [])[0] : null,
                usage: Array.isArray(martellProfileValue(values, 244, null)) ? martellProfileValue(values, 244, [])[1] : null
            },
            network: {
                connectionType: martellString(martellProfileValue(values, 138, "")),
                effectiveType: martellString(martellProfileValue(values, 139, "")),
                downlinkMax: martellNumber(martellProfileValue(values, 140, null), null),
                downlink: martellNumber(martellProfileValue(values, 141, null), null),
                rtt: martellNumber(martellProfileValue(values, 142, null), null),
                saveData: martellBooleanString(martellProfileValue(values, 143, null)),
                webrtcCandidates: [].concat(martellProfileValue(values, 247, []) || [], martellProfileValue(values, 248, []) || [])
            },
            security: {
                isSecureContext: martellBooleanString(martellProfileValue(values, 183, null)),
                automationSignal: martellProfileValue(values, 21, ""),
                publicKeyCredentialCapabilities: martellProfileValue(values, 241, [])
            },
            quality: martellBuildQuality(result, featuresValues)
        };
        return profile;
    }

    function martellPrimaryChromiumBrand(fullVersionList, brands) {
        var preferred = ["Microsoft Edge", "Google Chrome", "Chromium"];
        for (var index = 0; index < preferred.length; index++) {
            var found = martellFindBrand(fullVersionList, preferred[index]) || martellFindBrand(brands, preferred[index]);
            if (found)
                return found;
        }
        return martellFindBrand(fullVersionList) || martellFindBrand(brands);
    }

    function martellBrandFromProfile(profile) {
        var fullVersionList = profile && profile.clientHints && profile.clientHints.fullVersionList || [];
        var brands = profile && profile.clientHints && profile.clientHints.brands || [];
        return martellPrimaryChromiumBrand(fullVersionList, brands) || {
            brand: "Chromium",
            version: ""
        };
    }

    function martellChromiumProductFromBrand(brand) {
        brand = martellString(brand);
        if (/Microsoft Edge/i.test(brand))
            return "Microsoft Edge";
        if (/Google Chrome/i.test(brand))
            return "Google Chrome";
        if (/Chromium/i.test(brand))
            return "Chromium";
        return brand || "Chromium";
    }

    function martellWebglParameterType(value, name) {
        if ("string" === typeof value)
            return "string";
        if (Array.isArray(value))
            return "ALIASED_LINE_WIDTH_RANGE" === name || "ALIASED_POINT_SIZE_RANGE" === name ? "float32Array" : "int32Array";
        if ("number" === typeof value && value > 2147483647)
            return "uint";
        return "int";
    }

    function martellWebglParameterEnumMap() {
        return {
            VERSION: 7938,
            SHADING_LANGUAGE_VERSION: 35724,
            VENDOR: 7936,
            RENDERER: 7937,
            ALIASED_LINE_WIDTH_RANGE: 33902,
            ALIASED_POINT_SIZE_RANGE: 33901,
            ALPHA_BITS: 3413,
            BLUE_BITS: 3412,
            DEPTH_BITS: 3414,
            GREEN_BITS: 3411,
            RED_BITS: 3410,
            STENCIL_BITS: 3415,
            MAX_COMBINED_TEXTURE_IMAGE_UNITS: 35661,
            MAX_CUBE_MAP_TEXTURE_SIZE: 34076,
            MAX_FRAGMENT_UNIFORM_VECTORS: 36349,
            MAX_RENDERBUFFER_SIZE: 34024,
            MAX_TEXTURE_IMAGE_UNITS: 34930,
            MAX_TEXTURE_SIZE: 3379,
            MAX_VARYING_VECTORS: 36348,
            MAX_VERTEX_ATTRIBS: 34921,
            MAX_VERTEX_TEXTURE_IMAGE_UNITS: 35660,
            MAX_VERTEX_UNIFORM_VECTORS: 36347,
            MAX_VIEWPORT_DIMS: 3386,
            UNMASKED_VENDOR_WEBGL: 37445,
            UNMASKED_RENDERER_WEBGL: 37446,
            MAX_TEXTURE_MAX_ANISOTROPY_EXT: 34047,
            MAX_3D_TEXTURE_SIZE: 32883,
            MAX_ARRAY_TEXTURE_LAYERS: 35071,
            MAX_CLIENT_WAIT_TIMEOUT_WEBGL: 37447,
            MAX_COLOR_ATTACHMENTS: 36063,
            MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS: 35379,
            MAX_COMBINED_UNIFORM_BLOCKS: 35374,
            MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS: 35377,
            MAX_DRAW_BUFFERS: 34852,
            MAX_ELEMENT_INDEX: 36203,
            MAX_ELEMENTS_INDICES: 33001,
            MAX_ELEMENTS_VERTICES: 33000,
            MAX_FRAGMENT_INPUT_COMPONENTS: 37157,
            MAX_FRAGMENT_UNIFORM_BLOCKS: 35373,
            MAX_FRAGMENT_UNIFORM_COMPONENTS: 35657,
            MAX_PROGRAM_TEXEL_OFFSET: 35077,
            MAX_SAMPLES: 36183,
            MAX_SERVER_WAIT_TIMEOUT: 37137,
            MAX_TEXTURE_LOD_BIAS: 34045,
            MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS: 35978,
            MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS: 35979,
            MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS: 35968,
            MAX_UNIFORM_BLOCK_SIZE: 35376,
            MAX_UNIFORM_BUFFER_BINDINGS: 35375,
            MAX_VARYING_COMPONENTS: 35659,
            MAX_VERTEX_OUTPUT_COMPONENTS: 37154,
            MAX_VERTEX_UNIFORM_BLOCKS: 35371,
            MAX_VERTEX_UNIFORM_COMPONENTS: 35658,
            MIN_PROGRAM_TEXEL_OFFSET: 35076
        };
    }

    function martellImplementationPlan(status, priority, current, required, notes) {
        var result = {
            status: status || "unknown",
            priority: priority || "p2"
        };
        if (Array.isArray(current) && current.length)
            result.current = current.slice();
        if (Array.isArray(required) && required.length)
            result.required = required.slice();
        if (Array.isArray(notes) && notes.length)
            result.notes = notes.slice();
        return result;
    }

    function martellFingerprintSection(values, implementation) {
        return {
            values: values || {},
            implementation: implementation
        };
    }

    function martellBuildChromiumBrowser(profile) {
        var brand = martellBrandFromProfile(profile);
        var version = brand.version || "";
        var major = version.split(".")[0] || "";
        return {
            engine: "chromium",
            family: "chromium",
            product: martellChromiumProductFromBrand(brand.brand),
            brand: brand.brand || "Chromium",
            version: version,
            major: major,
            role: "observed-browser",
            platform: profile.clientHints && profile.clientHints.platform || profile.navigator && profile.navigator.platform || "",
            platformVersion: profile.clientHints && profile.clientHints.platformVersion || "",
            architecture: profile.clientHints && profile.clientHints.architecture || "",
            bitness: profile.clientHints && profile.clientHints.bitness || "",
            profileHash: "fnv1a32:" + martellHashString(JSON.stringify([
                profile.navigator && profile.navigator.userAgent,
                profile.clientHints && profile.clientHints.fullVersionList,
                profile.screen && profile.screen.width,
                profile.screen && profile.screen.height,
                profile.locale && profile.locale.timeZone,
                profile.webgl && profile.webgl.unmaskedRenderer
            ]))
        };
    }

    function martellBuildIdentityConfig(profile, browser) {
        var nav = profile.navigator || {};
        var hints = profile.clientHints || {};
        return martellFingerprintSection({
            browser: {
                family: browser.family,
                product: browser.product,
                brand: browser.brand,
                version: browser.version,
                major: browser.major,
                platform: browser.platform,
                platformVersion: browser.platformVersion,
                architecture: browser.architecture,
                bitness: browser.bitness
            },
            userAgent: nav.userAgent,
            appVersion: nav.appVersion,
            appName: nav.direct && nav.direct.appName,
            appCodeName: nav.appCodeName,
            product: nav.product,
            productSub: nav.productSub,
            vendor: nav.vendor,
            vendorSub: nav.vendorSub,
            platform: nav.platform,
            pdfViewerEnabled: nav.pdfViewerEnabled,
            cookieEnabled: nav.cookieEnabled,
            userAgentData: {
                brands: hints.brands,
                fullVersionList: hints.fullVersionList,
                mobile: hints.mobile,
                model: hints.model,
                platform: hints.platform,
                platformVersion: hints.platformVersion,
                architecture: hints.architecture,
                bitness: hints.bitness,
                wow64: hints.wow64,
                formFactors: hints.formFactors
            }
        }, martellImplementationPlan("partial", "p0", [
            "command-line and content-layer identity overrides can cover UA/version basics"
        ], [
            "native NavigatorUAData override for brands, fullVersionList, platformVersion, formFactors",
            "single source of truth to keep UA, UA-CH, productSub, vendor, and PDF plugin state coherent"
        ]));
    }

    function martellBuildNavigatorConfig(profile) {
        var nav = profile.navigator || {};
        return martellFingerprintSection({
            hardwareConcurrency: nav.hardwareConcurrency,
            deviceMemory: nav.deviceMemory,
            maxTouchPoints: nav.maxTouchPoints,
            language: nav.language,
            languages: nav.languages,
            doNotTrack: nav.doNotTrack,
            msDoNotTrack: nav.msDoNotTrack,
            webdriver: nav.direct && nav.direct.webdriver,
            onLine: nav.onLine,
            buildID: nav.direct && nav.direct.buildID,
            oscpu: nav.direct && nav.direct.oscpu
        }, martellImplementationPlan("partial", "p0", [
            "CPU, memory, and DNT are simple scalar overrides"
        ], [
            "native Navigator object/property descriptor layer for languages, maxTouchPoints, webdriver, oscpu, buildID",
            "descriptor/toString consistency checks for all overridden Navigator accessors"
        ]));
    }

    function martellLooksLikeRemoteDesktopPointerProfile(profile) {
        var nav = profile.navigator || {};
        var screen = profile.screen || {};
        var viewport = screen.viewport || {};
        var media = viewport.mediaQueries || {};
        var isDesktop = 0 === nav.maxTouchPoints && /Win|Mac|Linux/i.test(nav.platform || "") && !(profile.clientHints && profile.clientHints.mobile);
        return !!(isDesktop && false === media.hover && false === media.anyHover && false === media.pointerFine && false === media.anyPointerFine);
    }

    function martellLooksLikeDockedToolWindowGeometry(profile) {
        var nav = profile.navigator || {};
        var screen = profile.screen || {};
        var win = screen.window || {};
        var outerWidth = martellNumber(win.outerWidth, 0);
        var innerWidth = martellNumber(win.innerWidth, 0);
        var screenWidth = martellNumber(screen.availWidth || screen.width, 0);
        var isDesktop = /Win|Mac|Linux/i.test(nav.platform || "") && !(profile.clientHints && profile.clientHints.mobile);
        var fillsScreen = outerWidth && screenWidth && Math.abs(outerWidth - screenWidth) <= 24;
        return !!(isDesktop && fillsScreen && innerWidth > 0 && outerWidth - innerWidth >= 240 && innerWidth / outerWidth < 0.75);
    }

    function martellApplyDesktopWindowGeometryNormalization(profile, values) {
        if (!martellLooksLikeDockedToolWindowGeometry(profile))
            return values;
        var win = values.window || {};
        var viewport = values.viewport || {};
        var viewportWindow = viewport.window || {};
        var outerWidth = martellNumber(win.outerWidth || viewportWindow.outerWidth, 0);
        if (!outerWidth)
            return values;
        values.observedWindow = martellClonePlain(win);
        values.window = Object.assign({}, win, {
            innerWidth: outerWidth,
            documentClientWidth: outerWidth
        });
        if (viewport.window) {
            viewport.observedWindow = martellClonePlain(viewport.window);
            viewport.window = Object.assign({}, viewport.window, {
                innerWidth: outerWidth
            });
        }
        if (viewport.documentElement) {
            viewport.observedDocumentElement = martellClonePlain(viewport.documentElement);
            viewport.documentElement = Object.assign({}, viewport.documentElement, {
                clientWidth: outerWidth,
                scrollWidth: Math.max(outerWidth, martellNumber(viewport.documentElement.scrollWidth, outerWidth))
            });
        }
        if (viewport.visualViewport) {
            viewport.observedVisualViewport = martellClonePlain(viewport.visualViewport);
            viewport.visualViewport = Object.assign({}, viewport.visualViewport, {
                width: outerWidth
            });
        }
        viewport.normalization = Object.assign({}, viewport.normalization || {}, {
            windowGeometry: {
                profile: "normal-desktop-maximized",
                reason: "docked-tool-or-remote-panel-window-width",
                note: "Observed innerWidth was much narrower than a maximized desktop outerWidth. This usually means docked DevTools or a remote-control side panel affected capture; chromium config restores a normal maximized desktop content width while profile keeps raw observations."
            }
        });
        values.viewport = viewport;
        return values;
    }

    function martellNormalizeScreenConfigValues(profile) {
        var values = martellClonePlain(profile.screen || {}) || {};
        var viewport = values.viewport || {};
        var media = viewport.mediaQueries || null;
        values = martellApplyDesktopWindowGeometryNormalization(profile, values);
        viewport = values.viewport || {};
        media = viewport.mediaQueries || null;
        if (media && martellLooksLikeRemoteDesktopPointerProfile(profile)) {
            viewport.observedMediaQueries = martellClonePlain(media);
            media.hover = true;
            media.anyHover = true;
            media.pointerFine = true;
            media.anyPointerFine = true;
            viewport.mediaQueries = media;
            viewport.normalization = Object.assign({}, viewport.normalization || {}, {
                inputDeviceProfile: {
                    profile: "normal-desktop",
                    reason: "remote-or-displayless-desktop-pointer-media-query",
                    note: "Observed pointer/hover media queries were all false on a desktop profile. This commonly happens on remote or displayless hosts; chromium config normalizes to ordinary desktop input while profile keeps raw observations."
                }
            });
        }
        values.viewport = viewport;
        return values;
    }

    function martellBuildScreenConfig(profile) {
        return martellFingerprintSection(martellNormalizeScreenConfigValues(profile), martellImplementationPlan("partial", "p0", [
            "screen size, device scale factor, and window geometry are already practical launch/runtime targets"
        ], [
            "native Screen/VisualViewport/media-query coherence layer",
            "window placement and work-area handling for availWidth/availHeight/screenX/screenY",
            "docked DevTools or remote-control panels can shrink innerWidth while outerWidth still looks maximized; keep raw observations but normalize the browser contract for ordinary desktop simulation",
            "remote/displayless hosts can report pointer/hover media queries unlike normal desktop users; keep raw observations but simulate the normalized desktop input profile unless explicitly requested"
        ]));
    }

    function martellBuildLocaleConfig(profile) {
        var locale = profile.locale || {};
        var intl = locale.intl || {};
        var supported = intl.supportedValues || {};
        var supportedSummary = {};
        Object.keys(supported).forEach(function(key) {
            var value = supported[key];
            if (Array.isArray(value))
                supportedSummary[key] = {
                    count: value.length,
                    hash: supported[key + "Hash"] || "fnv1a32:" + martellHashString(value.join("|"))
                };
        });
        return martellFingerprintSection({
            timeZone: locale.timeZone,
            timezoneOffsetMinutes: locale.timezoneOffsetMinutes,
            locale: locale.locale,
            language: locale.language,
            languages: locale.languages,
            intl: {
                dateTimeFormat: intl.dateTimeFormat,
                numberFormat: intl.numberFormat,
                collator: intl.collator,
                supportedValues: supportedSummary
            }
        }, martellImplementationPlan("partial", "p0", [
            "timezone and Accept-Language style values are direct profile fields"
        ], [
            "native ICU/Intl resolvedOptions override for locale, calendar, numberingSystem, collation",
            "supportedValues list/hash alignment across timezone, currency, unit, calendar, and collation"
        ]));
    }

    function martellBuildRuntimeConfig(profile, browser) {
        var api = profile.apiSurface || {};
        return martellFingerprintSection({
            javascriptEngine: "v8",
            v8: {
                hashSeedMode: "stable-profile",
                seedMaterialHash: browser.profileHash,
                nativeCodeToStringPolicy: "chromium-native-consistent"
            },
            runtime: api.runtime,
            browserGlobals: api.browserGlobals,
            crypto: api.crypto,
            streamsAndCodecs: api.streamsAndCodecs
        }, martellImplementationPlan("partial", "p0", [
            "stable V8 hash seed and feature switches are feasible as startup/runtime controls"
        ], [
            "native API-surface gate for per-interface presence",
            "descriptor and Function.prototype.toString consistency for gated APIs"
        ]));
    }

    function martellBuildWebglContextConfig(context) {
        var result = {
            context: context.context,
            supported: !!context.supported,
            constructorName: context.constructorName,
            contextAttributes: context.contextAttributes,
            parameters: {},
            parameterEnums: {},
            shaderPrecision: context.shaderPrecision,
            supportedExtensions: Array.isArray(context.supportedExtensions) ? context.supportedExtensions.slice() : [],
            supportedExtensionsHash: context.supportedExtensionsHash,
            clearPixelsHash: context.clearPixelsHash
        };
        var enumMap = martellWebglParameterEnumMap();
        var parameters = context.parameters || {};
        Object.keys(parameters).forEach(function(name) {
            if (!martellIsTypedProfileValue(parameters[name]))
                return;
            result.parameters[name] = parameters[name];
            if (enumMap[name])
                result.parameterEnums[String(enumMap[name])] = {
                    name: name,
                    type: martellWebglParameterType(parameters[name], name),
                    value: parameters[name]
                };
        });
        return result;
    }

    function martellBuildWebglConfig(profile) {
        var contexts = {};
        (profile.webgl && profile.webgl.extended && profile.webgl.extended.contexts || []).forEach(function(context) {
            if (context && context.context)
                contexts[context.context] = martellBuildWebglContextConfig(context);
        });
        var preferredContext = profile.webgl && profile.webgl.context || "";
        var preferredExtensions = contexts[preferredContext] && contexts[preferredContext].supportedExtensions || [];
        var rawExtensionCount = profile.webgl && profile.webgl.extensionCount;
        return martellFingerprintSection({
            enabled: !!(profile.webgl && profile.webgl.context),
            preferredContext: preferredContext,
            suggestedProfile: profile.webgl && profile.webgl.suggestedProfile,
            observed: {
                version: profile.webgl && profile.webgl.version,
                shadingLanguageVersion: profile.webgl && profile.webgl.shadingLanguageVersion,
                vendor: profile.webgl && profile.webgl.vendor,
                renderer: profile.webgl && profile.webgl.renderer,
                unmaskedRenderer: profile.webgl && profile.webgl.unmaskedRenderer,
                unmaskedVendor: profile.webgl && profile.webgl.unmaskedVendor,
                extensionCount: preferredExtensions.length || rawExtensionCount,
                rawSummaryExtensionCount: rawExtensionCount,
                extensionCountSource: preferredExtensions.length ? "contexts." + preferredContext + ".supportedExtensions.length" : "raw-summary",
                canvasHashes: profile.webgl && profile.webgl.canvasHashes || {}
            },
            contexts: contexts
        }, martellImplementationPlan(profile.webgl && profile.webgl.context ? "partial" : "not-observed", "p0", [
            "getParameter, extension list, and renderer/vendor overrides are high-value native targets"
        ], [
            "contextAttributes, shaderPrecisionFormat, supportedExtensions, and readPixels/canvas hash coherence",
            "separate WebGL1/WebGL2/experimental-webgl profiles with descriptor-safe native binding behavior"
        ]));
    }

    function martellBuildCanvasConfig(profile) {
        return martellFingerprintSection(profile.canvas || {}, martellImplementationPlan(profile.canvas ? "partial" : "not-observed", "p0", [
            "Canvas readback and toDataURL hooks are feasible native/content targets"
        ], [
            "2D text metrics, imageData, and WebGL canvas hashes must share one deterministic profile",
            "avoid per-call random noise; restore a stable sampled profile"
        ]));
    }

    function martellBuildWebgpuConfig(profile) {
        return martellFingerprintSection(profile.webgpu || {}, martellImplementationPlan(profile.webgpu ? "native-required" : "not-observed", "p1", [], [
            "Dawn/WebGPU adapter info, feature set, and limits need native implementation",
            "GPU adapter must stay coherent with WebGL renderer and operating system"
        ]));
    }

    function martellBuildGraphicsConfig(profile) {
        return {
            canvas2d: martellBuildCanvasConfig(profile),
            webgl: martellBuildWebglConfig(profile),
            webgpu: martellBuildWebgpuConfig(profile)
        };
    }

    function martellBuildAudioConfig(profile) {
        var audio = profile.audio || {};
        return martellFingerprintSection({
            context: {
                sampleRate: audio.sampleRate,
                baseLatency: audio.baseLatency,
                outputLatency: audio.outputLatency,
                state: audio.state
            },
            offline: audio.extended && audio.extended.offline
        }, martellImplementationPlan(audio.sampleRate ? "partial" : "not-observed", "p1", [
            "sampleRate/baseLatency/outputLatency are narrow native override targets"
        ], [
            "OfflineAudioContext render hash needs deterministic DSP shaping, not random noise",
            "AudioContext, OfflineAudioContext, analyser, and destination behavior must agree"
        ]));
    }

    function martellInferFontProfile(profile, detected) {
        var nav = profile.navigator || {};
        var language = martellString(nav.language).toLowerCase();
        var platform = martellString(nav.platform);
        if (!/Win/i.test(platform))
            return "";
        var hasTraditional = detected.some(function(font) {
            return /Microsoft JhengHei|PMingLiU|MingLiU/i.test(font);
        });
        var hasSimplified = detected.some(function(font) {
            return /Microsoft YaHei|SimSun|NSimSun|SimHei|KaiTi|FangSong|DengXian/i.test(font);
        });
        if (/^zh-(tw|hk|mo)/i.test(language))
            return hasSimplified ? "windows_zh_mixed" : "windows_zh_tw";
        if (/^zh-cn/i.test(language))
            return hasTraditional ? "windows_zh_mixed" : "windows_zh_cn";
        if (/^zh/i.test(language))
            return hasTraditional && hasSimplified ? "windows_zh_mixed" : hasTraditional ? "windows_zh_tw" : "windows_zh_cn";
        return "windows";
    }

    function martellBuildFontConfig(profile) {
        var detected = profile.fonts && profile.fonts.detected || [];
        var windowsLikely = [];
        var maybe = [];
        detected.forEach(function(font) {
            if (/^(Arial|Arial Black|Calibri|Cambria|Candara|Comic Sans MS|Consolas|Constantia|Courier New|Georgia|Impact|Lucida Console|Lucida Sans Unicode|Microsoft Sans Serif|Segoe UI|Tahoma|Times New Roman|Trebuchet MS|Verdana|Microsoft YaHei|Microsoft JhengHei|SimSun|NSimSun|SimHei|KaiTi|FangSong|DengXian)$/i.test(font))
                windowsLikely.push(font);
            else
                maybe.push(font);
        });
        return martellFingerprintSection({
            profile: martellInferFontProfile(profile, detected),
            method: profile.fonts && profile.fonts.method,
            candidatesCount: profile.fonts && profile.fonts.candidates ? profile.fonts.candidates.length : 0,
            detected: windowsLikely,
            maybeDetected: maybe,
            checkedCount: profile.fonts && profile.fonts.checked ? profile.fonts.checked.length : 0,
            detectedHash: profile.fonts && profile.fonts.detectedHash || ""
        }, martellImplementationPlan(detected.length ? "partial" : "not-observed", "p0", [
            "coarse OS/language font profiles are practical as bundled profile presets"
        ], [
            "native font fallback/font access layer for exact per-family availability and metrics",
            "CSS Font Loading, canvas measureText, DOM layout, and PDF/plugin text paths must use the same font profile"
        ]));
    }

    function martellBuildMediaConfig(profile) {
        var media = profile.media || {};
        return martellFingerprintSection({
            mimeTypes: media.mimeTypes,
            plugins: media.plugins,
            pluginsDetailed: media.pluginsDetailed,
            speechVoices: media.speechVoicesDetailed || media.speechVoices,
            devices: media.devices,
            capabilities: media.capabilities
        }, martellImplementationPlan("native-required", "p1", [
            "built-in PDF plugin shape can be made coherent with brand/version"
        ], [
            "PluginArray/MimeTypeArray native descriptors and enumeration order",
            "speechSynthesis voice inventory tied to OS/language profile",
            "mediaDevices and MediaCapabilities overrides without triggering permission prompts"
        ]));
    }

    function martellBuildNetworkConfig(profile) {
        var network = profile.network || {};
        return martellFingerprintSection({
            connection: {
                type: network.connectionType,
                effectiveType: network.effectiveType,
                downlinkMax: network.downlinkMax,
                downlink: network.downlink,
                rtt: network.rtt,
                saveData: network.saveData
            },
            webrtc: {
                candidates: network.webrtcCandidates,
                candidatePolicy: "profile-local-candidate-or-policy",
                recommendedIpHandlingPolicy: "disable_non_proxied_udp"
            }
        }, martellImplementationPlan("partial", "p1", [
            "WebRTC IP handling policy is already a launch-level control"
        ], [
            "NetworkInformation native override for effectiveType/downlink/rtt/saveData",
            "ICE candidate generation profile that preserves mDNS/local-IP policy coherence"
        ]));
    }

    function martellBuildStorageConfig(profile) {
        return martellFingerprintSection(profile.storage || {}, martellImplementationPlan("native-required", "p2", [], [
            "QuotaManager and StorageManager estimate/persisted overrides",
            "storage API presence and legacy webkitRequestFileSystem/openDatabase shape"
        ]));
    }

    function martellBuildSecurityConfig(profile) {
        var security = profile.security || {};
        return martellFingerprintSection({
            automationSignal: security.automationSignal,
            isSecureContext: security.isSecureContext,
            permissionSurface: security.permissionSurface,
            webAuthn: security.webAuthn,
            publicKeyCredentialCapabilities: security.publicKeyCredentialCapabilities
        }, martellImplementationPlan("partial", "p0", [
            "automation-visible flags and webdriver state are high-priority scalar/native targets"
        ], [
            "WebAuthn capability surface and authenticator availability",
            "Permissions API must expose shape only unless caller explicitly asks to query status"
        ], [
            "permission states are intentionally not queried by this collector"
        ]));
    }

    function martellBuildApiSurfaceConfig(profile) {
        return martellFingerprintSection(profile.apiSurface || {}, martellImplementationPlan(profile.apiSurface ? "native-required" : "not-observed", "p1", [], [
            "window/global API availability gates per Chromium version, platform, and feature flags",
            "constructor names, prototypes, property descriptors, and native-code strings must be coherent"
        ]));
    }

    function martellBuildChromiumProfile(profile, options) {
        var browser = martellBuildChromiumBrowser(profile, options);
        var warnings = (profile.quality && profile.quality.warnings || []).slice();
        if (martellLooksLikeDockedToolWindowGeometry(profile))
            warnings.push("docked-tool-or-remote-panel-window-geometry-normalized");
        if (martellLooksLikeRemoteDesktopPointerProfile(profile))
            warnings.push("remote-or-displayless-pointer-media-query-normalized");
        var chromium = {
            schema: "chromium.fingerprint-config.v1",
            browser: browser,
            warnings: martellUnique(warnings),
            config: {
                identity: martellBuildIdentityConfig(profile, browser),
                navigator: martellBuildNavigatorConfig(profile),
                screen: martellBuildScreenConfig(profile),
                locale: martellBuildLocaleConfig(profile),
                runtime: martellBuildRuntimeConfig(profile, browser),
                graphics: martellBuildGraphicsConfig(profile),
                audio: martellBuildAudioConfig(profile),
                fonts: martellBuildFontConfig(profile),
                media: martellBuildMediaConfig(profile),
                network: martellBuildNetworkConfig(profile),
                storage: martellBuildStorageConfig(profile),
                security: martellBuildSecurityConfig(profile),
                apiSurface: martellBuildApiSurfaceConfig(profile)
            },
            implementation: {
                consumer: {
                    role: "browser-fingerprint-simulator",
                    priorityOrder: [
                        "identity",
                        "navigator",
                        "screen",
                        "locale",
                        "graphics.webgl",
                        "graphics.canvas2d",
                        "fonts",
                        "runtime",
                        "security",
                        "media",
                        "network",
                        "graphics.webgpu",
                        "audio",
                        "storage",
                        "apiSurface"
                    ],
                    contract: "semantic fingerprint config; consumers translate values to their own runtime hooks"
                }
            }
        };
        return martellPruneProfile(chromium);
    }

    function martellTrainingLabel(severity, category, field, finding, recommendation, evidence) {
        var label = {
            severity: severity,
            category: category,
            field: field,
            finding: finding,
            recommendation: recommendation
        };
        if (evidence)
            label.evidence = evidence;
        return label;
    }

    function martellCollectTrainingLabels(profile, chromium) {
        var labels = [];
        var screenValues = chromium && chromium.config && chromium.config.screen && chromium.config.screen.values || {};
        var viewport = screenValues.viewport || {};
        var webglValues = chromium && chromium.config && chromium.config.graphics && chromium.config.graphics.webgl && chromium.config.graphics.webgl.values || {};
        var fontValues = chromium && chromium.config && chromium.config.fonts && chromium.config.fonts.values || {};
        if (viewport.normalization && viewport.normalization.windowGeometry)
            labels.push(martellTrainingLabel("p1", "capture-environment", "screen.window.innerWidth", "capture window geometry was affected by a docked tool or remote-control panel", "use normalized desktop window geometry for simulation and keep observedWindow for audit", {
                observedInnerWidth: screenValues.observedWindow && screenValues.observedWindow.innerWidth,
                normalizedInnerWidth: screenValues.window && screenValues.window.innerWidth,
                reason: viewport.normalization.windowGeometry.reason
            }));
        if (viewport.normalization && viewport.normalization.inputDeviceProfile)
            labels.push(martellTrainingLabel("p1", "capture-environment", "screen.viewport.mediaQueries", "remote or displayless capture polluted pointer/hover media queries", "normalize pointer/hover fields to ordinary desktop values while preserving observedMediaQueries", {
                observed: viewport.observedMediaQueries,
                normalized: viewport.mediaQueries,
                reason: viewport.normalization.inputDeviceProfile.reason
            }));
        if (webglValues.observed && webglValues.observed.rawSummaryExtensionCount && webglValues.observed.rawSummaryExtensionCount !== webglValues.observed.extensionCount)
            labels.push(martellTrainingLabel("p2", "consistency", "graphics.webgl.observed.extensionCount", "raw WebGL summary extension count differed from preferred context supportedExtensions length", "trust the preferred context list length and preserve the raw summary count separately", {
                extensionCount: webglValues.observed.extensionCount,
                rawSummaryExtensionCount: webglValues.observed.rawSummaryExtensionCount,
                extensionCountSource: webglValues.observed.extensionCountSource
            }));
        if ("windows_zh_mixed" === fontValues.profile)
            labels.push(martellTrainingLabel("p2", "consistency", "fonts.profile", "Chinese Windows font set contains both Simplified and Traditional signals", "use mixed language font profile and rely on detected font list/hash for stronger matching", {
                profile: fontValues.profile,
                detectedHash: fontValues.detectedHash
            }));
        return labels;
    }

    function martellTrainingSectionSummary(section) {
        section = section || {};
        return {
            status: section.implementation && section.implementation.status,
            priority: section.implementation && section.implementation.priority,
            valueKeys: section.values && "object" === typeof section.values ? Object.keys(section.values).sort() : []
        };
    }

    function martellBuildImplementationTrainingTasks(chromium) {
        var config = chromium && chromium.config || {};
        var tasks = [];
        function add(surface, section) {
            if (!section || !section.implementation)
                return;
            tasks.push({
                surface: surface,
                priority: section.implementation.priority,
                status: section.implementation.status,
                current: section.implementation.current || [],
                required: section.implementation.required || [],
                notes: section.implementation.notes || []
            });
        }
        add("identity", config.identity);
        add("navigator", config.navigator);
        add("screen", config.screen);
        add("locale", config.locale);
        add("runtime", config.runtime);
        if (config.graphics) {
            add("graphics.canvas2d", config.graphics.canvas2d);
            add("graphics.webgl", config.graphics.webgl);
            add("graphics.webgpu", config.graphics.webgpu);
        }
        add("audio", config.audio);
        add("fonts", config.fonts);
        add("media", config.media);
        add("network", config.network);
        add("storage", config.storage);
        add("security", config.security);
        add("apiSurface", config.apiSurface);
        return tasks;
    }

    function martellBuildProfileTrainingInput(profile) {
        profile = profile || {};
        var media = profile.media || {};
        var network = profile.network || {};
        var intl = profile.locale && profile.locale.intl || {};
        var supported = intl.supportedValues || {};
        var supportedSummary = {};
        Object.keys(supported).forEach(function(key) {
            if (Array.isArray(supported[key]))
                supportedSummary[key] = {
                    count: supported[key].length,
                    hash: supported[key + "Hash"] || "fnv1a32:" + martellHashString(supported[key].join("|"))
                };
        });
        return martellPruneProfile({
            schema: profile.schema,
            collector: profile.collector && {
                name: profile.collector.name,
                version: profile.collector.version,
                count: profile.collector.count,
                valueIndexMapVersion: profile.collector.valueIndexMapVersion,
                payloadHash: profile.collector.payloadHash,
                asyncProfile: profile.collector.asyncProfile
            },
            navigator: profile.navigator,
            clientHints: profile.clientHints,
            screen: profile.screen,
            locale: {
                timeZone: profile.locale && profile.locale.timeZone,
                timezoneOffsetMinutes: profile.locale && profile.locale.timezoneOffsetMinutes,
                locale: profile.locale && profile.locale.locale,
                language: profile.locale && profile.locale.language,
                languages: profile.locale && profile.locale.languages,
                intl: {
                    dateTimeFormat: intl.dateTimeFormat,
                    numberFormat: intl.numberFormat,
                    collator: intl.collator,
                    supportedValues: supportedSummary
                }
            },
            hardware: {
                cpuCores: profile.hardware && profile.hardware.cpuCores,
                memoryGb: profile.hardware && profile.hardware.memoryGb,
                platform: profile.hardware && profile.hardware.platform,
                architecture: profile.hardware && profile.hardware.architecture,
                bitness: profile.hardware && profile.hardware.bitness,
                battery: profile.hardware && profile.hardware.battery,
                bluetooth: profile.hardware && profile.hardware.bluetooth,
                gamepads: profile.hardware && profile.hardware.gamepads && {
                    count: profile.hardware.gamepads.count,
                    hash: profile.hardware.gamepads.hash
                },
                keyboard: profile.hardware && profile.hardware.keyboard && {
                    hash: profile.hardware.keyboard.hash,
                    entryCount: Array.isArray(profile.hardware.keyboard.entries) ? profile.hardware.keyboard.entries.length : null
                },
                grantedDevices: profile.hardware && profile.hardware.grantedDevices && {
                    hash: profile.hardware.grantedDevices.hash
                }
            },
            webgl: profile.webgl,
            webgpu: profile.webgpu,
            canvas: profile.canvas,
            audio: profile.audio,
            fonts: profile.fonts && {
                method: profile.fonts.method,
                candidatesCount: Array.isArray(profile.fonts.candidates) ? profile.fonts.candidates.length : null,
                detected: profile.fonts.detected,
                detectedHash: profile.fonts.detectedHash,
                checkedCount: Array.isArray(profile.fonts.checked) ? profile.fonts.checked.length : null
            },
            media: {
                mimeTypes: media.mimeTypes,
                plugins: media.plugins,
                pluginsDetailed: media.pluginsDetailed,
                speechVoices: media.speechVoicesDetailed ? {
                    count: media.speechVoicesDetailed.count,
                    hash: media.speechVoicesDetailed.hash
                } : media.speechVoices,
                devices: media.devices && {
                    count: media.devices.count,
                    kinds: media.devices.kinds,
                    devicesHash: media.devices.devicesHash
                },
                capabilities: media.capabilities
            },
            storage: profile.storage,
            network: {
                connectionType: network.connectionType,
                effectiveType: network.effectiveType,
                downlinkMax: network.downlinkMax,
                downlink: network.downlink,
                rtt: network.rtt,
                saveData: network.saveData,
                direct: network.direct,
                webrtcCandidateCount: Array.isArray(network.webrtcCandidates) ? network.webrtcCandidates.length : 0,
                webrtcCandidatesIncluded: false
            },
            security: profile.security,
            apiSurface: profile.apiSurface,
            quality: profile.quality
        });
    }

    function martellSanitizeChromiumNetworkTarget(target) {
        target = martellClonePlain(target || {}) || {};
        var webrtc = target.config && target.config.network && target.config.network.values && target.config.network.values.webrtc;
        if (webrtc && Array.isArray(webrtc.candidates)) {
            webrtc.candidateCount = webrtc.candidates.length;
            delete webrtc.candidates;
            webrtc.candidatesIncluded = false;
        }
        return martellPruneProfile(target);
    }

    function martellBroiumSwitchValue(value) {
        if (Array.isArray(value)) {
            return value.map(function(item) {
                return martellString(item).trim();
            }).filter(Boolean);
        }
        if ("number" === typeof value)
            return Number.isFinite(value) ? value : null;
        if ("boolean" === typeof value)
            return value;
        value = martellString(value).trim();
        return value ? value : null;
    }

    function martellBroiumSwitchArgValue(value) {
        if (Array.isArray(value))
            return value.join(",");
        return martellString(value);
    }

    function martellAddBroiumSwitch(target, name, value, source) {
        value = martellBroiumSwitchValue(value);
        if (null === value || "undefined" === typeof value)
            return false;
        if (Array.isArray(value) && !value.length)
            return false;
        target.switches[name] = value;
        target.args.push(true === value ? "--" + name : "--" + name + "=" + martellBroiumSwitchArgValue(value));
        if (source)
            target.coverage.push({
                switch: name,
                source: source
            });
        return true;
    }

    function martellPositiveIntegerSwitchValue(value) {
        var number = martellNumber(value, null);
        return Number.isFinite(number) && number > 0 && Math.round(number) === number ? number : null;
    }

    function martellVersionSwitchValue(value) {
        value = martellString(value).trim();
        return /^\d+(?:\.\d+)*$/.test(value) ? value : null;
    }

    function martellBroiumShaderPrecisionEnumMap() {
        return {
            VERTEX_SHADER: 35633,
            FRAGMENT_SHADER: 35632,
            LOW_FLOAT: 36336,
            MEDIUM_FLOAT: 36337,
            HIGH_FLOAT: 36338,
            LOW_INT: 36339,
            MEDIUM_INT: 36340,
            HIGH_INT: 36341
        };
    }

    function martellBroiumShaderPrecisionFormat(shaderPrecision) {
        var enumMap = martellBroiumShaderPrecisionEnumMap();
        var result = {};
        shaderPrecision = shaderPrecision || {};
        Object.keys(shaderPrecision).forEach(function(shaderName) {
            var shaderEnum = enumMap[shaderName];
            var precisionGroup = shaderPrecision[shaderName] || {};
            var compiled = {};
            Object.keys(precisionGroup).forEach(function(precisionName) {
                var precisionEnum = enumMap[precisionName];
                var value = precisionGroup[precisionName];
                if (!shaderEnum || !precisionEnum || !value)
                    return;
                compiled[String(precisionEnum)] = martellClonePlain(value);
            });
            if (shaderEnum && 0 < Object.keys(compiled).length)
                result[String(shaderEnum)] = compiled;
        });
        return result;
    }

    function martellBroiumWebglContextConfig(context) {
        context = context || {};
        var result = {};
        var getParameter = {};
        var parameters = context.parameterEnums || {};
        Object.keys(parameters).forEach(function(enumValue) {
            var item = parameters[enumValue];
            if (!item || !martellIsTypedProfileValue(item.value))
                return;
            getParameter[String(enumValue)] = {
                type: item.type || martellWebglParameterType(item.value, item.name || ""),
                value: item.value
            };
        });
        if (0 < Object.keys(getParameter).length)
            result.getParameter = getParameter;
        if (Array.isArray(context.supportedExtensions))
            result.extensions = {
                list: context.supportedExtensions.slice()
            };
        if (context.contextAttributes)
            result.contextAttributes = martellClonePlain(context.contextAttributes);
        var shaderPrecisionFormat = martellBroiumShaderPrecisionFormat(context.shaderPrecision);
        if (0 < Object.keys(shaderPrecisionFormat).length)
            result.shaderPrecisionFormat = shaderPrecisionFormat;
        return martellPruneProfile(result) || {};
    }

    function martellAddBroiumGenericArg(target, arg) {
        arg = martellString(arg).trim();
        if (!arg)
            return;
        target.args.push(arg);
        target.genericArgs.push(arg);
    }

    function martellAddBroiumGenericSwitchArg(target, name, value, source) {
        value = martellBroiumSwitchValue(value);
        if (null === value || "undefined" === typeof value)
            return false;
        if (Array.isArray(value) && !value.length)
            return false;
        martellAddBroiumGenericArg(target, "--" + name + "=" + martellBroiumSwitchArgValue(value));
        if (source)
            target.coverage.push({
                arg: name,
                source: source
            });
        return true;
    }

    function martellBuildBroiumWebglConfig(webglValues, canvasValues) {
        webglValues = webglValues || {};
        canvasValues = canvasValues || {};
        var contexts = {};
        Object.keys(webglValues.contexts || {}).forEach(function(contextName) {
            var context = martellBroiumWebglContextConfig(webglValues.contexts[contextName]);
            if (0 < Object.keys(context).length)
                contexts[contextName] = context;
        });
        var canvasHashes = webglValues.observed && webglValues.observed.canvasHashes || {};
        var result = {
            enable: !!webglValues.enabled,
            profile: webglValues.suggestedProfile || "",
            dataURL: {
                enable: true,
                mode: "png-text-chunk",
                observed: {
                    canvas2dDataUrlHash: canvasValues.dataUrlHash,
                    canvas2dImageDataHash: canvasValues.imageDataHash,
                    webglCanvasHashes: canvasHashes
                }
            },
            readPixels: {
                enable: !!webglValues.enabled,
                mode: "coordinate-stable-lowbit",
                strength: 1,
                stride: 23,
                samples: 1
            },
            contextCreation: {
                allowSoftwareWhenMajorPerformanceCaveat: false
            },
            contexts: contexts
        };
        return martellPruneProfile(result);
    }

    function martellBuildBroiumAudioConfig(audioValues) {
        audioValues = audioValues || {};
        var context = audioValues.context || {};
        var offline = audioValues.offline || {};
        var observed = !!(Object.keys(context).length || Object.keys(offline).length);
        return martellPruneProfile({
            enable: observed,
            mode: "sample-stable-lowbit",
            scope: "all",
            analyser: true,
            stride: 97,
            strength: 1,
            protectHeadSamples: 64,
            protectTailSamples: 512,
            observed: {
                context: context,
                offline: {
                    hash: offline.hash,
                    sampleRate: offline.sampleRate,
                    length: offline.length,
                    numberOfChannels: offline.numberOfChannels
                }
            }
        });
    }

    function martellBuildBroiumCanvas2dConfig(canvasValues) {
        canvasValues = canvasValues || {};
        return martellPruneProfile({
            enable: !!canvasValues.supported,
            mode: "stable-profile",
            observed: {
                dataUrlHash: canvasValues.dataUrlHash,
                imageDataHash: canvasValues.imageDataHash,
                dataUrlLength: canvasValues.dataUrlLength,
                textMetrics: canvasValues.textMetrics
            }
        });
    }

    function martellBuildBroiumNativeSurfaces(config) {
        config = config || {};
        var graphics = config.graphics || {};
        var active = ["identity", "navigator", "screen", "locale"];
        if (config.runtime)
            active.push("runtime");
        if (config.fonts)
            active.push("fonts");
        if (graphics.webgl)
            active.push("webgl");
        if (graphics.canvas2d)
            active.push("canvas");
        if (config.audio)
            active.push("audio");
        return {
            active: martellUnique(active),
            planned: [
                "media",
                "network",
                "storage",
                "security",
                "apiSurface",
                "webgpu"
            ]
        };
    }

    function martellBroiumCapability(surface, status, source, notes) {
        var result = {
            surface: surface,
            status: status,
            source: source
        };
        if (Array.isArray(notes) && notes.length)
            result.notes = notes.slice();
        return result;
    }

    function martellBuildBroiumCapabilityMatrix(chromium, nativeSurfaces) {
        var config = chromium && chromium.config || {};
        var graphics = config.graphics || {};
        var active = nativeSurfaces && nativeSurfaces.active || [];
        function activeSurface(name) {
            return -1 !== active.indexOf(name);
        }
        return [
            martellBroiumCapability("identity", activeSurface("identity") ? "native-supported" : "disabled", "config.identity.values"),
            martellBroiumCapability("navigator", activeSurface("navigator") ? "native-supported" : "disabled", "config.navigator.values"),
            martellBroiumCapability("screen", activeSurface("screen") ? "native-supported" : "disabled", "config.screen.values"),
            martellBroiumCapability("locale", activeSurface("locale") ? "native-supported" : "disabled", "config.locale.values"),
            martellBroiumCapability("runtime", config.runtime ? "partial-native" : "not-observed", "config.runtime.values", [
                "v8Keys hash-seed config is emitted; API surface gating still needs native work"
            ]),
            martellBroiumCapability("fonts", config.fonts ? "partial-native" : "not-observed", "config.fonts.values", [
                "font profile and explicit family allow-list are emitted"
            ]),
            martellBroiumCapability("graphics.webgl", graphics.webgl ? "partial-native" : "not-observed", "config.graphics.webgl.values", [
                "numeric getParameter, shaderPrecisionFormat, contextAttributes, extensions, readPixels, and dataURL policy are emitted"
            ]),
            martellBroiumCapability("graphics.canvas2d", graphics.canvas2d ? "partial-native" : "not-observed", "config.graphics.canvas2d.values", [
                "observed hashes are preserved; exact 2D text/layout replay remains native follow-up"
            ]),
            martellBroiumCapability("audio", config.audio ? "partial-native" : "not-observed", "config.audio.values", [
                "stable sample shaping config is emitted; exact offline hash replay remains native follow-up"
            ]),
            martellBroiumCapability("media", config.media ? "planned" : "not-observed", "config.media.values"),
            martellBroiumCapability("network", config.network ? "launch-policy" : "not-observed", "config.network.values"),
            martellBroiumCapability("storage", config.storage ? "planned" : "not-observed", "config.storage.values"),
            martellBroiumCapability("security", config.security ? "partial-native" : "not-observed", "config.security.values"),
            martellBroiumCapability("apiSurface", config.apiSurface ? "planned" : "not-observed", "config.apiSurface.values"),
            martellBroiumCapability("graphics.webgpu", graphics.webgpu ? "planned" : "not-observed", "config.graphics.webgpu.values")
        ];
    }

    function martellBuildBroiumFontSwitches(target, fontValues) {
        fontValues = fontValues || {};
        var profile = martellString(fontValues.profile).trim();
        if ("windows" === profile)
            profile = "windows_en_us";
        if (/^windows_zh/.test(profile))
            profile = "windows_zh_cn";
        if (/^macos/.test(profile))
            profile = "macos_en_us";
        if (/^linux/.test(profile))
            profile = "linux_en_us";
        martellAddBroiumSwitch(target, "brofp-font-profile", profile, "fonts.profile");
        var detected = [].concat(fontValues.detected || [], fontValues.maybeDetected || []);
        martellAddBroiumSwitch(target, "brofp-fonts", martellUnique(detected), "fonts.detected");
    }

    function martellBuildBroiumWindowArgs(target, screenValues) {
        screenValues = screenValues || {};
        var win = screenValues.window || {};
        var width = martellPositiveIntegerSwitchValue(win.outerWidth || screenValues.availWidth || screenValues.width);
        var height = martellPositiveIntegerSwitchValue(win.outerHeight || screenValues.availHeight || screenValues.height);
        if (width && height) {
            martellAddBroiumGenericSwitchArg(target, "window-size", [width, height], "screen.window.outerWidth,outerHeight");
            martellAddBroiumGenericSwitchArg(target, "window-position", [
                martellInteger(win.screenX, 0),
                martellInteger(win.screenY, 0)
            ], "screen.window.screenX,screenY");
            martellAddBroiumGenericArg(target, "--start-maximized");
        }
    }

    function martellBuildBroiumLaunchConfig(chromium) {
        chromium = chromium || {};
        var config = chromium.config || {};
        var identity = config.identity && config.identity.values || {};
        var browser = identity.browser || chromium.browser || {};
        var userAgentData = identity.userAgentData || {};
        var navigatorValues = config.navigator && config.navigator.values || {};
        var localeValues = config.locale && config.locale.values || {};
        var screenValues = config.screen && config.screen.values || {};
        var runtimeValues = config.runtime && config.runtime.values || {};
        var fontValues = config.fonts && config.fonts.values || {};
        var canvasValues = config.graphics && config.graphics.canvas2d && config.graphics.canvas2d.values || {};
        var webglValues = config.graphics && config.graphics.webgl && config.graphics.webgl.values || {};
        var audioValues = config.audio && config.audio.values || {};
        var networkValues = config.network && config.network.values || {};
        var nativeSurfaces = martellBuildBroiumNativeSurfaces(config);
        var target = {
            switches: {},
            args: [],
            genericArgs: [],
            coverage: []
        };
        martellAddBroiumSwitch(target, "brofp-brand", browser.brand, "identity.browser.brand");
        martellAddBroiumSwitch(target, "brofp-brand-version", martellVersionSwitchValue(browser.version), "identity.browser.version");
        martellAddBroiumSwitch(target, "brofp-platform", identity.platform, "identity.platform");
        martellAddBroiumSwitch(target, "brofp-ua-platform", userAgentData.platform || browser.platform, "identity.userAgentData.platform");
        martellAddBroiumSwitch(target, "brofp-platform-version", martellVersionSwitchValue(userAgentData.platformVersion || browser.platformVersion), "identity.userAgentData.platformVersion");
        martellAddBroiumSwitch(target, "brofp-architecture", userAgentData.architecture || browser.architecture, "identity.userAgentData.architecture");
        martellAddBroiumSwitch(target, "brofp-bitness", userAgentData.bitness || browser.bitness, "identity.userAgentData.bitness");
        if ("boolean" === typeof userAgentData.wow64)
            martellAddBroiumSwitch(target, "brofp-wow64", userAgentData.wow64 ? 1 : 0, "identity.userAgentData.wow64");
        martellAddBroiumSwitch(target, "brofp-form-factors", userAgentData.formFactors, "identity.userAgentData.formFactors");
        martellAddBroiumSwitch(target, "brofp-tz", localeValues.timeZone, "locale.timeZone");
        martellAddBroiumSwitch(target, "brofp-locale", localeValues.locale || localeValues.language, "locale.locale");
        martellAddBroiumSwitch(target, "brofp-languages", localeValues.languages, "locale.languages");
        martellAddBroiumGenericSwitchArg(target, "lang", localeValues.locale || localeValues.language, "locale.locale");
        var dnt = martellString(navigatorValues.doNotTrack).trim();
        if ("0" === dnt || "1" === dnt)
            martellAddBroiumSwitch(target, "brofp-dnt", dnt, "navigator.doNotTrack");
        martellAddBroiumSwitch(target, "brofp-cpu", martellPositiveIntegerSwitchValue(navigatorValues.hardwareConcurrency), "navigator.hardwareConcurrency");
        martellAddBroiumSwitch(target, "brofp-mem", martellPositiveIntegerSwitchValue(navigatorValues.deviceMemory), "navigator.deviceMemory");
        var screenWidth = martellPositiveIntegerSwitchValue(screenValues.width);
        var screenHeight = martellPositiveIntegerSwitchValue(screenValues.height);
        var screenScale = martellNumber(screenValues.devicePixelRatio, null);
        if (screenWidth && screenHeight && Number.isFinite(screenScale) && screenScale > 0)
            martellAddBroiumSwitch(target, "brofp-screen", [screenWidth, screenHeight, screenScale], "screen.width,height,devicePixelRatio");
        martellAddBroiumSwitch(target, "brofp-native-mode", true, "broium.default.nativeMode");
        martellAddBroiumSwitch(target, "brofp-native-surfaces", nativeSurfaces.active, "broium.nativeSurfaces.active");
        martellAddBroiumSwitch(target, "brofp-webgl-mode", webglValues.enabled ? "native" : null, "graphics.webgl.enabled");
        martellBuildBroiumFontSwitches(target, fontValues);
        martellBuildBroiumWindowArgs(target, screenValues);
        martellAddBroiumGenericArg(target, "--no-first-run");
        martellAddBroiumGenericArg(target, "--no-default-browser-check");
        if (networkValues.webrtc && networkValues.webrtc.recommendedIpHandlingPolicy)
            martellAddBroiumGenericArg(target, "--webrtc-ip-handling-policy=" + networkValues.webrtc.recommendedIpHandlingPolicy);
        target.coverage.push({
            config: "v8Keys",
            source: "runtime.v8"
        });
        if (config.graphics && config.graphics.webgl)
            target.coverage.push({
                config: "webgl",
                source: "graphics.webgl.values"
            });
        if (config.graphics && config.graphics.canvas2d)
            target.coverage.push({
                config: "canvas2d",
                source: "graphics.canvas2d.values"
            });
        if (config.audio)
            target.coverage.push({
                config: "audio",
                source: "audio.values"
            });
        var cfg = {
            identify: chromium.browser && chromium.browser.profileHash || "",
            switches: target.switches,
            v8Keys: {
                enable: true,
                mode: "hash-seed",
                seedMaterialHash: runtimeValues.v8 && runtimeValues.v8.seedMaterialHash || chromium.browser && chromium.browser.profileHash || ""
            },
            nativeSurfaces: nativeSurfaces,
            webgl: martellBuildBroiumWebglConfig(webglValues, canvasValues),
            canvas2d: martellBuildBroiumCanvas2dConfig(canvasValues),
            audio: martellBuildBroiumAudioConfig(audioValues),
            capabilities: martellBuildBroiumCapabilityMatrix(chromium, nativeSurfaces),
            args: target.genericArgs
        };
        return martellPruneProfile({
            schema: "broium.launch-config.v1",
            browser: chromium.browser,
            warnings: chromium.warnings || [],
            switches: target.switches,
            args: target.args,
            cfg: cfg,
            nativeSurfaces: nativeSurfaces,
            capabilities: cfg.capabilities,
            coverage: target.coverage,
            implementation: martellImplementationPlan("partial", "p0", [
                "compiled native-supported identity, UA brand/version, platform, locale/languages/Accept-Language, screen, CPU, memory, DNT, fonts, V8 hash seed, WebGL getParameter/extension/readback/dataURL config, canvas observations, and audio stable-shaping config"
            ], [
                "compile remaining UA OS-token cross-platform variants into native code",
                "add exact canvas 2D text/layout replay, exact offline audio hash replay, media/plugin/speech voice inventory, WebRTC candidate profile, storage quota, permissions, WebAuthn, WebGPU, and API-surface gates as native hooks land"
            ])
        });
    }

    function martellBuildRuntimeChromiumConfig(chromium) {
        chromium = chromium || {};
        var config = chromium.config || {};
        var runtime = {
            schema: "chromium.runtime-fingerprint-config.v1",
            browser: chromium.browser,
            warnings: chromium.warnings || [],
            config: {}
        };
        Object.keys(config).forEach(function(sectionName) {
            var section = config[sectionName];
            if (!section)
                return;
            if ("graphics" === sectionName) {
                runtime.config.graphics = {};
                Object.keys(section).forEach(function(graphicsName) {
                    if (section[graphicsName] && "undefined" !== typeof section[graphicsName].values)
                        runtime.config.graphics[graphicsName] = martellClonePlain(section[graphicsName].values);
                });
                return;
            }
            if ("undefined" !== typeof section.values)
                runtime.config[sectionName] = martellClonePlain(section.values);
        });
        var webrtc = runtime.config.network && runtime.config.network.webrtc;
        if (webrtc && Array.isArray(webrtc.candidates)) {
            webrtc.candidateCount = webrtc.candidates.length;
            delete webrtc.candidates;
            webrtc.candidatesIncluded = false;
        }
        return martellPruneProfile(runtime);
    }

    function martellBuildTrainingChromiumTarget(chromium) {
        return martellBuildRuntimeChromiumConfig(martellSanitizeChromiumNetworkTarget(chromium));
    }

    function martellBuildTrainingDataset(training) {
        training = training || {};
        var samples = Array.isArray(training.samples) ? training.samples : [];
        return martellPruneProfile({
            schema: "martell.llm-fingerprint-training-dataset.v1",
            source: training.source,
            privacy: training.privacy,
            records: samples.map(function(sample, index) {
                return {
                    id: (training.source && training.source.profileHash || "profile") + ":" + sample.task + ":" + index,
                    task: sample.task,
                    input: sample.input,
                    output: sample.output,
                    labels: sample.labels || []
                };
            }),
            facts: training.facts
        });
    }

    function martellBuildTrainingProfile(profile, chromium) {
        profile = profile || {};
        chromium = chromium || {};
        var config = chromium.config || {};
        var labels = martellCollectTrainingLabels(profile, chromium);
        var screenValues = config.screen && config.screen.values || {};
        var viewport = screenValues.viewport || {};
        var webglValues = config.graphics && config.graphics.webgl && config.graphics.webgl.values || {};
        var fontValues = config.fonts && config.fonts.values || {};
        var mediaValues = config.media && config.media.values || {};
        var networkValues = config.network && config.network.values || {};
        var securityValues = config.security && config.security.values || {};
        return martellPruneProfile({
            schema: "martell.llm-fingerprint-training.v1",
            source: {
                profileHash: chromium.browser && chromium.browser.profileHash,
                browser: chromium.browser,
                collector: profile.collector && {
                    name: profile.collector.name,
                    version: profile.collector.version,
                    valueIndexMapVersion: profile.collector.valueIndexMapVersion,
                    payloadHash: profile.collector.payloadHash
                }
            },
            privacy: {
                rawPayloadIncluded: false,
                rawValuesIncluded: false,
                networkIdentifiersIncluded: false,
                timestampsCoarsened: true,
                fullFontMetricsIncluded: false,
                fullIntlSupportedValuesIncluded: false
            },
            samples: [
                {
                    task: "generate-chromium-config-from-profile",
                    input: {
                        profile: martellBuildProfileTrainingInput(profile)
                    },
                    output: {
                        chromium: martellBuildTrainingChromiumTarget(chromium)
                    },
                    labels: [
                        martellTrainingLabel("p0", "contract-generation", "chromium", "generate the semantic Chromium fingerprint config from the collected browser profile", "produce the chromium contract with normalized capture-environment fields and privacy-safe network candidate handling")
                    ]
                },
                {
                    task: "review-fingerprint-consistency",
                    input: {
                        browser: chromium.browser,
                        navigator: config.navigator && config.navigator.values,
                        identity: config.identity && config.identity.values && {
                            userAgent: config.identity.values.userAgent,
                            userAgentData: config.identity.values.userAgentData
                        },
                        screen: {
                            width: screenValues.width,
                            height: screenValues.height,
                            availWidth: screenValues.availWidth,
                            availHeight: screenValues.availHeight,
                            window: screenValues.window,
                            observedWindow: screenValues.observedWindow,
                            mediaQueries: viewport.mediaQueries,
                            observedMediaQueries: viewport.observedMediaQueries,
                            normalization: viewport.normalization
                        },
                        locale: config.locale && config.locale.values && {
                            timeZone: config.locale.values.timeZone,
                            language: config.locale.values.language,
                            languages: config.locale.values.languages
                        },
                        webgl: {
                            preferredContext: webglValues.preferredContext,
                            suggestedProfile: webglValues.suggestedProfile,
                            observed: webglValues.observed,
                            contextNames: webglValues.contexts ? Object.keys(webglValues.contexts) : []
                        },
                        fonts: {
                            profile: fontValues.profile,
                            detected: fontValues.detected,
                            maybeDetected: fontValues.maybeDetected,
                            detectedHash: fontValues.detectedHash
                        }
                    },
                    labels: labels
                },
                {
                    task: "plan-browser-fingerprint-implementation",
                    input: {
                        browser: chromium.browser,
                        warnings: chromium.warnings,
                        sections: {
                            identity: martellTrainingSectionSummary(config.identity),
                            navigator: martellTrainingSectionSummary(config.navigator),
                            screen: martellTrainingSectionSummary(config.screen),
                            locale: martellTrainingSectionSummary(config.locale),
                            runtime: martellTrainingSectionSummary(config.runtime),
                            canvas2d: martellTrainingSectionSummary(config.graphics && config.graphics.canvas2d),
                            webgl: martellTrainingSectionSummary(config.graphics && config.graphics.webgl),
                            webgpu: martellTrainingSectionSummary(config.graphics && config.graphics.webgpu),
                            audio: martellTrainingSectionSummary(config.audio),
                            fonts: martellTrainingSectionSummary(config.fonts),
                            media: martellTrainingSectionSummary(config.media),
                            network: martellTrainingSectionSummary(config.network),
                            storage: martellTrainingSectionSummary(config.storage),
                            security: martellTrainingSectionSummary(config.security),
                            apiSurface: martellTrainingSectionSummary(config.apiSurface)
                        }
                    },
                    labels: martellBuildImplementationTrainingTasks(chromium)
                }
            ],
            facts: {
                warnings: chromium.warnings || [],
                pluginNames: Array.isArray(mediaValues.plugins) ? mediaValues.plugins.map(function(plugin) {
                    return Array.isArray(plugin) ? plugin[0] : "";
                }).filter(Boolean) : [],
                speechVoiceCount: mediaValues.speechVoices && mediaValues.speechVoices.count,
                webgpu: config.graphics && config.graphics.webgpu && {
                    available: config.graphics.webgpu.values && config.graphics.webgpu.values.available,
                    featureCount: config.graphics.webgpu.values && Array.isArray(config.graphics.webgpu.values.features) ? config.graphics.webgpu.values.features.length : null,
                    info: config.graphics.webgpu.values && config.graphics.webgpu.values.info
                },
                network: {
                    connection: networkValues.connection,
                    webrtcCandidateCount: networkValues.webrtc && Array.isArray(networkValues.webrtc.candidates) ? networkValues.webrtc.candidates.length : 0,
                    webrtcCandidatesIncluded: false
                },
                security: {
                    automationSignal: securityValues.automationSignal,
                    webAuthnAvailable: securityValues.webAuthn && securityValues.webAuthn.available
                }
            }
        });
    }

    function martellNowMs() {
        return "undefined" !== typeof performance && performance && "function" === typeof performance.now ? performance.now() : +new Date;
    }

    function martellErrorText(error) {
        try {
            return error && (error.name || error.message || error.toString()) || "error";
        } catch (ignored) {}
        return "error";
    }

    function martellPlainValue(value) {
        if ("undefined" === typeof value)
            return null;
        if (null === value || "string" === typeof value || "number" === typeof value || "boolean" === typeof value)
            return value;
        if (Array.isArray(value))
            return value.map(martellPlainValue);
        if (value && "function" === typeof value.forEach && "number" === typeof value.size) {
            var entries = [];
            value.forEach(function(item, key) {
                entries.push(key === item ? martellPlainValue(item) : [martellPlainValue(key), martellPlainValue(item)]);
            });
            return entries;
        }
        if (value && "number" === typeof value.length && "string" !== typeof value && "function" !== typeof value) {
            try {
                return Array.prototype.slice.call(value);
            } catch (error) {}
        }
        if (value && "object" === typeof value) {
            var result = {};
            Object.keys(value).forEach(function(key) {
                var item = value[key];
                if ("function" !== typeof item)
                    result[key] = martellPlainValue(item);
            });
            return result;
        }
        return martellString(value);
    }

    function martellIsTypedProfileValue(value) {
        return null !== value && "undefined" !== typeof value && !("number" === typeof value && !Number.isFinite(value));
    }

    function martellPruneProfileValue(value) {
        if (!martellIsTypedProfileValue(value))
            return void 0;
        if (Array.isArray(value)) {
            var array = [];
            value.forEach(function(item) {
                item = martellPruneProfileValue(item);
                if ("undefined" !== typeof item)
                    array.push(item);
            });
            return array;
        }
        if ("object" === typeof value) {
            var result = {};
            Object.keys(value).forEach(function(key) {
                var item = martellPruneProfileValue(value[key]);
                if ("undefined" !== typeof item)
                    result[key] = item;
            });
            return 0 < Object.keys(result).length ? result : void 0;
        }
        return value;
    }

    function martellPruneProfile(profile) {
        var pruned = martellPruneProfileValue(profile);
        return pruned && "object" === typeof pruned ? pruned : profile;
    }

    function martellHashBytes(value) {
        var hash = 2166136261;
        if (!value)
            return (hash >>> 0).toString(16).padStart(8, "0");
        for (var index = 0; index < value.length; index++) {
            hash ^= value[index] & 255;
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).padStart(8, "0");
    }

    function martellHashFloatArray(value) {
        var hash = 2166136261;
        if (!value)
            return (hash >>> 0).toString(16).padStart(8, "0");
        for (var index = 0; index < value.length; index++) {
            var sample = Math.round((value[index] + 1) * 1000000);
            hash ^= sample & 255;
            hash = Math.imul(hash, 16777619);
            hash ^= sample >>> 8 & 255;
            hash = Math.imul(hash, 16777619);
            hash ^= sample >>> 16 & 255;
            hash = Math.imul(hash, 16777619);
            hash ^= sample >>> 24 & 255;
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).padStart(8, "0");
    }

    function martellUnique(items) {
        var seen = {};
        return (items || []).filter(function(item) {
            item = martellString(item);
            if (!item || seen[item])
                return false;
            seen[item] = true;
            return true;
        });
    }

    function martellCollectNavigatorDirectProfile() {
        var nav = global.navigator || {};
        return {
            userAgent: martellString(nav.userAgent),
            appVersion: martellString(nav.appVersion),
            appName: martellString(nav.appName),
            appCodeName: martellString(nav.appCodeName),
            product: martellString(nav.product),
            productSub: martellString(nav.productSub),
            vendor: martellString(nav.vendor),
            vendorSub: martellString(nav.vendorSub),
            platform: martellString(nav.platform),
            hardwareConcurrency: "hardwareConcurrency" in nav ? nav.hardwareConcurrency : null,
            deviceMemory: "deviceMemory" in nav ? nav.deviceMemory : null,
            maxTouchPoints: "maxTouchPoints" in nav ? nav.maxTouchPoints : null,
            language: martellString(nav.language),
            languages: Array.isArray(nav.languages) ? nav.languages.slice() : [],
            cookieEnabled: "cookieEnabled" in nav ? !!nav.cookieEnabled : null,
            onLine: "onLine" in nav ? !!nav.onLine : null,
            doNotTrack: martellString(nav.doNotTrack),
            webdriver: "webdriver" in nav ? nav.webdriver : null,
            pdfViewerEnabled: "pdfViewerEnabled" in nav ? !!nav.pdfViewerEnabled : null,
            globalPrivacyControl: "globalPrivacyControl" in nav ? nav.globalPrivacyControl : null,
            buildID: martellString(nav.buildID),
            oscpu: martellString(nav.oscpu),
            standalone: "standalone" in nav ? nav.standalone : null,
            userActivation: global.navigator && global.navigator.userActivation ? martellPlainValue(global.navigator.userActivation) : null
        };
    }

    function martellCollectClientHintsDirectProfile() {
        var nav = global.navigator || {};
        var uaData = nav.userAgentData;
        if (!uaData)
            return Promise.resolve(null);
        var base = {
            brands: Array.isArray(uaData.brands) ? martellPlainValue(uaData.brands) : [],
            mobile: "mobile" in uaData ? !!uaData.mobile : null,
            platform: martellString(uaData.platform)
        };
        if ("function" !== typeof uaData.getHighEntropyValues)
            return Promise.resolve(base);
        var fields = ["architecture", "bitness", "model", "platformVersion", "fullVersionList", "wow64", "formFactors"];
        try {
            return uaData.getHighEntropyValues(fields)["catch"](function() {
                return uaData.getHighEntropyValues(fields.filter(function(field) {
                    return "formFactors" !== field;
                }));
            }).then(function(data) {
                data = data || {};
                Object.keys(data).forEach(function(key) {
                    base[key] = martellPlainValue(data[key]);
                });
                return base;
            }, function(error) {
                base.error = martellErrorText(error);
                return base;
            });
        } catch (error) {
            base.error = martellErrorText(error);
            return Promise.resolve(base);
        }
    }

    function martellCollectIntlProfile() {
        var profile = {
            supportedValues: {}
        };
        if ("undefined" === typeof Intl)
            return profile;
        try {
            profile.dateTimeFormat = Intl.DateTimeFormat().resolvedOptions();
        } catch (error) {}
        try {
            profile.numberFormat = Intl.NumberFormat().resolvedOptions();
        } catch (error) {}
        try {
            profile.collator = Intl.Collator().resolvedOptions();
        } catch (error) {}
        try {
            profile.pluralRules = Intl.PluralRules().resolvedOptions();
        } catch (error) {}
        if ("function" === typeof Intl.supportedValuesOf)
            ["calendar", "collation", "currency", "numberingSystem", "timeZone", "unit"].forEach(function(key) {
                try {
                    profile.supportedValues[key] = Intl.supportedValuesOf(key);
                    profile.supportedValues[key + "Hash"] = "fnv1a32:" + martellHashString(profile.supportedValues[key].join("|"));
                } catch (error) {
                    profile.supportedValues[key] = [];
                    profile.supportedValues[key + "Error"] = martellErrorText(error);
                }
            });
        return profile;
    }

    function martellCollectViewportProfile() {
        function media(query) {
            try {
                return "function" === typeof global.matchMedia ? !!global.matchMedia(query).matches : null;
            } catch (error) {
                return null;
            }
        }
        function cssSupports(property, value) {
            try {
                return global.CSS && "function" === typeof global.CSS.supports ? !!global.CSS.supports(property, value) : null;
            } catch (error) {
                return null;
            }
        }
        var visual = global.visualViewport || {};
        var doc = global.document || {};
        var element = doc.documentElement || {};
        return {
            screen: global.screen ? {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth,
                orientation: screen.orientation ? {
                    type: screen.orientation.type,
                    angle: screen.orientation.angle
                } : null
            } : null,
            window: {
                innerWidth: global.innerWidth,
                innerHeight: global.innerHeight,
                outerWidth: global.outerWidth,
                outerHeight: global.outerHeight,
                screenX: global.screenX,
                screenY: global.screenY,
                pageXOffset: global.pageXOffset,
                pageYOffset: global.pageYOffset,
                devicePixelRatio: global.devicePixelRatio
            },
            documentElement: {
                clientWidth: element.clientWidth || null,
                clientHeight: element.clientHeight || null,
                scrollWidth: element.scrollWidth || null,
                scrollHeight: element.scrollHeight || null
            },
            visualViewport: visual && "width" in visual ? {
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
                fontVariationSettings: cssSupports("font-variation-settings", "\"wght\" 500"),
                scrollbarGutter: cssSupports("scrollbar-gutter", "stable")
            }
        };
    }

    function martellCollectPluginsProfile() {
        var nav = global.navigator || {};
        var plugins = [];
        var mimeTypes = [];
        try {
            for (var index = 0; nav.plugins && index < nav.plugins.length; index++) {
                var plugin = nav.plugins[index];
                var item = {
                    name: martellString(plugin.name),
                    filename: martellString(plugin.filename),
                    description: martellString(plugin.description),
                    mimeTypes: []
                };
                for (var mimeIndex = 0; mimeIndex < plugin.length; mimeIndex++) {
                    item.mimeTypes.push({
                        type: martellString(plugin[mimeIndex].type),
                        suffixes: martellString(plugin[mimeIndex].suffixes),
                        description: martellString(plugin[mimeIndex].description)
                    });
                }
                plugins.push(item);
            }
        } catch (error) {}
        try {
            for (var mime = 0; nav.mimeTypes && mime < nav.mimeTypes.length; mime++) {
                mimeTypes.push({
                    type: martellString(nav.mimeTypes[mime].type),
                    suffixes: martellString(nav.mimeTypes[mime].suffixes),
                    description: martellString(nav.mimeTypes[mime].description),
                    enabledPlugin: nav.mimeTypes[mime].enabledPlugin ? martellString(nav.mimeTypes[mime].enabledPlugin.name) : ""
                });
            }
        } catch (error) {}
        return {
            plugins: plugins,
            mimeTypes: mimeTypes,
            pluginHash: "fnv1a32:" + martellHashString(JSON.stringify(plugins)),
            mimeTypeHash: "fnv1a32:" + martellHashString(JSON.stringify(mimeTypes))
        };
    }

    function martellCollectStorageDirectProfile() {
        function storageInfo(name) {
            try {
                var storage = global[name];
                return storage ? {
                    available: true,
                    length: storage.length
                } : {
                    available: false,
                    length: null
                };
            } catch (error) {
                return {
                    available: false,
                    length: null,
                    error: martellErrorText(error)
                };
            }
        }
        return {
            cookieEnabled: global.navigator && "cookieEnabled" in navigator ? !!navigator.cookieEnabled : null,
            localStorage: storageInfo("localStorage"),
            sessionStorage: storageInfo("sessionStorage"),
            indexedDB: "indexedDB" in global,
            caches: "caches" in global,
            serviceWorker: !!(global.navigator && navigator.serviceWorker),
            webkitRequestFileSystem: "webkitRequestFileSystem" in global,
            openDatabase: "openDatabase" in global
        };
    }

    function martellCollectStorageAsyncProfile() {
        var storage = global.navigator && navigator.storage;
        var result = {};
        var tasks = [];
        if (storage && "function" === typeof storage.estimate)
            try {
                tasks.push(storage.estimate().then(function(value) {
                    result.estimate = martellPlainValue(value);
                }, function(error) {
                    result.estimateError = martellErrorText(error);
                }));
            } catch (error) {
                result.estimateError = martellErrorText(error);
            }
        if (storage && "function" === typeof storage.persisted)
            try {
                tasks.push(storage.persisted().then(function(value) {
                    result.persisted = !!value;
                }, function(error) {
                    result.persistedError = martellErrorText(error);
                }));
            } catch (error) {
                result.persistedError = martellErrorText(error);
            }
        if (storage && "function" === typeof storage.getDirectory)
            result.hasStorageFoundationDirectory = true;
        return Promise.all(tasks).then(function() {
            return result;
        });
    }

    function martellCollectNetworkDirectProfile() {
        var nav = global.navigator || {};
        var connection = nav.connection || nav.mozConnection || nav.webkitConnection;
        return {
            online: "onLine" in nav ? !!nav.onLine : null,
            connection: connection ? {
                type: martellString(connection.type),
                effectiveType: martellString(connection.effectiveType),
                downlink: "downlink" in connection ? connection.downlink : null,
                downlinkMax: "downlinkMax" in connection ? connection.downlinkMax : null,
                rtt: "rtt" in connection ? connection.rtt : null,
                saveData: "saveData" in connection ? !!connection.saveData : null
            } : null
        };
    }

    function martellCollectApiSurfaceProfile() {
        var nav = global.navigator || {};
        return {
            runtime: {
                bigInt: "function" === typeof BigInt,
                atomics: "object" === typeof Atomics,
                sharedArrayBuffer: "function" === typeof SharedArrayBuffer,
                crossOriginIsolated: !!global.crossOriginIsolated,
                webAssembly: "object" === typeof WebAssembly,
                finalizationRegistry: "function" === typeof FinalizationRegistry,
                weakRef: "function" === typeof WeakRef,
                structuredClone: "function" === typeof global.structuredClone
            },
            browserGlobals: {
                chrome: "chrome" in global,
                trustedTypes: "trustedTypes" in global,
                scheduler: "scheduler" in global,
                caches: "caches" in global,
                cookieStore: "cookieStore" in global,
                launchQueue: "launchQueue" in global,
                navigation: "navigation" in global,
                portalHost: "portalHost" in global
            },
            crypto: {
                crypto: "crypto" in global,
                subtle: !!(global.crypto && crypto.subtle),
                randomUUID: !!(global.crypto && crypto.randomUUID)
            },
            streamsAndCodecs: {
                compressionStream: "CompressionStream" in global,
                decompressionStream: "DecompressionStream" in global,
                textEncoderStream: "TextEncoderStream" in global,
                textDecoderStream: "TextDecoderStream" in global,
                audioDecoder: "AudioDecoder" in global,
                audioEncoder: "AudioEncoder" in global,
                videoDecoder: "VideoDecoder" in global,
                videoEncoder: "VideoEncoder" in global,
                imageDecoder: "ImageDecoder" in global
            },
            graphics: {
                webgl: "WebGLRenderingContext" in global,
                webgl2: "WebGL2RenderingContext" in global,
                webgpu: !!nav.gpu,
                offscreenCanvas: "OffscreenCanvas" in global,
                createImageBitmap: "createImageBitmap" in global
            },
            devices: {
                mediaDevices: !!nav.mediaDevices,
                bluetooth: !!nav.bluetooth,
                usb: !!nav.usb,
                hid: !!nav.hid,
                serial: !!nav.serial,
                keyboard: !!nav.keyboard,
                virtualKeyboard: !!nav.virtualKeyboard,
                wakeLock: !!nav.wakeLock,
                locks: !!nav.locks,
                contacts: !!nav.contacts,
                credentials: !!nav.credentials,
                getGamepads: "function" === typeof nav.getGamepads,
                requestMIDIAccess: "function" === typeof nav.requestMIDIAccess
            },
            sensors: {
                absoluteOrientationSensor: "AbsoluteOrientationSensor" in global,
                accelerometer: "Accelerometer" in global,
                ambientLightSensor: "AmbientLightSensor" in global,
                gyroscope: "Gyroscope" in global,
                magnetometer: "Magnetometer" in global,
                relativeOrientationSensor: "RelativeOrientationSensor" in global
            },
            paymentsAndCredentials: {
                paymentRequest: "PaymentRequest" in global,
                applePaySession: "ApplePaySession" in global,
                publicKeyCredential: "PublicKeyCredential" in global,
                identityCredential: "IdentityCredential" in global,
                fedCm: !!(nav.credentials && "function" === typeof nav.credentials.get)
            }
        };
    }

    function martellCollectGamepadProfile() {
        if (!global.navigator || "function" !== typeof navigator.getGamepads)
            return null;
        try {
            var gamepads = Array.prototype.slice.call(navigator.getGamepads() || []).map(function(gamepad) {
                if (!gamepad)
                    return null;
                return {
                    id: martellString(gamepad.id),
                    index: gamepad.index,
                    connected: gamepad.connected,
                    mapping: martellString(gamepad.mapping),
                    axes: gamepad.axes ? gamepad.axes.length : 0,
                    buttons: gamepad.buttons ? gamepad.buttons.length : 0,
                    timestamp: gamepad.timestamp
                };
            }).filter(Boolean);
            return {
                count: gamepads.length,
                gamepads: gamepads,
                hash: "fnv1a32:" + martellHashString(JSON.stringify(gamepads))
            };
        } catch (error) {
            return {
                error: martellErrorText(error)
            };
        }
    }

    function martellCollectPerformanceProfile() {
        var perf = global.performance;
        if (!perf)
            return null;
        var profile = {
            timeOrigin: "timeOrigin" in perf ? perf.timeOrigin : null,
            now: "function" === typeof perf.now ? perf.now() : null
        };
        try {
            profile.memory = perf.memory ? martellPlainValue(perf.memory) : null;
        } catch (error) {}
        try {
            var navigation = "function" === typeof perf.getEntriesByType ? perf.getEntriesByType("navigation")[0] : null;
            profile.navigation = navigation ? {
                type: martellString(navigation.type),
                redirectCount: navigation.redirectCount,
                startTime: navigation.startTime,
                domContentLoadedEventEnd: navigation.domContentLoadedEventEnd,
                loadEventEnd: navigation.loadEventEnd,
                transferSize: navigation.transferSize,
                encodedBodySize: navigation.encodedBodySize,
                decodedBodySize: navigation.decodedBodySize,
                nextHopProtocol: martellString(navigation.nextHopProtocol)
            } : null;
        } catch (error) {}
        try {
            profile.eventCounts = perf.eventCounts ? martellPlainValue(perf.eventCounts) : null;
        } catch (error) {}
        return profile;
    }

    function martellCollectWebGpuProfile() {
        if (!global.navigator || !navigator.gpu || "function" !== typeof navigator.gpu.requestAdapter)
            return Promise.resolve(null);
        var started = martellNowMs();
        function readLimits(limits) {
            if (!limits)
                return null;
            var names = [
                "maxTextureDimension1D", "maxTextureDimension2D", "maxTextureDimension3D", "maxTextureArrayLayers", "maxBindGroups", "maxBindGroupsPlusVertexBuffers", "maxBindingsPerBindGroup", "maxDynamicUniformBuffersPerPipelineLayout", "maxDynamicStorageBuffersPerPipelineLayout", "maxSampledTexturesPerShaderStage", "maxSamplersPerShaderStage", "maxStorageBuffersPerShaderStage", "maxStorageTexturesPerShaderStage", "maxUniformBuffersPerShaderStage", "maxUniformBufferBindingSize", "maxStorageBufferBindingSize", "minUniformBufferOffsetAlignment", "minStorageBufferOffsetAlignment", "maxVertexBuffers", "maxBufferSize", "maxVertexAttributes", "maxVertexBufferArrayStride", "maxInterStageShaderComponents", "maxInterStageShaderVariables", "maxColorAttachments", "maxColorAttachmentBytesPerSample", "maxComputeWorkgroupStorageSize", "maxComputeInvocationsPerWorkgroup", "maxComputeWorkgroupSizeX", "maxComputeWorkgroupSizeY", "maxComputeWorkgroupSizeZ", "maxComputeWorkgroupsPerDimension"
            ];
            var result = {};
            names.forEach(function(name) {
                try {
                    if ("undefined" !== typeof limits[name])
                        result[name] = limits[name];
                } catch (error) {}
            });
            return 0 < Object.keys(result).length ? result : null;
        }
        function readInfo(info) {
            if (!info)
                return null;
            var names = ["vendor", "architecture", "device", "description", "subgroupMinSize", "subgroupMaxSize"];
            var result = {};
            names.forEach(function(name) {
                try {
                    if ("undefined" !== typeof info[name])
                        result[name] = info[name];
                } catch (error) {}
            });
            return 0 < Object.keys(result).length ? result : null;
        }
        try {
            return navigator.gpu.requestAdapter({
                powerPreference: "high-performance"
            }).then(function(adapter) {
                if (!adapter)
                    return {
                        available: false,
                        requestMs: Math.round(martellNowMs() - started)
                    };
                var result = {
                    available: true,
                    requestMs: Math.round(martellNowMs() - started),
                    isFallbackAdapter: "isFallbackAdapter" in adapter ? !!adapter.isFallbackAdapter : null,
                    features: adapter.features ? Array.from(adapter.features.values ? adapter.features.values() : adapter.features) : [],
                    limits: readLimits(adapter.limits)
                };
                if ("function" === typeof adapter.requestAdapterInfo)
                    return adapter.requestAdapterInfo().then(function(info) {
                        result.info = readInfo(info);
                        return result;
                    }, function(error) {
                        result.infoError = martellErrorText(error);
                        return result;
                    });
                result.info = readInfo(adapter.info);
                return result;
            }, function(error) {
                return {
                    error: martellErrorText(error)
                };
            });
        } catch (error) {
            return Promise.resolve({
                error: martellErrorText(error)
            });
        }
    }

    function martellCollectMediaCapabilitiesProfile() {
        var capabilities = global.navigator && navigator.mediaCapabilities;
        if (!capabilities || "function" !== typeof capabilities.decodingInfo)
            return Promise.resolve(null);
        var queries = [
            {
                name: "h264_1080p",
                config: {
                    type: "file",
                    video: {
                        contentType: 'video/mp4; codecs="avc1.42E01E"',
                        width: 1920,
                        height: 1080,
                        bitrate: 5000000,
                        framerate: 30
                    }
                }
            },
            {
                name: "vp9_1080p",
                config: {
                    type: "file",
                    video: {
                        contentType: 'video/webm; codecs="vp09.00.10.08"',
                        width: 1920,
                        height: 1080,
                        bitrate: 5000000,
                        framerate: 30
                    }
                }
            },
            {
                name: "av1_1080p",
                config: {
                    type: "file",
                    video: {
                        contentType: 'video/mp4; codecs="av01.0.05M.08"',
                        width: 1920,
                        height: 1080,
                        bitrate: 5000000,
                        framerate: 30
                    }
                }
            },
            {
                name: "aac",
                config: {
                    type: "file",
                    audio: {
                        contentType: 'audio/mp4; codecs="mp4a.40.2"',
                        channels: 2,
                        bitrate: 132700,
                        samplerate: 48000
                    }
                }
            },
            {
                name: "opus",
                config: {
                    type: "file",
                    audio: {
                        contentType: 'audio/webm; codecs="opus"',
                        channels: 2,
                        bitrate: 128000,
                        samplerate: 48000
                    }
                }
            }
        ];
        return Promise.all(queries.map(function(query) {
            try {
                return capabilities.decodingInfo(query.config).then(function(result) {
                    return {
                        name: query.name,
                        result: martellPlainValue(result)
                    };
                }, function(error) {
                    return {
                        name: query.name,
                        error: martellErrorText(error)
                    };
                });
            } catch (error) {
                return Promise.resolve({
                    name: query.name,
                    error: martellErrorText(error)
                });
            }
        })).then(function(results) {
            return {
                decoding: results,
                hash: "fnv1a32:" + martellHashString(JSON.stringify(results))
            };
        });
    }

    function martellCollectGrantedDeviceProfile() {
        var nav = global.navigator || {};
        var result = {};
        var tasks = [];
        [
            ["hid", nav.hid, "getDevices"],
            ["usb", nav.usb, "getDevices"],
            ["serial", nav.serial, "getPorts"]
        ].forEach(function(item) {
            var name = item[0];
            var api = item[1];
            var method = item[2];
            if (!api || "function" !== typeof api[method]) {
                result[name] = null;
                return;
            }
            try {
                tasks.push(api[method]().then(function(devices) {
                    result[name] = Array.prototype.slice.call(devices || []).map(function(device) {
                        return martellPlainValue(device);
                    });
                }, function(error) {
                    result[name] = {
                        error: martellErrorText(error)
                    };
                }));
            } catch (error) {
                result[name] = {
                    error: martellErrorText(error)
                };
            }
        });
        return Promise.all(tasks).then(function() {
            result.hash = "fnv1a32:" + martellHashString(JSON.stringify(result));
            return result;
        });
    }

    function martellCollectCanvasProfile() {
        if (!global.document || "function" !== typeof document.createElement)
            return null;
        var canvas = document.createElement("canvas");
        canvas.width = 280;
        canvas.height = 80;
        var ctx = null;
        try {
            ctx = canvas.getContext("2d", {
                willReadFrequently: true
            });
        } catch (error) {
            try {
                ctx = canvas.getContext("2d");
            } catch (ignored) {}
        }
        if (!ctx)
            return {
                supported: false
            };
        try {
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
        } catch (error) {
            return {
                supported: true,
                error: martellErrorText(error)
            };
        }
        var dataUrl = "";
        var imageHash = "";
        var textMetrics = {};
        try {
            dataUrl = canvas.toDataURL();
        } catch (error) {}
        try {
            var image = ctx.getImageData(0, 0, canvas.width, canvas.height);
            imageHash = "fnv1a32:" + martellHashBytes(image.data);
        } catch (error) {}
        try {
            var metrics = ctx.measureText("Martell fingerprint 12345");
            ["width", "actualBoundingBoxLeft", "actualBoundingBoxRight", "actualBoundingBoxAscent", "actualBoundingBoxDescent", "fontBoundingBoxAscent", "fontBoundingBoxDescent"].forEach(function(key) {
                if (key in metrics)
                    textMetrics[key] = metrics[key];
            });
        } catch (error) {}
        return {
            supported: true,
            width: canvas.width,
            height: canvas.height,
            dataUrlLength: dataUrl.length,
            dataUrlHash: dataUrl ? "fnv1a32:" + martellHashString(dataUrl) : "",
            imageDataHash: imageHash,
            textMetrics: textMetrics
        };
    }

    function martellCollectFontProfile() {
        if (!global.document || "function" !== typeof document.createElement)
            return null;
        var candidates = [
            "Arial", "Arial Black", "Calibri", "Cambria", "Candara", "Comic Sans MS", "Consolas", "Constantia", "Courier New", "Georgia", "Impact", "Lucida Console", "Lucida Sans Unicode", "Microsoft Sans Serif", "Segoe UI", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana",
            "Microsoft YaHei", "Microsoft JhengHei", "SimSun", "NSimSun", "SimHei", "KaiTi", "FangSong", "DengXian", "Meiryo", "Yu Gothic", "Malgun Gothic",
            "Helvetica", "Helvetica Neue", "Avenir", "Avenir Next", "Menlo", "Monaco", "PingFang SC", "PingFang TC", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Songti SC", "STHeiti", "STKaiti", "Geeza Pro",
            "Noto Sans", "Noto Sans CJK SC", "Noto Sans CJK TC", "Noto Serif", "Roboto", "Ubuntu", "Cantarell", "DejaVu Sans", "DejaVu Serif", "Liberation Sans", "Liberation Serif"
        ];
        var text = "mmmmmmmmmmlliWW@@@12345";
        var canvas = document.createElement("canvas");
        canvas.width = 600;
        canvas.height = 40;
        var ctx = canvas.getContext && canvas.getContext("2d");
        if (!ctx)
            return null;
        var generics = ["monospace", "sans-serif", "serif"];
        var base = {};
        generics.forEach(function(generic) {
            ctx.font = "72px " + generic;
            base[generic] = ctx.measureText(text).width;
        });
        var detected = [];
        var checked = [];
        candidates.forEach(function(font) {
            var widths = {};
            var available = false;
            generics.forEach(function(generic) {
                ctx.font = "72px \"" + font + "\"," + generic;
                widths[generic] = ctx.measureText(text).width;
                if (Math.abs(widths[generic] - base[generic]) > 0.01)
                    available = true;
            });
            var cssCheck = null;
            try {
                cssCheck = document.fonts && "function" === typeof document.fonts.check ? document.fonts.check("12px \"" + font + "\"") : null;
            } catch (error) {}
            if (available)
                detected.push(font);
            checked.push({
                name: font,
                availableByCanvas: available,
                cssCheck: cssCheck,
                widths: widths
            });
        });
        return {
            method: "canvas-width-diff",
            candidates: candidates,
            detected: detected,
            detectedHash: "fnv1a32:" + martellHashString(detected.join("|")),
            checked: checked
        };
    }

    function martellWebglParameter(gl, key) {
        try {
            return martellPlainValue(gl.getParameter(key));
        } catch (error) {
            return {
                error: martellErrorText(error)
            };
        }
    }

    function martellShaderPrecision(gl, shader, precision) {
        try {
            var value = gl.getShaderPrecisionFormat(shader, precision);
            return value ? {
                rangeMin: value.rangeMin,
                rangeMax: value.rangeMax,
                precision: value.precision
            } : null;
        } catch (error) {
            return null;
        }
    }

    function martellCollectWebglContextProfile(contextName) {
        if (!global.document || "function" !== typeof document.createElement)
            return {
                context: contextName,
                supported: false
            };
        var canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        var gl = null;
        try {
            gl = canvas.getContext(contextName, {
                alpha: true,
                antialias: true,
                depth: true,
                failIfMajorPerformanceCaveat: false,
                preserveDrawingBuffer: true,
                stencil: true
            });
        } catch (error) {}
        if (!gl)
            return {
                context: contextName,
                supported: false
            };
        var parameters = {};
        [
            "VERSION", "SHADING_LANGUAGE_VERSION", "VENDOR", "RENDERER", "ALIASED_LINE_WIDTH_RANGE", "ALIASED_POINT_SIZE_RANGE", "ALPHA_BITS", "BLUE_BITS", "DEPTH_BITS", "GREEN_BITS", "RED_BITS", "STENCIL_BITS", "MAX_COMBINED_TEXTURE_IMAGE_UNITS", "MAX_CUBE_MAP_TEXTURE_SIZE", "MAX_FRAGMENT_UNIFORM_VECTORS", "MAX_RENDERBUFFER_SIZE", "MAX_TEXTURE_IMAGE_UNITS", "MAX_TEXTURE_SIZE", "MAX_VARYING_VECTORS", "MAX_VERTEX_ATTRIBS", "MAX_VERTEX_TEXTURE_IMAGE_UNITS", "MAX_VERTEX_UNIFORM_VECTORS", "MAX_VIEWPORT_DIMS"
        ].forEach(function(name) {
            if (name in gl)
                parameters[name] = martellWebglParameter(gl, gl[name]);
        });
        [
            "MAX_3D_TEXTURE_SIZE", "MAX_ARRAY_TEXTURE_LAYERS", "MAX_CLIENT_WAIT_TIMEOUT_WEBGL", "MAX_COLOR_ATTACHMENTS", "MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS", "MAX_COMBINED_UNIFORM_BLOCKS", "MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS", "MAX_DRAW_BUFFERS", "MAX_ELEMENT_INDEX", "MAX_ELEMENTS_INDICES", "MAX_ELEMENTS_VERTICES", "MAX_FRAGMENT_INPUT_COMPONENTS", "MAX_FRAGMENT_UNIFORM_BLOCKS", "MAX_FRAGMENT_UNIFORM_COMPONENTS", "MAX_PROGRAM_TEXEL_OFFSET", "MAX_SAMPLES", "MAX_SERVER_WAIT_TIMEOUT", "MAX_TEXTURE_LOD_BIAS", "MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS", "MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS", "MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS", "MAX_UNIFORM_BLOCK_SIZE", "MAX_UNIFORM_BUFFER_BINDINGS", "MAX_VARYING_COMPONENTS", "MAX_VERTEX_OUTPUT_COMPONENTS", "MAX_VERTEX_UNIFORM_BLOCKS", "MAX_VERTEX_UNIFORM_COMPONENTS", "MIN_PROGRAM_TEXEL_OFFSET"
        ].forEach(function(name) {
            if (name in gl)
                parameters[name] = martellWebglParameter(gl, gl[name]);
        });
        try {
            var debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
            if (debugInfo) {
                parameters.UNMASKED_VENDOR_WEBGL = martellWebglParameter(gl, debugInfo.UNMASKED_VENDOR_WEBGL);
                parameters.UNMASKED_RENDERER_WEBGL = martellWebglParameter(gl, debugInfo.UNMASKED_RENDERER_WEBGL);
            }
        } catch (error) {}
        try {
            var anisotropy = gl.getExtension("EXT_texture_filter_anisotropic") || gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic") || gl.getExtension("MOZ_EXT_texture_filter_anisotropic");
            if (anisotropy)
                parameters.MAX_TEXTURE_MAX_ANISOTROPY_EXT = martellWebglParameter(gl, anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        } catch (error) {}
        var precision = {};
        [["VERTEX_SHADER", gl.VERTEX_SHADER], ["FRAGMENT_SHADER", gl.FRAGMENT_SHADER]].forEach(function(shader) {
            precision[shader[0]] = {};
            [["LOW_FLOAT", gl.LOW_FLOAT], ["MEDIUM_FLOAT", gl.MEDIUM_FLOAT], ["HIGH_FLOAT", gl.HIGH_FLOAT], ["LOW_INT", gl.LOW_INT], ["MEDIUM_INT", gl.MEDIUM_INT], ["HIGH_INT", gl.HIGH_INT]].forEach(function(item) {
                precision[shader[0]][item[0]] = martellShaderPrecision(gl, shader[1], item[1]);
            });
        });
        var pixelsHash = "";
        try {
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0.123, 0.456, 0.789, 1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            var pixels = new Uint8Array(canvas.width * canvas.height * 4);
            gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            pixelsHash = "fnv1a32:" + martellHashBytes(pixels);
        } catch (error) {}
        var extensions = [];
        try {
            extensions = gl.getSupportedExtensions() || [];
        } catch (error) {}
        return {
            context: contextName,
            supported: true,
            constructorName: gl.constructor && gl.constructor.name || "",
            contextAttributes: "function" === typeof gl.getContextAttributes ? martellPlainValue(gl.getContextAttributes()) : null,
            parameters: parameters,
            shaderPrecision: precision,
            supportedExtensions: extensions,
            supportedExtensionsHash: "fnv1a32:" + martellHashString(extensions.join("|")),
            clearPixelsHash: pixelsHash
        };
    }

    function martellCollectWebglExtendedProfile() {
        var contexts = [];
        ["webgl2", "webgl", "experimental-webgl"].forEach(function(name) {
            var profile = martellCollectWebglContextProfile(name);
            contexts.push(profile);
        });
        return {
            contexts: contexts
        };
    }

    function martellCollectAudioExtendedProfile(options) {
        var result = {
            context: null,
            offline: null
        };
        var AudioContextCtor = global.AudioContext || global.webkitAudioContext;
        if (AudioContextCtor) {
            try {
                var audioContext = new AudioContextCtor;
                result.context = {
                    sampleRate: audioContext.sampleRate,
                    baseLatency: "baseLatency" in audioContext ? audioContext.baseLatency : null,
                    outputLatency: "outputLatency" in audioContext ? audioContext.outputLatency : null,
                    state: martellString(audioContext.state)
                };
                if ("function" === typeof audioContext.close)
                    audioContext.close()["catch"](function() {});
            } catch (error) {
                result.context = {
                    error: martellErrorText(error)
                };
            }
        }
        if (!options.enableOfflineAudioProfile)
            return Promise.resolve(result);
        var OfflineAudioContextCtor = global.OfflineAudioContext || global.webkitOfflineAudioContext;
        if (!OfflineAudioContextCtor)
            return Promise.resolve(result);
        return new Promise(function(resolve) {
            try {
                var sampleRate = 44100;
                var offline = new OfflineAudioContextCtor(1, sampleRate, sampleRate);
                var oscillator = offline.createOscillator();
                var compressor = offline.createDynamicsCompressor();
                oscillator.type = "triangle";
                oscillator.frequency.value = 10000;
                compressor.threshold.value = -50;
                compressor.knee.value = 40;
                compressor.ratio.value = 12;
                compressor.attack.value = 0;
                compressor.release.value = 0.25;
                oscillator.connect(compressor);
                compressor.connect(offline.destination);
                oscillator.start(0);
                offline.oncomplete = function(event) {
                    try {
                        var buffer = event.renderedBuffer || event.target && event.target.renderedBuffer;
                        var data = buffer.getChannelData(0);
                        var min = Infinity;
                        var max = -Infinity;
                        var sum = 0;
                        for (var index = 0; index < data.length; index++) {
                            var sample = data[index];
                            if (sample < min)
                                min = sample;
                            if (sample > max)
                                max = sample;
                            sum += sample;
                        }
                        result.offline = {
                            length: data.length,
                            sampleRate: buffer.sampleRate,
                            numberOfChannels: buffer.numberOfChannels,
                            hash: "fnv1a32:" + martellHashFloatArray(data),
                            sum: sum,
                            min: min,
                            max: max,
                            firstSamples: Array.prototype.slice.call(data, 0, 12)
                        };
                    } catch (error) {
                        result.offline = {
                            error: martellErrorText(error)
                        };
                    }
                    resolve(result);
                };
                var render = offline.startRendering();
                if (render && "function" === typeof render.then)
                    render.then(function(buffer) {
                        offline.oncomplete({
                            renderedBuffer: buffer
                        });
                    }, function(error) {
                        result.offline = {
                            error: martellErrorText(error)
                        };
                        resolve(result);
                    });
            } catch (error) {
                result.offline = {
                    error: martellErrorText(error)
                };
                resolve(result);
            }
        });
    }

    function martellCollectMediaDevicesProfile() {
        var mediaDevices = global.navigator && navigator.mediaDevices;
        if (!mediaDevices || "function" !== typeof mediaDevices.enumerateDevices)
            return Promise.resolve(null);
        try {
            return mediaDevices.enumerateDevices().then(function(devices) {
                devices = Array.prototype.slice.call(devices || []).map(function(device) {
                    return {
                        kind: martellString(device.kind),
                        label: martellString(device.label),
                        deviceId: martellString(device.deviceId),
                        groupId: martellString(device.groupId)
                    };
                });
                return {
                    devices: devices,
                    count: devices.length,
                    kinds: devices.reduce(function(acc, device) {
                        acc[device.kind] = (acc[device.kind] || 0) + 1;
                        return acc;
                    }, {}),
                    devicesHash: "fnv1a32:" + martellHashString(JSON.stringify(devices))
                };
            }, function(error) {
                return {
                    error: martellErrorText(error)
                };
            });
        } catch (error) {
            return {
                error: martellErrorText(error)
            };
        }
    }

    function martellCollectBatteryProfile() {
        if (!global.navigator || "function" !== typeof navigator.getBattery)
            return Promise.resolve(null);
        try {
            return navigator.getBattery().then(function(battery) {
                return {
                    charging: battery.charging,
                    chargingTime: battery.chargingTime,
                    dischargingTime: battery.dischargingTime,
                    level: battery.level
                };
            }, function(error) {
                return {
                    error: martellErrorText(error)
                };
            });
        } catch (error) {
            return {
                error: martellErrorText(error)
            };
        }
    }

    function martellCollectBluetoothProfile() {
        if (!global.navigator || !navigator.bluetooth || "function" !== typeof navigator.bluetooth.getAvailability)
            return Promise.resolve(null);
        try {
            return navigator.bluetooth.getAvailability().then(function(available) {
                return {
                    available: !!available
                };
            }, function(error) {
                return {
                    error: martellErrorText(error)
                };
            });
        } catch (error) {
            return {
                error: martellErrorText(error)
            };
        }
    }

    function martellCollectKeyboardProfile() {
        if (!global.navigator || !navigator.keyboard || "function" !== typeof navigator.keyboard.getLayoutMap)
            return Promise.resolve(null);
        try {
            return navigator.keyboard.getLayoutMap().then(function(layout) {
                var entries = [];
                layout.forEach(function(value, key) {
                    entries.push([key, value]);
                });
                entries.sort(function(a, b) {
                    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
                });
                return {
                    entries: entries,
                    hash: "fnv1a32:" + martellHashString(JSON.stringify(entries))
                };
            }, function(error) {
                return {
                    error: martellErrorText(error)
                };
            });
        } catch (error) {
            return {
                error: martellErrorText(error)
            };
        }
    }

    function martellCollectPermissionsProfile() {
        if (!global.navigator || !navigator.permissions || "function" !== typeof navigator.permissions.query)
            return Promise.resolve(null);
        var descriptors = [
            {name: "accelerometer"},
            {name: "ambient-light-sensor"},
            {name: "background-sync"},
            {name: "camera"},
            {name: "clipboard-read"},
            {name: "clipboard-write"},
            {name: "geolocation"},
            {name: "gyroscope"},
            {name: "magnetometer"},
            {name: "microphone"},
            {name: "midi"},
            {name: "notifications"},
            {name: "persistent-storage"},
            {name: "push", userVisibleOnly: true},
            {name: "speaker-selection"}
        ];
        return Promise.all(descriptors.map(function(descriptor) {
            try {
                return navigator.permissions.query(descriptor).then(function(status) {
                    return [descriptor.name, status.state || ""];
                }, function(error) {
                    return [descriptor.name, "error:" + martellErrorText(error)];
                });
            } catch (error) {
                return [descriptor.name, "error:" + martellErrorText(error)];
            }
        })).then(function(items) {
            return items.reduce(function(acc, item) {
                acc[item[0]] = item[1];
                return acc;
            }, {});
        });
    }

    function martellCollectPermissionSurfaceProfile() {
        if (!global.navigator)
            return null;
        return {
            permissionsApi: !!navigator.permissions,
            queryFunction: !!(navigator.permissions && "function" === typeof navigator.permissions.query),
            statusNotQueried: true
        };
    }

    function martellCollectWebAuthnProfile() {
        var credential = global.PublicKeyCredential;
        if (!credential)
            return Promise.resolve(null);
        var result = {
            available: true
        };
        var tasks = [];
        if ("function" === typeof credential.getClientCapabilities)
            try {
                tasks.push(credential.getClientCapabilities().then(function(value) {
                    result.clientCapabilities = martellPlainValue(value);
                }, function(error) {
                    result.clientCapabilitiesError = martellErrorText(error);
                }));
            } catch (error) {
                result.clientCapabilitiesError = martellErrorText(error);
            }
        if ("function" === typeof credential.isUserVerifyingPlatformAuthenticatorAvailable)
            try {
                tasks.push(credential.isUserVerifyingPlatformAuthenticatorAvailable().then(function(value) {
                    result.userVerifyingPlatformAuthenticatorAvailable = !!value;
                }, function(error) {
                    result.userVerifyingPlatformAuthenticatorError = martellErrorText(error);
                }));
            } catch (error) {
                result.userVerifyingPlatformAuthenticatorError = martellErrorText(error);
            }
        if ("function" === typeof credential.isConditionalMediationAvailable)
            try {
                tasks.push(credential.isConditionalMediationAvailable().then(function(value) {
                    result.conditionalMediationAvailable = !!value;
                }, function(error) {
                    result.conditionalMediationError = martellErrorText(error);
                }));
            } catch (error) {
                result.conditionalMediationError = martellErrorText(error);
            }
        return Promise.all(tasks).then(function() {
            return result;
        });
    }

    function martellCollectSpeechVoicesProfile() {
        if (!global.speechSynthesis || "function" !== typeof speechSynthesis.getVoices)
            return Promise.resolve(null);
        function readVoices() {
            return speechSynthesis.getVoices().map(function(voice) {
                return {
                    default: !!voice.default,
                    lang: martellString(voice.lang),
                    localService: !!voice.localService,
                    name: martellString(voice.name),
                    voiceURI: martellString(voice.voiceURI)
                };
            });
        }
        var voices = readVoices();
        if (voices.length)
            return Promise.resolve({
                voices: voices,
                count: voices.length,
                hash: "fnv1a32:" + martellHashString(JSON.stringify(voices))
            });
        return new Promise(function(resolve) {
            var done = false;
            function finish() {
                if (done)
                    return;
                done = true;
                try {
                    speechSynthesis.removeEventListener("voiceschanged", finish);
                } catch (error) {}
                var list = readVoices();
                resolve({
                    voices: list,
                    count: list.length,
                    hash: "fnv1a32:" + martellHashString(JSON.stringify(list))
                });
            }
            try {
                speechSynthesis.addEventListener("voiceschanged", finish);
            } catch (error) {}
            global.setTimeout(finish, 500);
        });
    }

    function martellApplyChromiumWarnings(chromium, profile) {
        if (!chromium || !profile || !profile.quality)
            return chromium;
        var base = Array.isArray(profile.quality.warnings) ? profile.quality.warnings : [];
        var asyncWarnings = Array.isArray(profile.quality.asyncWarnings) ? profile.quality.asyncWarnings : [];
        chromium.warnings = martellUnique((chromium.warnings || []).concat(base, asyncWarnings));
        return chromium;
    }

    function martellSetProfilePath(profile, path, value) {
        if (!profile || null === value || "undefined" === typeof value)
            return;
        var target = profile;
        for (var index = 0; index < path.length - 1; index++) {
            if (!target[path[index]] || "object" !== typeof target[path[index]])
                target[path[index]] = {};
            target = target[path[index]];
        }
        target[path[path.length - 1]] = value;
    }

    function martellRunProfileTask(task, state, warnings) {
        return Promise.resolve().then(task.collect).then(function(value) {
            if (state.active)
                martellSetProfilePath(state.profile, task.path, value);
        }, function(error) {
            if (state.active)
                warnings.push(task.name + ":" + martellErrorText(error));
        });
    }

    function martellWaitForProfileTasks(profile, tasks, timeoutMs, warnings) {
        if (!tasks.length)
            return Promise.resolve(true);
        var state = {
            active: true,
            profile: profile
        };
        var all = Promise.all(tasks.map(function(task) {
            return martellRunProfileTask(task, state, warnings);
        }));
        if (!(timeoutMs > 0))
            return all.then(function() {
                return true;
            });
        return new Promise(function(resolve) {
            var settled = false;
            var timer = global.setTimeout(function() {
                if (settled)
                    return;
                settled = true;
                state.active = false;
                warnings.push("async-profile-timeout");
                resolve(false);
            }, timeoutMs);
            all.then(function() {
                if (settled)
                    return;
                settled = true;
                global.clearTimeout(timer);
                resolve(true);
            }, function() {
                if (settled)
                    return;
                settled = true;
                global.clearTimeout(timer);
                resolve(true);
            });
        });
    }

    function martellCollectSyncProfile(profile, options) {
        martellSetProfilePath(profile, ["navigator", "direct"], martellCollectNavigatorDirectProfile());
        martellSetProfilePath(profile, ["locale", "intl"], martellCollectIntlProfile());
        martellSetProfilePath(profile, ["screen", "viewport"], martellCollectViewportProfile());
        martellSetProfilePath(profile, ["media", "pluginsDetailed"], martellCollectPluginsProfile());
        martellSetProfilePath(profile, ["storage", "direct"], martellCollectStorageDirectProfile());
        martellSetProfilePath(profile, ["network", "direct"], martellCollectNetworkDirectProfile());
        martellSetProfilePath(profile, ["apiSurface"], martellCollectApiSurfaceProfile());
        martellSetProfilePath(profile, ["security", "permissionSurface"], martellCollectPermissionSurfaceProfile());
        martellSetProfilePath(profile, ["hardware", "gamepads"], martellCollectGamepadProfile());
        martellSetProfilePath(profile, ["performance"], martellCollectPerformanceProfile());
        martellSetProfilePath(profile, ["canvas"], martellCollectCanvasProfile());
        if (options.enableFontProfile)
            martellSetProfilePath(profile, ["fonts"], martellCollectFontProfile());
        if (options.enableWebglProfile)
            martellSetProfilePath(profile, ["webgl", "extended"], martellCollectWebglExtendedProfile());
    }

    function martellAugmentFingerprintResult(result, options) {
        if (!result || "object" !== typeof result)
            return Promise.resolve(result);
        try {
            result.profile = martellBuildBrowserProfile(result, options);
            result.chromium = martellBuildChromiumProfile(result.profile, options);
            result.broium = martellBuildBroiumLaunchConfig(result.chromium);
            result.training = martellBuildTrainingProfile(result.profile, result.chromium);
            result.trainingDataset = martellBuildTrainingDataset(result.training);
        } catch (error) {
            result.profileError = error && (error.message || error.toString()) || "profile-build-error";
            return Promise.resolve(result);
        }
        var profile = result.profile;
        profile.collector.asyncProfile = {
            enabled: !!options.enableAsyncProfile,
            timeoutMs: options.profileExtraTimeout,
            completed: !options.enableAsyncProfile,
            durationMs: 0
        };
        profile.quality.asyncWarnings = [];
        var started = martellNowMs();
        try {
            martellCollectSyncProfile(profile, options);
        } catch (error) {
            profile.quality.asyncWarnings.push("sync-profile:" + martellErrorText(error));
        }
        if (!options.enableAsyncProfile) {
            result.chromium = martellApplyChromiumWarnings(martellBuildChromiumProfile(profile, options), profile);
            result.broium = martellBuildBroiumLaunchConfig(result.chromium);
            result.training = martellBuildTrainingProfile(profile, result.chromium);
            result.trainingDataset = martellBuildTrainingDataset(result.training);
            result.profile = martellPruneProfile(profile);
            result.chromium = martellPruneProfile(result.chromium);
            result.broium = martellPruneProfile(result.broium);
            result.training = martellPruneProfile(result.training);
            result.trainingDataset = martellPruneProfile(result.trainingDataset);
            return Promise.resolve(result);
        }
        var tasks = [
            {name: "client-hints", path: ["clientHints", "direct"], collect: martellCollectClientHintsDirectProfile},
            {name: "storage", path: ["storage", "async"], collect: martellCollectStorageAsyncProfile},
            {name: "audio", path: ["audio", "extended"], collect: function() {
                return martellCollectAudioExtendedProfile(options);
            }},
            {name: "media-devices", path: ["media", "devices"], collect: martellCollectMediaDevicesProfile},
            {name: "battery", path: ["hardware", "battery"], collect: martellCollectBatteryProfile},
            {name: "bluetooth", path: ["hardware", "bluetooth"], collect: martellCollectBluetoothProfile},
            {name: "keyboard", path: ["hardware", "keyboard"], collect: martellCollectKeyboardProfile},
            {name: "webauthn", path: ["security", "webAuthn"], collect: martellCollectWebAuthnProfile},
            {name: "speech-voices", path: ["media", "speechVoicesDetailed"], collect: martellCollectSpeechVoicesProfile},
            {name: "webgpu", path: ["webgpu"], collect: martellCollectWebGpuProfile},
            {name: "media-capabilities", path: ["media", "capabilities"], collect: martellCollectMediaCapabilitiesProfile},
            {name: "granted-devices", path: ["hardware", "grantedDevices"], collect: martellCollectGrantedDeviceProfile}
        ];
        if (options.enablePermissionStatusProfile)
            tasks.push({name: "permissions", path: ["security", "permissions"], collect: martellCollectPermissionsProfile});
        return martellWaitForProfileTasks(profile, tasks, options.profileExtraTimeout, profile.quality.asyncWarnings).then(function(completed) {
            profile.collector.asyncProfile.completed = completed;
            profile.collector.asyncProfile.durationMs = Math.round(martellNowMs() - started);
            result.chromium = martellApplyChromiumWarnings(martellBuildChromiumProfile(profile, options), profile);
            result.broium = martellBuildBroiumLaunchConfig(result.chromium);
            result.training = martellBuildTrainingProfile(profile, result.chromium);
            result.trainingDataset = martellBuildTrainingDataset(result.training);
            result.profile = martellPruneProfile(profile);
            result.chromium = martellPruneProfile(result.chromium);
            result.broium = martellPruneProfile(result.broium);
            result.training = martellPruneProfile(result.training);
            result.trainingDataset = martellPruneProfile(result.trainingDataset);
            return result;
        });
    }

            (function() {
                global.MartellFingerprintInit = function(Ea, N) {
                    function Jb(h, b) {
                        function d() {
                            this.input = null;
                            this.fa = this.B = this.P = 0;
                            this.output = null;
                            this.ga = this.o = this.J = 0;
                            this.ua = "";
                            this.state = null;
                            this.Ba = 2;
                            this.m = 0
                        }
                        function c(a, k, e, l, p, r) {
                            if (!a)
                                return -2;
                            var v = 1;
                            -1 === k && (k = 6);
                            0 > l ? (v = 0,
                            l = -l) : 15 < l && (v = 2,
                            l -= 16);
                            if (1 > p || 9 < p || 8 !== e || 8 > l || 15 < l || 0 > k || 9 < k || 0 > r || 4 < r || 8 === l && 1 !== v)
                                return R(a, -2);
                            8 === l && (l = 9);
                            var u = new oc;
                            a.state = u;
                            u.h = a;
                            u.status = 42;
                            u.G = v;
                            u.j = null;
                            u.Ha = l;
                            u.l = 1 << u.Ha;
                            u.aa = u.l - 1;
                            u.Da = p + 7;
                            u.ra = 1 << u.Da;
                            u.Ma = u.ra - 1;
                            u.Na = ~~((u.Da + 3 - 1) / 3);
                            u.window = new Uint8Array(2 * u.l);
                            u.head = new Uint16Array(u.ra);
                            u.T = new Uint16Array(u.l);
                            u.ta = 1 << p + 6;
                            u.R = 4 * u.ta;
                            u.v = new Uint8Array(u.R);
                            u.ea = u.ta;
                            u.Ua = 3 * (u.ta - 1);
                            u.level = k;
                            u.U = r;
                            u.method = e;
                            return f(a)
                        }
                        function f(a) {
                            var k = g(a);
                            0 === k && (a = a.state,
                            a.xa = 2 * a.l,
                            C(a.head),
                            a.Fa = Ma[a.level].pb,
                            a.Ka = Ma[a.level].lb,
                            a.Pa = Ma[a.level].tb,
                            a.Oa = Ma[a.level].ob,
                            a.g = 0,
                            a.C = 0,
                            a.i = 0,
                            a.A = 0,
                            a.u = a.O = 2,
                            a.da = 0,
                            a.s = 0);
                            return k
                        }
                        function g(a) {
                            if (m(a))
                                return R(a, -2);
                            a.fa = a.ga = 0;
                            a.Ba = 2;
                            var k = a.state;
                            k.pending = 0;
                            k.ka = 0;
                            0 > k.G && (k.G = -k.G);
                            k.status = 2 === k.G ? 57 : k.G ? 42 : 113;
                            a.m = 2 === k.G ? 0 : 1;
                            k.N = -2;
                            if (!Kb) {
                                var e, l, p;
                                a = Array(16);
                                for (p = l = 0; 28 > p; p++)
                                    for (lb[p] = l,
                                    e = 0; e < 1 << mb[p]; e++)
                                        Na[l++] = p;
                                Na[l - 1] = p;
                                for (p = l = 0; 16 > p; p++)
                                    for (Ya[p] = l,
                                    e = 0; e < 1 << Za[p]; e++)
                                        Aa[l++] = p;
                                for (l >>= 7; 30 > p; p++)
                                    for (Ya[p] = l << 7,
                                    e = 0; e < 1 << Za[p] - 7; e++)
                                        Aa[256 + l++] = p;
                                for (e = 0; 15 >= e; e++)
                                    a[e] = 0;
                                for (e = 0; 143 >= e; )
                                    oa[2 * e + 1] = 8,
                                    e++,
                                    a[8]++;
                                for (; 255 >= e; )
                                    oa[2 * e + 1] = 9,
                                    e++,
                                    a[9]++;
                                for (; 279 >= e; )
                                    oa[2 * e + 1] = 7,
                                    e++,
                                    a[7]++;
                                for (; 287 >= e; )
                                    oa[2 * e + 1] = 8,
                                    e++,
                                    a[8]++;
                                $a(oa, 287, a);
                                for (e = 0; 30 > e; e++)
                                    Oa[2 * e + 1] = 5,
                                    Oa[2 * e] = Lb(e, 5);
                                Mb = new nb(oa,mb,257,286,15);
                                Nb = new nb(Oa,Za,0,30,15);
                                Ob = new nb([],pc,0,19,7);
                                Kb = !0
                            }
                            k.sa = new ob(k.L,Mb);
                            k.qa = new ob(k.ca,Nb);
                            k.Ia = new ob(k.H,Ob);
                            k.I = 0;
                            k.F = 0;
                            pa(k);
                            return 0
                        }
                        function m(a) {
                            if (!a)
                                return 1;
                            var k = a.state;
                            return !k || k.h !== a || 42 !== k.status && 57 !== k.status && 69 !== k.status && 73 !== k.status && 91 !== k.status && 103 !== k.status && 113 !== k.status && 666 !== k.status ? 1 : 0
                        }
                        function w(a, k) {
                            for (var e; ; ) {
                                if (0 === a.i && (E(a),
                                0 === a.i)) {
                                    if (0 === k)
                                        return 1;
                                    break
                                }
                                a.u = 0;
                                e = W(a, 0, a.window[a.g]);
                                a.i--;
                                a.g++;
                                if (e && (J(a, !1),
                                0 === a.h.o))
                                    return 1
                            }
                            a.A = 0;
                            return 4 === k ? (J(a, !0),
                            0 === a.h.o ? 3 : 4) : a.S && (J(a, !1),
                            0 === a.h.o) ? 1 : 2
                        }
                        function D(a, k) {
                            for (var e, l, p, r = a.window; ; ) {
                                if (258 >= a.i) {
                                    E(a);
                                    if (258 >= a.i && 0 === k)
                                        return 1;
                                    if (0 === a.i)
                                        break
                                }
                                a.u = 0;
                                if (3 <= a.i && 0 < a.g && (l = a.g - 1,
                                e = r[l],
                                e === r[++l] && e === r[++l] && e === r[++l])) {
                                    for (p = a.g + 258; e === r[++l] && e === r[++l] && e === r[++l] && e === r[++l] && e === r[++l] && e === r[++l] && e === r[++l] && e === r[++l] && l < p; )
                                        ;
                                    a.u = 258 - (p - l);
                                    a.u > a.i && (a.u = a.i)
                                }
                                3 <= a.u ? (e = W(a, 1, a.u - 3),
                                a.i -= a.u,
                                a.g += a.u,
                                a.u = 0) : (e = W(a, 0, a.window[a.g]),
                                a.i--,
                                a.g++);
                                if (e && (J(a, !1),
                                0 === a.h.o))
                                    return 1
                            }
                            a.A = 0;
                            return 4 === k ? (J(a, !0),
                            0 === a.h.o ? 3 : 4) : a.S && (J(a, !1),
                            0 === a.h.o) ? 1 : 2
                        }
                        function B(a, k) {
                            for (var e, l; ; ) {
                                if (262 > a.i) {
                                    E(a);
                                    if (262 > a.i && 0 === k)
                                        return 1;
                                    if (0 === a.i)
                                        break
                                }
                                e = 0;
                                3 <= a.i && (a.s = Y(a, a.s, a.window[a.g + 3 - 1]),
                                e = a.T[a.g & a.aa] = a.head[a.s],
                                a.head[a.s] = a.g);
                                a.O = a.u;
                                a.Qa = a.ia;
                                a.u = 2;
                                0 !== e && a.O < a.Fa && a.g - e <= a.l - 262 && (a.u = A(a, e),
                                5 >= a.u && (1 === a.U || 3 === a.u && 4096 < a.g - a.ia) && (a.u = 2));
                                if (3 <= a.O && a.u <= a.O) {
                                    l = a.g + a.i - 3;
                                    e = W(a, a.g - 1 - a.Qa, a.O - 3);
                                    a.i -= a.O - 1;
                                    a.O -= 2;
                                    do
                                        ++a.g <= l && (a.s = Y(a, a.s, a.window[a.g + 3 - 1]),
                                        a.T[a.g & a.aa] = a.head[a.s],
                                        a.head[a.s] = a.g);
                                    while (0 !== --a.O);
                                    a.da = 0;
                                    a.u = 2;
                                    a.g++;
                                    if (e && (J(a, !1),
                                    0 === a.h.o))
                                        return 1
                                } else if (a.da) {
                                    if ((e = W(a, 0, a.window[a.g - 1])) && J(a, !1),
                                    a.g++,
                                    a.i--,
                                    0 === a.h.o)
                                        return 1
                                } else
                                    a.da = 1,
                                    a.g++,
                                    a.i--
                            }
                            a.da && (W(a, 0, a.window[a.g - 1]),
                            a.da = 0);
                            a.A = 2 > a.g ? a.g : 2;
                            return 4 === k ? (J(a, !0),
                            0 === a.h.o ? 3 : 4) : a.S && (J(a, !1),
                            0 === a.h.o) ? 1 : 2
                        }
                        function z(a, k) {
                            for (var e; ; ) {
                                if (262 > a.i) {
                                    E(a);
                                    if (262 > a.i && 0 === k)
                                        return 1;
                                    if (0 === a.i)
                                        break
                                }
                                e = 0;
                                3 <= a.i && (a.s = Y(a, a.s, a.window[a.g + 3 - 1]),
                                e = a.T[a.g & a.aa] = a.head[a.s],
                                a.head[a.s] = a.g);
                                0 !== e && a.g - e <= a.l - 262 && (a.u = A(a, e));
                                if (3 <= a.u)
                                    if (e = W(a, a.g - a.ia, a.u - 3),
                                    a.i -= a.u,
                                    a.u <= a.Fa && 3 <= a.i) {
                                        a.u--;
                                        do
                                            a.g++,
                                            a.s = Y(a, a.s, a.window[a.g + 3 - 1]),
                                            a.T[a.g & a.aa] = a.head[a.s],
                                            a.head[a.s] = a.g;
                                        while (0 !== --a.u);
                                        a.g++
                                    } else
                                        a.g += a.u,
                                        a.u = 0,
                                        a.s = a.window[a.g],
                                        a.s = Y(a, a.s, a.window[a.g + 1]);
                                else
                                    e = W(a, 0, a.window[a.g]),
                                    a.i--,
                                    a.g++;
                                if (e && (J(a, !1),
                                0 === a.h.o))
                                    return 1
                            }
                            a.A = 2 > a.g ? a.g : 2;
                            return 4 === k ? (J(a, !0),
                            0 === a.h.o ? 3 : 4) : a.S && (J(a, !1),
                            0 === a.h.o) ? 1 : 2
                        }
                        function H(a, k) {
                            var e = a.R - 5 > a.l ? a.l : a.R - 5
                              , l = 0
                              , p = a.h.B;
                            do {
                                var r = 65535;
                                var v = a.F + 42 >> 3;
                                if (a.h.o < v)
                                    break;
                                v = a.h.o - v;
                                var u = a.g - a.C;
                                r > u + a.h.B && (r = u + a.h.B);
                                r > v && (r = v);
                                if (r < e && (0 === r && 4 !== k || 0 === k || r !== u + a.h.B))
                                    break;
                                l = 4 === k && r === u + a.h.B ? 1 : 0;
                                Ba(a, 0, 0, l);
                                a.v[a.pending - 4] = r;
                                a.v[a.pending - 3] = r >> 8;
                                a.v[a.pending - 2] = ~r;
                                a.v[a.pending - 1] = ~r >> 8;
                                P(a.h);
                                u && (u > r && (u = r),
                                a.h.output.set(a.window.subarray(a.C, a.C + u), a.h.J),
                                a.h.J += u,
                                a.h.o -= u,
                                a.h.ga += u,
                                a.C += u,
                                r -= u);
                                r && (G(a.h, a.h.output, a.h.J, r),
                                a.h.J += r,
                                a.h.o -= r,
                                a.h.ga += r)
                            } while (0 === l);
                            if (p -= a.h.B)
                                p >= a.l ? (a.matches = 2,
                                a.window.set(a.h.input.subarray(a.h.P - a.l, a.h.P), 0),
                                a.g = a.l,
                                a.A = a.g) : (a.xa - a.g <= p && (a.g -= a.l,
                                a.window.set(a.window.subarray(a.l, a.l + a.g), 0),
                                2 > a.matches && a.matches++,
                                a.A > a.g && (a.A = a.g)),
                                a.window.set(a.h.input.subarray(a.h.P - p, a.h.P), a.g),
                                a.g += p,
                                a.A += p > a.l - a.A ? a.l - a.A : p),
                                a.C = a.g;
                            a.Ea < a.g && (a.Ea = a.g);
                            if (l)
                                return 4;
                            if (0 !== k && 4 !== k && 0 === a.h.B && a.g === a.C)
                                return 2;
                            v = a.xa - a.g;
                            a.h.B > v && a.C >= a.l && (a.C -= a.l,
                            a.g -= a.l,
                            a.window.set(a.window.subarray(a.l, a.l + a.g), 0),
                            2 > a.matches && a.matches++,
                            v += a.l,
                            a.A > a.g && (a.A = a.g));
                            v > a.h.B && (v = a.h.B);
                            v && (G(a.h, a.window, a.g, v),
                            a.g += v,
                            a.A += v > a.l - a.A ? a.l - a.A : v);
                            a.Ea < a.g && (a.Ea = a.g);
                            v = a.F + 42 >> 3;
                            v = 65535 < a.R - v ? 65535 : a.R - v;
                            e = v > a.l ? a.l : v;
                            u = a.g - a.C;
                            if (u >= e || (u || 4 === k) && 0 !== k && 0 === a.h.B && u <= v)
                                r = u > v ? v : u,
                                l = 4 === k && 0 === a.h.B && r === u ? 1 : 0,
                                Ba(a, a.C, r, l),
                                a.C += r,
                                P(a.h);
                            return l ? 3 : 1
                        }
                        function E(a) {
                            var k = a.l;
                            do {
                                var e = a.xa - a.i - a.g;
                                if (a.g >= k + (k - 262)) {
                                    a.window.set(a.window.subarray(k, k + k - e), 0);
                                    a.ia -= k;
                                    a.g -= k;
                                    a.C -= k;
                                    a.A > a.g && (a.A = a.g);
                                    var l, p = a, r = p.l;
                                    var v = l = p.ra;
                                    do {
                                        var u = p.head[--v];
                                        p.head[v] = u >= r ? u - r : 0
                                    } while (--l);
                                    v = l = r;
                                    do
                                        u = p.T[--v],
                                        p.T[v] = u >= r ? u - r : 0;
                                    while (--l);
                                    e += k
                                }
                                if (0 === a.h.B)
                                    break;
                                e = G(a.h, a.window, a.g + a.i, e);
                                a.i += e;
                                if (3 <= a.i + a.A)
                                    for (e = a.g - a.A,
                                    a.s = a.window[e],
                                    a.s = Y(a, a.s, a.window[e + 1]); a.A && !(a.s = Y(a, a.s, a.window[e + 3 - 1]),
                                    a.T[e & a.aa] = a.head[a.s],
                                    a.head[a.s] = e,
                                    e++,
                                    a.A--,
                                    3 > a.i + a.A); )
                                        ;
                            } while (262 > a.i && 0 !== a.h.B)
                        }
                        function A(a, k) {
                            var e = a.Oa
                              , l = a.g
                              , p = a.O
                              , r = a.Pa
                              , v = a.g > a.l - 262 ? a.g - (a.l - 262) : 0
                              , u = a.window
                              , X = a.aa
                              , Z = a.T
                              , qa = a.g + 258
                              , V = u[l + p - 1]
                              , Ca = u[l + p];
                            a.O >= a.Ka && (e >>= 2);
                            r > a.i && (r = a.i);
                            do {
                                var T = k;
                                if (u[T + p] === Ca && u[T + p - 1] === V && u[T] === u[l] && u[++T] === u[l + 1]) {
                                    l += 2;
                                    for (T++; u[++l] === u[++T] && u[++l] === u[++T] && u[++l] === u[++T] && u[++l] === u[++T] && u[++l] === u[++T] && u[++l] === u[++T] && u[++l] === u[++T] && u[++l] === u[++T] && l < qa; )
                                        ;
                                    T = 258 - (qa - l);
                                    l = qa - 258;
                                    if (T > p) {
                                        a.ia = k;
                                        p = T;
                                        if (T >= r)
                                            break;
                                        V = u[l + p - 1];
                                        Ca = u[l + p]
                                    }
                                }
                            } while ((k = Z[k & X]) > v && 0 !== --e);
                            return p <= a.i ? p : a.i
                        }
                        function G(a, k, e, l) {
                            var p = a.B;
                            p > l && (p = l);
                            if (0 === p)
                                return 0;
                            a.B -= p;
                            k.set(a.input.subarray(a.P, a.P + p), e);
                            1 === a.state.G ? a.m = Q(a.m, k, p, e) : 2 === a.state.G && (a.m = S(a.m, k, p, e));
                            a.P += p;
                            a.fa += p;
                            return p
                        }
                        function I(a, k) {
                            a.v[a.pending++] = k >>> 8 & 255;
                            a.v[a.pending++] = k & 255
                        }
                        function y(a, k) {
                            a.v[a.pending++] = k
                        }
                        function J(a, k) {
                            var e = 0 <= a.C ? a.C : -1
                              , l = a.g - a.C
                              , p = 0;
                            if (0 < a.level) {
                                2 === a.h.Ba && (a.h.Ba = Fa(a));
                                ua(a, a.sa);
                                ua(a, a.qa);
                                K(a, a.L, a.sa.ja);
                                K(a, a.ca, a.qa.ja);
                                ua(a, a.Ia);
                                for (p = 18; 3 <= p && 0 === a.H[2 * Pb[p] + 1]; p--)
                                    ;
                                a.X += 3 * (p + 1) + 14;
                                var r = a.X + 3 + 7 >>> 3;
                                var v = a.na + 3 + 7 >>> 3;
                                v <= r && (r = v)
                            } else
                                r = v = l + 5;
                            if (l + 4 <= r && -1 !== e)
                                Ba(a, e, l, k);
                            else if (4 === a.U || v === r)
                                ha(a, 2 + (k ? 1 : 0), 3),
                                Pa(a, oa, Oa);
                            else {
                                ha(a, 4 + (k ? 1 : 0), 3);
                                e = a.sa.ja + 1;
                                l = a.qa.ja + 1;
                                p += 1;
                                ha(a, e - 257, 5);
                                ha(a, l - 1, 5);
                                ha(a, p - 4, 4);
                                for (r = 0; r < p; r++)
                                    ha(a, a.H[2 * Pb[r] + 1], 3);
                                ca(a, a.L, e - 1);
                                ca(a, a.ca, l - 1);
                                Pa(a, a.L, a.ca)
                            }
                            pa(a);
                            k && L(a);
                            a.C = a.g;
                            P(a.h)
                        }
                        function P(a) {
                            var k = a.state
                              , e = k.pending;
                            e > a.o && (e = a.o);
                            0 !== e && (a.output.set(k.v.subarray(k.ka, k.ka + e), a.J),
                            a.J += e,
                            k.ka += e,
                            a.ga += e,
                            a.o -= e,
                            k.pending -= e,
                            0 === k.pending && (k.ka = 0))
                        }
                        function Y(a, k, e) {
                            return (k << a.Na ^ e) & a.Ma
                        }
                        function C(a) {
                            for (var k = a.length; 0 <= --k; )
                                a[k] = 0
                        }
                        function R(a, k) {
                            a.ua = pb[k];
                            return k
                        }
                        function W(a, k, e) {
                            a.v[a.ea + a.S++] = k;
                            a.v[a.ea + a.S++] = k >> 8;
                            a.v[a.ea + a.S++] = e;
                            0 === k ? a.L[2 * e]++ : (a.matches++,
                            k--,
                            a.L[2 * (Na[e] + 256 + 1)]++,
                            a.ca[2 * (256 > k ? Aa[k] : Aa[256 + (k >>> 7)])]++);
                            return a.S === a.Ua
                        }
                        function S(a, k, e, l) {
                            e = l + e;
                            for (a ^= -1; l < e; l++)
                                a = a >>> 8 ^ qc[(a ^ k[l]) & 255];
                            return a ^ -1
                        }
                        function Q(a, k, e, l) {
                            var p = a & 65535 | 0;
                            a = a >>> 16 & 65535 | 0;
                            for (var r; 0 !== e; ) {
                                r = 2E3 < e ? 2E3 : e;
                                e -= r;
                                do
                                    p = p + k[l++] | 0,
                                    a = a + p | 0;
                                while (--r);
                                p %= 65521;
                                a %= 65521
                            }
                            return p | a << 16 | 0
                        }
                        function Ba(a, k, e, l) {
                            ha(a, l ? 1 : 0, 3);
                            L(a);
                            Qa(a, e);
                            Qa(a, ~e);
                            e && a.v.set(a.window.subarray(k, k + e), a.pending);
                            a.pending += e
                        }
                        function Fa(a) {
                            var k = 4093624447, e;
                            for (e = 0; 31 >= e; e++,
                            k >>>= 1)
                                if (k & 1 && 0 !== a.L[2 * e])
                                    return 0;
                            if (0 !== a.L[18] || 0 !== a.L[20] || 0 !== a.L[26])
                                return 1;
                            for (e = 32; 256 > e; e++)
                                if (0 !== a.L[2 * e])
                                    return 1;
                            return 0
                        }
                        function ca(a, k, e) {
                            var l, p = -1, r = k[1], v = 0, u = 7, X = 4;
                            0 === r && (u = 138,
                            X = 3);
                            for (l = 0; l <= e; l++) {
                                var Z = r;
                                r = k[2 * (l + 1) + 1];
                                if (!(++v < u && Z === r)) {
                                    if (v < X) {
                                        do
                                            ka(a, Z, a.H);
                                        while (0 !== --v)
                                    } else
                                        0 !== Z ? (Z !== p && (ka(a, Z, a.H),
                                        v--),
                                        ka(a, 16, a.H),
                                        ha(a, v - 3, 2)) : 10 >= v ? (ka(a, 17, a.H),
                                        ha(a, v - 3, 3)) : (ka(a, 18, a.H),
                                        ha(a, v - 11, 7));
                                    v = 0;
                                    p = Z;
                                    0 === r ? (u = 138,
                                    X = 3) : Z === r ? (u = 6,
                                    X = 3) : (u = 7,
                                    X = 4)
                                }
                            }
                        }
                        function K(a, k, e) {
                            var l, p = -1, r = k[1], v = 0, u = 7, X = 4;
                            0 === r && (u = 138,
                            X = 3);
                            k[2 * (e + 1) + 1] = 65535;
                            for (l = 0; l <= e; l++) {
                                var Z = r;
                                r = k[2 * (l + 1) + 1];
                                ++v < u && Z === r || (v < X ? a.H[2 * Z] += v : 0 !== Z ? (Z !== p && a.H[2 * Z]++,
                                a.H[32]++) : 10 >= v ? a.H[34]++ : a.H[36]++,
                                v = 0,
                                p = Z,
                                0 === r ? (u = 138,
                                X = 3) : Z === r ? (u = 6,
                                X = 3) : (u = 7,
                                X = 4))
                            }
                        }
                        function ua(a, k) {
                            var e = k.Ja, l = k.$.Sa, p = k.$.La, r = k.$.fb, v, u = -1;
                            a.W = 0;
                            a.ha = 573;
                            for (v = 0; v < r; v++)
                                0 !== e[2 * v] ? (a.D[++a.W] = u = v,
                                a.depth[v] = 0) : e[2 * v + 1] = 0;
                            for (; 2 > a.W; ) {
                                var X = a.D[++a.W] = 2 > u ? ++u : 0;
                                e[2 * X] = 1;
                                a.depth[X] = 0;
                                a.X--;
                                p && (a.na -= l[2 * X + 1])
                            }
                            k.ja = u;
                            for (v = a.W >> 1; 1 <= v; v--)
                                la(a, e, v);
                            X = r;
                            do
                                v = a.D[1],
                                a.D[1] = a.D[a.W--],
                                la(a, e, 1),
                                l = a.D[1],
                                a.D[--a.ha] = v,
                                a.D[--a.ha] = l,
                                e[2 * X] = e[2 * v] + e[2 * l],
                                a.depth[X] = (a.depth[v] >= a.depth[l] ? a.depth[v] : a.depth[l]) + 1,
                                e[2 * v + 1] = e[2 * l + 1] = X,
                                a.D[1] = X++,
                                la(a, e, 1);
                            while (2 <= a.W);
                            a.D[--a.ha] = a.D[1];
                            v = k.Ja;
                            X = k.ja;
                            l = k.$.Sa;
                            p = k.$.La;
                            r = k.$.hb;
                            var Z = k.$.gb, qa = k.$.qb, V, Ca = 0;
                            for (V = 0; 15 >= V; V++)
                                a.V[V] = 0;
                            v[2 * a.D[a.ha] + 1] = 0;
                            for (k = a.ha + 1; 573 > k; k++) {
                                var T = a.D[k];
                                V = v[2 * v[2 * T + 1] + 1] + 1;
                                V > qa && (V = qa,
                                Ca++);
                                v[2 * T + 1] = V;
                                if (!(T > X)) {
                                    a.V[V]++;
                                    var qb = 0;
                                    T >= Z && (qb = r[T - Z]);
                                    var Qb = v[2 * T];
                                    a.X += Qb * (V + qb);
                                    p && (a.na += Qb * (l[2 * T + 1] + qb))
                                }
                            }
                            if (0 !== Ca) {
                                do {
                                    for (V = qa - 1; 0 === a.V[V]; )
                                        V--;
                                    a.V[V]--;
                                    a.V[V + 1] += 2;
                                    a.V[qa]--;
                                    Ca -= 2
                                } while (0 < Ca);
                                for (V = qa; 0 !== V; V--)
                                    for (T = a.V[V]; 0 !== T; )
                                        l = a.D[--k],
                                        l > X || (v[2 * l + 1] !== V && (a.X += (V - v[2 * l + 1]) * v[2 * l],
                                        v[2 * l + 1] = V),
                                        T--)
                            }
                            $a(e, u, a.V)
                        }
                        function Pa(a, k, e) {
                            var l = 0;
                            if (0 !== a.S) {
                                do {
                                    var p = a.v[a.ea + l++] & 255;
                                    p += (a.v[a.ea + l++] & 255) << 8;
                                    var r = a.v[a.ea + l++];
                                    if (0 === p)
                                        ka(a, r, k);
                                    else {
                                        var v = Na[r];
                                        ka(a, v + 256 + 1, k);
                                        var u = mb[v];
                                        0 !== u && (r -= lb[v],
                                        ha(a, r, u));
                                        p--;
                                        v = 256 > p ? Aa[p] : Aa[256 + (p >>> 7)];
                                        ka(a, v, e);
                                        u = Za[v];
                                        0 !== u && (p -= Ya[v],
                                        ha(a, p, u))
                                    }
                                } while (l < a.S)
                            }
                            ka(a, 256, k)
                        }
                        function la(a, k, e) {
                            for (var l = a.D[e], p = e << 1; p <= a.W; ) {
                                p < a.W && Ga(k, a.D[p + 1], a.D[p], a.depth) && p++;
                                if (Ga(k, l, a.D[p], a.depth))
                                    break;
                                a.D[e] = a.D[p];
                                e = p;
                                p <<= 1
                            }
                            a.D[e] = l
                        }
                        function Ga(a, k, e, l) {
                            var p = 2 * k
                              , r = 2 * e;
                            return a[p] < a[r] || a[p] === a[r] && l[k] <= l[e]
                        }
                        function L(a) {
                            8 < a.F ? Qa(a, a.I) : 0 < a.F && (a.v[a.pending++] = a.I);
                            a.I = 0;
                            a.F = 0
                        }
                        function pa(a) {
                            var k;
                            for (k = 0; 286 > k; k++)
                                a.L[2 * k] = 0;
                            for (k = 0; 30 > k; k++)
                                a.ca[2 * k] = 0;
                            for (k = 0; 19 > k; k++)
                                a.H[2 * k] = 0;
                            a.L[512] = 1;
                            a.X = a.na = 0;
                            a.S = a.matches = 0
                        }
                        function $a(a, k, e) {
                            var l = Array(16), p = 0, r;
                            for (r = 1; 15 >= r; r++)
                                p = p + e[r - 1] << 1,
                                l[r] = p;
                            for (e = 0; e <= k; e++)
                                p = a[2 * e + 1],
                                0 !== p && (a[2 * e] = Lb(l[p]++, p))
                        }
                        function Lb(a, k) {
                            var e = 0;
                            do
                                e |= a & 1,
                                a >>>= 1,
                                e <<= 1;
                            while (0 < --k);
                            return e >>> 1
                        }
                        function ka(a, k, e) {
                            ha(a, e[2 * k], e[2 * k + 1])
                        }
                        function ha(a, k, e) {
                            a.F > 16 - e ? (a.I |= k << a.F & 65535,
                            Qa(a, a.I),
                            a.I = k >> 16 - a.F,
                            a.F += e - 16) : (a.I |= k << a.F & 65535,
                            a.F += e)
                        }
                        function Qa(a, k) {
                            a.v[a.pending++] = k & 255;
                            a.v[a.pending++] = k >>> 8 & 255
                        }
                        function Ha(a) {
                            for (var k = a.length; 0 <= --k; )
                                a[k] = 0
                        }
                        function nb(a, k, e, l, p) {
                            this.Sa = a;
                            this.hb = k;
                            this.gb = e;
                            this.fb = l;
                            this.qb = p;
                            this.La = a && a.length
                        }
                        function ob(a, k) {
                            this.Ja = a;
                            this.ja = 0;
                            this.$ = k
                        }
                        function ma(a, k, e, l, p) {
                            this.lb = a;
                            this.pb = k;
                            this.tb = e;
                            this.ob = l;
                            this.Ca = p
                        }
                        function oc() {
                            this.h = null;
                            this.status = 0;
                            this.v = null;
                            this.G = this.pending = this.ka = this.R = 0;
                            this.j = null;
                            this.M = 0;
                            this.method = 8;
                            this.N = -1;
                            this.aa = this.Ha = this.l = 0;
                            this.window = null;
                            this.xa = 0;
                            this.head = this.T = null;
                            this.Pa = this.Ka = this.U = this.level = this.Fa = this.Oa = this.O = this.i = this.ia = this.g = this.da = this.Qa = this.u = this.C = this.Na = this.Ma = this.Da = this.ra = this.s = 0;
                            this.L = new Uint16Array(1146);
                            this.ca = new Uint16Array(122);
                            this.H = new Uint16Array(78);
                            C(this.L);
                            C(this.ca);
                            C(this.H);
                            this.Ia = this.qa = this.sa = null;
                            this.V = new Uint16Array(16);
                            this.D = new Uint16Array(573);
                            C(this.D);
                            this.ha = this.W = 0;
                            this.depth = new Uint16Array(573);
                            C(this.depth);
                            this.F = this.I = this.A = this.matches = this.na = this.X = this.Ua = this.S = this.ta = this.ea = 0
                        }
                        function rb(a) {
                            "@babel/helpers - typeof";
                            return rb = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(k) {
                                return typeof k
                            }
                            : function(k) {
                                return k && "function" == typeof Symbol && k.constructor === Symbol && k !== Symbol.prototype ? "symbol" : typeof k
                            }
                            ,
                            rb(a)
                        }
                        function ab(a) {
                            a = this.options = Rb.assign({
                                level: -1,
                                method: 8,
                                Wa: 16384,
                                ba: 15,
                                sb: 8,
                                U: 0
                            }, a || {});
                            a.raw && 0 < a.ba ? a.ba = -a.ba : a.Hb && 0 < a.ba && 16 > a.ba && (a.ba += 16);
                            this.ua = "";
                            this.ended = !1;
                            this.za = [];
                            this.h = new d;
                            this.h.o = 0;
                            var k = Ra.ab(this.h, a.level, a.method, a.ba, a.sb, a.U);
                            if (0 !== k)
                                throw Error(pb[k]);
                            a.mb && Ra.cb(this.h, a.mb);
                            if (a.oa && (a = "string" === typeof a.oa ? Sb.Ta(a.oa) : "[object ArrayBuffer]" === Tb.call(a.oa) ? new Uint8Array(a.oa) : a.oa,
                            k = Ra.bb(this.h, a),
                            0 !== k))
                                throw Error(pb[k]);
                        }
                        var mb = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0])
                          , Za = new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13])
                          , pc = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7])
                          , Pb = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15])
                          , oa = Array(576);
                        Ha(oa);
                        var Oa = Array(60);
                        Ha(Oa);
                        var Aa = Array(512);
                        Ha(Aa);
                        var Na = Array(256);
                        Ha(Na);
                        var lb = Array(29);
                        Ha(lb);
                        var Ya = Array(30);
                        Ha(Ya);
                        var Mb, Nb, Ob, Kb = !1, qc = new Uint32Array(function() {
                            for (var a, k = [], e = 0; 256 > e; e++) {
                                a = e;
                                for (var l = 0; 8 > l; l++)
                                    a = a & 1 ? 3988292384 ^ a >>> 1 : a >>> 1;
                                k[e] = a
                            }
                            return k
                        }()), pb = {
                            2: "need dictionary",
                            1: "stream end",
                            0: "",
                            "-1": "file error",
                            "-2": "stream error",
                            "-3": "data error",
                            "-4": "insufficient memory",
                            "-5": "buffer error",
                            "-6": "incompatible version"
                        }, Ma = [new ma(0,0,0,0,H), new ma(4,4,8,4,z), new ma(4,5,16,8,z), new ma(4,6,32,32,z), new ma(4,4,16,16,B), new ma(8,16,32,32,B), new ma(8,16,128,128,B), new ma(8,32,128,256,B), new ma(32,128,258,1024,B), new ma(32,258,258,4096,B)], Ra = {
                            Db: function(a, k) {
                                return c(a, k, 8, 15, 8, 0)
                            },
                            ab: c,
                            Eb: f,
                            Fb: g,
                            cb: function(a, k) {
                                if (m(a) || 2 !== a.state.G)
                                    return -2;
                                a.state.j = k;
                                return 0
                            },
                            Za: function(a, k) {
                                if (m(a) || 5 < k || 0 > k)
                                    return a ? R(a, -2) : -2;
                                var e = a.state;
                                if (!a.output || 0 !== a.B && !a.input || 666 === e.status && 4 !== k)
                                    return R(a, 0 === a.o ? -5 : -2);
                                var l = e.N;
                                e.N = k;
                                if (0 !== e.pending) {
                                    if (P(a),
                                    0 === a.o)
                                        return e.N = -1,
                                        0
                                } else if (0 === a.B && 2 * k - (4 < k ? 9 : 0) <= 2 * l - (4 < l ? 9 : 0) && 4 !== k)
                                    return R(a, -5);
                                if (666 === e.status && 0 !== a.B)
                                    return R(a, -5);
                                42 === e.status && 0 === e.G && (e.status = 113);
                                if (42 === e.status && (l = 8 + (e.Ha - 8 << 4) << 8,
                                l |= (2 <= e.U || 2 > e.level ? 0 : 6 > e.level ? 1 : 6 === e.level ? 2 : 3) << 6,
                                0 !== e.g && (l |= 32),
                                I(e, l + (31 - l % 31)),
                                0 !== e.g && (I(e, a.m >>> 16),
                                I(e, a.m & 65535)),
                                a.m = 1,
                                e.status = 113,
                                P(a),
                                0 !== e.pending))
                                    return e.N = -1,
                                    0;
                                if (57 === e.status)
                                    if (a.m = 0,
                                    y(e, 31),
                                    y(e, 139),
                                    y(e, 8),
                                    e.j)
                                        y(e, (e.j.text ? 1 : 0) + (e.j.Z ? 2 : 0) + (e.j.Y ? 4 : 0) + (e.j.name ? 8 : 0) + (e.j.Aa ? 16 : 0)),
                                        y(e, e.j.time & 255),
                                        y(e, e.j.time >> 8 & 255),
                                        y(e, e.j.time >> 16 & 255),
                                        y(e, e.j.time >> 24 & 255),
                                        y(e, 9 === e.level ? 2 : 2 <= e.U || 2 > e.level ? 4 : 0),
                                        y(e, e.j.Jb & 255),
                                        e.j.Y && e.j.Y.length && (y(e, e.j.Y.length & 255),
                                        y(e, e.j.Y.length >> 8 & 255)),
                                        e.j.Z && (a.m = S(a.m, e.v, e.pending, 0)),
                                        e.M = 0,
                                        e.status = 69;
                                    else if (y(e, 0),
                                    y(e, 0),
                                    y(e, 0),
                                    y(e, 0),
                                    y(e, 0),
                                    y(e, 9 === e.level ? 2 : 2 <= e.U || 2 > e.level ? 4 : 0),
                                    y(e, 3),
                                    e.status = 113,
                                    P(a),
                                    0 !== e.pending)
                                        return e.N = -1,
                                        0;
                                if (69 === e.status) {
                                    if (e.j.Y) {
                                        l = e.pending;
                                        for (var p = (e.j.Y.length & 65535) - e.M; e.pending + p > e.R; ) {
                                            var r = e.R - e.pending;
                                            e.v.set(e.j.Y.subarray(e.M, e.M + r), e.pending);
                                            e.pending = e.R;
                                            e.j.Z && e.pending > l && (a.m = S(a.m, e.v, e.pending - l, l));
                                            e.M += r;
                                            P(a);
                                            if (0 !== e.pending)
                                                return e.N = -1,
                                                0;
                                            l = 0;
                                            p -= r
                                        }
                                        r = new Uint8Array(e.j.Y);
                                        e.v.set(r.subarray(e.M, e.M + p), e.pending);
                                        e.pending += p;
                                        e.j.Z && e.pending > l && (a.m = S(a.m, e.v, e.pending - l, l));
                                        e.M = 0
                                    }
                                    e.status = 73
                                }
                                if (73 === e.status) {
                                    if (e.j.name) {
                                        l = e.pending;
                                        do {
                                            if (e.pending === e.R) {
                                                e.j.Z && e.pending > l && (a.m = S(a.m, e.v, e.pending - l, l));
                                                P(a);
                                                if (0 !== e.pending)
                                                    return e.N = -1,
                                                    0;
                                                l = 0
                                            }
                                            p = e.M < e.j.name.length ? e.j.name.charCodeAt(e.M++) & 255 : 0;
                                            y(e, p)
                                        } while (0 !== p);
                                        e.j.Z && e.pending > l && (a.m = S(a.m, e.v, e.pending - l, l));
                                        e.M = 0
                                    }
                                    e.status = 91
                                }
                                if (91 === e.status) {
                                    if (e.j.Aa) {
                                        l = e.pending;
                                        do {
                                            if (e.pending === e.R) {
                                                e.j.Z && e.pending > l && (a.m = S(a.m, e.v, e.pending - l, l));
                                                P(a);
                                                if (0 !== e.pending)
                                                    return e.N = -1,
                                                    0;
                                                l = 0
                                            }
                                            p = e.M < e.j.Aa.length ? e.j.Aa.charCodeAt(e.M++) & 255 : 0;
                                            y(e, p)
                                        } while (0 !== p);
                                        e.j.Z && e.pending > l && (a.m = S(a.m, e.v, e.pending - l, l))
                                    }
                                    e.status = 103
                                }
                                if (103 === e.status) {
                                    if (e.j.Z) {
                                        if (e.pending + 2 > e.R && (P(a),
                                        0 !== e.pending))
                                            return e.N = -1,
                                            0;
                                        y(e, a.m & 255);
                                        y(e, a.m >> 8 & 255);
                                        a.m = 0
                                    }
                                    e.status = 113;
                                    P(a);
                                    if (0 !== e.pending)
                                        return e.N = -1,
                                        0
                                }
                                if (0 !== a.B || 0 !== e.i || 0 !== k && 666 !== e.status) {
                                    l = 0 === e.level ? H(e, k) : 2 === e.U ? w(e, k) : 3 === e.U ? D(e, k) : Ma[e.level].Ca(e, k);
                                    if (3 === l || 4 === l)
                                        e.status = 666;
                                    if (1 === l || 3 === l)
                                        return 0 === a.o && (e.N = -1),
                                        0;
                                    if (2 === l && (1 === k ? (ha(e, 2, 3),
                                    ka(e, 256, oa),
                                    16 === e.F ? (Qa(e, e.I),
                                    e.I = 0,
                                    e.F = 0) : 8 <= e.F && (e.v[e.pending++] = e.I & 255,
                                    e.I >>= 8,
                                    e.F -= 8)) : 5 !== k && (Ba(e, 0, 0, !1),
                                    3 === k && (C(e.head),
                                    0 === e.i && (e.g = 0,
                                    e.C = 0,
                                    e.A = 0))),
                                    P(a),
                                    0 === a.o))
                                        return e.N = -1,
                                        0
                                }
                                if (4 !== k)
                                    return 0;
                                if (0 >= e.G)
                                    return 1;
                                2 === e.G ? (y(e, a.m & 255),
                                y(e, a.m >> 8 & 255),
                                y(e, a.m >> 16 & 255),
                                y(e, a.m >> 24 & 255),
                                y(e, a.fa & 255),
                                y(e, a.fa >> 8 & 255),
                                y(e, a.fa >> 16 & 255),
                                y(e, a.fa >> 24 & 255)) : (I(e, a.m >>> 16),
                                I(e, a.m & 65535));
                                P(a);
                                0 < e.G && (e.G = -e.G);
                                return 0 !== e.pending ? 0 : 1
                            },
                            $a: function(a) {
                                if (m(a))
                                    return -2;
                                var k = a.state.status;
                                a.state = null;
                                return 113 === k ? R(a, -3) : 0
                            },
                            bb: function(a, k) {
                                var e = k.length;
                                if (m(a))
                                    return -2;
                                var l = a.state
                                  , p = l.G;
                                if (2 === p || 1 === p && 42 !== l.status || l.i)
                                    return -2;
                                1 === p && (a.m = Q(a.m, k, e, 0));
                                l.G = 0;
                                if (e >= l.l) {
                                    0 === p && (C(l.head),
                                    l.g = 0,
                                    l.C = 0,
                                    l.A = 0);
                                    var r = new Uint8Array(l.l);
                                    r.set(k.subarray(e - l.l, e), 0);
                                    k = r;
                                    e = l.l
                                }
                                r = a.B;
                                var v = a.P
                                  , u = a.input;
                                a.B = e;
                                a.P = 0;
                                a.input = k;
                                for (E(l); 3 <= l.i; ) {
                                    k = l.g;
                                    e = l.i - 2;
                                    do
                                        l.s = Y(l, l.s, l.window[k + 3 - 1]),
                                        l.T[k & l.aa] = l.head[l.s],
                                        l.head[l.s] = k,
                                        k++;
                                    while (--e);
                                    l.g = k;
                                    l.i = 2;
                                    E(l)
                                }
                                l.g += l.i;
                                l.C = l.g;
                                l.A = l.i;
                                l.i = 0;
                                l.u = l.O = 2;
                                l.da = 0;
                                a.P = v;
                                a.input = u;
                                a.B = r;
                                l.G = p;
                                return 0
                            },
                            Cb: "pako deflate (from Nodeca project)"
                        }, Rb = {
                            assign: function(a) {
                                for (var k = Array.prototype.slice.call(arguments, 1); k.length; ) {
                                    var e = k.shift();
                                    if (e) {
                                        if ("object" !== rb(e))
                                            throw new TypeError(e + "must be non-object");
                                        for (var l in e)
                                            Object.prototype.hasOwnProperty.call(e, l) && (a[l] = e[l])
                                    }
                                }
                                return a
                            },
                            kb: function(a) {
                                for (var k = 0, e = 0, l = a.length; e < l; e++)
                                    k += a[e].length;
                                k = new Uint8Array(k);
                                l = e = 0;
                                for (var p = a.length; e < p; e++) {
                                    var r = a[e];
                                    k.set(r, l);
                                    l += r.length
                                }
                                return k
                            }
                        }, Ub = !0;
                        try {
                            new Uint8Array(1)
                        } catch (a) {
                            Ub = !1
                        }
                        for (var Sa = new Uint8Array(256), va = 0; 256 > va; va++)
                            Sa[va] = 252 <= va ? 6 : 248 <= va ? 5 : 240 <= va ? 4 : 224 <= va ? 3 : 192 <= va ? 2 : 1;
                        Sa[254] = Sa[255] = 1;
                        var Sb = {
                            Ta: function(a) {
                                if ("function" === typeof TextEncoder && TextEncoder.prototype.encode)
                                    return (new TextEncoder).encode(a);
                                var k, e, l = a.length, p = 0;
                                for (k = 0; k < l; k++) {
                                    var r = a.charCodeAt(k);
                                    if (55296 === (r & 64512) && k + 1 < l) {
                                        var v = a.charCodeAt(k + 1);
                                        56320 === (v & 64512) && (r = 65536 + (r - 55296 << 10) + (v - 56320),
                                        k++)
                                    }
                                    p += 128 > r ? 1 : 2048 > r ? 2 : 65536 > r ? 3 : 4
                                }
                                var u = new Uint8Array(p);
                                for (k = e = 0; e < p; k++)
                                    r = a.charCodeAt(k),
                                    55296 === (r & 64512) && k + 1 < l && (v = a.charCodeAt(k + 1),
                                    56320 === (v & 64512) && (r = 65536 + (r - 55296 << 10) + (v - 56320),
                                    k++)),
                                    128 > r ? u[e++] = r : (2048 > r ? u[e++] = 192 | r >>> 6 : (65536 > r ? u[e++] = 224 | r >>> 12 : (u[e++] = 240 | r >>> 18,
                                    u[e++] = 128 | r >>> 12 & 63),
                                    u[e++] = 128 | r >>> 6 & 63),
                                    u[e++] = 128 | r & 63);
                                return u
                            },
                            Bb: function(a, k) {
                                var e = k || a.length;
                                if ("function" === typeof TextDecoder && TextDecoder.prototype.decode)
                                    return (new TextDecoder).decode(a.subarray(0, k));
                                var l, p = Array(2 * e);
                                for (l = k = 0; l < e; ) {
                                    var r = a[l++];
                                    if (128 > r)
                                        p[k++] = r;
                                    else {
                                        var v = Sa[r];
                                        if (4 < v)
                                            p[k++] = 65533,
                                            l += v - 1;
                                        else {
                                            for (r &= 2 === v ? 31 : 3 === v ? 15 : 7; 1 < v && l < e; )
                                                r = r << 6 | a[l++] & 63,
                                                v--;
                                            1 < v ? p[k++] = 65533 : 65536 > r ? p[k++] = r : (r -= 65536,
                                            p[k++] = 55296 | r >> 10 & 1023,
                                            p[k++] = 56320 | r & 1023)
                                        }
                                    }
                                }
                                if (65534 > k && p.subarray && Ub)
                                    k = String.fromCharCode.apply(null, p.length === k ? p : p.subarray(0, k));
                                else {
                                    a = "";
                                    for (e = 0; e < k; e++)
                                        a += String.fromCharCode(p[e]);
                                    k = a
                                }
                                return k
                            },
                            Mb: function(a, k) {
                                k = k || a.length;
                                k > a.length && (k = a.length);
                                for (var e = k - 1; 0 <= e && 128 === (a[e] & 192); )
                                    e--;
                                return 0 > e || 0 === e ? k : e + Sa[a[e]] > k ? e : k
                            }
                        }
                          , Tb = Object.prototype.toString;
                        ab.prototype.push = function(a, k) {
                            var e = this.h
                              , l = this.options.Wa;
                            if (this.ended)
                                return !1;
                            k = k === ~~k ? k : !0 === k ? 4 : 0;
                            "string" === typeof a ? e.input = Sb.Ta(a) : "[object ArrayBuffer]" === Tb.call(a) ? e.input = new Uint8Array(a) : e.input = a;
                            e.P = 0;
                            for (e.B = e.input.length; ; )
                                if (0 === e.o && (e.output = new Uint8Array(l),
                                e.J = 0,
                                e.o = l),
                                (2 === k || 3 === k) && 6 >= e.o)
                                    this.va(e.output.subarray(0, e.J)),
                                    e.o = 0;
                                else {
                                    a = Ra.Za(e, k);
                                    if (1 === a)
                                        return 0 < e.J && this.va(e.output.subarray(0, e.J)),
                                        a = Ra.$a(this.h),
                                        this.xb(a),
                                        this.ended = !0,
                                        0 === a;
                                    if (0 === e.o)
                                        this.va(e.output);
                                    else if (0 < k && 0 < e.J)
                                        this.va(e.output.subarray(0, e.J)),
                                        e.o = 0;
                                    else if (0 === e.B)
                                        break
                                }
                            return !0
                        }
                        ;
                        ab.prototype.va = function(a) {
                            this.za.push(a)
                        }
                        ;
                        ab.prototype.xb = function(a) {
                            0 === a && (this.result = Rb.kb(this.za));
                            this.za = [];
                            this.ua = this.h.ua
                        }
                        ;
                        b = new ab(b);
                        b.push(h, !0);
                        return b.result
                    }
                    function Vb(h) {
                        var b = String.fromCharCode.bind(String);
                        return ("function" === typeof Buffer ? function(d) {
                            return Buffer.from(d).toString("base64")
                        }
                        : function(d) {
                            for (var c = [], f = 0, g = d.length; f < g; f += 4096)
                                c.push(b.apply(null, d.subarray(f, f + 4096)));
                            return sb(c.join(""))
                        }
                        )(h)
                    }
                    function tb(h, b) {
                        var d = h[0]
                          , c = h[1]
                          , f = h[2]
                          , g = h[3];
                        d = da(d, c, f, g, b[0], 7, -680876936);
                        g = da(g, d, c, f, b[1], 12, -389564586);
                        f = da(f, g, d, c, b[2], 17, 606105819);
                        c = da(c, f, g, d, b[3], 22, -1044525330);
                        d = da(d, c, f, g, b[4], 7, -176418897);
                        g = da(g, d, c, f, b[5], 12, 1200080426);
                        f = da(f, g, d, c, b[6], 17, -1473231341);
                        c = da(c, f, g, d, b[7], 22, -45705983);
                        d = da(d, c, f, g, b[8], 7, 1770035416);
                        g = da(g, d, c, f, b[9], 12, -1958414417);
                        f = da(f, g, d, c, b[10], 17, -42063);
                        c = da(c, f, g, d, b[11], 22, -1990404162);
                        d = da(d, c, f, g, b[12], 7, 1804603682);
                        g = da(g, d, c, f, b[13], 12, -40341101);
                        f = da(f, g, d, c, b[14], 17, -1502002290);
                        c = da(c, f, g, d, b[15], 22, 1236535329);
                        d = ea(d, c, f, g, b[1], 5, -165796510);
                        g = ea(g, d, c, f, b[6], 9, -1069501632);
                        f = ea(f, g, d, c, b[11], 14, 643717713);
                        c = ea(c, f, g, d, b[0], 20, -373897302);
                        d = ea(d, c, f, g, b[5], 5, -701558691);
                        g = ea(g, d, c, f, b[10], 9, 38016083);
                        f = ea(f, g, d, c, b[15], 14, -660478335);
                        c = ea(c, f, g, d, b[4], 20, -405537848);
                        d = ea(d, c, f, g, b[9], 5, 568446438);
                        g = ea(g, d, c, f, b[14], 9, -1019803690);
                        f = ea(f, g, d, c, b[3], 14, -187363961);
                        c = ea(c, f, g, d, b[8], 20, 1163531501);
                        d = ea(d, c, f, g, b[13], 5, -1444681467);
                        g = ea(g, d, c, f, b[2], 9, -51403784);
                        f = ea(f, g, d, c, b[7], 14, 1735328473);
                        c = ea(c, f, g, d, b[12], 20, -1926607734);
                        d = aa(c ^ f ^ g, d, c, b[5], 4, -378558);
                        g = aa(d ^ c ^ f, g, d, b[8], 11, -2022574463);
                        f = aa(g ^ d ^ c, f, g, b[11], 16, 1839030562);
                        c = aa(f ^ g ^ d, c, f, b[14], 23, -35309556);
                        d = aa(c ^ f ^ g, d, c, b[1], 4, -1530992060);
                        g = aa(d ^ c ^ f, g, d, b[4], 11, 1272893353);
                        f = aa(g ^ d ^ c, f, g, b[7], 16, -155497632);
                        c = aa(f ^ g ^ d, c, f, b[10], 23, -1094730640);
                        d = aa(c ^ f ^ g, d, c, b[13], 4, 681279174);
                        g = aa(d ^ c ^ f, g, d, b[0], 11, -358537222);
                        f = aa(g ^ d ^ c, f, g, b[3], 16, -722521979);
                        c = aa(f ^ g ^ d, c, f, b[6], 23, 76029189);
                        d = aa(c ^ f ^ g, d, c, b[9], 4, -640364487);
                        g = aa(d ^ c ^ f, g, d, b[12], 11, -421815835);
                        f = aa(g ^ d ^ c, f, g, b[15], 16, 530742520);
                        c = aa(f ^ g ^ d, c, f, b[2], 23, -995338651);
                        d = fa(d, c, f, g, b[0], 6, -198630844);
                        g = fa(g, d, c, f, b[7], 10, 1126891415);
                        f = fa(f, g, d, c, b[14], 15, -1416354905);
                        c = fa(c, f, g, d, b[5], 21, -57434055);
                        d = fa(d, c, f, g, b[12], 6, 1700485571);
                        g = fa(g, d, c, f, b[3], 10, -1894986606);
                        f = fa(f, g, d, c, b[10], 15, -1051523);
                        c = fa(c, f, g, d, b[1], 21, -2054922799);
                        d = fa(d, c, f, g, b[8], 6, 1873313359);
                        g = fa(g, d, c, f, b[15], 10, -30611744);
                        f = fa(f, g, d, c, b[6], 15, -1560198380);
                        c = fa(c, f, g, d, b[13], 21, 1309151649);
                        d = fa(d, c, f, g, b[4], 6, -145523070);
                        g = fa(g, d, c, f, b[11], 10, -1120210379);
                        f = fa(f, g, d, c, b[2], 15, 718787259);
                        c = fa(c, f, g, d, b[9], 21, -343485551);
                        h[0] = d + h[0] & 4294967295;
                        h[1] = c + h[1] & 4294967295;
                        h[2] = f + h[2] & 4294967295;
                        h[3] = g + h[3] & 4294967295
                    }
                    function aa(h, b, d, c, f, g) {
                        b = (b + h & 4294967295) + (c + g & 4294967295) & 4294967295;
                        return (b << f | b >>> 32 - f) + d & 4294967295
                    }
                    function da(h, b, d, c, f, g, m) {
                        return aa(b & d | ~b & c, h, b, f, g, m)
                    }
                    function ea(h, b, d, c, f, g, m) {
                        return aa(b & c | d & ~c, h, b, f, g, m)
                    }
                    function fa(h, b, d, c, f, g, m) {
                        return aa(d ^ (b | ~c), h, b, f, g, m)
                    }
                    function ia(h) {
                        var org = h
                          , b = h
                          , d = b.length;
                        h = [1732584193, -271733879, -1732584194, 271733878];
                        var c;
                        for (c = 64; c <= b.length; c += 64) {
                            var f, g = b.substring(c - 64, c), m = [];
                            for (f = 0; 64 > f; f += 4)
                                m[f >> 2] = g.charCodeAt(f) + (g.charCodeAt(f + 1) << 8) + (g.charCodeAt(f + 2) << 16) + (g.charCodeAt(f + 3) << 24);
                            tb(h, m)
                        }
                        b = b.substring(c - 64);
                        f = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                        for (c = 0; c < b.length; c++)
                            f[c >> 2] |= b.charCodeAt(c) << (c % 4 << 3);
                        f[c >> 2] |= 128 << (c % 4 << 3);
                        if (55 < c)
                            for (tb(h, f),
                            c = 0; 16 > c; c++)
                                f[c] = 0;
                        f[14] = 8 * d;
                        tb(h, f);
                        for (b = 0; b < h.length; b++) {
                            d = b;
                            c = h[b];
                            f = "";
                            for (g = 0; 4 > g; g++)
                                f += Wb[c >> 8 * g + 4 & 15] + Wb[c >> 8 * g & 15];
                            h[d] = f
                        }
                        var m = h.join("");
                        !N.quiet && console.log("%c[hash!]%c:" + m + "\n%c[!data]:" + org + "\n", "color: red;", "", "color: gray;");
                        "function" === typeof window.MartellFingerprintDebugWrite && window.MartellFingerprintDebugWrite("hash", org);
                        "function" === typeof window.MartellFingerprintDebugWrite && window.MartellFingerprintDebugWrite("hash-result", m);
                        return m
                    }
                    function ub(h, b) {
                        function c(f) {
                            try {
                                f()
                            } catch (g) {
                                x.push("ptQerr-" + (g && (g.message || g.toString()) || ""))
                            }
                        }
                        var d = 0;
                        b && (d = performance.now() - b,
                        x.push("ptQplt-" + d));
                        b = performance.now();
                        for (x.push("ptQs-" + h.length + ": " + performance.now()); document.hidden && 0 < h.length; )
                            c(h.shift());
                        if (3 > d && 0 < h.length)
                            c(h.shift());
                        else
                            for (; performance.now() - b < 3 * d && 0 < h.length; )
                                c(h.shift());
                        x.push("ptQe-" + h.length + ": " + performance.now());
                        if (0 < h.length)
                            try {
                                setImmediate(ub.bind(wa, h, performance.now()))
                            } catch (c) {
                                setTimeout(ub.bind(wa, h, performance.now()), 0)
                            }
                    }
                    function Xb(h, b, d) {
                        null == d && (d = function(m, w) {
                            return m.time > w.time ? 1 : m.time < w.time ? -1 : 0
                        }
                        );
                        for (var c = 0, f = h.length, g = Math.floor((c + f) / 2); f > c; )
                            0 > d(b, h[g]) ? f = g : c = g + 1,
                            g = Math.floor((c + f) / 2);
                        h.splice(g, 0, b)
                    }
                    function ra(h, b) {
                        for (var d = [], c = 2; c < arguments.length; c++)
                            d.push(arguments[c]);
                        c = !1;
                        0 > b && (c = !0,
                        b = -1 * (b + 1));
                        d = {
                            time: Math.round(performance.now() + b),
                            Ca: h,
                            ya: d
                        };
                        Xb(c ? vb : sa, d)
                    }
                    function Ia(h) {
                        if ((h || document.hidden) && (0 == sa.length || sa[0].time > performance.now()))
                            for (; 0 < vb.length; )
                                Xb(sa, vb.shift());
                        for (; 0 < sa.length && sa[0].time <= performance.now(); ) {
                            try {
                                sa[0].Ca.apply(this, sa[0].ya)
                            } catch (b) {}
                            sa.shift()
                        }
                    }
                    function t(h, b, d) {
                        if (ja && "undefined" !== typeof b) {
                            var c = 0;
                            -2 == (ba[h] || null) && -2 != b ? c = -1 : -2 != (ba[h] || null) && -2 == b && (c = 1);
                            wb += c;
                            ba[h] = b;
                            0 != c && !d && xb && xb(2)
                        }
                    }
                    function U(h) {
                        var b = Math.round(performance.now() - bb);
                        cb += b + "!" + h + ","
                    }
                    function Yb(h, b) {
                        if (!h || h.constructor !== Array)
                            return "";
                        var d = h.length;
                        !b && 300 < d && (d = 300);
                        var c = "!" + d + ";";
                        for (b = 0; b < d; b++)
                            if ("object" == typeof h[b] && null != h[b] && h[b].constructor === Array)
                                c += Yb(h[b], !1);
                            else {
                                a: {
                                    var f = h[b];
                                    try {
                                        if (f && f.toString) {
                                            var g = f.toString().replace(/\\/gi, "\\\\").replace(/!/gi, "\\!").replace(/;/gi, "\\;");
                                            break a
                                        }
                                    } catch (m) {}
                                    g = ""
                                }
                                c += g + ";"
                            }
                        return c
                    }
                    function yb() {
                        return Object.assign({}, {
                            status: 0,
                            responseText: "",
                            readyState: 0,
                            timeout: 0,
                            withCredentials: !1,
                            ma: "",
                            la: {},
                            onerror: null,
                            onload: null,
                            onabort: null,
                            onprogress: null,
                            onreadystatechange: null,
                            ontimeout: null,
                            keepalive: !1,
                            pa: !1,
                            priority: "",
                            cache: "",
                            url: "",
                            method: "",
                            controller: void 0,
                            handleEvent: function(h, b, d) {
                                try {
                                    if (!this.pa) {
                                        if ("onload" == h || "onerror" == h || "onabort" == h || "ontimeout" == h)
                                            this.pa = !0;
                                        if (void 0 !== d) {
                                            var c = this.readyState != d;
                                            if (2 != this.readyState || 0 < d)
                                                this.readyState = d;
                                            if (this.onreadystatechange && c)
                                                this.onreadystatechange()
                                        }
                                        if (this[h])
                                            if (!1 !== b)
                                                this[h](b);
                                            else
                                                this[h]()
                                    }
                                } catch (f) {}
                            },
                            setRequestHeader: function(h, b) {
                                this.la[h] = b
                            },
                            open: function(h, b) {
                                if ("" != this.url)
                                    throw Error("x2f reused " + this.url);
                                this.controller = new AbortController;
                                this.method = h;
                                this.url = b;
                                this.handleEvent("onreadystatechange", !1, 1)
                            },
                            send: function(h) {
                                try {
                                    if ("" == this.url)
                                        throw Error("x2f url empty");
                                    var b = this;
                                    0 < b.timeout && setTimeout(function() {
                                        0 != b.status && (b.handleEvent("ontimeout", !1, 4),
                                        b.abort())
                                    }, b.timeout);
                                    var d = {
                                        method: this.method,
                                        signal: this.controller.signal,
                                        mode: "cors"
                                    };
                                    h && (d.body = h);
                                    "" != this.cache && (d.cache = this.cache);
                                    "" != this.priority && (d.priority = this.priority);
                                    this.keepalive && (d.keepalive = !0);
                                    d.credentials = this.withCredentials ? "include" : "same-origin";
                                    0 < Object.keys(this.la).length && (d.headers = this.la);
                                    this.controller.onabort = function(c) {
                                        b.status = 0;
                                        b.handleEvent("onabort", c, 4)
                                    }
                                    ;
                                    fetch(this.url, d).then(function(c) {
                                        b.status = c.status;
                                        c.headers.forEach(function(f, g) {
                                            b.ma = b.ma + g + ": " + f + "\r\n"
                                        });
                                        if (204 == c.status)
                                            return "";
                                        b.handleEvent("onprogress", !1, 2);
                                        setTimeout(function() {}, 0);
                                        return c.text()
                                    }).then(function(c) {
                                        b.responseText = c;
                                        b.handleEvent("onload", !1, 4)
                                    })["catch"](function(c) {
                                        b.status = 0;
                                        b.handleEvent("AbortError" === (c.name || "") ? "onabort" : "onerror", c, 4)
                                    })
                                } catch (c) {
                                    b.handleEvent("onerror", c, 4)
                                }
                            },
                            abort: function() {
                                if (!this.keepalive)
                                    try {
                                        this.status = 0,
                                        this.controller.abort()
                                    } catch (h) {}
                            },
                            getAllResponseHeaders: function() {
                                return this.ma
                            }
                        })
                    }
                    function zb(h) {
                        return [h.name || "", h.nextHopProtocol || "", h.decodedBodySize || "", h.encodedBodySize || "", h.type || "", h.transferSize || "", h.startTime || "", h.connectEnd || "", h.connectStart || "", h.domainLookupEnd || "", h.domainLookupStart || "", h.Gb || "", h.requestStart || "", h.responseEnd || "", h.responseStart || "", h.secureConnectionStart || "", h.contentType || "", h.initiatorType || "", h.redirectCount || "", h.redirectStart || "", h.redirectEnd || "", h.Lb || "", h.type || ""]
                    }
                    function Ta(h, b, d, c) {
                        try {
                            "undefined" !== typeof b && t(b, -2, !0);
                            if (!h || "local" !== N.network_mode && /^https?:\/\//i.test(h)) {
                                "undefined" !== typeof b && t(b, [-3, 0, 0, "", []]);
                                return;
                            }
                            var f = Ab(0);
                            "priority"in f && (f.priority = "auto");
                            "withCredentials"in f && (f.withCredentials = !1);
                            db.push(f);
                            f.open("GET", h, !0);
                            d && (f.timeout = d);
                            var g = performance.now()
                              , m = !1;
                            f.onload = f.onreadystatechange = function() {
                                if (4 == f.readyState && "" != f.responseText && !m) {
                                    m = !0;
                                    var w = []
                                      , D = "";
                                    if ("performance"in window && "getEntriesByName"in window.performance) {
                                        var B = performance.getEntriesByName(h, "resource");
                                        0 < B.length && (w = zb(B[0]))
                                    }
                                    f.getAllResponseHeaders && (D = f.getAllResponseHeaders());
                                    "undefined" !== typeof b && t(b, [c ? f.responseText.match(c)[0] || "" : f.responseText, g, performance.now(), D, w])
                                }
                            }
                            ;
                            "undefined" !== typeof b && (f.onabort = f.ontimeout = f.onerror = function() {
                                t(b, [-1, g, performance.now(), "", []])
                            }
                            );
                            f.send()
                        } catch (w) {
                            "undefined" !== typeof b && t(b, [-3, 0, 0, "", []])
                        }
                    }
                    function Zb(h) {
                        var b = ""
                          , d = Ja.length - 3;
                        h || (h = ~~(Math.random() * d));
                        for (var c = 0; c < h; c++)
                            b += Ja[~~(Math.random() * d)];
                        return b
                    }
                    function rc(h) {
                        return Object.assign({}, {
                            url: "",
                            priority: "",
                            status: 0,
                            responseText: "",
                            readyState: 0,
                            timeout: 0,
                            withCredentials: h || !1,
                            K: null,
                            done: !1,
                            timeout: 0,
                            onerror: null,
                            onload: null,
                            ontimeout: null,
                            ub: 1,
                            rb: 6E4,
                            ib: 300,
                            open: function(b, d) {
                                this.url = d;
                                return !0
                            },
                            send: function(b) {
                                var d = this;
                                this.K = document.createElement("script");
                                "" != this.priority && this.K.setAttribute("fetchpriority", this.priority);
                                this.K.setAttribute("type", "text/javascript");
                                this.withCredentials || this.K.setAttribute("crossorigin", "anonymous");
                                this.K.onload = function() {
                                    if (!d.done) {
                                        d.done = !0;
                                        if (window.MartellFingerprintResponseStatus) {
                                            if (d.status = window.MartellFingerprintResponseStatus,
                                            d.responseText = window.MartellFingerprintResponseText || "",
                                            d.readyState = 4,
                                            window.MartellFingerprintResponseStatus = window.MartellFingerprintResponseText = void 0,
                                            d.onload)
                                                d.onload()
                                        } else if (d.status = 0,
                                        d.onerror)
                                            d.onerror("jsonp-noresp");
                                        d.abort()
                                    }
                                }
                                ;
                                this.K.onreadystatechange = function() {
                                    if ("loaded" == d.K.readyState || "complete" == d.K.readyState) {
                                        if (window.MartellFingerprintResponseStatus)
                                            d.K.onload();
                                        ra(function() {
                                            if (window.MartellFingerprintResponseStatus)
                                                d.K.onload()
                                        }, 10)
                                    }
                                }
                                ;
                                this.K.onerror = function(f) {
                                    if (!d.done) {
                                        d.done = !0;
                                        d.status = 0;
                                        d.responseText = "";
                                        if (d.onerror)
                                            d.onerror(f);
                                        d.abort()
                                    }
                                }
                                ;
                                if ("string" === typeof b)
                                    try {
                                        var c = "TextEncoder"in window ? Vb((new TextEncoder).encode(b)) : sb(unescape(encodeURIComponent(b)))
                                    } catch (f) {
                                        c = sb(b)
                                    }
                                else
                                    c = Vb(b);
                                b = this.url + "?" + encodeURIComponent(c);
                                if (6E4 < b.length)
                                    throw Error("URL too long");
                                this.K.setAttribute("src", b);
                                Bb.appendChild(this.K);
                                0 < d.timeout && ra(function() {
                                    if (this.ontimeout)
                                        this.ontimeout();
                                    d.abort()
                                }, d.timeout)
                            },
                            abort: function() {
                                if (this.K.parentNode)
                                    try {
                                        Bb.removeChild(this.K)
                                    } catch (b) {}
                            }
                        })
                    }
                    function Ab(h) {
                        if ("AbortController"in window && 0 > --h && na)
                            return $b(!0);
                        if ("AbortController"in window && 0 > --h)
                            return yb();
                        if ("XDomainRequest"in window && 0 > --h)
                            return new XDomainRequest;
                        if ("XMLHttpRequest"in window && 0 > --h && na)
                            return $b(!0);
                        if ("XMLHttpRequest"in window && 0 > --h)
                            return new XMLHttpRequest;
                        if ("ActiveXObject"in window && 0 > --h)
                            try {
                                return new ActiveXObject("Msxml2.XMLHTTP")
                            } catch (b) {
                                try {
                                    return new ActiveXObject("Microsoft.XMLHTTP")
                                } catch (d) {}
                            }
                        return 0 > --h ? rc() : !1
                    }
                    function eb(h, b, d, c, f) {
                        if ("local" !== N.network_mode) {
                            c && c("", 5);
                            return !1
                        }
                        function g(y, J) {
                            c && c(0 == J ? y : "", J)
                        }
                        function m(y) {
                            U("sAIF");
                            Object.keys(G).forEach(function(J) {
                                if (!y || J != y) {
                                    if ("abort"in G[J])
                                        try {
                                            G[J].abort()
                                        } catch (P) {}
                                    delete G[J]
                                }
                            })
                        }
                        function w(y, J, P) {
                            function Y() {
                                "" != G[ca].responseText && U("cRAR" + G[ca].responseText.length);
                                return !1
                            }
                            function C(L) {
                                if ("string" !== typeof L && !(L instanceof String))
                                    try {
                                        "preventDefault"in L && L.preventDefault(),
                                        "stopImmediatePropagation"in L && L.stopImmediatePropagation()
                                    } catch (pa) {}
                            }
                            function R(L) {
                                C(L);
                                if (G[ca] && !Y()) {
                                    delete G[ca];
                                    try {
                                        var pa = "string" == typeof L ? L : "object" == typeof L ? L.message || "" : typeof L
                                    } catch ($a) {
                                        pa = typeof $a
                                    }
                                    U("sDiOE:" + pa);
                                    H++;
                                    2 == H ? (z++,
                                    A = H = 0,
                                    y = !0) : 30 > performance.now() - Ga && (y = !1);
                                    w(y, J, P + 1)
                                }
                            }
                            function W() {
                                0 < ua - (performance.now() - Ga) ? ra(W, ua) : G[ca] && (U("sDiOT"),
                                Y() || (A++,
                                3 == A && (z++,
                                A = H = 0,
                                y = !0),
                                w(y, J, P + 1)))
                            }
                            function S(L) {
                                C(L);
                                G[ca] && (U("sDiOA"),
                                Y() || (delete G[ca],
                                w(y, J, P + 1)))
                            }
                            function Q(L) {
                                C(L);
                                G[ca] && 0 != (G[ca].status || 0) && !Y() && (U("sDiOP"),
                                Ga = performance.now(),
                                m(ca))
                            }
                            function Ba(L) {
                                C(L);
                                if (G[ca])
                                    if ("status"in K && 0 == K.status)
                                        R("ONLOADF1");
                                    else {
                                        L = 200;
                                        "status"in K && (L = K.status);
                                        var pa = K.responseText;
                                        U("sDiOL" + L);
                                        "" != d && 200 == L && "" == pa ? R("ONLOADF2") : (delete G[ca],
                                        403 != L || J ? 421 == L && y ? (m(!1),
                                        w(!1, J, 0)) : 3 > E && 200 != L && (400 > L || 499 < L) ? (E++,
                                        w(y, J, P + 1)) : (m(!1),
                                        g(pa, 200 == L ? 0 : L)) : w(y, !0, P))
                                    }
                            }
                            if ("undefined" == typeof fb || fb) {
                                U("sDi" + z + P);
                                if (10 <= Object.keys(G).length)
                                    return U("sDiIFMAX"),
                                    !1;
                                Ua[P] || (P = 0);
                                var Fa = Ua[P];
                                I++;
                                var ca = I
                                  , K = Ab(z);
                                if (!K) {
                                    if (0 < Object.keys(G).length)
                                        return !1;
                                    U("sDiSKIPMAX");
                                    g("", 3);
                                    return !1
                                }
                                G[ca] = K;
                                var ua = 500;
                                "extratimeout"in K && (ua += K.ib);
                                try {
                                    var Pa = function() {
                                        try {
                                            K.onerror = R
                                        } catch (L) {}
                                        try {
                                            K.onabort = S
                                        } catch (L) {}
                                        try {
                                            K.onload = Ba
                                        } catch (L) {}
                                        try {
                                            K.onprogress = Q
                                        } catch (L) {}
                                        try {
                                            K.onloadstart = Q
                                        } catch (L) {}
                                        try {
                                            K.onreadystatechange = function() {
                                                2 > K.readyState || (4 > K.readyState ? Q(!1) : "" != K.responseText && Ba(!1))
                                            }
                                        } catch (L) {}
                                    };
                                    var la = J ? N.endpoints.protocols.http : N.endpoints.protocols.https;
                                    la = -1 === Fa.indexOf(":") ? la + Fa : J ? la + Fa.replace(":2087", ":2086") : la + Fa;
                                    la += "/" + h;
                                    !y && "maxdatalength"in K && d.length > K.rb && (y = !0);
                                    Pa();
                                    K.open("" == d ? "GET" : "POST", la, !0);
                                    Pa();
                                    try {
                                        "priority"in K && (K.priority = "high"),
                                        "withCredentials"in K && (K.withCredentials = !1),
                                        "timeout"in K && (K.timeout = 0),
                                        "cache"in K && (K.cache = "no-store"),
                                        "responseType"in K && (K.responseType = "text"),
                                        "setRequestHeader"in K && K.setRequestHeader("Accept", "text/plain")
                                    } catch (L) {}
                                    if (y) {
                                        "setRequestHeader"in K && K.setRequestHeader("Content-Type", "text/plain;charset=x-user-defined");
                                        try {
                                            if (K.ub || !B)
                                                K.send(b);
                                            else
                                                try {
                                                    K.send(B)
                                                } catch (L) {
                                                    K.send(b)
                                                }
                                        } catch (L) {
                                            w(!1, J, 0);
                                            return
                                        }
                                    } else
                                        "setRequestHeader"in K && "" != d && K.setRequestHeader("Content-Type", "text/plain"),
                                        K.send(d);
                                    var Ga = performance.now();
                                    "" != d && ra(W, ua)
                                } catch (L) {
                                    throw R(L),
                                    L;
                                }
                            }
                        }
                        var D = !1;
                        if ("string" !== typeof b && !(b instanceof String) && "buffer"in b) {
                            var B = !1;
                            try {
                                B = new Blob([b.buffer.slice(b.byteOffset, b.byteLength + b.byteOffset)],{
                                    type: "text/plain;charset=x-user-defined"
                                })
                            } catch (y) {}
                            D = !0
                        }
                        U("sD:" + h);
                        f && ra(function() {
                            0 != Object.keys(G).length && (U("AT"),
                            m(!1),
                            g("", 5))
                        }, f);
                        if (navigator.sendBeacon && "object" == typeof N && N.async_callback && "p" == h && b && navigator.sendBeacon(N.endpoints.protocols.https + Ua[0] + "/" + h, b))
                            return g("", 0),
                            !0;
                        var z = 0
                          , H = 0
                          , E = 0
                          , A = 0
                          , G = {}
                          , I = 0;
                        w(D, !ac, 0)
                    }
                    function $b(h) {
                        return Object.assign({}, {
                            requestId: 0,
                            status: 0,
                            responseText: "",
                            readyState: 0,
                            timeout: 0,
                            withCredentials: !1,
                            ma: "",
                            la: {},
                            onerror: null,
                            onload: null,
                            onabort: null,
                            onprogress: null,
                            onreadystatechange: null,
                            ontimeout: null,
                            keepalive: !1,
                            pa: !1,
                            priority: "",
                            cache: "",
                            url: "",
                            method: "",
                            handleEvent: function(b, d) {
                                try {
                                    if (!this.pa) {
                                        if ("onload" == b || "onerror" == b || "onabort" == b || "ontimeout" == b)
                                            this.pa = !0;
                                        this.readyState = d.readyState;
                                        this.status = d.status;
                                        this.responseText = d.responseText;
                                        this.ma = d.Ra;
                                        var c = this.readyState != d.readyState;
                                        if (2 != this.readyState || 0 < d.readyState)
                                            this.readyState = d.readyState;
                                        if (this.onreadystatechange && c)
                                            this.onreadystatechange();
                                        if (this[b])
                                            this[b]()
                                    }
                                } catch (f) {}
                            },
                            setRequestHeader: function(b, d) {
                                this.la[b] = d
                            },
                            open: function(b, d) {
                                if ("" != this.url)
                                    throw Error("x2f reused " + this.url);
                                this.method = b;
                                this.url = d
                            },
                            send: function(b) {
                                bc++;
                                this.requestId = bc;
                                cc[this.requestId] = this.handleEvent.bind(this);
                                b = {
                                    requestId: this.requestId,
                                    wa: h ? "fetch" : "xhr",
                                    url: this.url,
                                    method: this.method,
                                    data: b
                                };
                                0 < this.timeout && (b.timeout = this.timeout);
                                this.withCredentials && (b.withCredentials = this.withCredentials);
                                0 < Object.keys(this.la).length && (b.Ga = this.Ga);
                                this.priority && (b.priority = this.priority);
                                this.cache && (b.cache = this.cache);
                                na.postMessage(b)
                            },
                            abort: function() {
                                if (!this.keepalive)
                                    try {
                                        na.postMessage({
                                            requestId: this.requestId,
                                            wa: "abort"
                                        })
                                    } catch (b) {}
                            },
                            getAllResponseHeaders: function() {
                                return this.ma
                            }
                        })
                    }
                    function Cb(h) {
                        try {
                            if ("undefined" === typeof window[h])
                                return !1;
                            if (h in gb)
                                return gb[h];
                            window[h].setItem("Martell browser fingerprint by memade", "Martell browser fingerprint by memade");
                            window[h].removeItem("Martell browser fingerprint by memade");
                            return gb[h] = !0
                        } catch (b) {
                            return gb[h] = !1
                        }
                    }
                    function dc(h) {
                        return !isNaN(parseFloat(h)) && !isNaN(h - 0)
                    }
                    function ec(h) {
                        if (Cb("localStorage"))
                            try {
                                return dc(window.localStorage.getItem("e_" + h)) && +new Date < window.localStorage.getItem("e_" + h) ? window.localStorage.getItem("v_" + h) : ""
                            } catch (f) {}
                        h += "=";
                        try {
                            var b = decodeURIComponent(document.cookie)
                        } catch (f) {
                            return ""
                        }
                        b = b.split(";");
                        for (var d = 0; d < b.length; d++) {
                            for (var c = b[d]; " " == c.charAt(0); )
                                c = c.substring(1);
                            if (0 == c.indexOf(h))
                                return c.substring(h.length, c.length)
                        }
                        return ""
                    }
                    function hb(h, b, d) {
                        try {
                            if (Cb("localStorage"))
                                try {
                                    0 == d ? (window.localStorage.removeItem("v_" + h),
                                    window.localStorage.removeItem("e_" + h)) : (window.localStorage.setItem("v_" + h, b),
                                    window.localStorage.setItem("e_" + h, +new Date + 36E5 * d))
                                } catch (g) {}
                            else if (!N.nocookies) {
                                var c = new Date;
                                c.setTime(c.getTime() + 36E5 * d);
                                var f = h + "=" + b + ";expires=" + c.toUTCString() + ";path=/";
                                f = window.isSecureContext ? f + ";SameSite=None;Secure" : f + ";SameSite=Lax";
                                document.cookie = f
                            }
                        } catch (g) {}
                    }
                    function q() {
                        return "undefined" !== typeof performance && "undefined" !== typeof performance.now ? performance.now() : +new Date
                    }
                    function O(h) {
                        try {
                            if (null === h || "undefined" === typeof h)
                                return "";
                            if (h && h.toString && fc.hasOwnProperty(h.toString()))
                                return "#" + fc[h.toString()];
                            if ("String" === typeof h)
                                return h;
                            if (0 === h)
                                return "0";
                            if (1 === h)
                                return "1";
                            if (!1 === h)
                                return "0";
                            if (!0 === h)
                                return "1";
                            if (h instanceof Array)
                                return h;
                            if (h && h.toString)
                                return h.toString()
                        } catch (b) {}
                        try {
                            if (h = "" + h,
                            "undefined" != h)
                                return h
                        } catch (b) {}
                        return ""
                    }
                    function F(h) {
                        gc.push(O(h))
                    }
                    function Lc(h) {
                        function b(d, c) {
                            try {
                                return {
                                    handled: !0,
                                    value: d()
                                }
                            } catch (f) {
                                return {
                                    handled: !0,
                                    value: "undefined" === typeof c ? "" : c
                                }
                            }
                        }
                        switch (h) {
                        case "!(top==window)":
                            return b(function() {
                                return !(top == window)
                            });
                        case "!!document.fullscreen||!!document.mozFullscreen||!!document.webkitIsFullScreen||!!document.fullScreenElement":
                            return b(function() {
                                return !!document.fullscreen || !!document.mozFullscreen || !!document.webkitIsFullScreen || !!document.fullScreenElement
                            });
                        case "window.screenX||window.screenLeft":
                            return b(function() {
                                return window.screenX || window.screenLeft
                            });
                        case "window.screenY||window.screenTop":
                            return b(function() {
                                return window.screenY || window.screenTop
                            });
                        case "document.hasFocus()":
                            return b(function() {
                                return document.hasFocus()
                            });
                        case "navigator.languages.toString()":
                            return b(function() {
                                return navigator.languages.toString()
                            });
                        case "window.opener==null":
                            return b(function() {
                                return window.opener == null
                            });
                        case "window.opener.screenX||window.opener.screenLeft":
                            return b(function() {
                                return window.opener.screenX || window.opener.screenLeft
                            });
                        case "window.opener.screenY||window.opener.screenTop":
                            return b(function() {
                                return window.opener.screenY || window.opener.screenTop
                            });
                        case "(new Date).getTimezoneOffset()":
                            return b(function() {
                                return (new Date).getTimezoneOffset()
                            });
                        case "window.ScriptEngineMajorVersion();":
                            return b(function() {
                                return window.ScriptEngineMajorVersion()
                            });
                        case "window.ScriptEngineMinorVersion();":
                            return b(function() {
                                return window.ScriptEngineMinorVersion()
                            });
                        case "window.ScriptEngineBuildVersion();":
                            return b(function() {
                                return window.ScriptEngineBuildVersion()
                            });
                        case "typeof window.ondevicelight":
                            return b(function() {
                                return typeof window.ondevicelight
                            });
                        case "typeof window.ontouchstart":
                            return b(function() {
                                return typeof window.ontouchstart
                            });
                        case "typeof navigator.hardwareConcurrency":
                            return b(function() {
                                return typeof navigator.hardwareConcurrency
                            });
                        case "typeof document.visibilityState":
                            return b(function() {
                                return typeof document.visibilityState
                            });
                        case "Intl.DateTimeFormat().resolvedOptions().timeZone":
                            return b(function() {
                                return Intl.DateTimeFormat().resolvedOptions().timeZone
                            });
                        case "Intl.DateTimeFormat().resolvedOptions().locale":
                            return b(function() {
                                return Intl.DateTimeFormat().resolvedOptions().locale
                            });
                        case 'window.external.getHostEnvironmentValue("os-architecture");':
                            return b(function() {
                                return window.external.getHostEnvironmentValue("os-architecture")
                            });
                        case 'window.external.getHostEnvironmentValue("os-build");':
                            return b(function() {
                                return window.external.getHostEnvironmentValue("os-build")
                            });
                        case 'window.external.getHostEnvironmentValue("os-mode");':
                            return b(function() {
                                return window.external.getHostEnvironmentValue("os-mode")
                            });
                        case 'window.external.getHostEnvironmentValue("os-sku");':
                            return b(function() {
                                return window.external.getHostEnvironmentValue("os-sku")
                            });
                        case 'document.getElementsByTagName("title")[0].innerText':
                            return b(function() {
                                return document.getElementsByTagName("title")[0].innerText
                            });
                        case "document.fullscreenElement!==null":
                            return b(function() {
                                return document.fullscreenElement !== null
                            });
                        default:
                            return {
                                handled: !1,
                                value: ""
                            }
                        }
                    }
                    function n(h) {
                        var b = null;
                        try {
                            if (h.match(/^[A-Za-z\._]+$/)) {
                                for (var d = window, c = h.split("."), f = 0; f < c.length; f++) {
                                    var g = c[f];
                                    if ("window" != g) {
                                        if (null == d)
                                            break;
                                        if ("prototype" == g && "function" !== typeof d)
                                            break;
                                        if ("prototype" != g && "object" !== typeof d)
                                            break;
                                        d = g in d ? d[g] : null
                                    }
                                }
                                F(d);
                                return
                            }
                        } catch (m) {}
                        var d = Lc(h);
                        if (d.handled) {
                            F(d.value);
                            return
                        }
                        if (!N.enable_eval_probe) {
                            F("");
                            return
                        }
                        if (null === b)
                            try {
                                b = eval("(function a(){try{return " + h + '; }catch(e){return ""}})();')
                            } catch (m) {
                                b = ""
                            }
                        F(b)
                    }
                    function sc() {
                        var h = 0;
                        db.forEach(function(b) {
                            if ("abort"in b)
                                try {
                                    "onerror"in b && (b.onerror = null),
                                    "onabort"in b && (b.onabort = null),
                                    "ontimeout"in b && (b.ontimeout = null),
                                    "onload"in b && (b.onload = null),
                                    "onloadstart"in b && (b.onload = null),
                                    "onreadystatechange"in b && (b.onreadystatechange = null),
                                    "onprogress"in b && (b.onprogress = null),
                                    "abort"in b && b.abort(),
                                    h++
                                } catch (d) {}
                        });
                        db = [];
                        return 0 < h
                    }
                    function tc() {
                        try {
                            if (Da = !1,
                            Db.forEach(function(f) {
                                if (f.parentNode)
                                    try {
                                        f.parentNode.removeChild(f)
                                    } catch (g) {}
                                else {
                                    if ("abort"in f)
                                        try {
                                            "onerror"in f && (f.onerror = null),
                                            "onabort"in f && (f.onabort = null),
                                            "ontimeout"in f && (f.ontimeout = null),
                                            "onload"in f && (f.onload = null),
                                            "onloadstart"in f && (f.onload = null),
                                            "onreadystatechange"in f && (f.onreadystatechange = null),
                                            "onprogress"in f && (f.onprogress = null),
                                            "abort"in f && f.abort()
                                        } catch (g) {}
                                    if ("close"in f)
                                        try {
                                            f.close()
                                        } catch (g) {}
                                }
                            }),
                            M = {},
                            Cb("localStorage")) {
                                for (var h = +new Date, b = [], d = 0; d < window.localStorage.length; d++) {
                                    var c = window.localStorage.key(d);
                                    c.startsWith("e_") && (!dc(window.localStorage.getItem(c)) || h >= window.localStorage.getItem(c)) && h >= window.localStorage.getItem(c) && b.push(c.substring(2))
                                }
                                for (d = 0; d < b.length; d++) {
                                    try {
                                        window.localStorage.removeItem("v_" + b[d])
                                    } catch (f) {}
                                    try {
                                        window.localStorage.removeItem("e_" + b[d])
                                    } catch (f) {}
                                }
                            }
                        } catch (f) {
                            return !1
                        }
                        return !0
                    }
                    function Eb(h) {
                        if (ja) {
                            var b = N.lite ? 200 : 400
                              , d = q() - hc;
                            if (1E3 > (N.timeout || 2500) - (performance.now() - bb) || d >= b || 0 == wb || 2 >= wb && 100 <= d)
                                return 0 == h ? ra(ic, 50, !0) : ic(!0),
                                !0;
                            2 != (h || 0) && ra(Eb, 50, 1);
                            return !1
                        }
                    }
                    function uc() {
                        if (N.lite)
                            return ["", "", 0, 0, 0, ""];
                        var h = performance.now()
                          , b = document.createElement("canvas");
                        x.push("canvas " + Math.round(performance.now() - h));
                        var d = "";
                        try {
                            b.addEventListener("webglcontextcreationerror", function(D) {
                                d = D.statusMessage
                            })
                        } catch (D) {}
                        var c = null
                          , f = [];
                        "WebGL2RenderingContext"in window && f.push("webgl2");
                        "WebGLRenderingContext"in window && (f.push("webgl"),
                        f.push("experimental-webgl"));
                        for (var g = 0; g < f.length; g++) {
                            h = performance.now();
                            try {
                                c = b.getContext(f[g], {
                                    failIfMajorPerformanceCaveat: !1,
                                    desynchronized: !0,
                                    preserveDrawingBuffer: !1,
                                    powerPreference: "high-performance"
                                })
                            } catch (D) {
                                x.push("contextfailure " + Math.round(performance.now() - h));
                                continue
                            }
                            h = performance.now() - h;
                            x.push("context " + Math.round(h));
                            if (c) {
                                "experimental-webgl" == f[g] && (Va = !0);
                                Ka = c;
                                b = 0;
                                if (100 > h) {
                                    var m = document.createElement("canvas")
                                      , w = q();
                                    try {
                                        b = m.getContext(f[g], {
                                            failIfMajorPerformanceCaveat: !0
                                        }) ? 0 : 1
                                    } catch (D) {
                                        b = 1,
                                        Va = !0
                                    }
                                    w = q() - w
                                } else
                                    Va = !0;
                                return [f[g], c.constructor || "", Math.round(h), b, Math.round(w), ""]
                            }
                            if (50 < h)
                                return ["", "", 0, 0, 0, ""]
                        }
                        return ["", "", 0, 0, 0, d]
                    }
                    function jc(h, b, d) {
                        M[h] = {
                            status: -2,
                            data: null,
                            callbacks: []
                        };
                        d && M[h].callbacks.push(d);
                        try {
                            return M[h].iframe = document.createElement("iframe"),
                            M[h].iframe.sandbox = "allow-scripts",
                            M[h].iframe.style.display = "none",
                            M[h].iframe.name = h,
                            d = "function success(data){window.parent.postMessage({id: '" + h + "', data: data},\"*\")}function failure(){window.parent.postMessage({id: '" + h + '\',data: null},"*")}',
                            d = d + "try{" + b + "}catch(e){failure()}",
                            d = "%3Chtml%3E%3Chead%3E%3Cscript%3E" + encodeURIComponent(d) + "%3C/script%3E%3C/head%3E%3C/html%3E",
                            M[h].iframe.onerror = function(c) {
                                c = c.target.name;
                                M[c] && (M[c].status = -1,
                                M[c].callbacks && M[c].callbacks.forEach(function(f) {
                                    f(null)
                                }),
                                M[c].iframe.parentNode.removeChild(M[c].iframe))
                            }
                            ,
                            M[h].iframe.src = "data:text/html;charset=utf8," + d,
                            Db.push(M[h].iframe),
                            1 == Object.keys(M).length && window.addEventListener("message", function(c) {
                                try {
                                    c && "object" === typeof c && "data"in c && "object" === typeof c.data && "data"in c.data && "id"in c.data && M[c.data.id] && (M[c.data.id].callbacks && M[c.data.id].callbacks.forEach(function(f) {
                                        f(c.data.data)
                                    }),
                                    M[c.data.id].status = null === c.data.data ? -1 : 1,
                                    M[c.data.id].data = c.data.data,
                                    M[c.data.id].iframe.parentNode.removeChild(M[c.data.id].iframe))
                                } catch (f) {}
                            }),
                            Bb.appendChild(M[h].iframe),
                            M[h].status = 0,
                            !0
                        } catch (c) {
                            M[h].status = -1
                        }
                        return !1
                    }
                    function vc() {
                        var h = q();
                        F(uc());
                        h = Math.round(q() - h);
                        0 < h && x.push("webgl " + h)
                    }
                    function wc() {
                        N.enable_isolated_frame_probe && !N.lite && "Google Inc." == navigator.vendor && jc("webrtc", 'RTCPeerConnection.generateCertificate({name:"ECDSA",namedCurve:"P-256"})["then"](success)["catch"](failure);', !1)
                    }
                    function xc() {
                        N.enable_isolated_frame_probe && "AudioContext"in window && "Google Inc." == navigator.vendor && jc("audio", 'var a=new AudioContext(); success([a["baseLatency"], a["outputLatency"], a["sampleRate"], a["state"]]);', !1)
                    }
                    function La(h, b, d) {
                        try {
                            var c = window.RTCPeerConnection || window.Ib || window.Ob;
                            if (c) {
                                d = d ? {} : {
                                    iceServers: 0 < N.endpoints.stunUrls.length ? [{
                                        urls: N.endpoints.stunUrls.slice()
                                    }] : []
                                };
                                h instanceof RTCCertificate && (d.certificates = [h]);
                                d.iceCandidatePoolSize = 10;
                                try {
                                    var f = new c(d)
                                } catch (g) {
                                    delete d.iceCandidatePoolSize,
                                    f = new c(d)
                                }
                                Db.push(f);
                                f.createDataChannel("" + Math.random());
                                f.onicecandidate = function(g) {
                                    if (g && g.candidate && g.candidate.candidate)
                                        try {
                                            Array.isArray(ba[b]) ? ba[b].push(g.candidate.candidate) : t(b, [g.candidate.candidate]),
                                            t(b)
                                        } catch (m) {}
                                    else if (!g || !g.candidate)
                                        try {
                                            -2 === ba[b] && t(b, [])
                                        } catch (m) {}
                                }
                                ;
                                h = function(g) {
                                    return f.setLocalDescription(g)
                                }
                                ;
                                c = function() {
                                    t(b, -1)
                                }
                                ;
                                try {
                                    f.createOffer().then(h)["catch"](c);
                                    0 == N.endpoints.stunUrls.length && ra(function() {
                                        try {
                                            -2 === ba[b] && t(b, [])
                                        } catch (g) {}
                                    }, 300)
                                } catch (g) {
                                    c(g)
                                }
                            } else
                                t(b, -3)
                        } catch (g) {
                            t(b, -1)
                        }
                    }
                    function xa(h, b) {
                        b = {
                            codec: b,
                            description: new Uint8Array(0)
                        };
                        "VideoDecoder" == h ? (b.hardwareAcceleration = "prefer-hardware",
                        b.codedHeight = 1080,
                        b.codedWidth = 1920) : "VideoEncoder" == h ? (b.hardwareAcceleration = "prefer-hardware",
                        b.height = 1080,
                        b.width = 1920) : (b.sampleRate = 44100,
                        b.numberOfChannels = 2);
                        if ("hardwareAcceleration"in b) {
                            var d = Object.assign({}, b);
                            d.hardwareAcceleration = "prefer-software";
                            return window[h].isConfigSupported(b).then(function(c) {
                                return c.supported ? c : window[h].isConfigSupported(d)
                            })
                        }
                        return window[h].isConfigSupported(b)
                    }
                    function yc(h) {
                        ub([wc, xc, function() {
                            var b = q();
                            try {
                                if (t(0, -2, !0),
                                M.audio && 0 == M.audio.status)
                                    M.audio.callbacks.push(function(c) {
                                        t(0, c ? c : -3)
                                    });
                                else if (M.audio && 1 == M.audio.status)
                                    t(0, M.audio.data);
                                else if ("AudioContext"in window) {
                                    var d = new window.AudioContext;
                                    t(0, [d.baseLatency, d.outputLatency, d.sampleRate, d.state])
                                } else
                                    t(0, [-1, -1, -1, -1])
                            } catch (c) {
                                t(0, [-3, -3, -3, -3])
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 0 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                if (t(1, -4, !0),
                                "BarcodeDetector"in window)
                                    window.BarcodeDetector.getSupportedFormats().then(function(d) {
                                        t(1, d)
                                    })["catch"](function() {
                                        t(1, -3)
                                    });
                                else
                                    t(1, -1, !0)
                            } catch (d) {
                                t(1, -3)
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 1 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                t(2, -2, !0),
                                navigator.getBattery ? navigator.getBattery()["catch"](function() {
                                    t(2, -3)
                                }).then(function(d) {
                                    var c = [];
                                    c.push(O(Math.round(100 * d.level)));
                                    c.push(O(d.charging));
                                    c.push(O(d.chargingTime));
                                    c.push(O(d.dischargingTime));
                                    t(2, c)
                                }) : t(2, -3, !0)
                            } catch (d) {
                                t(2, -3)
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 2 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                if (t(3, -4, !0),
                                navigator.bluetooth)
                                    navigator.bluetooth.getAvailability().then(function(d) {
                                        t(3, d ? 1 : 0)
                                    })["catch"](function() {
                                        t(3, -3)
                                    });
                                else
                                    t(3, -1, !0)
                            } catch (d) {
                                t(3, -3)
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 3 " + b)
                        }
                        , function() {
                            var b = q();
                            t(4, -2, !0);
                            try {
                                var d = function(g) {
                                    g && g.supported && f.push(c);
                                    c++;
                                    if (ta[c] && ja)
                                        xa("AudioDecoder", ta[c]).then(d)["catch"](d);
                                    else
                                        t(4, [f.join(","), ta[c] ? "0" : "1"])
                                };
                                if (!("AudioDecoder"in window)) {
                                    t(4, [-1, -1], !0);
                                    return
                                }
                                var c = 0
                                  , f = [];
                                performance.now();
                                xa("AudioDecoder", ta[0]).then(d)["catch"](d)
                            } catch (g) {
                                ba[4] = [-3, -3]
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 4 " + b)
                        }
                        , function() {
                            var b = q();
                            t(5, -2, !0);
                            try {
                                var d = function(g) {
                                    g && g.supported && f.push(c);
                                    c++;
                                    if (ta[c] && ja)
                                        xa("AudioEncoder", ta[c]).then(d)["catch"](d);
                                    else
                                        t(5, [f.join(","), ta[c] ? "0" : "1"])
                                };
                                if (!("AudioEncoder"in window)) {
                                    t(5, [-1, -1], !0);
                                    return
                                }
                                var c = 0
                                  , f = [];
                                xa("AudioEncoder", ta[0]).then(d)["catch"](d)
                            } catch (g) {
                                t(5, [-3, -3])
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 5 " + b)
                        }
                        , function() {
                            var b = q();
                            t(6, -2, !0);
                            try {
                                var d = function(m) {
                                    m && m.supported && ("prefer-hardware" == m.config.hardwareAcceleration ? f.push(c) : g.push(c));
                                    c++;
                                    if (ya[c] && ja)
                                        xa("VideoDecoder", ya[c]).then(d)["catch"](d);
                                    else
                                        t(6, [f.join(","), g.join(","), ya[c] ? "0" : "1"])
                                };
                                if (!("VideoDecoder"in window)) {
                                    t(6, [-1, -1, -1], !0);
                                    return
                                }
                                var c = 0
                                  , f = []
                                  , g = [];
                                xa("VideoDecoder", ya[0]).then(d)["catch"](d)
                            } catch (m) {
                                t(6, [-3, -3, -3])
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 6 " + b)
                        }
                        , function() {
                            var b = q();
                            t(7, -2, !0);
                            try {
                                var d = function(m) {
                                    m && m.supported && ("prefer-hardware" == m.config.hardwareAcceleration ? f.push(c) : g.push(c));
                                    c++;
                                    if (ya[c] && ja)
                                        xa("VideoEncoder", ya[c]).then(d)["catch"](d);
                                    else
                                        t(7, [f.join(","), g.join(","), ya[c] ? "0" : "1"])
                                };
                                if (!("VideoEncoder"in window)) {
                                    t(7, [-1, -1, -1], !0);
                                    return
                                }
                                var c = 0
                                  , f = []
                                  , g = [];
                                xa("VideoEncoder", ya[0]).then(d)["catch"](d)
                            } catch (m) {
                                t(7, [-3, -3, -3])
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 7 " + b)
                        }
                        , function() {
                            var b = q();
                            t(8, -4, !0);
                            if (!N.enable_drm_probe) {
                                t(8, -3, !0);
                                return;
                            }
                            if ("requestMediaKeySystemAccess"in navigator)
                                try {
                                    var d = function(z, H) {
                                        if (g[z])
                                            if (performance.now() - B > (N.lite ? 200 : 400) - 50)
                                                0 < D.length ? t(8, [D, 0]) : t(8, -5);
                                            else
                                                navigator.requestMediaKeySystemAccess(f[g[z]][H], c(g[z])).then(function(E) {
                                                    var A = E.getConfiguration();
                                                    D.push([E.keySystem, A.videoCapabilities[0].contentType, A.videoCapabilities[0].robustness]);
                                                    d(z + 1, 0)
                                                })["catch"](function() {
                                                    f[g[z]][H + 1] ? d(z, H + 1) : d(z + 1, 0)
                                                });
                                        else
                                            0 < D.length ? t(8, [D, 1]) : t(8, -3)
                                    }
                                      , c = function(z) {
                                        var H = [], E;
                                        for (E in w)
                                            for (var A in m[z])
                                                H.push({
                                                    initDataTypes: ["cenc"],
                                                    videoCapabilities: [{
                                                        contentType: w[E],
                                                        robustness: m[z][A]
                                                    }]
                                                });
                                        return H
                                    }
                                      , f = {
                                        yb: ["com.microsoft.playready.recommendation", "com.microsoft.playready"],
                                        Xa: ["org.w3.clearkey", "webkit-org.w3.clearkey"],
                                        Ab: ["com.widevine.alpha"],
                                        jb: ["com.apple.fairplay", "com.apple.fps.3_0", "com.apple.fps.2_0", "com.apple.fps"]
                                    }
                                      , g = Object.keys(f)
                                      , m = {
                                        yb: ["3000", "2000", "150", ""],
                                        Xa: [""],
                                        Ab: ["HW_SECURE_ALL", "HW_SECURE_DECODE", "HW_SECURE_CRYPTO", "SW_SECURE_DECODE", "SW_SECURE_CRYPTO"],
                                        Kb: [""],
                                        jb: [""]
                                    }
                                      , w = ['video/mp4; codecs="avc1.42E01E"', 'video/mp4; codecs="avc1.42c00d"', 'video/mp4; codecs="ec-3"', 'video/webm; codecs="vorbis,vp8"', 'video/mp2t; codecs="avc1.42E01E,mp4a.40.2"']
                                      , D = []
                                      , B = performance.now();
                                    d(0, 0)
                                } catch (z) {
                                    -4 === ba[8] && t(8, -3)
                                }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 8 " + b)
                        }
                        , function() {
                            var b = q();
                            N.enable_chrome_pdf_probe && window.chrome && navigator.userAgentData && !navigator.userAgentData.mobile && N.endpoints.chromePdfViewerProbe ? (t(9, -2, !0),
                            Ta(N.endpoints.chromePdfViewerProbe, 9, null, "[0-9].[0-9.]+")) : t(9, [-3, -3, -3], !0);
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 9 " + b)
                        }
                        , function() {
                            var b = q();
                            t(10, -2, !0);
                            if ("webkitRequestFileSystem"in window) {
                                t(10, -2, !0);
                                try {
                                    window.webkitRequestFileSystem(0, 1, function() {
                                        t(10, 0)
                                    }, function() {
                                        t(10, 1)
                                    })
                                } catch (d) {
                                    t(10, -1)
                                }
                            } else
                                t(10, -1, !0);
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 10 " + b)
                        }
                        , function() {
                            var b = q();
                            if ("buildID"in navigator) {
                                t(11, -2, !0);
                                try {
                                    if ("function" === typeof navigator.storage.getDirectory)
                                        navigator.storage.getDirectory().then(function() {
                                            t(11, 0)
                                        })["catch"](function(c) {
                                            c.message.includes("Security error") && t(11, 1)
                                        });
                                    else {
                                        var d = indexedDB.open("martell-fingerprint");
                                        d.onerror = function(c) {
                                            c.preventDefault();
                                            t(11, 1)
                                        }
                                        ;
                                        d.onsuccess = function() {
                                            t(11, 0);
                                            try {
                                                indexedDB.deleteDatabase("martell-fingerprint")
                                            } catch (c) {}
                                        }
                                    }
                                } catch (c) {
                                    t(11, -1)
                                }
                                b = Math.round(q() - b);
                                0 < b && x.push("ai 11 " + b)
                            } else
                                t(11, -1, !0)
                        }
                        , function() {
                            var b = q();
                            if ("Apple Computer, Inc." != navigator.vendor)
                                t(12, -1, !0);
                            else {
                                t(12, -2, !0);
                                if ("Intl"in window)
                                    try {
                                        var d = String(Math.random());
                                        window.indexedDB.open(d, 1).onupgradeneeded = function(c) {
                                            var f, g;
                                            c = null === (f = c.target) || void 0 === f ? void 0 : f.result;
                                            try {
                                                c.createObjectStore("test", {
                                                    autoIncrement: !0
                                                }).put(new Blob),
                                                t(12, 0)
                                            } catch (m) {
                                                f = m,
                                                m instanceof Error && (f = null !== (g = m.message) && void 0 !== g ? g : m),
                                                "string" !== typeof f ? t(12, 0) : t(12, /BlobURLs are not yet supported/.test(f) ? 1 : 0)
                                            } finally {
                                                try {
                                                    c.close(),
                                                    window.indexedDB.deleteDatabase(d)
                                                } catch (m) {}
                                            }
                                        }
                                    } catch (c) {
                                        t(12, -1)
                                    }
                                else
                                    t(12, -3);
                                b = Math.round(q() - b);
                                0 < b && x.push("ai 12 " + b)
                            }
                        }
                        , function() {
                            var b = q();
                            Ta(N.endpoints.probes.ipv4Primary, 13);
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 13 " + b)
                        }
                        , function() {
                            var b = q();
                            Ta(N.endpoints.probes.ipv4Alt, 14);
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 14 " + b)
                        }
                        , function() {
                            var b = q();
                            Ta(N.endpoints.probes.ipv6Primary, 15);
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 15 " + b)
                        }
                        , function() {
                            var b = q();
                            Ta(N.endpoints.probes.ipv6Alt, 16);
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 16 " + b)
                        }
                        , function() {
                            var b = q();
                            t(17, -2, !0);
                            try {
                                if (navigator.keyboard)
                                    navigator.keyboard.getLayoutMap().then(function(d) {
                                        var c = performance.now()
                                          , f = "";
                                        d.forEach(function(g, m) {
                                            f += m + g
                                        });
                                        t(17, ia(f));
                                        x.push("aii 17 " + (performance.now() - c))
                                    })["catch"](function() {
                                        t(17, -1)
                                    });
                                else
                                    t(17, -3, !0)
                            } catch (d) {
                                t(17, -1)
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 17 " + b)
                        }
                        , function() {
                            function b(c) {
                                if ("local" !== N.network_mode || !N.endpoints.probes.dynamicBase)
                                    return;
                                c = N.endpoints.probes.dynamicBase.replace(/\{nonce\}/g, kc).replace(/\{label\}/g, c).replace(/\{family\}/g, N.ipv6_priority ? "6" : "4");
                                if (!c)
                                    return;
                                if (!navigator.sendBeacon || !navigator.sendBeacon(c))
                                    try {
                                        var f = Ab(0);
                                        db.push(f);
                                        "keepalive"in f && (f.keepalive = !0,
                                        f.cache = "no-store",
                                        f.priority = "auto");
                                        f.open("GET", c, !0);
                                        f.send()
                                    } catch (g) {}
                            }
                            var d = q();
                            b("l");
                            b("n");
                            b("s");
                            d = Math.round(q() - d);
                            0 < d && x.push("ai 18 " + d)
                        }
                        , function() {
                            var b = q();
                            try {
                                var d = function(c) {
                                    var f = performance.now()
                                      , g = ""
                                      , m = ""
                                      , w = ""
                                      , D = 0
                                      , B = 0
                                      , z = 0
                                      , H = 0;
                                    c.forEach(function(E) {
                                        H++;
                                        g += E.kind + E.label;
                                        if ("communications" == E.deviceId || "default" == E.deviceId)
                                            g += E.deviceId;
                                        "audioinput" == E.kind && (z = 1);
                                        "audiooutput" == E.kind && (D = 1);
                                        "videoinput" == E.kind && (B = 1);
                                        m += E.kind + E.label + E.deviceId + E.groupId;
                                        "" != E.deviceId && "default" != E.deviceId && "communications" != E.deviceId && (w = E.deviceId)
                                    });
                                    c = [];
                                    c.push(O(ia(g)));
                                    c.push(O(ia(m)));
                                    c.push(O(w));
                                    c.push(z + 2 * D + 4 * B);
                                    c.push(H);
                                    t(19, c);
                                    x.push("aii 19 " + (performance.now() - f))
                                };
                                "mediaDevices"in navigator ? document.hidden || !ac ? t(19, -3) : (t(19, -2, !0),
                                navigator.mediaDevices.enumerateDevices()["catch"](function() {
                                    t(19, -1)
                                }).then(d)) : t(19, -1)
                            } catch (c) {
                                t(19, -1)
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 19 " + b)
                        }
                        , function() {
                            var b = q();
                            t(20, -1, !0);
                            try {
                                window.addEventListener("deviceorientation", function(d) {
                                    var c = [];
                                    c.push(d.beta);
                                    c.push(d.gamma);
                                    c.push(d.alpha);
                                    t(20, c)
                                })
                            } catch (d) {
                                t(20, -1)
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 20 " + b)
                        }
                        , function() {
                            var b = q();
                            t(21, -1, !0);
                            try {
                                window.addEventListener("devicemotion", function(d) {
                                    var c = [];
                                    d.accelerationIncludingGravity && (c.push(d.accelerationIncludingGravity.x),
                                    c.push(d.accelerationIncludingGravity.y),
                                    c.push(d.accelerationIncludingGravity.z),
                                    c.push(d.interval),
                                    t(21, c))
                                })
                            } catch (d) {
                                t(21, -1)
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 21 " + b)
                        }
                        , function() {
                            var b = q();
                            t(22, -1, !0);
                            try {
                                var d = function(c) {
                                    (c = c || window.event || !1) && -1 == ba[22] && t(22, [c.screenX || "e", c.screenY || "e", c.clientX || "e", c.clientY || "e"])
                                };
                                window.addEventListener("mouseover", d);
                                window.addEventListener("mousemove", d);
                                window.addEventListener("mouseenter", d)
                            } catch (c) {
                                t(22, -3)
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 22 " + b)
                        }
                        , function() {
                            var b = q();
                            if ("PublicKeyCredential"in window && "getClientCapabilities"in window.PublicKeyCredential) {
                                t(23, -2, !0);
                                try {
                                    var d = performance.now();
                                    window.PublicKeyCredential.getClientCapabilities().then(function(c) {
                                        var f = [];
                                        Object.entries(c).forEach(function(g) {
                                            f.push(g)
                                        });
                                        t(23, [f, performance.now() - d])
                                    })["catch"](function() {
                                        t(23, -3)
                                    })
                                } catch (c) {
                                    t(23, -3)
                                }
                            } else
                                t(23, -1);
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 23 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                if (window.requestAnimationFrame) {
                                    var d = function(c) {
                                        ba[24].constructor === Array ? ba[24].push(c) : t(24, [c]);
                                        10 > ba[24].length && ja && window.requestAnimationFrame(d.bind(this))
                                    };
                                    t(24, -2, !0);
                                    window.requestAnimationFrame(d.bind(this))
                                } else
                                    t(24, -3, !0)
                            } catch (c) {
                                t(24, -1)
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 24 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                var d = function() {
                                    try {
                                        if (ja) {
                                            var f = performance.now()
                                              , g = speechSynthesis.getVoices();
                                            x.push("aii 25 " + (performance.now() - f));
                                            if (0 == g.length)
                                                return 0;
                                            Array.isArray(ba[25]) || (ba[25] = []);
                                            for (var m = 0; m < g.length; m++)
                                                c[g[m].voiceURI] || (c[g[m].voiceURI] = 1,
                                                ba[25].push([g[m].lang, g[m].name, g[m].voiceURI]));
                                            t(25);
                                            x.push("aii 25 " + (performance.now() - f))
                                        }
                                    } catch (w) {
                                        t(25, -3)
                                    }
                                }
                                  , c = {};
                                "undefined" === typeof speechSynthesis ? t(25, -1, !0) : (t(25, -2, !0),
                                speechSynthesis.addEventListener("voiceschanged", d),
                                d())
                            } catch (f) {
                                t(25, -3)
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 25 " + b)
                        }
                        , function() {
                            var b = q();
                            t(26, -1, !0);
                            try {
                                if ("webkitTemporaryStorage"in navigator)
                                    navigator.webkitTemporaryStorage.queryUsageAndQuota(function(d, c) {
                                        t(26, [c, d])
                                    }, function() {
                                        t(26, [-3, -3])
                                    });
                                else if ("storage"in navigator && "estimate"in navigator.storage)
                                    navigator.storage.estimate().then(function(d) {
                                        t(26, [d.quota, d.usage])
                                    })["catch"](function() {
                                        t(26, [-4, -4])
                                    });
                                else
                                    t(26, [-3, -3])
                            } catch (d) {
                                t(26, [-3, -3])
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 26 " + b)
                        }
                        , function() {
                            var b = q();
                            t(27, -1, !0);
                            try {
                                var d = function(c) {
                                    (c = c || window.event) && "touches"in c && c.touches[0] && -1 == ba[27] && (c = c.touches[0],
                                    t(27, [c.screenX || "e", c.screenY || "e", c.clientX || "e", c.clientY || "e"]))
                                };
                                window.addEventListener("touchstart", d);
                                window.addEventListener("touchmove", d);
                                window.addEventListener("touchend", d)
                            } catch (c) {
                                t(27, -3)
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 27 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                var d = function(c) {
                                    try {
                                        if (c) {
                                            var f = [];
                                            f.push(O(c.architecture || ""));
                                            f.push(O(c.bitness || ""));
                                            var g = [];
                                            if ("brands"in c)
                                                for (var m = 0; m < c.brands.length; m++)
                                                    g.push([c.brands[m].brand, c.brands[m].version]);
                                            f.push(O(g));
                                            g = [];
                                            if ("fullVersionList"in c)
                                                for (m = 0; m < c.fullVersionList.length; m++)
                                                    g.push([c.fullVersionList[m].brand, c.fullVersionList[m].version]);
                                            f.push(O(g));
                                            f.push(O("mobile"in c ? c.mobile ? 1 : 0 : ""));
                                            f.push(O(c.model || ""));
                                            f.push(O(c.platform || ""));
                                            f.push(O(c.platformVersion || ""));
                                            f.push(O("wow64"in c ? c.wow64 ? 1 : 0 : ""));
                                            g = [];
                                            if ("formFactors"in c)
                                                for (m = 0; m < c.formFactors.length; m++)
                                                    g.push(c.formFactors[m]);
                                            f.push(O(g));
                                            t(28, f)
                                        } else
                                            t(28, -1)
                                    } catch (w) {
                                        t(28, -1)
                                    }
                                };
                                "userAgentData"in navigator && "getHighEntropyValues"in navigator.userAgentData ? (t(28, -2, !0),
                                navigator.userAgentData.getHighEntropyValues("architecture bitness model platformVersion fullVersionList wow64 formFactors".split(" "))["catch"](function() {
                                    t(28, -1)
                                }).then(d)) : t(28, -1, !0)
                            } catch (c) {
                                t(28, -1)
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 28 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                t(29, -2, !0),
                                M.webrtc && 0 == M.webrtc.status ? M.webrtc.callbacks.push(function(d) {
                                    d ? La(d, 29, !1) : t(29, -3)
                                }) : M.webrtc && 1 == M.webrtc.status ? La(M.webrtc.data, 29, !1) : La(null, 29, !1)
                            } catch (d) {
                                t(29, -1)
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 29 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                t(30, -2),
                                M.webrtc && 0 == M.webrtc.status ? M.webrtc.callbacks.push(function(d) {
                                    d ? La(d, 30, !0) : t(30, -3)
                                }) : M.webrtc && 1 == M.webrtc.status ? La(M.webrtc.data, 30, !0) : La(null, 30, !0)
                            } catch (d) {
                                t(30, -1)
                            }
                            b = Math.round(q() - b);
                            0 < b && x.push("ai 30 " + b)
                        }
                        , vc, function() {
                            var b = q();
                            var d = function() {
                                try {
                                    var c = window.location || document.location;
                                    if (!c || !c.ancestorOrigins)
                                        return -1;
                                    for (var f = [], g = 0; g < c.ancestorOrigins.length; g++)
                                        f.push(c.ancestorOrigins[g]);
                                    return f
                                } catch (m) {
                                    return -2
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 0 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    if ("ApplePaySession"in window) {
                                        if (top != window)
                                            return [-2, 0];
                                        for (var c = [], f = performance.now(), g = 1; 100 > g; g++)
                                            if (!window.ApplePaySession.supportsVersion(g)) {
                                                c.push(g - 1);
                                                break
                                            }
                                        c.push(performance.now() - f);
                                        return c
                                    }
                                    return [0, 0]
                                } catch (m) {
                                    return [-1, 0]
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 1 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    if (!window.chrome || !window.chrome.csi)
                                        return "";
                                    var c = window.chrome.csi()
                                      , f = [];
                                    f.push(c.startE || -2);
                                    f.push(c.onLoadT || -2);
                                    f.push(c.pageT || -2);
                                    f.push(c.tran || -2)
                                } catch (g) {
                                    return -1
                                }
                                return f
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 2 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    if (!window.chrome || !window.chrome.loadTimes)
                                        return -1;
                                    var c = window.chrome.loadTimes()
                                      , f = [];
                                    f.push(c.commitLoadTime);
                                    f.push(c.connectionInfo);
                                    f.push(c.finishDocumentLoadTime);
                                    f.push(c.finishLoadTime);
                                    f.push(c.firstPaintAfterLoadTime);
                                    f.push(c.firstPaintTime);
                                    f.push(c.navigationType);
                                    f.push(c.npnNegotiatedProtocol);
                                    f.push(c.requestTime);
                                    f.push(c.startLoadTime);
                                    f.push(c.wasAlternateProtocolAvailable);
                                    f.push(c.wasFetchedViaSpdy);
                                    f.push(c.wasNpnNegotiated);
                                    return f
                                } catch (g) {
                                    return -2
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 3 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    if (N.lite)
                                        return -2;
                                    var c = q();
                                    if (!N.enable_console_probe)
                                        return -2;
                                    !N.quiet && console.log("        ".repeat(1E4));
                                    return Math.round(100 * (q() - c)) / 100
                                } catch (f) {
                                    return -1
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 4 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    for (var c = function(w, D) {
                                        return 1E-8 > w ? D : w < D ? c(D - Math.floor(D / w) * w, w) : w == D ? w : c(D, w)
                                    }, f = q() / 1E3, g = q() / 1E3 - f, m = 0; 50 > m; m++)
                                        g = c(g, q() / 1E3 - f);
                                    return Math.round(1 / g)
                                } catch (w) {}
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 5 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    var c = /./
                                      , f = 0
                                      , g = c.toString;
                                    c.toString = function() {
                                        f++;
                                        return "   "
                                    }
                                    ;
                                    N.enable_console_probe && console.debug(c);
                                    c.toString = g;
                                    return f
                                } catch (m) {
                                    return -1
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 6 " + b)
                        }
                        , function() {
                            var b = q();
                            a: {
                                try {
                                    null[0]()
                                } catch (c) {
                                    var d = c && c.name ? c.name : "error";
                                    break a
                                }
                                d = ""
                            }
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 7 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    if ("undefined" !== typeof ipcRenderer)
                                        return 20;
                                    if ("_phantom"in window || "callPhantom"in window)
                                        return 1;
                                    if ("__phantomas"in window)
                                        return 2;
                                    if ("emit"in window)
                                        return 4;
                                    if ("spawn"in window)
                                        return 3;
                                    if ("webdriver"in window.clientInformation && window.clientInformation.webdriver || "webdriver"in window && window.webdriver || "webdriver"in window.navigator && window.navigator.webdriver)
                                        return 6;
                                    if ("domAutomation"in window)
                                        return 7;
                                    if ("domAutomationController"in window)
                                        return 21;
                                    if ("_WEBDRIVER_ELEM_CACHE"in window)
                                        return 22;
                                    try {
                                        if (window.document.documentElement.getAttribute("webdriver"))
                                            return 8
                                    } catch (D) {}
                                    if ("_Selenium_IDE_Recorder"in window)
                                        return 9;
                                    if ("__webdriver_script_fn"in document)
                                        return 10;
                                    var c = "__webdriver_evaluate __selenium_evaluate __webdriver_script_function __webdriver_script_func __webdriver_script_fn __fxdriver_evaluate __driver_unwrapped __webdriver_unwrapped __driver_evaluate __selenium_unwrapped __fxdriver_unwrapped".split(" "), f = "_phantom __pwInitScripts window.__playwright_builtins__ __nightmare _selenium callPhantom callSelenium _Selenium_IDE_Recorder __stopAllTimers".split(" "), g;
                                    for (g in f)
                                        if (window[f[g]])
                                            return 11;
                                    for (var m in c)
                                        if (window.document[c[m]])
                                            return 12;
                                    for (var w in window.document)
                                        if (w.match(/\$[a-z]dc_/) && window.document[w].cache_)
                                            return 13;
                                    return window.external && window.external.toString() && -1 != window.external.toString().indexOf("Sequentum") ? 14 : window.document.documentElement.getAttribute("selenium") ? 15 : window.document.documentElement.getAttribute("driver") ? 16 : null !== window.document.documentElement.getAttribute("selenium") ? 17 : null !== window.document.documentElement.getAttribute("webdriver") ? 18 : null !== window.document.documentElement.getAttribute("driver") ? 19 : 0
                                } catch (D) {
                                    return -1
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 8 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    if ("Apple Computer, Inc." != navigator.vendor || !("openDatabase"in window))
                                        return -1;
                                    if ("Intl"in window)
                                        return -3;
                                    try {
                                        window.openDatabase(null, null, null, null)
                                    } catch (c) {
                                        return 1
                                    }
                                    try {
                                        window.localStorage.setItem("test", "1"),
                                        window.localStorage.removeItem("test")
                                    } catch (c) {
                                        return 1
                                    }
                                    return 0
                                } catch (c) {
                                    return -1
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 9 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                try {
                                    var d = ia(Intl.supportedValuesOf("timeZone").join(""))
                                } catch (g) {
                                    d = ""
                                }
                                try {
                                    var c = ia(Intl.supportedValuesOf("currency").join(""))
                                } catch (g) {
                                    c = ""
                                }
                                var f = [d, c]
                            } catch (g) {
                                f = [-1, -1]
                            }
                            F(f);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 10 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    var c = function(z, H) {
                                        function E(C) {
                                            for (var R = C.length, W = R, S = 0; S < W; S++)
                                                R = (R << 5) - R + C.charCodeAt(S) | 0;
                                            return R
                                        }
                                        function A(C) {
                                            try {
                                                if (null === C)
                                                    return 0;
                                                switch (typeof C) {
                                                case "boolean":
                                                    return C ? 10 : 11;
                                                case "number":
                                                    return C;
                                                case "string":
                                                    return E(C);
                                                case "function":
                                                    return E(Function.prototype.toString.call(C));
                                                case "object":
                                                    return 1 + E(Object.prototype.toString.call(C));
                                                default:
                                                    return 2 + E("" + C)
                                                }
                                            } catch (R) {
                                                try {
                                                    return 3 + E("" + C)
                                                } catch (W) {
                                                    return 4
                                                }
                                            }
                                        }
                                        function G(C, R) {
                                            if (!R)
                                                return 0;
                                            try {
                                                var W = C.getPrototypeOf(R);
                                                return A(W) ^ G(C, W)
                                            } catch (S) {
                                                return 1
                                            }
                                        }
                                        function I(C, R, W) {
                                            try {
                                                var S = W ? R[W] : R
                                            } catch (Q) {
                                                return C ^ A(Q.stack || !1)
                                            }
                                            try {
                                                C ^= A(S)
                                            } catch (Q) {
                                                C ^= A(Q.stack || !1)
                                            }
                                            try {
                                                C ^= G(Object, S)
                                            } catch (Q) {
                                                C ^= A(Q.stack || !1)
                                            }
                                            try {
                                                C ^ A(Object.isExtensible(S))
                                            } catch (Q) {
                                                C ^= 66
                                            }
                                            try {
                                                C ^ A(Object.isFrozen(S))
                                            } catch (Q) {
                                                C ^= 66
                                            }
                                            try {
                                                C ^ A(Object.isSealed(S))
                                            } catch (Q) {
                                                C ^= 66
                                            }
                                            if (W) {
                                                try {
                                                    C ^= A(Object.hasOwn(R, W))
                                                } catch (Q) {
                                                    C ^= A(Q.stack || !1)
                                                }
                                                try {
                                                    C ^= A(R.hasOwnProperty(W))
                                                } catch (Q) {
                                                    C ^= A(Q.stack || !1)
                                                }
                                            }
                                            try {
                                                S.hasOwnProperty("toString") || S.hasOwnProperty("arguments") || S.hasOwnProperty("caller") || S.hasOwnProperty("prototype") ? C ^= 126 : C ^= 11
                                            } catch (Q) {
                                                C ^= A(Q.stack || !1)
                                            }
                                            try {
                                                "prototype"in S ? C ^= 22654 : C ^= 51
                                            } catch (Q) {
                                                C ^= A(Q.stack || !1)
                                            }
                                            try {
                                                S.toString === Function.prototype.toString ? C ^= 955 : C ^= 1301
                                            } catch (Q) {
                                                C ^= A(Q.stack || !1)
                                            }
                                            if (Reflect) {
                                                try {
                                                    C ^= A(Reflect.ownKeys(S))
                                                } catch (Q) {
                                                    C ^= A(Q.stack || !1)
                                                }
                                                try {
                                                    C ^= G(Reflect, S)
                                                } catch (Q) {
                                                    C ^= A(Q.stack || !1)
                                                }
                                                if (W)
                                                    try {
                                                        C ^= A(Reflect.getOwnPropertyDescriptor(R, W))
                                                    } catch (Q) {
                                                        C ^= A(Q.stack || !1)
                                                    }
                                            }
                                            return C
                                        }
                                        var y = window;
                                        "userAgentData" == z && (y = window.navigator);
                                        if (!(z in y))
                                            return 0;
                                        y = y[z];
                                        if (H) {
                                            if (!(H in y))
                                                return 0;
                                            y = y[H]
                                        }
                                        if (null === y)
                                            return 0;
                                        try {
                                            var J = Object.getOwnPropertyDescriptors(y)
                                        } catch (C) {
                                            return 0
                                        }
                                        z = I(0, y);
                                        for (var P in J) {
                                            z = I(z, y, P);
                                            z = I(z, J, P);
                                            try {
                                                for (var Y in J[P])
                                                    z = I(z, J[P], Y)
                                            } catch (C) {}
                                        }
                                        return z
                                    }, f = "Object Function Window Navigator NavigatorUAData Screen navigator userAgentData screen".split(" "), g = [], m = performance.now(), w, D, B;
                                    for (f.forEach(function(z) {
                                        50 < performance.now() - m || (w = c(z),
                                        50 < performance.now() - m || (D = c(z, "prototype"),
                                        50 < performance.now() - m || (B = c(z, "__proto__"),
                                        g.push(w ^ D ^ B))))
                                    }); g.length < f.length; )
                                        g.push("t");
                                    return g
                                } catch (z) {
                                    return "eeeeeeee".split("")
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 11 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    if (10 < function() {
                                        var f = Object;
                                        var g = performance.now();
                                        var m = f;
                                        for (f = 0; 100 > f; f++)
                                            m = new Proxy(m,{});
                                        try {
                                            m.eb
                                        } catch (w) {
                                            return 99
                                        }
                                        return performance.now() - g
                                    }())
                                        return [-1, -1, -1, -1, -1, -1, -1, -1];
                                    var c = [Proxy, Function.prototype.toString];
                                    ("Apple Computer, Inc." != navigator.vendor || "MacIntel" != navigator.platform || 0 < navigator.maxTouchPoints) && c.push(Object.getOwnPropertyDescriptors);
                                    return function(f) {
                                        function g(y) {
                                            if (!y || 1 >= y.length)
                                                return !0;
                                            for (var J = 1; J < y.length; J++)
                                                if (y[J] !== y[0])
                                                    return !1;
                                            return !0
                                        }
                                        function m(y) {
                                            for (var J, P = 0, Y, C = 1E3; 0 < C && 1E5 > P; ) {
                                                Y = y;
                                                for (J = 0; J < C; J++)
                                                    Y = new Proxy(Y,{});
                                                try {
                                                    Y.eb,
                                                    y = Y,
                                                    P += C
                                                } catch (R) {
                                                    C = C / 10 >> 0
                                                }
                                            }
                                            return P
                                        }
                                        for (var w = performance.now(), D = 0, B = [], z = [], H = 0; H < f.length; H++)
                                            B[H] = 0,
                                            z[H] = 0;
                                        for (var E = 2, A = !1; !A; ) {
                                            var G = !0;
                                            for (H = 0; H < f.length; H++) {
                                                var I = m(f[H]);
                                                D++;
                                                I != B[H] ? (z[H] = 1,
                                                B[H] = I,
                                                G = !1) : (z[H]++,
                                                z[H] < E && (G = !1));
                                                if (performance.now() - w > (2 == E ? 200 : 2E3)) {
                                                    A = !0;
                                                    break
                                                }
                                            }
                                            G && (g(B) || 4 == E ? A = !0 : E = 4)
                                        }
                                        return [z[0], z[1], z[2] || -1, B[0], B[1], B[2] || -1, Math.round(performance.now() - w), D]
                                    }(c)
                                } catch (f) {
                                    return [-1, -1, -1, -1, -1, -1, -1, -1]
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 12 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    for (var c = document.body.innerText.toLowerCase().replaceAll("\n", " ").replaceAll(/[^a-z ]/g, "").split(" "), f = {}, g = 0; g < c.length; g++)
                                        3 <= c[g].length && 20 > c[g].length && (f[c[g]] = 1 + (f[c[g]] || 0));
                                    return Object.keys(f).sort(function(m, w) {
                                        return f[w] - f[m]
                                    }).slice(0, 25).join(" ")
                                } catch (m) {
                                    return ""
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 13 " + b)
                        }
                        , function() {
                            var b = q();
                            F(function() {
                                if (N.lite)
                                    return -2;
                                try {
                                    return (new Date(0)).toLocaleString()
                                } catch (d) {
                                    return -1
                                }
                            }());
                            b = Math.round(q() - b);
                            0 < b && x.push("s 14 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    var c = performance.now();
                                    if (!document.getElementsByTagName("html")[0])
                                        return -3;
                                    var f = document.getElementsByTagName("html")[0]
                                      , g = document.createElement("div")
                                      , m = document.createElement("span");
                                    g.setAttribute("style", "font-size:128px;position:absolute;left:-9999px;top:-9999px;margin:0;padding:0;border:0;vertical-align: baseline;display:block;");
                                    m.innerText = "mmmMMMmmmlllmmmLLL!@#$% martell browser fingerprint by github.com/memade ^*()\u00c6\u2019mmmiiimmmIIImmmwwwmmmWWW";
                                    g.appendChild(m);
                                    f.appendChild(g);
                                    for (var w = "Noto Sans Noto Sans ;Apple Symbols;Noto Sans Myanmar;Noto Sans Modi;Noto Sans Runic;Noto Sans Duployan;Noto Sans Caucasian Albanian;Euphemia UCAS;Euphemia UCAS Italic;Mistral;BiauKai;PingFang MO;AkayaKanadaka".split(";"), D = [], B = 0; B < w.length; B++)
                                        if (m.style.fontFamily = w[B],
                                        g.appendChild(m),
                                        D.push(m.offsetWidth + "," + m.offsetHeight),
                                        g.removeChild(m),
                                        50 < performance.now() - c)
                                            return f.removeChild(g),
                                            -2;
                                    f.removeChild(g);
                                    return D
                                } catch (z) {
                                    return -1
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 15 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = [1, Math.PI, Math.PI / 2, 1 / Math.PI, 1E-300, 1E-310, 2, -100];
                            for (var c, f = "", g = 0; g < d.length; g++)
                                c = d[g],
                                f += Math.exp(c),
                                f += Math.sin(c),
                                f += Math.cos(c),
                                f += Math.tan(c),
                                f += Math.atan2(c, 2),
                                f += Math.pow(c, -100);
                            d = ia(f);
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 16 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    var c = function(g, m) {
                                        for (var w = 0; w < m.length; w++)
                                            if (window.matchMedia("(" + g + ": " + m[w] + ")").matches)
                                                return w + 1;
                                        return 0
                                    }
                                      , f = function(g, m, w, D, B) {
                                        for (var z; 0 < D && 0 <= w; )
                                            window.matchMedia("(" + g + ": " + (w + 1) / B + m + ")").matches ? (w += D,
                                            z = Math.floor(D / 2),
                                            D = 1 < D && 0 == z ? 1 : z) : w -= D;
                                        return w / B
                                    };
                                    return [f("min-resolution", "dpi", 300, 10, 1), f("min-device-width", "cm", 1500, 100, 10), f("min-device-height", "cm", 1500, 100, 10), f("min-device-width", "px", 1E4, 2E3, 1), f("min-device-height", "px", 1E4, 2E3, 1), c("pointer", ["coarse", "fine", "none"]), c("any-pointer", ["coarse", "fine", "none"]), c("hover", ["none", "hover"]), c("color-gamut", ["rec2020", "p3", "srgb"]), c("dynamic-range", ["high", "standard"]), c("display-mode", ["fullscreen", "standalone", "minimal-ui", "window-controls-overlay", "browser"]), c("update", ["fast", "slow", "none"]), c("device-posture", ["folded", "continuous"])]
                                } catch (g) {
                                    return [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 17 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                for (var d = [], c = 0; c < navigator.mimeTypes.length; c++)
                                    d.push([navigator.mimeTypes[c].type, navigator.mimeTypes[c].description]);
                                var f = d
                            } catch (g) {
                                f = -1
                            }
                            F(f);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 18 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    if (!window.clientInformation)
                                        return -1;
                                    var c = [], f;
                                    for (f in window.clientInformation)
                                        if ("object" != typeof navigator[f] && navigator[f] != window.clientInformation[f]) {
                                            var g = [];
                                            g.push(f);
                                            g.push(navigator[f]);
                                            g.push(window.clientInformation[f]);
                                            c.push(g)
                                        }
                                    return 0 == c.length ? 1 : c
                                } catch (m) {
                                    return -2
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 19 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                var d = performance.getEntriesByName("visible", "visibility-state").length
                                  , c = performance.getEntriesByName("hidden", "visibility-state").length;
                                var f = [d, c]
                            } catch (g) {
                                f = [-1, -1]
                            }
                            F(f);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 20 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                for (var d = performance.getEntriesByType("resource"), c = 0; c < d.length; c++)
                                    if (N.endpoints.centralHostPattern.test(d[c].name)) {
                                        var f = d[c];
                                        break
                                    }
                                var g = f ? zb(f) : -1
                            } catch (m) {
                                g = -1
                            }
                            F(g);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 21 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                var d = performance.getEntriesByType("navigation")[0] || null;
                                var c = d ? zb(d) : -1
                            } catch (f) {
                                c = -1
                            }
                            F(c);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 22 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                for (var d = [], c = 0; c < navigator.plugins.length; c++) {
                                    var f = [];
                                    f.push(O(navigator.plugins[c].name || ""));
                                    f.push(O(navigator.plugins[c].filename || ""));
                                    f.push(O(navigator.plugins[c].description || ""));
                                    d.push(f)
                                }
                                var g = d
                            } catch (m) {
                                g = -1
                            }
                            F(g);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 23 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                function c(g) {
                                    if (document.location.host != Fb)
                                        return 1;
                                    try {
                                        var m = window.open(g)
                                    } catch (w) {
                                        return 1
                                    }
                                    try {
                                        if ("object" != typeof m || m.closed || "undefined" == typeof m.closed || 0 == m.outerHeight || 0 == m.outerWidth)
                                            return 1
                                    } catch (w) {
                                        return 1
                                    }
                                    try {
                                        m.focus(),
                                        m.close()
                                    } catch (w) {
                                        return 1
                                    }
                                    return 0
                                }
                                var f = c("about:blank");
                                0 == f && "about:blank" != N.endpoints.publicOrigin && (f = c(N.endpoints.publicOrigin));
                                return f
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 24 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                var c = [];
                                try {
                                    var f = function(g, m, w) {
                                        if (N.lite)
                                            return -2;
                                        m = Object.getOwnPropertyNames(m);
                                        for (var D = 0; D < m.length; D++) {
                                            try {
                                                var B = m[D].toString()
                                            } catch (H) {
                                                continue
                                            }
                                            if ("window" == w && B.startsWith("__MARTELL_"))
                                                continue;
                                            var z = "";
                                            try {
                                                z = "window" == w ? window[B].toString() : window[w][B].toString(),
                                                100 < z.length && (z = "!l")
                                            } catch (H) {
                                                z = "!e"
                                            }
                                            (B.startsWith("_") || B.startsWith("$cd") || 28 == B.length) && g.push([w + "." + B, z])
                                        }
                                    };
                                    f(c, window, "window");
                                    f(c, window.document, "document");
                                    f(c, window.navigator, "navigator")
                                } catch (g) {
                                    return -1
                                }
                                return c
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 25 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                var d = PluginArray.prototype !== navigator.plugins.__proto__ ? 1 : 0 < navigator.plugins.length && Plugin.prototype !== navigator.plugins[0].__proto__ ? 2 : Navigator.prototype !== navigator.__proto__ ? 3 : window.Ya && Navigator.prototype !== window.Ya.__proto__ ? 4 : MimeTypeArray.prototype !== navigator.mimeTypes.__proto__ ? 5 : Screen.prototype !== screen.__proto__ ? 6 : 0
                            } catch (c) {
                                d = -1
                            }
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 26 " + b)
                        }
                        , function() {
                            var b = q();
                            n("window.__gCrWeb");
                            n("navigator.serviceWorker");
                            n("window.indexedDB");
                            n("window.chrome");
                            n("window.safari");
                            n("window.chrome.csi");
                            n("document.location");
                            n("document.hidden");
                            n("document.visibilityState");
                            n("!(top==window)");
                            n("window.locationbar.visible");
                            n("window.menubar.visible");
                            n("window.personalbar.visible");
                            n("window.scrollbars.visible");
                            n("window.statusbar.visible");
                            n("window.toolbar.visible");
                            n("window.WebAssembly");
                            n("window.BarcodeDetector");
                            n("navigator.setAppBadge");
                            n("window.mozPaintCount");
                            n("top.frames.length");
                            n("window.history.length");
                            n("navigation.currentEntry.index");
                            n("navigation.currentEntry.url");
                            n("navigation.canGoBack");
                            n("navigation.canGoForward");
                            n("!!document.fullscreen||!!document.mozFullscreen||!!document.webkitIsFullScreen||!!document.fullScreenElement");
                            n("window.screen.isExtended");
                            n("window.navigator.standalone");
                            n("document.referrer");
                            n("document.innerWidth");
                            n("document.innerHeight");
                            n("document.documentElement.clientWidth");
                            n("document.documentElement.clientHeight");
                            n("window.screenX||window.screenLeft");
                            n("window.screenY||window.screenTop");
                            n("window.outerWidth");
                            n("window.outerHeight");
                            n("window.innerWidth");
                            n("window.innerHeight");
                            n("document.hasFocus()");
                            n("document.hasFocus");
                            n("window.offscreenBuffering");
                            n("MouseEvent.WEBKIT_FORCE_AT_MOUSE_DOWN");
                            n("window.performance.memory.jsHeapSizeLimit");
                            n("screen.orientation.type");
                            n("screen.top");
                            n("screen.left");
                            n("screen.availTop");
                            n("screen.availLeft");
                            n("screen.width");
                            n("screen.height");
                            n("screen.availWidth");
                            n("screen.availHeight");
                            n("screen.colorDepth");
                            n("screen.pixelDepth");
                            n("screen.deviceYDPI");
                            n("screen.deviceXDPI");
                            n("window.devicePixelRatio");
                            n("navigator.userAgent");
                            n("navigator.appVersion");
                            n("navigator.appCodeName");
                            n("navigator.appMinorVersion");
                            n("navigator.product");
                            n("navigator.productSub");
                            n("navigator.vendor");
                            n("navigator.vendorSub");
                            n("navigator.buildID");
                            n("navigator.platform");
                            n("navigator.cpuClass");
                            n("navigator.oscpu");
                            n("navigator.hardwareConcurrency");
                            n("navigator.maxTouchPoints");
                            n("navigator.msMaxTouchPoints");
                            n("navigator.language");
                            n("navigator.languages.toString()");
                            n("navigator.browserLanguage");
                            n("navigator.userLanguage");
                            n("navigator.systemLanguage");
                            n("navigator.onLine");
                            n("navigator.deviceMemory");
                            n("navigator.doNotTrack");
                            n("navigator.msDoNotTrack");
                            n("navigator.cookieEnabled");
                            n("navigator.battery.level");
                            n("navigator.battery.charging");
                            n("performance.navigation.type");
                            n("performance.navigation.redirectCount");
                            n("window.opener==null");
                            n("window.opener.location.href");
                            n("window.opener.screenX||window.opener.screenLeft");
                            n("window.opener.screenY||window.opener.screenTop");
                            n("window.opener.innerWidth");
                            n("window.opener.innerHeight");
                            n("window.opener.outerWidth");
                            n("window.opener.outerHeight");
                            n("window.opener.offscreenBuffering");
                            F(zc);
                            n("(new Date).getTimezoneOffset()");
                            n("navigator.connection.type");
                            n("navigator.connection.effectiveType");
                            n("navigator.connection.downlinkMax");
                            n("navigator.connection.downlink");
                            n("navigator.connection.rtt");
                            n("navigator.connection.saveData");
                            n("window.ScriptEngineMajorVersion();");
                            n("window.ScriptEngineMinorVersion();");
                            n("window.ScriptEngineBuildVersion();");
                            n("performance.timing.navigationStart");
                            n("performance.timing.redirectStart");
                            n("performance.timing.redirectEnd");
                            n("performance.timing.fetchStart");
                            n("performance.timing.domainLookupStart");
                            n("performance.timing.domainLookupEnd");
                            n("performance.timing.connectStart");
                            n("performance.timing.connectEnd");
                            n("performance.timing.secureConnectionStart");
                            n("performance.timing.requestStart");
                            n("performance.timing.responseStart");
                            n("performance.timing.responseEnd");
                            n("typeof window.ondevicelight");
                            n("typeof window.ontouchstart");
                            n("typeof navigator.hardwareConcurrency");
                            n("window");
                            n("navigator");
                            n("window.clientInformation");
                            n("navigator.plugins");
                            n("eval");
                            n("HTMLElement.prototype.animate");
                            n("screen");
                            n("window.open");
                            n("window.brave");
                            n("window.close");
                            n("window.InstallTrigger.install");
                            n("document.webkitHidden");
                            n("window.console.log");
                            n("document.appendChild");
                            n("document.head.appendChild");
                            n("document.body.appendChild");
                            n("window.mozInnerScreenY");
                            n("window.mozInnerScreenX");
                            n("window.IntersectionObserver");
                            n("window.alert");
                            n("window.isSecureContext");
                            n("typeof document.visibilityState");
                            n("navigator.gpu");
                            n("HTMLCanvasElement.prototype.toDataURL");
                            F(O(Fb ? N.endpoints.protocols.https + Fb + "/" : ""));
                            F(O(Fb));
                            n("window.google");
                            n("window.RTCPeerConnection");
                            n("window.mozRTCPeerConnection");
                            n("window.webkitRTCPeerConnection");
                            n("window.XMLHttpRequest");
                            n("Intl.DateTimeFormat().resolvedOptions().timeZone");
                            n("Intl.DateTimeFormat().resolvedOptions().locale");
                            n("navigator.pdfViewerEnabled");
                            n('window.external.getHostEnvironmentValue("os-architecture");');
                            n('window.external.getHostEnvironmentValue("os-build");');
                            n('window.external.getHostEnvironmentValue("os-mode");');
                            n('window.external.getHostEnvironmentValue("os-sku");');
                            n('document.getElementsByTagName("title")[0].innerText');
                            n("document.currentScript.referrerPolicy");
                            n("document.fullscreenEnabled");
                            n("document.fullscreenElement!==null");
                            n("window.NDEFReader");
                            n("window.BluetoothRemoteGATTDescriptor");
                            n("navigator.userActivation.hasBeenActive");
                            n("navigator.userActivation.isActive");
                            b = Math.round(q() - b);
                            0 < b && x.push("s 27 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                for (var d = [], c = 0; 5 > c; c++)
                                    d.push(Math.random());
                                var f = d
                            } catch (g) {
                                f = -1
                            }
                            F(f);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 28 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    if (!Function || !Function.prototype)
                                        return [-2, -2, -2, -2, -2, -2, -2, -2, -2];
                                    var c = Function.prototype.toString;
                                    try {
                                        new c
                                    } catch (w) {
                                        var f = w.message;
                                        var g = w && w.name ? w.name : "error"
                                    }
                                    var m = [];
                                    try {
                                        m.push("prototype"in c ? 1 : 0)
                                    } catch (w) {
                                        m.push(-1)
                                    }
                                    try {
                                        m.push("" + c.toString())
                                    } catch (w) {
                                        m.push(-1)
                                    }
                                    try {
                                        m.push("" + c.name || -2)
                                    } catch (w) {
                                        m.push(-1)
                                    }
                                    try {
                                        m.push("" + c.call(c))
                                    } catch (w) {
                                        m.push(-1)
                                    }
                                    try {
                                        m.push("" + c.call(Object.prototype.toString))
                                    } catch (w) {
                                        m.push(-1)
                                    }
                                    try {
                                        m.push("" + c.call(Object.getOwnPropertyDescriptors))
                                    } catch (w) {
                                        m.push(-1)
                                    }
                                    try {
                                        m.push("" + c.call(Object.getPrototypeOf))
                                    } catch (w) {
                                        m.push(-1)
                                    }
                                    m.push(f);
                                    m.push(g);
                                    return m
                                } catch (w) {
                                    return [-1, -1, -1, -1, -1, -1, -1, -1, -1]
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 29 " + b)
                        }
                        , function() {
                            var b = q();
                            a: {
                                try {
                                    document.createEvent("TouchEvent");
                                    var d = 1;
                                    break a
                                } catch (c) {}
                                d = 0
                            }
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 30 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    if (!navigator.userAgentData)
                                        return [-1, -1, -1];
                                    var c = navigator.userAgentData, f = [], g;
                                    for (g in c.brands) {
                                        var m = [];
                                        m.push(c.brands[g].brand);
                                        m.push(c.brands[g].version);
                                        f.push(m)
                                    }
                                    return [c.mobile ? 1 : 0, c.platform, f]
                                } catch (w) {
                                    return [-2, -2, -2]
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 31 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                var d = ec("a");
                                "" == d && (d = Ac);
                                hb("a", d, 7);
                                var c = d
                            } catch (f) {
                                c = -1
                            }
                            F(c);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 32 " + b)
                        }
                        , function() {
                            var b = q()
                              , d = document.documentElement.getBoundingClientRect()
                              , c = [];
                            c.push(O(d.left));
                            c.push(O(d.top));
                            c.push(O(d.right));
                            c.push(O(d.bottom));
                            c.push(O(d.x));
                            c.push(O(d.y));
                            F(c);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 33 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    if (0 == Ka)
                                        return "";
                                    var c = Ka
                                      , f = [];
                                    f.push(Ka.getParameter);
                                    var g = c.getExtension("WEBGL_debug_renderer_info");
                                    if (!g)
                                        return "";
                                    f.push(O(c.getParameter(c.VERSION)));
                                    f.push(O(c.getParameter(c.SHADING_LANGUAGE_VERSION)));
                                    f.push(O(c.getParameter(c.VENDOR)));
                                    f.push(O(c.getParameter(c.RENDERER)));
                                    if (g) {
                                        f.push(O(c.getParameter(g.UNMASKED_RENDERER_WEBGL)));
                                        f.push(O(c.getParameter(g.UNMASKED_VENDOR_WEBGL)));
                                        for (var m = performance.now(), w = 0; 5 > performance.now() - m; )
                                            null !== c.getParameter(g.UNMASKED_RENDERER_WEBGL) && w++;
                                        m = performance.now() - m;
                                        f.push(Math.round(w / m))
                                    } else
                                        f.push(""),
                                        f.push(""),
                                        f.push("");
                                    return f
                                } catch (D) {
                                    return ""
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 34 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    if (N.lite)
                                        return [-2, -2, -2];
                                    if (Va)
                                        return [-4, -4, -4];
                                    q();
                                    var c = "HP Simplified;Gill Sans;Centaur;Gentium Book Basic;Urdu Typesetting;EucrosiaUPC;Swis721 Blk BT;Century Schoolbook;Arabic Transparent;Segoe UI Semilight;Vani;Adobe Hebrew;Book Antiqua;Dotum;Copperplate Gothic Light;American Typewriter;Corsiva Hebrew;Gloucester MT Extra Condensed;Lucida Sans Typewriter;Nueva Std Cond;Cooper Black;Calibri Light;DejaVu Serif Condensed;Myriad Pro Cond;Estrangelo Edessa;".split(";")
                                      , f = performance.now()
                                      , g = document.createElement("canvas");
                                    g.width = 200;
                                    g.height = 200;
                                    var m = g.getContext("2d", {
                                        desynchronized: !0,
                                        willReadFrequently: !0
                                    });
                                    if (50 < performance.now() - f)
                                        return [-3, -3, -3];
                                    f = performance.now();
                                    m.beginPath();
                                    m.rect(0, 0, 200, 200);
                                    m.fillStyle = "black";
                                    m.fill();
                                    if (50 < performance.now() - f)
                                        return [-3, -3, -3];
                                    var w = g.toDataURL();
                                    if (50 < performance.now() - f)
                                        return [-3, -3, -3];
                                    m.beginPath();
                                    m.rect(0, 0, 200, 200);
                                    m.fillStyle = "white";
                                    m.fill();
                                    if (50 < performance.now() - f)
                                        return [-3, -3, -3];
                                    var D = g.toDataURL();
                                    if (50 < performance.now() - f)
                                        return [-3, -3, -3];
                                    var B = m.createLinearGradient(0, 0, 200, 0);
                                    B.addColorStop(0, "blue");
                                    B.addColorStop(1, "white");
                                    m.fillStyle = B;
                                    m.fillRect(0, 0, 200, 200);
                                    m.rotate(1 * Math.PI / 180);
                                    m.font = "14px 'Arial'";
                                    m.textBaseline = "alphabetic";
                                    m.fillStyle = "#f60";
                                    m.fillRect(0, 15, 200, 15);
                                    m.beginPath();
                                    m.moveTo(0, 0);
                                    m.quadraticCurveTo(50, 150, 180, 180);
                                    m.bezierCurveTo(190, -40, 100, 50, 100, 50);
                                    m.lineTo(30, 10);
                                    m.lineWidth = 1;
                                    m.strokeStyle = "#222222";
                                    m.stroke();
                                    m.fillStyle = "#069";
                                    m.fillText("mmiillII,)#!>\u26c4\u26c7\u12b9\u102a\u07f7\u058e\u17d8", 2, 15);
                                    m.fillStyle = "rgba(102,204,0,0.7)";
                                    m.fillText("mmiillII,)#!>\u26c4\u26c7\u12b9\u102a\u07f7\u058e\u17d8", 4, 17);
                                    B = g.toDataURL();
                                    if (50 < performance.now() - f)
                                        return [-3, -3, -3];
                                    f = performance.now();
                                    B = g.toDataURL();
                                    q();
                                    q();
                                    for (var z = 0, H = Math.min(25, c.length); z < H; z++) {
                                        m.font = "10px '" + c[z] + "'";
                                        var E = z % 255;
                                        var A = Math.floor(z / c.length * 255);
                                        var G = z % 8;
                                        m.fillStyle = "rgba(" + E + ", " + A + ", " + G + ", 0.5)";
                                        m.fillText(c[z], z % 8 * 25, 8 + z % 192);
                                        if (100 < performance.now() - f)
                                            return [-3, -3, -3]
                                    }
                                    var I = g.toDataURL();
                                    q();
                                    B = ia(B.substr(B.length - 100));
                                    I = ia(I.substr(I.length - 100));
                                    var y = ia(w.substr(w.length - 100) + D.substr(D.length - 100)).substr(0, 8);
                                    c = [];
                                    c.push(y);
                                    c.push(B);
                                    c.push(I);
                                    return c
                                } catch (J) {
                                    return [-2, -2, -2]
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 35 " + b)
                        }
                        , function() {
                            var b = q();
                            var d = function() {
                                try {
                                    var c = function(A) {
                                        g.clearColor(0, 0, 0, 1);
                                        g.enable(g.DEPTH_TEST);
                                        g.depthFunc(g.LEQUAL);
                                        g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT);
                                        return "[" + A[0] + ", " + A[1] + "]"
                                    };
                                    if (N.lite || 0 == Ka || Va)
                                        return ["", ""];
                                    var f = "";
                                    var g = Ka;
                                    if (!g)
                                        return null;
                                    var m = []
                                      , w = g.createBuffer();
                                    g.bindBuffer(g.ARRAY_BUFFER, w);
                                    var D = new Float32Array([-.2, -.9, 0, .4, -.26, 0, 0, .732134444, 0]);
                                    g.bufferData(g.ARRAY_BUFFER, D, g.STATIC_DRAW);
                                    w.nb = 3;
                                    w.vb = 3;
                                    var B = g.createProgram()
                                      , z = g.createShader(g.VERTEX_SHADER);
                                    g.shaderSource(z, "attribute vec2 attrVertex;varying vec2 varyinTexCoordinate;uniform vec2 uniformOffset;void main(){varyinTexCoordinate=attrVertex+uniformOffset;gl_Position=vec4(attrVertex,0,1);}");
                                    g.compileShader(z);
                                    var H = g.createShader(g.FRAGMENT_SHADER);
                                    g.shaderSource(H, "precision mediump float;varying vec2 varyinTexCoordinate;void main() {gl_FragColor=vec4(varyinTexCoordinate,0,1);}");
                                    g.compileShader(H);
                                    g.attachShader(B, z);
                                    g.attachShader(B, H);
                                    g.linkProgram(B);
                                    g.useProgram(B);
                                    B.zb = g.getAttribLocation(B, "attrVertex");
                                    B.wb = g.getUniformLocation(B, "uniformOffset");
                                    g.enableVertexAttribArray(B.Nb);
                                    g.vertexAttribPointer(B.zb, w.nb, g.FLOAT, !1, 0, 0);
                                    g.uniform2f(B.wb, 1, 1);
                                    g.drawArrays(g.TRIANGLE_STRIP, 0, w.vb);
                                    null != g.canvas && (f = ia(g.canvas.toDataURL()));
                                    m.push(g.getSupportedExtensions().join(";"));
                                    m.push(c(g.getParameter(g.ALIASED_LINE_WIDTH_RANGE)));
                                    m.push(c(g.getParameter(g.ALIASED_POINT_SIZE_RANGE)));
                                    m.push(g.getParameter(g.ALPHA_BITS));
                                    m.push(g.getContextAttributes().antialias ? "yes" : "no");
                                    m.push(g.getParameter(g.BLUE_BITS));
                                    m.push(g.getParameter(g.DEPTH_BITS));
                                    m.push(g.getParameter(g.GREEN_BITS));
                                    m.push(function(A) {
                                        var G, I = A.getExtension("EXT_texture_filter_anisotropic") || A.getExtension("WEBKIT_EXT_texture_filter_anisotropic") || A.getExtension("MOZ_EXT_texture_filter_anisotropic");
                                        return I ? (G = A.getParameter(I.MAX_TEXTURE_MAX_ANISOTROPY_EXT),
                                        0 === G && (G = 2),
                                        G) : null
                                    }(g));
                                    m.push(g.getParameter(g.MAX_COMBINED_TEXTURE_IMAGE_UNITS));
                                    m.push(g.getParameter(g.MAX_CUBE_MAP_TEXTURE_SIZE));
                                    m.push(g.getParameter(g.MAX_FRAGMENT_UNIFORM_VECTORS));
                                    m.push(g.getParameter(g.MAX_RENDERBUFFER_SIZE));
                                    m.push(g.getParameter(g.MAX_TEXTURE_IMAGE_UNITS));
                                    m.push(g.getParameter(g.MAX_TEXTURE_SIZE));
                                    m.push(g.getParameter(g.MAX_VARYING_VECTORS));
                                    m.push(g.getParameter(g.MAX_VERTEX_ATTRIBS));
                                    m.push(g.getParameter(g.MAX_VERTEX_TEXTURE_IMAGE_UNITS));
                                    m.push(g.getParameter(g.MAX_VERTEX_UNIFORM_VECTORS));
                                    m.push(c(g.getParameter(g.MAX_VIEWPORT_DIMS)));
                                    m.push(g.getParameter(g.RED_BITS));
                                    m.push(g.getParameter(g.RENDERER));
                                    m.push(g.getParameter(g.SHADING_LANGUAGE_VERSION));
                                    m.push(g.getParameter(g.STENCIL_BITS));
                                    m.push(g.getParameter(g.VENDOR));
                                    m.push(g.getParameter(g.VERSION));
                                    if (g.getShaderPrecisionFormat)
                                        for (c = ["FLOAT", "INT"],
                                        w = ["VERTEX", "FRAGMENT"],
                                        D = ["HIGH", "MEDIUM", "LOW"],
                                        B = 0; 1 >= B; B++)
                                            for (z = 0; 1 >= z; z++)
                                                for (H = 0; 2 >= H; H++) {
                                                    var E = g.getShaderPrecisionFormat(g[w[z] + "_SHADER"], g[D[H] + "_" + c[B]]);
                                                    m.push(E.precision);
                                                    m.push(E.rangeMin);
                                                    m.push(E.rangeMax)
                                                }
                                    E = [];
                                    E.push(f);
                                    E.push(ia(m.join(",")));
                                    return E
                                } catch (A) {
                                    return ["", ""]
                                }
                            }();
                            F(d);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 36 " + b)
                        }
                        , function() {
                            var b = q();
                            try {
                                var d = window.external
                                  , c = [];
                                try {
                                    for (var f in d)
                                        c.push(f);
                                    var g = c
                                } catch (w) {
                                    g = !1
                                }
                                var m = g || -2
                            } catch (w) {
                                m = -1
                            }
                            F(m);
                            b = Math.round(q() - b);
                            0 < b && x.push("s 37 " + b)
                        }
                        , h])
                    }
                    function Wa(h) {
                        !(N && N.collect_only) && "local" === N.network_mode && N.endpoints.beacons.debug && navigator.sendBeacon && navigator.sendBeacon(N.endpoints.beacons.debug + "?type=debug&d=" + encodeURIComponent(h))
                    }
                    function lc() {
                        if (ja)
                            return !1;
                        ja = !0;
                        yc(function() {
                            hc = q();
                            xb = Eb;
                            Eb(0)
                        })
                    }
                    function ib(h) {
                        tc();
                        !N.quiet && console && console.groupEnd && console.groupEnd();
                        0 < h.error && 0 < za && (h.error = 10 * h.error + za);
                        fb = !1;
                        clearTimeout(Bc);
                        if (!(N && N.collect_only) && "local" === N.network_mode && N.endpoints.beacons.error && 0 < h.error && 100 > h.error) {
                            var b = h.error;
                            cb = "W:" + (top != window && 0 == window.outerWidth && 0 == window.outerHeight && 0 == window.innerWidth && 0 == window.innerWidth ? "1" : "0") + ",H:" + (document.hidden ? "1" : "0") + "," + cb;
                            b = N.endpoints.beacons.error + "?type=err&code=" + b + "&tt=" + (performance.now() - bb) + "&j=" + encodeURIComponent(cb) + "&dmsg=" + encodeURIComponent(x.join(","));
                            navigator.sendBeacon && navigator.sendBeacon(b)
                        }
                        N.callback && N.callback instanceof Function && N.callback(h)
                    }
                    function Gb(h, b) {
                        if (0 < b) {
                            var d = {
                                signature: "",
                                data: "",
                                error: b
                            };
                            ib(d);
                            return !1
                        }
                        d = h.split("\n");
                        h = d[0];
                        d.splice(0, 1);
                        d = d.join("\n");
                        3 != (N.type || "") && (d = N.data || null);
                        d = {
                            signature: h,
                            data: d || null,
                            error: b
                        };
                        ib(d);
                        0 == b && hb("token_" + Ea, h, 6);
                        return !0
                    }
                    function Hb(h, b) {
                        if (0 == b || "undefined" === typeof Uint8Array || "undefined" === typeof Jb || 50 > h.length)
                            return h;
                        try {
                            var d = Jb(h, {
                                level: 3
                            });
                            return 50 > d.length || 10 * d.length < h.length || d.length > h.length ? h : d
                        } catch (c) {
                            return h
                        }
                    }
                    function martellCloneFingerprintValue(h) {
                        if (h instanceof Array) {
                            for (var b = [], d = 0; d < h.length; d++)
                                b[d] = martellCloneFingerprintValue(h[d]);
                            return b
                        }
                        if (h && "object" === typeof h) {
                            try {
                                return JSON.parse(JSON.stringify(h))
                            } catch (c) {}
                        }
                        return h
                    }
                    function ic(h) {
                        function b() {
                            Xa && (Xa = !1,
                            !N.collect_only && eb("p", Hb(c, h), c, Gb))
                        }
                        ja = !1;
                        if (0 == mc) {
                            mc = !0;
                            for (var d = 0; d < ba.length; d++)
                                F(ba[d]);
                            F(q() - nc);
                            F(Cc);
                            F(x);
                            F(Dc)
                        }
                        U("fDg");
                        sc();
                        var gcSnapshot = martellCloneFingerprintValue(gc);
                        var c = Yb(gcSnapshot, !0);
                        var f = JSON.stringify(gcSnapshot);
                        !N.quiet && console.log("ub: " + f);
                        !N.quiet && console.log("b: " + c);
                        "function" === typeof window.MartellFingerprintDebugWrite && window.MartellFingerprintDebugWrite("features", f);
                        "function" === typeof window.MartellFingerprintDebugWrite && window.MartellFingerprintDebugWrite("payload", c);
                        if (N.collect_only && N.onFingerprint instanceof Function) {
                            N.onFingerprint({
                                error: 0,
                                payload: c,
                                features: f,
                                values: gcSnapshot,
                                count: gcSnapshot.length,
                                endpoints: N.endpoints
                            });
                            return !0;
                        }
                        if (0 < jb) {
                            d = performance.now() - jb;
                            U("PRE" + d);
                            var f = (N.timeout || 2500) - (performance.now() - bb) - 200;
                            500 < f && (f = 500);
                            if (d < f) {
                                U("PREWAIT" + f);
                                Xa = b;
                                ra(b, f);
                                return
                            }
                        } else
                            U("PREFIN");
                        !N.collect_only && eb("p", Hb(c, h), c, Gb)
                    }
                    function Ec(h, b) {
                        U("cTC");
                        if (10 > h.length || 0 < b)
                            hb("token_" + Ea, "", 0),
                            lc();
                        else if (0 < b) {
                            var d = {
                                signature: "",
                                data: "",
                                error: b
                            };
                            ib(d)
                        } else
                            d = h.split("\n"),
                            h = d[0],
                            d.splice(0, 1),
                            d = d.join("\n"),
                            3 != (N.type || "") && (d = N.data || null),
                            d = {
                                signature: h,
                                data: d || null,
                                error: b
                            },
                            ib(d),
                            0 == b && hb("token_" + Ea, h, 6)
                    }
                    function Fc() {
                        var h = ec("token_" + Ea);
                        if ("" == h || "string" !== typeof h)
                            return !1;
                        h = h + "\n" + Ea + "\n" + (N.sub_id || "");
                        "" != (N.data || "") && (h = h + "\n" + N.data);
                        eb("t", Hb(h, !0), h, Ec, 800);
                        return !0
                    }
                    N || (N = {});
                    N.endpoints || (N.endpoints = MARTELL_FINGERPRINT_ENDPOINTS);
                    N.network_mode || (N.network_mode = N.endpoints.networkMode || "off");
                    "quiet"in N || (N.quiet = !0);
                    "enable_drm_probe"in N || (N.enable_drm_probe = !1);
                    "enable_chrome_pdf_probe"in N || (N.enable_chrome_pdf_probe = !1);
                    "enable_isolated_frame_probe"in N || (N.enable_isolated_frame_probe = !1);
                    "enable_console_probe"in N || (N.enable_console_probe = !1);
                    "enable_worker_scheduler"in N || (N.enable_worker_scheduler = !1);
                    "enable_eval_probe"in N || (N.enable_eval_probe = !1);
                    var wa = this, Ua = N.endpoints.hosts.primary.slice(), Gc = N.endpoints.hosts.ipv6.slice(), fc = {
                        "TypeError: Cannot read properties of null (reading '0')\n    at https://martell.local/:113:202\n    at Wb (https://martell.local/:48:316)\n    at c (https://martell.local/:176:111)\n    at https://martell.local/:176:310": 0,
                        "function appendChild() { [native code] }": 1,
                        "function toString() { [native code] }": 2,
                        "[object Object]": 3,
                        "function SpeechRecognitionEvent() { [native code] }": 4,
                        "Portable Document Format": 5,
                        "function RTCPeerConnection() { [native code] }": 6,
                        "function IntegrityViolationReportBody() { [native code] }": 7,
                        "function getPrototypeOf() { [native code] }": 8,
                        "function getOwnPropertyDescriptors() { [native code] }": 9,
                        "function SpeechRecognitionErrorEvent() { [native code] }": 10,
                        "window.FileSystemWritableFileStream": 11,
                        "function PerformanceObserverEntryList() { [native code] }": 12,
                        "window.SecurityPolicyViolationEvent": 13,
                        "function UserMessageHandlersNamespace() {\n    [native code]\n}": 14,
                        "function FileSystemWritableFileStream() { [native code] }": 15,
                        "window.SVGFESpecularLightingElement": 16,
                        "[object ServiceWorkerContainer]": 17,
                        "function appendChild() {\n    [native code]\n}": 18,
                        "[object Navigator]": 19,
                        "WebGL GLSL ES 3.00 (OpenGL ES GLSL ES 3.0 Chromium)": 20,
                        "ptQplt-0.10000002384185791": 21,
                        "internal-pdf-viewer": 22,
                        "function toString() {\n    [native code]\n}": 23,
                        "function WebGL2RenderingContext() { [native code] }": 24,
                        "function BluetoothRemoteGATTDescriptor() { [native code] }": 25,
                        "function MouseEvent() { [native code] }": 26,
                        "function getParameter() { [native code] }": 27,
                        "function XMLHttpRequest() { [native code] }": 28,
                        "function setAppBadge() { [native code] }": 29,
                        userVerifyingPlatformAuthenticator: 30,
                        "function SVGFESpecularLightingElement() { [native code] }": 31,
                        "function ReadableByteStreamController() { [native code] }": 32,
                        "function hasFocus() { [native code] }": 33,
                        "function SpeechRecognitionAlternative() {\n    [native code]\n}": 34,
                        "function getOwnPropertyDescriptors() {\n    [native code]\n}": 35,
                        "function alert() { [native code] }": 36,
                        "function SecurityPolicyViolationEvent() { [native code] }": 37,
                        "function toDataURL() { [native code] }": 38,
                        "[object PluginArray]": 39,
                        "function IntersectionObserver() {\n    [native code]\n}": 40,
                        "https://martell.local/": 41,
                        "ptQplt-0.19999998807907104": 42,
                        "1,2,3,4,5,6,7,16,36,45,47,49,50,53,56,80": 43,
                        "[object Screen]": 44,
                        "com.apple.speech.synthesis.voice.Trinoids": 45,
                        'video/mp4; codecs="avc1.42E01E"': 46,
                        "function animate() { [native code] }": 47,
                        "Google Chrome": 48,
                        "function BarcodeDetector() { [native code] }": 49
                    }, cb = "", za = 0, ja = !1, mc = !1, Ka = 0, Va = !1, ba = [], xb = !1, wb = 0, gc = [], Db = [], db = [], x = [], Cc = [], Dc = [], hc, Bb = document.getElementsByTagName("head")[0] || document.getElementsByTagName("script")[0].parentNode, M = {}, gb = {}, jb = 0, Xa = !1, Ja = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=".split(""), kb = document.URL || "";
                    "" == kb && "location"in document && "toString"in document.location && (kb = document.location.toString());
                    var ac = "" != kb ? 0 === kb.indexOf("https://") : window.isSecureContext || !0;
                    Array.prototype.push || (Array.prototype.push = function(h) {
                        for (var b = this.length >>> 0, d = arguments.length >>> 0, c = 0; c < d; c++)
                            this[b + c] = arguments[c];
                        return this.length = b + d
                    }
                    );
                    Array.prototype.indexOf || (Array.prototype.indexOf = function(h, b) {
                        if (null == this)
                            return -2;
                        var d = Object(this)
                          , c = d.length >>> 0;
                        if (0 === c)
                            return -1;
                        b |= 0;
                        if (b >= c)
                            return -1;
                        for (b = Math.max(0 <= b ? b : c - Math.abs(b), 0); b < c; ) {
                            if (b in d && d[b] === h)
                                return b;
                            b++
                        }
                        return -1
                    }
                    );
                    var sb = "function" === typeof window.btoa ? function(h) {
                        return window.btoa(h)
                    }
                    : "function" === typeof Buffer ? function(h) {
                        return Buffer.from(h, "binary").toString("base64")
                    }
                    : function(h) {
                        for (var b, d, c, f = "", g = h.length % 3, m = 0; m < h.length; ) {
                            if (255 < (b = h.charCodeAt(m++)) || 255 < (d = h.charCodeAt(m++)) || 255 < (c = h.charCodeAt(m++)))
                                return "";
                            b = b << 16 | d << 8 | c;
                            f += Ja[b >> 18 & 63] + Ja[b >> 12 & 63] + Ja[b >> 6 & 63] + Ja[b & 63]
                        }
                        return g ? f.slice(0, g - 3) + "===".substring(g) : f
                    }
                    ;
                    Date.now || (Date.now = function() {
                        return (new Date).getTime()
                    }
                    );
                    (function() {
                        if (!window.performance || !window.performance.now)
                            if (window.performance = window.performance || {},
                            window.performance.timing && window.performance.timing.navigationStart && window.performance.mark && window.performance.clearMarks && window.performance.getEntriesByName)
                                window.performance.now = function() {
                                    window.performance.clearMarks("__PERFORMANCE_NOW__");
                                    window.performance.mark("__PERFORMANCE_NOW__");
                                    return window.performance.getEntriesByName("__PERFORMANCE_NOW__")[0].startTime
                                }
                                ;
                            else if (!1 === "now"in window.performance) {
                                var h = Date.now();
                                window.performance.timing && window.performance.timing.navigationStart && (h = window.performance.timing.navigationStart);
                                window.performance.now = function() {
                                    return Date.now() - h
                                }
                            }
                    }
                    )();
                    var nc = performance.now();
                    "function" != typeof Object.assign && (Object.assign = function(h, b) {
                        if (null == h)
                            throw new TypeError("Cannot convert undefined or null to object");
                        for (var d = Object(h), c = 1; c < arguments.length; c++) {
                            var f = arguments[c];
                            if (null != f)
                                for (var g in f)
                                    Object.prototype.hasOwnProperty.call(f, g) && (d[g] = f[g])
                        }
                        return d
                    }
                    );
                    (function() {
                        Object.keys || (Object.keys = function() {
                            var h = Object.prototype.hasOwnProperty
                              , b = !{
                                toString: null
                            }.propertyIsEnumerable("toString")
                              , d = "toString toLocaleString valueOf hasOwnProperty isPrototypeOf propertyIsEnumerable constructor".split(" ")
                              , c = d.length;
                            return function(f) {
                                if ("object" !== typeof f && ("function" !== typeof f || null === f))
                                    throw new TypeError("Object.keys called on non-object");
                                var g = [], m;
                                for (m in f)
                                    h.call(f, m) && g.push(m);
                                if (b)
                                    for (m = 0; m < c; m++)
                                        h.call(f, d[m]) && g.push(d[m]);
                                return g
                            }
                        }())
                    }
                    )();
                    var Wb = "0123456789abcdef".split("");
                    ia("martell");
                    (function() {
                        function h(A) {
                            delete B[A]
                        }
                        function b(A) {
                            if (z)
                                setTimeout(b, 0, A);
                            else {
                                var G = B[A];
                                if (G) {
                                    z = !0;
                                    try {
                                        var I = G.Va
                                          , y = G.ya;
                                        switch (y.length) {
                                        case 0:
                                            I();
                                            break;
                                        case 1:
                                            I(y[0]);
                                            break;
                                        case 2:
                                            I(y[0], y[1]);
                                            break;
                                        case 3:
                                            I(y[0], y[1], y[2]);
                                            break;
                                        default:
                                            I.apply(void 0, y)
                                        }
                                    } finally {
                                        h(A),
                                        z = !1
                                    }
                                }
                            }
                        }
                        function d() {
                            E = function(A) {
                                window.scheduler.yield().then(function() {
                                    b(A)
                                })
                            }
                        }
                        function c() {
                            if ("postMessage"in window) {
                                var A = !0
                                  , G = window.onmessage;
                                window.onmessage = function() {
                                    A = !1
                                }
                                ;
                                window.postMessage("", "*");
                                window.onmessage = G;
                                return A
                            }
                        }
                        function f() {
                            function A(I) {
                                I.source === window && "string" === typeof I.data && 0 === I.data.indexOf(G) && b(+I.data.slice(G.length))
                            }
                            var G = "setImmediate$" + Math.random() + "$";
                            window.addEventListener ? window.addEventListener("message", A, !1) : window.attachEvent("onmessage", A);
                            E = function(I) {
                                window.postMessage(G + I, "*")
                            }
                        }
                        function g() {
                            var A = new MessageChannel;
                            A.port1.onmessage = function(G) {
                                b(G.data)
                            }
                            ;
                            E = function(G) {
                                A.port2.postMessage(G)
                            }
                        }
                        function m() {
                            var A = H.documentElement;
                            E = function(G) {
                                var I = H.createElement("script");
                                I.onreadystatechange = function() {
                                    b(G);
                                    I.onreadystatechange = null;
                                    A.removeChild(I);
                                    I = null
                                }
                                ;
                                A.appendChild(I)
                            }
                        }
                        function w() {
                            E = function(A) {
                                setTimeout(b, 0, A)
                            }
                        }
                        if (!("setImmediate"in window)) {
                            var D = 1, B = {}, z = !1, H = window.document, E;
                            "scheduler"in window && "object" == typeof window.scheduler && "yield"in window.scheduler ? (d(),
                            x.push("qH:scheduler")) : c() ? (x.push("qH:pM"),
                            f()) : window.MessageChannel ? (x.push("qH:mC"),
                            g()) : H && "onreadystatechange"in H.createElement("script") ? (x.push("qH:rs"),
                            m()) : (x.push("qH:sT"),
                            w());
                            Window.prototype.setImmediate = function(A) {
                                "function" !== typeof A && (A = new Function("" + A));
                                for (var G = Array(arguments.length - 1), I = 0; I < G.length; I++)
                                    G[I] = arguments[I + 1];
                                B[D] = {
                                    Va: A,
                                    ya: G
                                };
                                E(D);
                                return D++
                            }
                            ;
                            Window.prototype.clearImmediate = h
                        }
                    }
                    )();
                    var sa = []
                      , vb = []
                      , Da = !0;
                    (function() {
                        try {
                            var h = function() {
                                Ia(!0);
                                Da && setTimeout(h.bind(wa), 10)
                            };
                            h()
                        } catch (g) {}
                        if ("requestIdleCallback"in window)
                            try {
                                var b = function() {
                                    Ia(!0);
                                    Da && requestIdleCallback(b.bind(wa), {
                                        timeout: 10
                                    })
                                };
                                b()
                            } catch (g) {}
                        if ("requestAnimationFrame"in window)
                            try {
                                var d = function() {
                                    Ia(!0);
                                    Da && requestAnimationFrame(d.bind(wa))
                                };
                                d()
                            } catch (g) {}
                        if ("AbortSignal"in window && "timeout"in AbortSignal)
                            try {
                                var c = function() {
                                    Ia(!0);
                                    Da && (AbortSignal.timeout(10).onabort = c.bind(wa))
                                };
                                c()
                            } catch (g) {}
                        if ("scheduler"in window)
                            try {
                                var f = function() {
                                    Ia(!1);
                                    Da && window.scheduler.postTask(f.bind(wa), {
                                        priority: "user-blocking",
                                        delay: 10
                                    })
                                };
                                f()
                            } catch (g) {}
                        if (N.enable_worker_scheduler && "Worker"in window)
                            try {
                                (new Worker(URL.createObjectURL(new Blob(["setInterval(postMessage, 10, undefined);"],{
                                    type: "application/javascript"
                                })))).onmessage = function(g) {
                                    if (!Da)
                                        try {
                                            g.target.terminate()
                                        } catch (m) {}
                                    Ia(!0)
                                }
                                .bind(wa)
                            } catch (g) {}
                    }
                    )();
                    var Ac = Zb(32)
                      , zc = +new Date
                      , na = !1;
                    try {
                        var Hc = yb.toString() + ";(" + function() {
                            var h = {}
                              , b = {};
                            this.onmessage = function(d) {
                                function c(m) {
                                    h[f].readyState = b[f].readyState || 0;
                                    h[f].status = b[f].status || 0;
                                    h[f].responseText = b[f].responseText || "";
                                    "" == (h[f].Ra || "") && (h[f].Ra = b[f].getAllResponseHeaders());
                                    postMessage({
                                        wa: "event",
                                        event: m,
                                        request: h[f]
                                    })
                                }
                                if (d && d.data && "number" == typeof d.data.requestId) {
                                    var f = d.data.requestId;
                                    if ("abort" == d.data.wa)
                                        try {
                                            b[f].abort()
                                        } catch (m) {}
                                    else
                                        try {
                                            h[f] = d.data;
                                            b[f] = "fetch" == h[f].wa ? yb() : new XMLHttpRequest;
                                            b[f].onload = function() {
                                                c("onload")
                                            }
                                            ;
                                            b[f].onerror = function() {
                                                c("onerror")
                                            }
                                            ;
                                            b[f].ontimeout = function() {
                                                c("ontimeout")
                                            }
                                            ;
                                            b[f].onabort = function() {
                                                c("onabort")
                                            }
                                            ;
                                            b[f].onprogress = function() {
                                                c("onprogress")
                                            }
                                            ;
                                            b[f].onreadystatechange = function() {
                                                c("onreadystatechange")
                                            }
                                            ;
                                            var g = Object.keys(h[f]);
                                            for (d = 0; d < g.length; d++)
                                                g[d]in b[f] && (b[f][g] = h[f][g]);
                                            b[f].open(h[f].method || "GET", h[f].url);
                                            g = Object.keys(h[f].Ga || []);
                                            for (d = 0; d < g.length; d++)
                                                b[f].setRequestHeader(g[d], h[f].Ga[g[d]]);
                                            b[f].send(h[f].data)
                                        } catch (m) {
                                            c("onerror")
                                        }
                                }
                            }
                        }
                        .toString() + ")();";
                        if (N.enable_worker_scheduler && "Worker"in window) {
                            var bc = 0;
                            na = new Worker(URL.createObjectURL(new Blob([Hc],{
                                type: "application/javascript"
                            })));
                            var cc = {};
                            "object" == typeof na && "postMessage"in na ? na.onmessage = function(h) {
                                if (h && h.data && h.data.request && "number" == typeof h.data.request.requestId)
                                    try {
                                        cc[h.data.request.requestId](h.data.event, h.data.request)
                                    } catch (b) {}
                            }
                            : na = !1
                        }
                    } catch (h) {
                        na = !1
                    }
                    if (N.collect_only) {
                        F("");
                        F("");
                        F("");
                        F("");
                        F("");
                        F("");
                        F("");
                        F("");
                        F("");
                        F("");
                    } else {
                        F(1776604486);
                        F(Ea || "");
                        F(N.sub_id || "");
                        F(N.type || "");
                        F(N.request_signature || "");
                        F(N.data || "");
                        F(N.custom_nonce || "");
                        F(N.ipv6_priority ? 1 : 0);
                        F(N.lite ? 1 : 0);
                        F(N.async_callback ? 1 : 0);
                    }
                    N.ipv6_priority && (Ua = Gc);
                    for (var Fb = Ua[0], ya = "hev1.1.6.L93.90;hvc1.1.6.L93.90;hev1.1.6.L93.B0;hvc1.1.6.L93.B0;hvc1.1.6.L186.B0;vp09.00.10.08;vp09.00.50.08;vp09.01.20.08.01;vp09.01.20.08.01.01.01.01.00;vp09.02.10.10.01.09.16.09.01;av01.0.08M.08;av01.2.15M.10.0.100.09.16.09.0;av01.0.15M.10;3gvo;a3d1;a3d2;a3d3;a3d4;avc1;avc2;avc3;avc4;avcp;drac;dvav;dvhe;encf;encm;encs;enct;encv;fdp;hev1;hvc1;hvt1;ixse;lhv1;lhe1;lht1;m2ts;mett;metx;mjp2;mlix;mp4s;mp4v;mvc1;mvc2;mvc3;mvc4;mvd1;mvd2;mvd3;mvd4;oksd;pm2t;prtp;resv;rm2t;rrtp;rsrp;rtmd;rtp ;s263;sm2t;srtp;stpp;STGS;svc1;svc2;svcM;tc64;tmcd;tx3g;unid;urim;vc-1;vp08;vp09;wvtt;avc1.42003e;avc1.42003f;avc1.42403e;avc1.42403f;avc1.4d003e;avc1.4d003f;avc1.4d403e;avc1.4d403f;avc1.4d4040;avc1.4d4050;avc1.561085;avc1.58000a;avc1.58003e;avc1.58003f;avc1.64003e;avc1.64003f;avc1.64083e;avc1.64083f;avc1.f41085;avc1.2c000a;vorbis;vp8;vp8.0;vp9;theora".split(";"), ta = "mp4a.40;mp4a.66;mp4a.67;mp4a.68;mp4a.69;mp4a.6B;mp3;flac;bogus;aac;ac3;A52;a3ds;ac-3;ac-4;alac;alaw;dra1;dts+;dts-;dtsc;dtse;dtsh;dtsl;dtsx;ec-3;enca;g719;g726;m4ae;mha1;mha2;mhm1;mhm2;mlpa;mp4a;Opus;raw ;samr;sawb;sawp;sevc;sqcp;ssmv;twos;ulaw;0;1;2;opus;vorbis;speex".split(";"), Ib = 1; 37 > Ib; Ib++)
                        ta.push("mp4a.40." + Ib);
                    var kc = Zb(12);
                    F(N.collect_only ? "" : kc);
                    x.push("hdr " + (q() - nc));
                    try {
                        var bb = performance.now();
                        var fb = !0;
                        var Bc = ra(function() {
                            fb && Gb("", 6)
                        }, N.timeout || 2500);
                        !N.quiet && console && console.groupCollapsed && console.groupCollapsed("Martell browser fingerprint");
                        document.addEventListener && (document.addEventListener("securitypolicyviolation", function(h) {
                            try {
                                if (h && "blockedURI"in h && N.endpoints.centralHostPattern.test(h.blockedURI) && -1 == h.blockedURI.indexOf("favicon.ico") && "report" != h.disposition) {
                                    za = 1;
                                    var b = "";
                                    b = 100 > h.blockedURI.length ? b + ((h.blockedURI || "") + ",") : b + (h.blockedURI.substring(0, 100) + ",");
                                    b += (h.disposition || "") + ",";
                                    b += (h.lineNumber || "") + ",";
                                    b += (h.columnNumber || "") + ",";
                                    b += (h.effectiveDirective || "") + ",";
                                    U("CSP:" + b);
                                    Wa("CSP:" + b)
                                }
                            } catch (d) {}
                        }),
                        document.addEventListener("freeze", function() {
                            za = 2;
                            U("FREEZE")
                        }),
                        window.addEventListener("pagehide", function() {
                            za = 3;
                            U("PHIDE")
                        }),
                        window.addEventListener("beforeunload", function() {
                            za = 4;
                            U("BUNLOAD")
                        }),
                        window.addEventListener("offline", function() {
                            za = 5;
                            U("OFFLINE")
                        }),
                        window.addEventListener("visibilitychange", function() {
                            "hidden" == document.visibilityState && (za = 6,
                            U("VCHID"))
                        }),
                        window.addEventListener("unhandledrejection", function(h) {
                            try {
                                var b = "";
                                h && ("reason"in h && "object" == typeof reason ? (b += (h.reason.message || "") + ",",
                                b += (h.reason.stack || "") + ",") : b = h.reason || "",
                                N.endpoints.centralHostPattern.test(b) && (U("UR:" + b),
                                Wa("UR:" + b)))
                            } catch (d) {}
                        }),
                        window.addEventListener("error", function(h) {
                            try {
                                if (h) {
                                    var b = "";
                                    if ("object" == typeof h)
                                        try {
                                            "message"in h && (b += h.message || ""),
                                            "stack"in h && (b += h.stack || ""),
                                            "error"in h && (b += (h.error.message || "") + ",",
                                            b += (h.error.stack || "") + ",")
                                        } catch (d) {
                                            b = typeof d
                                        }
                                    N.endpoints.centralHostPattern.test(b) && (U("GER:" + b),
                                    Wa("GER:" + b))
                                }
                            } catch (d) {}
                        }));
                        U("STR");
                        if (N.collect_only)
                            lc();
                        else
                            Fc() || (eb("p", "", "", function(h, b) {
                                0 != jb && (U("PRECONF" + b),
                                jb = 0,
                                Xa && Xa())
                            }),
                            lc())
                    } catch (h) {
                        "object" == typeof h ? Wa("GER:" + h.toString() + "," + h.stack || "") : Wa("GER:" + h.toString())
                    }
                }
                ;
            }
            ).call(this);

    function collectMartellFingerprint(options) {
        options = martellNormalizeOptions(options);
        return new Promise(function(resolve, reject) {
            var done = false;
            var timer = global.setTimeout(function() {
                if (done)
                    return;
                done = true;
                reject(new Error("Martell fingerprint collection timed out"));
            }, options.timeout + options.settleGraceMs);

            function finish(result) {
                if (done)
                    return;
                done = true;
                global.clearTimeout(timer);
                martellAugmentFingerprintResult(result, options).then(function(finalResult) {
                    try {
                        Object.defineProperty(global, "__MARTELL_FINGERPRINT_LAST_RESULT__", {
                            configurable: true,
                            writable: true,
                            enumerable: false,
                            value: finalResult
                        });
                    } catch (error) {
                        global.__MARTELL_FINGERPRINT_LAST_RESULT__ = finalResult;
                    }
                    resolve(finalResult);
                }, function(error) {
                    if (result && "object" === typeof result)
                        result.profileError = error && (error.message || error.toString()) || "profile-augment-error";
                    resolve(result);
                });
            }

            try {
                global.MartellFingerprintInit("", {
                    type: "",
                    sub_id: "",
                    request_signature: "",
                    data: "",
                    custom_nonce: "",
                    async_callback: 0,
                    lite: options.lite ? 1 : 0,
                    ipv6_priority: options.ipv6Priority ? 1 : 0,
                    network_mode: options.networkMode,
                    quiet: options.quiet,
                    enable_drm_probe: options.enableDrmProbe,
                    enable_chrome_pdf_probe: options.enableChromePdfProbe,
                    enable_isolated_frame_probe: options.enableIsolatedFrameProbe,
                    enable_console_probe: options.enableConsoleProbe,
                    enable_worker_scheduler: options.enableWorkerScheduler,
                    enable_eval_probe: options.enableEvalProbe,
                    endpoints: options.endpoints,
                    timeout: options.timeout,
                    collect_only: 1,
                    nocookies: 1,
                    onFingerprint: finish,
                    callback: function(result) {
                        if (!done && result && result.error)
                            finish({error: result.error, payload: "", features: "", values: [], count: 0, endpoints: options.endpoints});
                    }
                });
            } catch (error) {
                if (!done) {
                    done = true;
                    global.clearTimeout(timer);
                    reject(error);
                }
            }
        });
    }

    function martellCompileFingerprintResult(result, options) {
        result = martellClonePlain(result);
        options = martellNormalizeOptions(options);
        if (!result || "object" !== typeof result)
            return Promise.resolve(result);
        try {
            if (!result.profile && Array.isArray(result.values))
                result.profile = martellBuildBrowserProfile(result, options);
            if (!result.chromium && result.profile)
                result.chromium = martellBuildChromiumProfile(result.profile, options);
            if (result.chromium)
                result.broium = martellBuildBroiumLaunchConfig(result.chromium);
            if (result.profile && result.chromium) {
                result.training = martellBuildTrainingProfile(result.profile, result.chromium);
                result.trainingDataset = martellBuildTrainingDataset(result.training);
            }
        } catch (error) {
            result.profileError = error && (error.message || error.toString()) || "profile-compile-error";
        }
        return Promise.resolve(martellPruneProfile(result));
    }

    const api = Object.freeze({
        endpoints: MARTELL_FINGERPRINT_ENDPOINTS,
        collect: collectMartellFingerprint,
        compile: martellCompileFingerprintResult,
        buildBroiumLaunchConfig: function(chromium) {
            return martellBuildBroiumLaunchConfig(chromium);
        }
    });

    global.MartellFingerprint = api;
    try {
        Object.defineProperty(global, "__MARTELL_FINGERPRINT_ENDPOINTS__", {
            configurable: true,
            writable: false,
            enumerable: false,
            value: MARTELL_FINGERPRINT_ENDPOINTS
        });
    } catch (error) {
        global.__MARTELL_FINGERPRINT_ENDPOINTS__ = MARTELL_FINGERPRINT_ENDPOINTS;
    }
    var martellResult = "undefined" !== typeof document ? collectMartellFingerprint(global.__MARTELL_FINGERPRINT_OPTIONS__) : api;
    if (martellResult && "function" === typeof martellResult.then) {
        try {
            Object.defineProperty(global, "__MARTELL_FINGERPRINT_LAST_PROMISE__", {
                configurable: true,
                writable: true,
                enumerable: false,
                value: martellResult
            });
        } catch (error) {
            global.__MARTELL_FINGERPRINT_LAST_PROMISE__ = martellResult;
        }
    }
    return martellResult;
})(typeof globalThis !== "undefined" ? globalThis : window);
