# Martell 指纹投喂 Broium 适配设计

## 目标

用 `sync/docs/martell-cdp-fingerprint.js` 在一个参考浏览器环境里采集 Martell 指纹观测值，再把这些观测值转换成 Broium 能消费的 `cfg.json` 配置，让 Broium 尽量贴近这份参考环境。

核心原则：

- Broium 的运行入口继续保持为 `src/chromium/docs/cfg.json` 这种结构。
- Martell 的原始 `values` 是位置数组，只能作为采集产物和调试数据，不能让 Chromium C++ 直接依赖数组下标。
- sync 侧负责把 Martell 原始结果转换为稳定、有语义字段名的 feed，再生成或 patch Broium `cfg.json`。
- C++ 侧优先复用现有 `cfg.json` 解析能力，只有当现有配置无法表达某类观测值时，再新增 Broium 原生能力。

## 当前状态

### Broium cfg.json

当前 `src/chromium/docs/cfg.json` 是运行时配置格式，主要包含：

- `identify`
- `switches`
- `v8Keys`
- `audio`
- `webgl`
- `args`
- `renderer.inject.js`

`configure.cc` 负责把 `identify`、`v8Keys`、`switches`、`args`、`renderer.inject.js` 转成命令行参数或注入脚本。完整 JSON 仍会通过 `GetConfigure()->GetData()` 被子模块读取。

现有模块已经能直接从完整 cfg 读取：

- `webgl_override.cc`: `webgl` / `fingerprints.webgl` / `switches.brofp-webgl`
- `audio_override.cc`: `audio` / `fingerprints.audio` / `switches.brofp-audio`
- `v8_override.cc`: `v8Keys` / `fingerprints.v8Keys` / `switches.brofp-v8-keys`

这意味着短期内不需要修改 Broium 主解析器，就可以通过生成更完整的 `cfg.json` 来投喂大部分现有能力。

### Martell 输出

当前 `martell-cdp-fingerprint.js` 返回：

```json
{
  "error": 0,
  "payload": "...",
  "features": "[...]",
  "values": [],
  "count": 253,
  "endpoints": {},
  "profile": {},
  "chromium": {}
}
```

这份结果已经做过清理：

- `features` 和 `values` 取自同一个深拷贝快照。
- 默认不外联，`endpoints.networkMode = "off"`。
- 默认不运行 eval 类探针。
- 过滤了 `__MARTELL_*` 自污染变量。
- 空 endpoint 不再生成 `https:///`。
- 内部异常栈被压成短码。
- 返回结果会附带 `profile` 和 `chromium`。`profile` 是面向还原的完整浏览器画像，`chromium` 是把画像投喂给 Chromium/Broium 的实现导向还原节点。

但是它仍然不是 Broium 应该直接消费的格式，因为 `values[98]`、`values[214]` 这种位置语义属于 Martell collector 的内部实现细节。

## 推荐数据流

```text
reference browser
    |
    | inject martell-cdp-fingerprint.js
    v
martell-result.json
    |
    | use result.profile or sync-side adapter
    v
martell-feed.json
    |
    | sync-side cfg compiler
    v
broium cfg.json
    |
    | --brofp-cfg
    v
Broium runtime
```

短期推荐落地方式：

1. Martell 继续负责采集。
2. sync 侧新增转换器，优先读取 `result.profile` 和 `result.chromium`，必要时再用 versioned index map 从原始 `values` 补字段。
3. sync 侧新增 cfg compiler，把 `martell-feed.json` 和模板 `cfg.json` 合并，输出 Broium 可直接使用的新 cfg。
4. Broium C++ 暂不直接读取 Martell 原始结果。

中期可以在 Broium cfg 中保留 `sourceObservations.martell`，用于审计和调试，但行为仍由 `switches`、`webgl`、`audio`、`v8Keys` 等已支持字段驱动。

## Feed Schema v1

建议新增中间文件 `martell-feed.json`，作为稳定投喂合同：

```json
{
  "schema": "broium.martell-feed.v1",
  "source": {
    "collector": "martell-cdp-fingerprint.js",
    "collectorVersion": 1,
    "createdAt": "2026-06-16T00:00:00.000Z",
    "pageUrl": "chrome://new-tab-page/",
    "count": 253,
    "payloadHash": "sha256:..."
  },
  "quality": {
    "valid": true,
    "warnings": []
  },
  "observed": {
    "navigator": {
      "userAgent": "",
      "appVersion": "",
      "vendor": "",
      "platform": "",
      "hardwareConcurrency": 0,
      "deviceMemory": 0,
      "language": "",
      "languages": [],
      "doNotTrack": "",
      "cookieEnabled": true
    },
    "clientHints": {
      "brands": [],
      "fullVersionList": [],
      "platform": "",
      "platformVersion": "",
      "architecture": "",
      "bitness": "",
      "mobile": false,
      "formFactors": []
    },
    "screen": {
      "width": 0,
      "height": 0,
      "availWidth": 0,
      "availHeight": 0,
      "colorDepth": 0,
      "pixelDepth": 0,
      "devicePixelRatio": 1
    },
    "locale": {
      "timeZone": "",
      "language": "",
      "languages": []
    },
    "webgl": {
      "context": "",
      "version": "",
      "shadingLanguageVersion": "",
      "vendor": "",
      "renderer": "",
      "unmaskedVendor": "",
      "unmaskedRenderer": "",
      "parameterProfile": "",
      "canvasHashes": [],
      "supportedExtensionsHash": ""
    },
    "audio": {
      "sampleRate": 0,
      "baseLatency": null,
      "outputLatency": null,
      "state": ""
    },
    "webrtc": {
      "candidates": [],
      "candidateMode": "mdns"
    },
    "speechVoices": []
  },
  "raw": {
    "include": false,
    "payload": "",
    "features": "",
    "values": []
  }
}
```

默认不建议把 `raw` 带入 Broium 运行 cfg。`raw` 可保存在 sync 目录用于审计。

## 当前 Martell 下标映射

这些下标只属于当前 `martell-cdp-fingerprint.js` 的 `collectorVersion`，不能作为 Broium C++ 合同。

| Feed 字段 | 当前 Martell 来源 | 说明 |
| --- | --- | --- |
| `navigator.userAgent` | `values[98]` | UA string |
| `navigator.appVersion` | `values[99]` | appVersion |
| `navigator.vendor` | `values[104]` | vendor |
| `navigator.platform` | `values[107]` | platform |
| `navigator.hardwareConcurrency` | `values[110]` | logical CPU count |
| `navigator.maxTouchPoints` | `values[111]` | touch points |
| `navigator.language` | `values[113]` | language |
| `navigator.languages` | `values[114]` | comma string，需要 split |
| `navigator.deviceMemory` | `values[119]` | memory GB |
| `locale.timeZone` | `values[193]` | IANA timezone |
| `locale.language` | `values[194]` | resolved locale |
| `screen.width` | `values[89]` | screen.width |
| `screen.height` | `values[90]` | screen.height |
| `screen.availWidth` | `values[91]` | availWidth |
| `screen.availHeight` | `values[92]` | availHeight |
| `screen.colorDepth` | `values[93]` | colorDepth |
| `screen.pixelDepth` | `values[94]` | pixelDepth |
| `screen.devicePixelRatio` | `values[97]` | DPR |
| `clientHints` | `values[246]` | high entropy UA-CH |
| `webgl` summary | `values[214]` | context/version/vendor/renderer/unmasked renderer |
| `webgl.canvasHashes` | `values[215]`, `values[216]` | canvas/dataURL hashes |
| `webrtc.candidates` | `values[247]`, `values[248]` | usually mDNS host candidates |
| `speechVoices` | `values[243]` | speech synthesis voices |

需要注意：

- `values[214]` 能推断 GPU/profile，但不能完整生成 `webgl.getParameter` 和 `shaderPrecisionFormat`。要做到完全自动生成 WebGL cfg，Martell 侧需要输出结构化 WebGL 参数。
- `values[243]` 是 speech voices，不等于字体枚举。不要用它直接生成 `brofp-font-allow`。

## Feed 到 cfg.json 的映射

### switches

| cfg 字段 | Feed 来源 | 策略 |
| --- | --- | --- |
| `identify` | `payloadHash` 或外部 profile id | 建议稳定 hash，作为所有扰动种子 |
| `switches.brofp-cpu` | `navigator.hardwareConcurrency` | 正整数才写入 |
| `switches.brofp-mem` | `navigator.deviceMemory` | 正整数/正数取整才写入 |
| `switches.brofp-dnt` | `navigator.doNotTrack` | 只接受 `0`/`1` |
| `switches.brofp-tz` | `locale.timeZone` | 非空 IANA id 才写入 |
| `switches.brofp-screen` | `screen.width,height,devicePixelRatio` | 格式：`width,height,dpr` |
| `switches.brofp-screen-window` | screen/window metrics | 有完整窗口观测时置 true |
| `switches.brofp-brand` | `clientHints.brands` 或 UA | 受版本策略控制 |
| `switches.brofp-brand-version` | `clientHints.fullVersionList` | 受版本策略控制 |
| `switches.brofp-webgl-mode` | `webgl.context`, `webgl.unmaskedRenderer` | 通常 `native` 或 `auto` |
| `switches.brofp-font-profile` | platform/language heuristic | 只能粗推，如 `windows_zh_cn` |

### v8Keys

继续使用：

```json
{
  "v8Keys": {
    "enable": true,
    "mode": "hash-seed"
  }
}
```

`identify` 变化时，V8 key ordering 跟着稳定变化。

### webgl

短期策略：

- 如果 `webgl.unmaskedRenderer` 包含 `Intel(R) UHD Graphics 770` 和 `Direct3D11`，选择现有 `windows_intel_uhd_770_d3d11` profile。
- 保留现有 cfg 中的 `getParameter`、`shaderPrecisionFormat`、`contextAttributes`、`extensions`，不要只凭 `values[214]` 覆盖完整 WebGL 参数。
- `dataURL` 和 `readPixels` 继续由 Broium 的 seed perturbation 处理。

中期策略：

- Martell 增加 `structured.webgl.parameters`、`structured.webgl.shaderPrecisionFormat`、`structured.webgl.extensions`、`structured.webgl.contextAttributes`。
- cfg compiler 将这些结构化字段直接生成 Broium `webgl.contexts.webgl` / `webgl.contexts.webgl2`。

### audio

当前 cfg 的 audio 是扰动策略，不是完整设备模拟。建议：

- 默认保持 `audio.enable = false`，除非目标需要跨会话稳定扰动。
- 如果启用，使用现有 `sample-stable-lowbit`，seed 来源仍为 `identify`。
- Martell 的 AudioContext 观测只用于评估，不直接改 `stride/strength`。

### renderer.inject.js

保留作为兜底层，只放 Broium 原生能力暂时覆盖不了的 JS patch。

不要把 Martell 原始 payload 或大型结果对象注入页面，这会造成新的可观察面。

## 版本策略

这是最容易踩坑的部分。当前样例 Martell 结果来自 Chrome 149，而 Broium 是 138。

建议 cfg compiler 支持两种模式：

### `versionPolicy: "native-major"` 推荐默认

保持 Broium 自身 major version，避免 UA/UA-CH/Chrome 内部对象互相矛盾。

- 不把 Martell 的 Chrome 149 直接写入 `brofp-brand-version`。
- 只复制平台、屏幕、语言、时区、硬件、WebGL profile 等非版本面。
- 如果 Martell major 与 Broium major 不一致，输出 warning。

### `versionPolicy: "mimic-source"` 高风险

尝试完全模拟 Martell 来源版本。

启用前必须确认 Broium 已覆盖：

- UA string
- UA-CH brands/fullVersionList/platformVersion
- `navigator.appVersion`
- `navigator.productSub`
- `chrome.*` 版本相关对象
- PDF viewer/version 相关面

否则只改 `brofp-brand-version` 会制造更大的不一致。

## 两边需要调整

### Martell / sync 侧

必须做：

1. 给 `martell-cdp-fingerprint.js` 增加稳定 `collectorVersion`。
2. 输出 `observed` 语义字段，至少覆盖 navigator、screen、locale、clientHints、webgl summary。
3. 保留 `values` 作为 raw/debug，但 cfg compiler 不直接使用 raw 下标，除非通过 versioned index map。
4. 增加质量门禁：
   - `error === 0`
   - `count === values.length`
   - `JSON.parse(features)` 与 `values` 深度一致
   - 不包含 `__MARTELL_`
   - 不包含 `TrustedScript`
   - 不包含 `https:///`
   - 不包含长异常栈

建议做：

1. 新增 `martell-feed-to-cfg` 转换器。
2. 生成结果时输出三个文件：
   - `martell-result.json`: 原始采集结果
   - `martell-feed.json`: 语义化观测 feed
   - `broium.generated.cfg.json`: 可直接传给 `--brofp-cfg`
3. 给转换器加 `versionPolicy`、`includeRaw`、`webglPolicy` 配置。

### Broium / Chromium 侧

短期不必须改 C++。

短期只需要让 sync 侧输出现有 `cfg.json` 结构，Broium 已经能读取：

- `switches`
- `v8Keys`
- `audio`
- `webgl`
- `args`
- `renderer.inject.js`

中期可考虑新增：

1. `cfg.json` 顶层 `sourceObservations`，用于保留 feed 审计信息。
2. `fingerprints.navigator`、`fingerprints.screen`、`fingerprints.clientHints` 原生解析器。
3. UA/UA-CH 的完整 cfg 驱动能力，避免只靠 `brofp-brand`。
4. WebRTC candidate/IP policy 的更细配置。
5. WebGL structured feed 到 `webgl` cfg 的原生编译或解析。

## cfg compiler 输出示例

示意，不是最终完整 cfg：

```json
{
  "identify": "martell:sha256:...",
  "switches": {
    "brofp-cpu": 28,
    "brofp-mem": 32,
    "brofp-dnt": 0,
    "brofp-tz": "Asia/Shanghai",
    "brofp-screen": "1920,1080,1",
    "brofp-screen-window": true,
    "brofp-brand": "Google Chrome",
    "brofp-brand-version": "138.0.7204.310",
    "brofp-native-mode": true,
    "brofp-font-profile": "windows_zh_cn",
    "brofp-webgl-mode": "native"
  },
  "v8Keys": {
    "enable": true,
    "mode": "hash-seed"
  },
  "webgl": {
    "enable": true,
    "profile": "windows_intel_uhd_770_d3d11",
    "dataURL": {
      "enable": true,
      "mode": "png-text-chunk"
    }
  },
  "audio": {
    "enable": false,
    "mode": "sample-stable-lowbit"
  },
  "args": [
    "--webrtc-ip-handling-policy=disable_non_proxied_udp",
    "--no-first-run",
    "--no-default-browser-check"
  ],
  "sourceObservations": {
    "martell": {
      "schema": "broium.martell-feed.v1",
      "payloadHash": "sha256:...",
      "count": 253,
      "versionPolicy": "native-major"
    }
  }
}
```

## 落地计划

### Phase 1: 文档和手工转换

- 以本文为合同。
- 手工从 `tmp.json` 提取字段，更新 cfg。
- 每次更新后跑 Martell 复测，确认质量门禁通过。

### Phase 2: sync 转换器

新增一个转换器，例如：

```text
sync/tools/martell-feed-to-cfg
```

输入：

```text
--input sync/docs/tmp.json
--template src/chromium/docs/cfg.json
--output sync/docs/broium.generated.cfg.json
--version-policy native-major
```

输出：

- `martell-feed.json`
- `broium.generated.cfg.json`
- `martell-feed-report.md`

### Phase 3: Martell structured output

增强 `martell-cdp-fingerprint.js`：

- 输出 `observed`。
- 输出 `collectorVersion`。
- WebGL 输出结构化参数。
- 输出 `quality.warnings`。

### Phase 4: Broium 原生扩展

当 converter 证明字段稳定后，再把必要字段沉入 Broium C++：

- UA/UA-CH 完整 override。
- WebRTC policy 细化。
- WebGL structured profile ingestion。
- 可选 `sourceObservations` 校验和日志。

## 验收标准

生成 cfg 后，重新运行 Martell 采集，至少满足：

- `error === 0`
- `count === values.length`
- `features` 与 `values` 深度一致
- 无 `__MARTELL_`
- 无 `TrustedScript`
- 无 `https:///`
- 无长异常栈
- Broium major version 与版本策略一致
- navigator/screen/locale/webgl/audio 关键字段与 feed 预期一致

## 当前建议

先不要让 Broium 直接读取 `tmp.json`。最稳的第一步是做 sync 侧 converter：

```text
martell-result.json -> martell-feed.json -> broium.generated.cfg.json
```

这样 C++ 侧保持当前配置结构，风险小；Martell 采集格式未来变化时，只需要更新 converter 的 versioned index map，不会把变化扩散到 Chromium 运行时。
