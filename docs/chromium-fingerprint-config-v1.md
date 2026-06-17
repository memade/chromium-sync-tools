# Chromium Fingerprint Config v1

## Purpose

`tmp.json.profile` is the full observed browser profile.
`tmp.json.chromium` is the semantic fingerprint contract for the observed Chromium-family browser.

The `chromium` node is not a launch-argument list and not a patch for another config file. It describes the browser fingerprint to reproduce: identity, navigator, screen, locale, runtime, graphics, audio, fonts, media, network, storage, security, and API surface.

If the collector runs in Google Chrome, the node describes Google Chrome. If it runs in Microsoft Edge, it describes Microsoft Edge. If it runs in Chromium, it describes Chromium. Runtime-specific compilation is a later consumer concern and must stay outside this contract.

## Shape

```json
{
  "schema": "chromium.fingerprint-config.v1",
  "browser": {
    "engine": "chromium",
    "family": "chromium",
    "product": "Google Chrome",
    "brand": "Google Chrome",
    "version": "149.0.7827.114",
    "major": "149",
    "role": "observed-browser"
  },
  "warnings": [],
  "config": {
    "identity": {"values": {}, "implementation": {}},
    "navigator": {"values": {}, "implementation": {}},
    "screen": {"values": {}, "implementation": {}},
    "locale": {"values": {}, "implementation": {}},
    "runtime": {"values": {}, "implementation": {}},
    "graphics": {
      "canvas2d": {"values": {}, "implementation": {}},
      "webgl": {"values": {}, "implementation": {}},
      "webgpu": {"values": {}, "implementation": {}}
    },
    "audio": {"values": {}, "implementation": {}},
    "fonts": {"values": {}, "implementation": {}},
    "media": {"values": {}, "implementation": {}},
    "network": {"values": {}, "implementation": {}},
    "storage": {"values": {}, "implementation": {}},
    "security": {"values": {}, "implementation": {}},
    "apiSurface": {"values": {}, "implementation": {}}
  },
  "implementation": {
    "consumer": {
      "role": "browser-fingerprint-simulator",
      "priorityOrder": [],
      "contract": "semantic fingerprint config; consumers translate values to their own runtime hooks"
    }
  }
}
```

## Browser Identity

The `browser` object is the observed browser identity. It must not rewrite or rename the captured browser. Version adaptation, compatibility mapping, and runtime-specific fallback rules belong in the consumer/compiler layer.

The identity section repeats the browser identity under `config.identity.values.browser` so identity values and JavaScript-visible fields can be validated together.

## Capture Environment

`profile` keeps raw observations. `chromium.config` may normalize values that are known to be capture-environment sensitive when the contract is meant to represent a normal user browser.

One important case is remote or displayless desktop capture. Tools such as remote desktop sessions can report all pointer/hover media queries as false even on a Windows desktop:

```json
{
  "hover": false,
  "anyHover": false,
  "pointerFine": false,
  "anyPointerFine": false
}
```

For a normal desktop fingerprint, `chromium.config.screen.values.viewport.mediaQueries` should use the normal desktop input profile:

```json
{
  "hover": true,
  "anyHover": true,
  "pointerFine": true,
  "anyPointerFine": true
}
```

When this normalization happens, `chromium.config.screen.values.viewport.observedMediaQueries` keeps the raw values and `chromium.warnings` includes `remote-or-displayless-pointer-media-query-normalized`.

A second capture-sensitive case is window geometry. Docked DevTools, remote-control panels, or sidebars can make `innerWidth` much smaller than a maximized desktop `outerWidth`. In that case, `chromium.config.screen.values.window` should represent the normal desktop browser contract, while raw values are kept under `observedWindow`, `observedDocumentElement`, or `observedVisualViewport`.

## Consistency Rules

`chromium.config.graphics.webgl.values.observed.extensionCount` must use the same source as the preferred context extension list. If raw Martell summary data disagrees with `contexts.<preferredContext>.supportedExtensions.length`, keep the raw number as `rawSummaryExtensionCount` and set `extensionCountSource`.

`chromium.config.fonts.values.profile` should follow platform and language. Chinese Windows profiles should distinguish `windows_zh_cn`, `windows_zh_tw`, and `windows_zh_mixed`; the detected font list and hash remain the stronger source of truth.

## Implementation Status

- `partial`: part of this surface can be represented by existing controls, but native work is needed for descriptor/prototype/coherence coverage.
- `native-required`: this surface needs native implementation or deeper browser-engine integration.
- `not-observed`: the collector did not observe enough data to generate a meaningful config section.

Each section uses:

```json
{
  "status": "partial",
  "priority": "p0",
  "current": [],
  "required": [],
  "notes": []
}
```

`current` describes feasible existing implementation areas in plain language.
`required` describes the native or runtime work needed for faithful restoration.

## Priority

1. `identity`, `navigator`, `screen`, `locale`
2. `graphics.webgl`, `graphics.canvas2d`, `fonts`
3. `runtime`, `security`
4. `media`, `network`, `graphics.webgpu`
5. `audio`, `storage`, `apiSurface`

This order favors high-signal, high-breakage browser fingerprint surfaces first.

## Non-Goals

- Do not emit config-file patches.
- Do not emit runtime-specific command-line switch names as the contract.
- Do not emit generic launch args such as first-run or default-browser flags.
- Do not depend on Martell `values[]` indexes in runtime code.
- Do not duplicate the full `chromium` contract inside `profile`.
- Do not copy large raw observation lists into `chromium.config` when a count/hash/profile key is enough. Keep full observations in `profile`.

## Consumer Rule

Consumers should translate this contract through their own compiler layer:

```text
profile/chromium fingerprint config
    -> consumer profile compiler
    -> existing runtime controls where possible
    -> native hooks where needed
```

This keeps collector evolution, profile design, and browser-runtime implementation decoupled.
