# Broium-138 总体架构对齐执行计划

日期: 2026-06-23

本文档是给后续执行者使用的“一次开工路线图”。目标不是再做一轮泛泛 review，而是把 Broium-138 的 cfg 生成链路、Chromium 原生 runtime、Martell 回采验证和仓库边界全部对齐，最终让同一份参考指纹能够被 Broium-138 稳定、可审计、可回归地还原。

## 当前执行进度

截至 2026-06-23，本计划已落地以下增量:

- Phase 0 基线验证已完成，`build-broium-cfg.js` 输出 deterministic summary，`verify-broium-cfg-fingerprint.js` self-diff 为 0 regression。
- Phase 1/2 diff harness 已扩展到 UA/UA-CH/navigator、screen/window/viewport/DPR/media query 等更细字段，且修正了 media query 字段从不存在的 `pointer/anyPointer` 到 Martell 实际的 `pointerFine/anyPointerFine`。
- Phase 2 runtime 已新增 `cfg.screen` 结构化 parser，`screen_override` 优先消费 `cfg.screen`，并保留 `brofp-screen` fallback；screen rect、work-area/`availHeight`、`colorDepth`、`window.inner*`、`documentElement.client/scroll*`、`visualViewport.width/height` 已由 native path 消费。
- Phase 3 已新增 `src/chromium/canvas_override.{h,cc}`，`cfg.canvas2d` 现在有结构化 parser，并接入 Canvas2D `toDataURL`、`toBlob`/OffscreenCanvas `convertToBlob` 与 `getImageData` native shaping。精确 observed hash replay、`measureText` 仍是后续缺口。
- Phase 4 已新增 `src/chromium/webrtc_override.{h,cc}`，`cfg.network.webrtc` 现在有结构化 parser，并在 `RTCPeerConnectionHandler::OnIceCandidate` 出口提供 native ICE candidate policy gate。它能抑制非 reference 的本地/private host candidate 泄漏；精确 candidate count/order/profile replay 仍是后续缺口。
- Phase 5 已新增 `src/chromium/permission_override.{h,cc}`，`cfg.permissions` 现在有结构化 parser，并在 Blink `Permissions` query/request/revoke 完成路径按 common descriptor 覆写状态。浏览器进程 permission prompt、media-device 权限联动、WebAuthn/security broader surface 仍是后续缺口。
- Phase 6 已开始 P1 收敛: `cfg.storage` 现在有结构化 parser，`StorageManager::estimate()` 有直接 native fast path 并原生消费 quota/usage，`StorageManager::persisted()` 原生消费 persisted；legacy `DeprecatedStorageQuota.queryUsageAndQuota()` 原生消费 quota/usage。IndexedDB/Cache/ServiceWorker/storage bucket presence 仍是后续缺口。
- Phase 6 已新增 `src/chromium/media_override.{h,cc}`，`cfg.media.capabilities.decoding[]` 现在有结构化 parser，并在 Blink `MediaCapabilities.decodingInfo()` 中对 Martell 固定 file/audio/video probe replay `supported/smooth/powerEfficient`。plugins/mimeTypes、mediaDevices、任意 codec inventory、encodingInfo 仍是后续缺口。
- Phase 6 diff harness 已显式覆盖 `graphics.webgpu` 与 `apiSurface` summary；两者仍保持 `planned`，但真实回采差异会被 report 分类为 documented known-gap，不再是沉默盲区。
- Canvas2D、WebRTC、Permissions capability 均已从 observed/planned 状态提升为真实 `partial-native`；剩余 P0 差异必须通过 diff harness 标为 exact、tolerance 或 documented known-gap。
- 已新增 `recapture-broium-fingerprint.js`，可自动生成 cfg、启动 `src/out/debug/chrome.exe --brofp-cfg`、执行 staged profile-lite 回采，并调用 diff harness 输出真实 Broium 回采 report。`--full-martell` 可作为诊断模式，默认门禁使用 profile-lite，避免 full collector 触发非目标平台/IO 噪声。

最近验证:

```bash
node -c sync/docs/martell-cdp-fingerprint.js
node -c sync/docs/build-broium-cfg.js
node -c sync/docs/verify-broium-cfg-fingerprint.js
node -c sync/docs/audit-broium-capabilities.js
node sync/docs/build-broium-cfg.js sync/docs/windows-amd64.json .tmp/broium-review-cfg.json
node sync/docs/audit-broium-capabilities.js .tmp/broium-review-cfg.json
node sync/docs/verify-broium-cfg-fingerprint.js sync/docs/windows-amd64.json sync/docs/windows-amd64.json .tmp/broium-self-diff.json
node sync/docs/recapture-broium-fingerprint.js sync/docs/windows-amd64.json .tmp/broium-real-recapture-lite
ninja -C src/out/debug base ui/display:display -j 4
ninja -C src/out/debug obj/third_party/blink/renderer/modules/quota/quota/storage_manager.obj -j 4
ninja -C src/out/debug obj/base/base/screen_override.obj -j 4
ninja -C src/out/debug obj/third_party/blink/renderer/core/core/html_canvas_element.obj obj/third_party/blink/renderer/modules/canvas/canvas/base_rendering_context_2d.obj -j 4
ninja -C src/out/debug obj/third_party/blink/renderer/modules/permissions/permissions/permissions.obj obj/third_party/blink/renderer/modules/peerconnection/peerconnection/rtc_peer_connection_handler.obj -j 4
ninja -C src/out/debug blink_core.dll blink_modules.dll -j 4
```

最近 sample cfg summary:

```text
summary.cfgKeys=args,audio,canvas2d,capabilities,identify,media,nativeSurfaces,network,permissions,screen,storage,switches,v8Keys,webgl
summary.structuredKeys=audio,canvas2d,media,network,permissions,screen,storage,v8Keys,webgl
summary.nativeActive=audio,canvas,fonts,identity,locale,media,navigator,network,permissions,pointer,runtime,screen,security,storage,webgl
summary.nativePlanned=apiSurface,webgpu
summary.knownGaps=apiSurface:planned,graphics.webgpu:planned
schema=broium.fingerprint-diff.v1
summary.total=141
summary.exact=141
summary.tolerance=0
summary.knownGap=0
summary.regression=0
```

最近 Broium real recapture summary:

```text
schema=broium.fingerprint-diff.v1
summary.total=141
summary.exact=126
summary.tolerance=0
summary.knownGap=15
summary.regression=0
```

当前 15 个 documented known-gap 覆盖:

- `fonts.summary`: font profile/allow-list 已驱动，但 exact family availability、fallback、metrics hash 仍取决于宿主字体环境。
- `audio.offline.hash`: OfflineAudioContext exact hash replay 尚未实现。
- `graphics.canvas2d`: native shaping 已覆盖 `toDataURL`、`toBlob`/OffscreenCanvas `convertToBlob`、`getImageData`；observed bitmap/hash exact replay 仍未完整。
- `graphics.webgl.observed.canvasHashes`: WebGL/readback/dataURL exact hash replay 仍未完整。
- `graphics.webgpu.summary`: WebGPU adapter info、features、limits、fallback state 仍无 native replay。
- `media.plugins.summary`: plugins/mimeTypes exact enumeration/hash 仍无完整 native replay。
- `network.connection.type`: `downlinkMax` 打开后 Chromium 会暴露当前 connection-type enum；reference 中空 type 表示采集时没有稳定暴露值，exact replay 需要后续 NetInfo type policy。
- `network.webrtc.policy/candidateSummary`: native policy gate 已有，exact candidate count/order/profile replay 仍未完整。
- `screen.normalization.*`: source capture normalization metadata 是审计信息，Broium 回采不需要复现原始 remote/docked reason。

## 最终目标

最终效果必须同时满足:

- `sync/docs/martell-cdp-fingerprint.js` 采集出的 `chromium.config` 是唯一稳定语义合同。
- `sync/docs/build-broium-cfg.js` 只负责把 `chromium.config` 编译成 `broium.launch-config.v1`，不把 Martell raw `values[]` 下标泄漏给 C++。
- `src/chromium` 只消费 Broium cfg/switch/structured config，不直接理解 Martell 原始采集格式。
- 新增 native 能力优先走结构化 cfg parser，例如 `cfg.canvas2d`、`cfg.network.webrtc`、`cfg.permissions`，不要把复杂对象硬塞进命令行。
- `cfg.capabilities` 必须真实表达 runtime 覆盖状态，不能把 observed-only 标成 partial/native。
- Martell reference 与 Broium 回采 diff 必须成为每个阶段的验收门禁。
- 最终 P0 指纹面没有未知 regression；所有剩余差异都有 capability/documented known-gap 对应。

## 仓库和职责边界

当前工作区是 gclient 风格:

- 顶层 `sync/`: 同步脚本、Martell 采集、cfg compiler、验证 harness、设计文档。
- `src/`: Chromium/Broium 源码仓库，包含 `src/chromium/*_override.*` 原生模块。
- `src/chromium/docs/`: Broium runtime 示例 cfg 和使用说明。

职责划分必须保持清楚:

- `sync/docs/*.js`: 可以读取 Martell result、生成 cfg、输出 diff report。
- `src/chromium/configure.*`: 负责 `--brofp-cfg`、shared-memory cfg、switch/args 注入和少量启动期桥接。
- `src/chromium/*_override.*`: 每个 native surface 自己解析完整 cfg 或 switch，并在 Chromium/Blink/content 入口处被调用。
- `src/chromium/docs/cfg.json`: 示例运行配置。除非任务明确要求更新样例，不要把临时生成结果写进它。

不要做的事:

- 不要让 C++ 读取 Martell `values[214]`、`values[247]` 这类下标。
- 不要把 Canvas/WebRTC/Permissions 这种复杂结构压成一个超长 switch。
- 不要用 JS 注入假装完成 native surface，除非文档明确标为临时兜底。
- 不要在 source repo 里提交 generated/toolchain/platform payload。

## 当前架构事实

已存在且应复用的 runtime 能力:

- `src/chromium/configure.cc`: 解析 `identify`、`v8Keys`、`switches`、`args`、`renderer.inject.js`，并把完整 cfg 保留在共享内存里。
- `src/chromium/v8_override.cc`: 直接从完整 cfg 读 `cfg.v8Keys`。
- `src/chromium/webgl_override.cc`: 直接从完整 cfg 读 `cfg.webgl`。
- `src/chromium/audio_override.cc`: 直接从完整 cfg 读 `cfg.audio`。
- `src/chromium/fingerprint_override.*`: identity、navigator、locale、native surface gating、speech voices 等 switch 消费点。
- `src/chromium/resource_override.*`: CPU、memory、storage quota、NetworkInformation switch 消费点。
- `src/chromium/screen_override.*`: screen/window/DPR switch 消费点。
- `src/chromium/font_override.*`: font profile/allowlist switch 消费点。

当前最大缺口:

- Canvas2D 已有 native `toDataURL`/`toBlob`/OffscreenCanvas `convertToBlob`/`getImageData` shaping，但精确 observed hash replay、`measureText` 仍未完整覆盖。
- WebRTC 已有 native candidate policy gate，但仍不是完整 candidate/profile replay；candidate count、ordering、interface ordering、rewrite 仍需继续收敛。
- Permissions/security 已有 `navigator.permissions` common descriptor status shaping，但 browser permission manager、permission prompt、media-device 权限联动、WebAuthn/security broader surface 仍未完整覆盖。
- UA/UA-CH/header/CDP、screen/window/viewport/DPR 已进入 diff harness，并已通过 profile-lite Broium real recapture；后续只需要对 full Martell collector 和多窗口/resize 场景继续扩展覆盖。
- Storage quota/usage/persisted 已走 `cfg.storage` 结构化 parser；IndexedDB/Cache/ServiceWorker/storage bucket presence 仍未完整覆盖。
- MediaCapabilities fixed decodingInfo probes 已走 `cfg.media` 结构化 parser；media devices/plugins/mimeTypes、任意 codec inventory、encodingInfo 仍未完整覆盖。
- WebGPU、API surface gating 仍是 P1/P2。

## 目标数据流

必须维持这条主链路:

```text
reference Chromium/Chrome/Edge
  -> martell-cdp-fingerprint.js
  -> result.chromium.config
  -> build-broium-cfg.js
  -> broium.launch-config.v1
  -> Broium --brofp-cfg
  -> Broium runtime native surfaces
  -> Martell recapture
  -> verify-broium-cfg-fingerprint.js diff report
```

其中:

- `result.profile` 可以作为审计/训练材料。
- `result.chromium.config` 是 cfg compiler 的输入合同。
- `broium.launch-config.v1.cfg` 是 runtime 合同。
- `cfg.capabilities` 是人和工具都能读的 truth table。
- diff report 是每次 native 改动后的验收证据。

## 总体实施顺序

执行时严格按顺序推进。每个阶段都要能独立验证，不能一口气改大堆 C++ 后才看结果。

### Phase 0: 冻结基线和证据

目标: 确认当前链路能生成 cfg、能回采、能 diff，并把真实状态写清楚。

动作:

1. 跑 JS 语法检查:

```bash
node -c sync/docs/martell-cdp-fingerprint.js
node -c sync/docs/build-broium-cfg.js
node -c sync/docs/verify-broium-cfg-fingerprint.js
```

2. 用样例生成 cfg 到临时目录:

```bash
node sync/docs/build-broium-cfg.js sync/docs/windows-amd64.json .tmp/broium-review-cfg.json
```

3. self-diff 验证 harness 自身:

```bash
node sync/docs/verify-broium-cfg-fingerprint.js sync/docs/windows-amd64.json sync/docs/windows-amd64.json .tmp/broium-self-diff.json
```

4. 确认 `summary.knownGaps` 只列出没有 native consumer 的 surface；已进入 partial-native 的 Canvas2D、WebRTC、security/permissions 等子缺口必须写在 capability notes 和本文档中。

验收:

- `build-broium-cfg.js` 输出 deterministic summary。
- `verify-broium-cfg-fingerprint.js` self-diff 为 0 regression。
- `cfg.capabilities` 每个条目都有 `runtimeConsumer` 和 `consumerFiles` 或 `plannedConsumerFiles`。

### Phase 1: UA/UA-CH/header/CDP 一致性 audit

目标: 先把最容易全局打架的 identity 体系审干净，避免后续 native surface 建在错误版本身份上。

检查面:

- JS:
  - `navigator.userAgent`
  - `navigator.appVersion`
  - `navigator.vendor`
  - `navigator.platform`
  - `navigator.userAgentData.brands`
  - `navigator.userAgentData.fullVersionList`
  - `navigator.userAgentData.getHighEntropyValues()`
- HTTP:
  - `User-Agent`
  - `Sec-CH-UA`
  - `Sec-CH-UA-Full-Version-List`
  - `Sec-CH-UA-Platform`
  - `Sec-CH-UA-Platform-Version`
  - `Accept-Language`
- CDP/internal:
  - `Browser.getVersion`
  - `chrome://version`
  - `version_info`
  - GREASE brand/order
  - full version patch

改动原则:

- 如果只是 cfg compiler 版本适配问题，改 `build-broium-cfg.js`。
- 如果 runtime 里 JS/HTTP/CDP 不一致，改 `src/chromium/fingerprint_override.*` 或对应 Chromium version/UA metadata 接入点。
- 不要只修 JS 而让 HTTP/CDP 暴露另一个版本。

验收:

- reference vs Broium diff 中 identity surface 无未知 regression。
- `cfg.capabilities.identity` 和 `navigator` 的 status 不夸大。
- `native-major` 与 `mimic-source` 策略边界清楚；默认优先 Broium runtime major。

### Phase 2: screen/window/viewport/DPR/media query 一致性 audit

目标: 保证 `brofp-screen` 和 `brofp-screen-window` 驱动后的可见窗口体系自洽。

检查面:

- `screen.width/height/availWidth/availHeight/colorDepth/pixelDepth`
- `window.outerWidth/outerHeight`
- `window.innerWidth/innerHeight`
- `window.screenX/screenY`
- `document.documentElement.clientWidth/clientHeight`
- `visualViewport.width/height/scale`
- `devicePixelRatio`
- pointer/hover/any-pointer/any-hover media query
- 启动后 resize、maximized、window-position 的优先级

改动入口:

- `src/chromium/screen_override.*`
- views/widget/display 相关接入点
- Blink media query/WebView 输入设备路径
- `build-broium-cfg.js` 的 window args 生成逻辑

验收:

- 常规 desktop reference 下，screen surface diff 只有允许的像素级 tolerance。
- 启动后没有被 DevTools、remote panel、默认窗口策略破坏。
- `brofp-pointer-profile=desktop` 与 observed/raw media query 关系在 config 中可追踪。

### Phase 3: Canvas2D native replay

目标: 让 `cfg.canvas2d` 从 observed-only 变成至少 partial-native，并能用 Martell hash/text metrics 验证。

新增文件:

- `src/chromium/canvas_override.h`
- `src/chromium/canvas_override.cc`

cfg 结构:

```json
{
  "canvas2d": {
    "enable": true,
    "mode": "stable-profile",
    "seed": "identify",
    "observed": {
      "dataUrlHash": "",
      "imageDataHash": "",
      "dataUrlLength": 0,
      "textMetrics": {}
    }
  }
}
```

必须 hook:

- `third_party/blink/renderer/core/html/canvas/html_canvas_element.cc`
  - `HTMLCanvasElement::toDataURL`
  - `HTMLCanvasElement::toBlob`
- `third_party/blink/renderer/modules/canvas/canvas2d/base_rendering_context_2d.cc`
  - `getImageData`
  - `measureText`
- OffscreenCanvas/offscreencanvas2d 路径需要纳入同一个 helper。

实现策略:

- 第一版只做 identify-seeded/stable-profile 扰动，避免 per-call random。
- readback 扰动和 text metrics 扰动必须同 seed、同 profile。
- 不破坏 WebGL scoped dataURL/readPixels 现有行为。
- parser 要支持 `cfg.canvas2d`，必要时兼容 legacy `fingerprints.canvas2d`。

验收:

- `graphics.canvas2d` capability 从 `observed-only` 更新为 `partial-native`，并指向真实 consumer files。
- diff harness 对 `dataUrlHash`、`imageDataHash`、`textMetrics` 输出 known-gap 或 exact/partial 结果，不能沉默。
- C++ 最小增量编译通过。

### Phase 4: WebRTC candidate/profile replay

目标: 从 generic launch policy 升级为 candidate/profile 级还原。

新增文件:

- `src/chromium/webrtc_override.h`
- `src/chromium/webrtc_override.cc`

cfg 结构建议:

```json
{
  "network": {
    "webrtc": {
      "enable": true,
      "mode": "profile",
      "candidatePolicy": "browser-default-mdns-host-candidates",
      "ipHandlingPolicy": "disable_non_proxied_udp",
      "mdns": true,
      "localIpPolicy": "redact",
      "udpPolicy": "match-reference",
      "tcpPolicy": "match-reference",
      "interfaceOrdering": [],
      "candidateRewrite": []
    }
  }
}
```

候选 hook:

- `third_party/blink/renderer/modules/peerconnection/`
- `content/browser/webrtc/`
- ICE candidate 输出/过滤/序列化路径

实现策略:

- 先保证 candidate count、type、protocol、mDNS/local/private IP policy 与 reference 一致。
- 再做 interface ordering 和 candidate rewrite。
- launch arg `--webrtc-ip-handling-policy` 只能作为 fallback，不是完整实现。

验收:

- `network.webrtc` capability 从 `observed/launch-policy` 更新为 `partial-native`。
- diff harness 对 `network.webrtc.policy` 和 `candidateSummary` 必须保持显式字段输出；在 exact candidate count/order/profile replay 落地前，这两个字段仍分类为 documented known-gap，不能沉默也不能误报为已完整支持。

### Phase 5: Permissions/security native hook

目标: 从 Martell security observation 生成 runtime cfg，并让 `navigator.permissions.query()` 常见 descriptor 可控。

新增文件:

- `src/chromium/permission_override.h`
- `src/chromium/permission_override.cc`

cfg 结构建议:

```json
{
  "permissions": {
    "enable": true,
    "query": {
      "notifications": "prompt",
      "geolocation": "prompt",
      "camera": "prompt",
      "microphone": "prompt",
      "clipboard-read": "prompt",
      "clipboard-write": "granted",
      "midi": "prompt",
      "persistent-storage": "denied"
    }
  }
}
```

候选 hook:

- `third_party/blink/renderer/modules/permissions/`
- content permission service 路径
- browser permission manager 相关路径

实现策略:

- 状态必须兼容 Chromium 默认行为。
- camera/microphone/geolocation 不能和 media devices/profile 互相矛盾。
- clipboard/midi/persistent-storage 等 descriptor 要优先覆盖 Martell 能采到的常见面。

验收:

- `security` 和 `security.permissions` capability 从 `planned` 更新为真实 partial/native 状态。
- diff harness 对 permission summary 可区分 exact、known-gap、regression。

### Phase 6: Media/plugins/codecs/WebGPU/API surface P1 收敛

目标: 补齐 P1 面，避免只有 P0 看起来正确但综合检测仍暴露明显缺口。

Media:

- `navigator.mediaDevices.enumerateDevices()`
- plugins/mimeTypes
- MediaCapabilities decodingInfo/encodingInfo
- codec inventory

WebGPU:

- `navigator.gpu` 存在性
- adapter info
- features
- limits
- fallback/software 状态

API surface gating:

- window/global constructors
- descriptors
- Function.prototype.toString 一致性
- worker/iframe/worklet 继承一致性

原则:

- 能结构化 cfg parser 的，一律不要塞 switch。
- 能用 native hook 的，不用页面 JS patch。
- 每个新增 surface 都要进 capability truth table 和 diff harness。

## 验证闭环

每个阶段最少跑:

```bash
node -c sync/docs/martell-cdp-fingerprint.js
node -c sync/docs/build-broium-cfg.js
node -c sync/docs/verify-broium-cfg-fingerprint.js
node -c sync/docs/audit-broium-capabilities.js
node sync/docs/build-broium-cfg.js sync/docs/windows-amd64.json .tmp/broium-review-cfg.json
node sync/docs/audit-broium-capabilities.js .tmp/broium-review-cfg.json
node sync/docs/verify-broium-cfg-fingerprint.js sync/docs/windows-amd64.json sync/docs/windows-amd64.json .tmp/broium-self-diff.json
```

C++ 改动后再跑:

```bash
cmake --build <actual-build-dir-or-wrapper>
```

如果本地实际构建体系是 GN/Ninja，就按当前 checkout 的最小 target 跑，例如 browser/renderer 相关 target。不要为了验证单个 hook 触发全量无意义构建。

真实回采流程:

1. 用 reference JSON 生成 cfg。
2. 用 Broium `--brofp-cfg=<cfg>` 启动。
3. 在 Broium 中执行 Martell 采集。
4. 保存 Broium 回采 JSON。
5. 运行:

```bash
node sync/docs/verify-broium-cfg-fingerprint.js <reference.json> <broium-recapture.json> <report.json>
```

验收规则:

- `summary.regression === 0` 才能继续下一阶段。
- P0 surface 的 known-gap 必须在本计划或 review plan 中有对应待办。
- 对于确认为 expected 的差异，要把 diff harness 分类更新成 known-gap 或 tolerance，而不是让它长期显示 regression。

## capability truth table 规则

每个 capability 必须包含:

- `surface`
- `status`
- `source`
- `runtimeConsumer`
- `consumerFiles`
- 如未实现，还要有 `plannedConsumerFiles`
- 必要时有 `notes`

状态含义:

- `native-supported`: 已有明确 runtime consumer，且主要语义被原生覆盖。
- `partial-native`: 已有 runtime consumer，但仍有明确未覆盖子面。
- `observed-only`: cfg 保存了观测，但 runtime 不消费。
- `observed/launch-policy`: 有观测，runtime 只用 generic launch policy。
- `planned`: 已纳入目标，但当前没有 runtime consumer。
- `not-observed`: reference 中没有对应观测。
- `disabled`: cfg 或 native surface gating 明确关闭。

禁止:

- 没有 C++ consumer 却标 `native-supported`。
- 只有 switch fallback 却标完整 WebRTC/canvas/media 支持。
- 把 `nativeSurfaces.active` 当成实现完成证据。

## 文件清单

sync 侧:

- `sync/docs/martell-cdp-fingerprint.js`
- `sync/docs/build-broium-cfg.js`
- `sync/docs/verify-broium-cfg-fingerprint.js`
- `sync/docs/stress-martell-cdp-fingerprint.js`
- `sync/docs/broium-138-cfg-fingerprint-review-plan.md`
- `sync/docs/broium-138-architecture-alignment-plan.md`

runtime cfg 入口:

- `src/chromium/chromium.cc`
- `src/chromium/chromium.h`
- `src/chromium/configure.cc`
- `src/chromium/configure.h`

已有 native modules:

- `src/chromium/fingerprint_override.{h,cc}`
- `src/chromium/resource_override.{h,cc}`
- `src/chromium/screen_override.{h,cc}`
- `src/chromium/font_override.{h,cc}`
- `src/chromium/v8_override.{h,cc}`
- `src/chromium/webgl_override.{h,cc}`
- `src/chromium/audio_override.{h,cc}`
- `src/chromium/ui_override.{h,cc}`
- `src/chromium/canvas_override.{h,cc}`
- `src/chromium/webrtc_override.{h,cc}`
- `src/chromium/permission_override.{h,cc}`
- `src/chromium/media_override.{h,cc}`

待新增 native modules:

- `src/chromium/webgpu_override.{h,cc}`
- `src/chromium/api_surface_override.{h,cc}`

## 一次性执行检查表

开始前:

- 读本文档。
- 读 `sync/docs/broium-138-cfg-fingerprint-review-plan.md`。
- 读 `src/chromium/docs/use.md`。
- 用 `rg` 查目标 surface 是否已有 consumer。
- 确认当前 git 工作区已有用户改动，不要 revert 不相关文件。

每做一个 surface:

- 先扩 cfg schema/编译器。
- 再扩 capability truth table。
- 再扩 diff harness。
- 最后接 native parser/hook。
- 编译和回采验证都过后，再把 status 从 planned/observed-only 提升。

收尾前:

- `node -c` 三个 sync 脚本通过。
- sample cfg generation 通过。
- capability truth table audit 通过。
- self-diff 通过。
- real recapture diff 无未知 P0 regression。
- `git diff --check` 通过；如果 Git dubious ownership 阻止检查，使用一次性 `git -c safe.directory=<repo>`，不要改全局配置。
- 临时输出只放 `.tmp`，不要污染 `src/chromium/docs/cfg.json`。

## Done Definition

只有同时满足以下条件，才能宣布 Broium-138 与总体架构对齐:

- Martell raw、`chromium.config`、Broium cfg、C++ runtime、diff harness 的职责边界清楚。
- `cfg.capabilities` 没有假阳性。
- Canvas2D、WebRTC、Permissions 三个 P0 native path 至少达到 partial-native，并被回采 diff 覆盖。
- UA/UA-CH/header/CDP、screen/window/viewport/DPR 两个一致性 audit 通过。
- WebGL、Audio、V8 仍走结构化 cfg parser，不被回退成命令行大对象。
- P0 diff report 中没有 unknown regression。
- 剩余 P1/P2 gap 都在 capability notes 和文档中可追踪。
