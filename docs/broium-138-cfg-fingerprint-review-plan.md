# Broium-138 cfg 指纹还原 Review 计划

日期: 2026-06-23  
目标: 让 `sync/docs/martell-cdp-fingerprint.js` 采集到的 Chromium 指纹，经 `sync/docs/build-broium-cfg.js` 生成的 `cfg.json`，能够完整、稳定地驱动 Broium-138 还原真实指纹场景。

## 结论先行

当前链路已经可以生成一个可启动、可部分原生驱动的 `broium.launch-config.v1`:

```text
reference Chromium
  -> martell-cdp-fingerprint.js
  -> result.chromium.config
  -> build-broium-cfg.js
  -> cfg.json
  -> Broium --brofp-cfg
```

但它还不能宣称“完整还原真实指纹”。主要原因不是采集不够，而是 cfg 中已有若干语义只被保存或标记，还没有对应的 Chromium 原生消费点。尤其是 Canvas2D、WebRTC、permissions/security、media devices/plugins/codecs、WebGPU、API surface gating 这些面，还需要继续落 native hook 和回归验证。

最重要的工程原则:

- C++ 侧不能消费 Martell `values[]` 下标。Martell 原始数组只用于采集审计。
- `chromium.config` 是稳定语义合同，`build-broium-cfg.js` 负责把它编译成 Broium runtime cfg。
- 复杂结构不要硬塞命令行。WebGL、Audio、V8 已经证明可以从共享内存里的完整 cfg 直接解析，后续 Canvas2D/WebRTC/Permissions 也应走同类结构化 parser。
- `nativeSurfaces.active` 只能说明该面被纳入运行目标，不等于该面已经完全实现。能力矩阵必须如实区分 `native-supported`、`partial-native`、`observed-only`、`planned`。

## Review 证据锚点

- `sync/docs/build-broium-cfg.js`: 优先使用输入中的 `chromium.config`，只在 raw 输入缺失 Chromium config 时调用 `MartellFingerprint.compile`。
- `sync/docs/martell-cdp-fingerprint.js:1604`: 构建 `nativeSurfaces.active/planned`。
- `sync/docs/martell-cdp-fingerprint.js:1645`: 构建 `capabilities` 矩阵。
- `sync/docs/martell-cdp-fingerprint.js:1722`: 生成 Broium launch cfg。
- `src/chromium/configure.cc:895`: `IConfigure::Parse()` 只把 `identify`、`v8Keys`、`switches`、`args`、`renderer.inject.js` 转成启动参数或注入脚本。
- `src/chromium/webgl_override.cc:1012`: WebGL 直接从完整 cfg 中找 `cfg.webgl`。
- `src/chromium/audio_override.cc:138`: Audio 直接从完整 cfg 中找 `cfg.audio`。
- `src/chromium/v8_override.cc:99`: V8 keys 直接从完整 cfg 中找 `cfg.v8Keys`。
- `src/chromium/webgl_override.cc:1305`: 现有 WebGL dataURL hook 明确保持普通 2D canvas `toDataURL` 字节稳定，因此 `cfg.canvas2d` 当前不是完整 native replay。
- 当前没有发现 `src/chromium/canvas_override.*`，也没有 Broium 专属 Canvas2D parser。

## 当前 cfg 输出画像

基于本地生成样例，当前 cfg 包含:

- schema: `broium.launch-config.v1`
- browser: `138.0.7204.310`
- cfg keys: `identify`、`switches`、`v8Keys`、`nativeSurfaces`、`webgl`、`canvas2d`、`audio`、`capabilities`、`args`
- switches: brand/version/platform/UA-CH、locale/languages/timezone、CPU/mem/storage、screen/window/pointer、fonts、speech voices、NetworkInformation、native mode/surfaces、WebGL mode 等约 30 个开关
- structured cfg: `webgl`、`canvas2d`、`audio`、`v8Keys`
- native surfaces active: `identity,navigator,screen,pointer,locale,runtime,fonts,webgl,canvas,audio,media,storage,network`
- native surfaces planned: `security,apiSurface,webgpu`

这说明生成链路已经覆盖了主要语义，但 runtime 覆盖深度还不均匀。

## 覆盖矩阵

| 指纹面 | cfg 表达 | 当前 C++ 消费 | 状态 | 处理级别 |
| --- | --- | --- | --- | --- |
| Identity / brand / version | `brofp-brand`, `brofp-brand-version` | `fingerprint_override.*`, `version_info` 等 | native-supported | P0 audit |
| UA / UA-CH platform | `brofp-platform*`, `architecture`, `bitness`, `wow64`, `form-factors` | Blink navigator + UA metadata 路径 | native-supported | P0 audit |
| Locale / languages / Accept-Language | `brofp-locale`, `brofp-languages`, `--lang`, disable ReduceAcceptLanguage | Chrome network prefs + Blink navigator language | native-supported | P0 audit |
| Timezone | `brofp-tz` | ICU timezone override | native-supported | P0 audit |
| Screen / window / DPR | `brofp-screen`, `brofp-screen-window`, window args | display + views/widget + Blink screen | native-supported | P0 audit |
| Pointer media queries | `brofp-pointer-profile=desktop` | Blink WebView media query path | native-supported | P0 audit |
| CPU / memory | `brofp-cpu`, `brofp-mem` | `base::SysInfo` + Blink device memory | native-supported | P1 validate |
| Storage quota | `brofp-storage-quota` | quota API reported value | partial-native | P1 |
| NetworkInformation | `brofp-net-*` | Blink netinfo | partial-native | P1 |
| WebRTC | cfg 里有 candidate 观测，但 launch 只支持 generic policy | 没有 Broium WebRTC candidate replay | observed/launch-policy | P0 |
| Fonts | `brofp-font-profile`, `brofp-fonts` | font enumeration/filter/sort + font cache allowlist | partial-native | P1 |
| V8 hash seed | `cfg.v8Keys` | V8 hash seed flag | native-supported | P1 validate |
| WebGL | `cfg.webgl` | getParameter / precision / attrs / extensions / readback perturb | partial-native | P1, P0 audit |
| Canvas2D | `cfg.canvas2d` | 暂无 Broium Canvas2D native module | observed-only | P0 |
| Audio | `cfg.audio` | analyser/getChannelData byte/float perturb | partial-native | P1 |
| Speech voices | `brofp-speech-voices` | `speechSynthesis.getVoices()` override | native-supported | P1 validate |
| Media devices / plugins / MIME / codecs | `config.media.values` 有观测 | 仅 speech voices 明确实现 | planned/partial | P1 |
| Permissions / security | `config.security.values` 有观测 | 未见 Broium permissions hook | planned | P0 |
| API surface gating | `config.apiSurface.values` | 未见 native gate | planned | P1 |
| WebGPU | `config.graphics.webgpu.values` | 未见 Broium WebGPU override | planned | P1 |

## P0 必须收尾项

1. 修正能力矩阵真值
   - `graphics.canvas2d` 在 native module 落地前应标为 `observed-only` 或 `planned-native`，不能写成会误导的 `partial-native`。
   - `security` 在权限/安全面没有 native hook 前应标为 `planned`。
   - 每个 capability 必须带 `runtimeConsumer` 或 `consumerFiles` 字段，能从 cfg 反查 C++ 消费点。

2. 建立 cfg 还原验证闭环
   - 输入: 参考浏览器 Martell result 或 `windows-amd64.json`。
   - 编译: `node sync/docs/build-broium-cfg.js sync/docs/windows-amd64.json <out-cfg>`.
   - 启动: Broium 使用 `<out-cfg>`。
   - 回采: 在 Broium 内再次执行 `martell-cdp-fingerprint.js`。
   - 输出: `reference vs broium` diff，按 surface 分成 `exact`、`tolerance`、`known-gap`、`regression`。
   - 验收: 没有未知 P0 regression，P0 known-gap 必须对应本文件中的待办。

3. Canvas2D native replay
   - 新增 `src/chromium/canvas_override.{h,cc}`，解析 `cfg.canvas2d`。
   - Hook `HTMLCanvasElement::toDataURL`、`HTMLCanvasElement::toBlob`、`BaseRenderingContext2D::getImageData`、`BaseRenderingContext2D::measureText`。
   - 覆盖 `OffscreenCanvas` / `offscreencanvas2d`。
   - 先实现 identify-seeded/stable-profile 扰动，再用 Martell `dataUrlHash`、`imageDataHash`、`textMetrics` 做回采验收。
   - 不破坏 WebGL dataURL scoped readback 的现有行为。

4. WebRTC candidate/profile
   - `config.network.values.webrtc` 不能只保留 candidate count 或 generic `--webrtc-ip-handling-policy`。
   - 新增 WebRTC cfg 结构: candidate mode、mDNS/local/private IP policy、UDP/TCP policy、interface ordering、candidate redaction/rewrite。
   - Hook Blink peerconnection 或 content/webrtc candidate 输出路径，保证 `RTCPeerConnection` 观测结果和 cfg 一致。

5. Permissions / security
   - 从 Martell permissions profile 生成 `cfg.permissions` 或 `cfg.security.permissions`。
   - Hook `navigator.permissions.query()` 的常见 descriptor: notifications、geolocation、camera、microphone、clipboard-read/write、midi、persistent-storage 等。
   - 状态要兼容 Chromium 默认行为，避免 prompt、denied、granted 与设备/媒体能力互相矛盾。

6. UA / UA-CH / headers / CDP 一致性 audit
   - 验证 `navigator.userAgent`、`appVersion`、`navigator.userAgentData.brands`、`fullVersionList`、`getHighEntropyValues()`。
   - 验证 HTTP `User-Agent`、`Sec-CH-UA*`、`Accept-Language`。
   - 验证 `Browser.getVersion`、`chrome://version`、version_info、GREASE brand order、full version patch。
   - 目标是 JS、HTTP、CDP、内部 version source 互不打架。

7. Screen / viewport / window coherence audit
   - 验证 `screen.*`、`window.outer/inner*`、`visualViewport`、documentElement/client size、DPR、workArea、media queries。
   - 检查 `--window-size/position` 与 `brofp-screen-window` 的优先级，防止启动后 resize 破坏指纹。

## P1 高优先级

- Media: `navigator.mediaDevices.enumerateDevices()`、plugins、mimeTypes、MediaCapabilities decodingInfo/encodingInfo、codec inventory。
- WebGPU: `navigator.gpu` 是否存在、adapter info、features、limits、fallback/software 状态。
- Audio: 当前是稳定扰动，不是 exact offline audio hash replay。需要以 Martell offline hash 作为验收。
- Fonts: 现在有 allowlist/sort/filter，但还要验证 CSS fallback、`document.fonts.check()`、canvas text metrics、queryLocalFonts 权限路径。
- Storage: quota 之外补齐 persisted、estimate usage、IndexedDB/Cache/ServiceWorker/storage bucket 相关可见面。
- Intl: `Intl.DateTimeFormat().resolvedOptions()` 之外，补 `supportedValuesOf`、calendar、numberingSystem、collation、timezone offset coherence。
- Network: NetInfo 已覆盖 reported values，但连接类型、saveData、rtt/downlink rounding 需要和 Chromium 默认舍入规则一致。

## P2 长尾

- Battery、Bluetooth、USB、HID、Serial、Gamepad、WebAuthn、Credential Management。
- Performance memory/timing、scheduler、hardware acceleration 状态、about:gpu 可见信息。
- Worker/ServiceWorker/Worklet/iframe isolated world 中的同源指纹一致性。
- Automation/CDP/headless 侧信号的专项 diff，包括 `navigator.webdriver`、DevTools protocol 可见差异、remote-debugging side effects。

## 实施顺序

### Phase A: 锁 schema 和 truth table

- 在 `martell-cdp-fingerprint.js` 中让 capability status 更精确。
- 给每个 capability 增加 runtime 消费点说明。
- `build-broium-cfg.js` 增加 deterministic smoke 输出: cfg key、switch key、structured config key、known gaps。
- 不改 C++，先让 cfg 自描述可靠。

### Phase B: 建 runtime diff harness

- 新增一个 sync 侧脚本，例如 `verify-broium-cfg-fingerprint.js`。
- 输入 reference JSON 和 Broium 回采 JSON。
- 输出 surface diff report。
- 第一版先比较: identity、UA-CH、locale、screen、CPU/mem、storage quota、netinfo、fonts summary、WebGL summary、Canvas2D hash、Audio hash、permissions summary、media summary。

### Phase C: P0 native modules

- Canvas2D: 新增 `canvas_override.{h,cc}`，接入 Blink canvas readback/text metric 点。
- WebRTC: 新增 `webrtc_override.{h,cc}`，接入 candidate 生成/输出点。
- Permissions: 新增 `permission_override.{h,cc}` 或 `security_override.{h,cc}`，接入 permission service / Blink permissions module。
- 每个模块都要支持从 `cfg.<surface>` 结构化读取，必要时兼容旧 `fingerprints.<surface>`。

### Phase D: P1 native modules

- Media override: media devices、plugins、mimeTypes、codecs。
- WebGPU override: adapter info/features/limits/status。
- Storage override: quota 之外的 storage API coherence。
- Intl/locale deep audit: ICU、Blink Intl、Accept-Language、timezone offset。

### Phase E: 收尾验收

- 同一份 reference profile 连续生成 cfg 多次，输出字节稳定。
- Broium 启动后连续回采多轮，P0/P1 指纹面稳定。
- `cfg.capabilities` 中没有 “标记已支持但 runtime 不消费” 的假阳性。
- 文档、脚本、C++ hook 三者互相能追踪到同一个 surface 名。

## 直接文件清单

生成/采集:

- `sync/docs/martell-cdp-fingerprint.js`
- `sync/docs/build-broium-cfg.js`
- `sync/docs/stress-martell-cdp-fingerprint.js`
- 待新增: `sync/docs/verify-broium-cfg-fingerprint.js`

Broium cfg 入口:

- `src/chromium/chromium.cc`
- `src/chromium/configure.cc`
- `src/chromium/configure.h`

已有 native 面:

- `src/chromium/fingerprint_override.{h,cc}`
- `src/chromium/resource_override.{h,cc}`
- `src/chromium/screen_override.{h,cc}`
- `src/chromium/font_override.{h,cc}`
- `src/chromium/v8_override.{h,cc}`
- `src/chromium/webgl_override.{h,cc}`
- `src/chromium/audio_override.{h,cc}`

待新增或重点改造:

- `src/chromium/canvas_override.{h,cc}`
- `src/chromium/webrtc_override.{h,cc}`
- `src/chromium/permission_override.{h,cc}` 或 `security_override.{h,cc}`
- `src/chromium/media_override.{h,cc}`
- `src/chromium/webgpu_override.{h,cc}`
- `src/chromium/storage_override.{h,cc}`
- `src/chromium/api_surface_override.{h,cc}`

Blink/Chrome hook 候选入口:

- Canvas: `third_party/blink/renderer/core/html/canvas/html_canvas_element.cc`
- Canvas2D: `third_party/blink/renderer/modules/canvas/canvas2d/base_rendering_context_2d.cc`
- OffscreenCanvas2D: `third_party/blink/renderer/modules/canvas/offscreencanvas2d/`
- WebRTC: `third_party/blink/renderer/modules/peerconnection/`、`content/browser/webrtc/`
- Permissions: `third_party/blink/renderer/modules/permissions/`、content permission service 路径
- WebGPU: `third_party/blink/renderer/modules/webgpu/`
- Media devices/capabilities: `third_party/blink/renderer/modules/mediastream/`、`third_party/blink/renderer/modules/media_capabilities/`

## 必跑命令

```bash
node -c sync/docs/martell-cdp-fingerprint.js
node -c sync/docs/build-broium-cfg.js
node sync/docs/build-broium-cfg.js sync/docs/windows-amd64.json /private/tmp/broium-review-cfg.json
node -e 'const j=require("/private/tmp/broium-review-cfg.json"); console.log(j.schema, Object.keys(j.cfg||{}))'
```

C++ 改动后按实际 GN target 跑最小增量编译和相关 Blink/browser tests。每落一个 native module，都要补一个 cfg parser 单测或 browser/renderer 行为测试。

## Done Definition

可以宣布“cfg.json 能完整驱动 Broium-138”之前，必须满足:

- `cfg.json` 不是简单 launch args，而是每个指纹面都有明确 cfg source、runtime consumer、capability status。
- Martell reference 与 Broium 回采 diff 中，P0 没有未知差异。
- Canvas2D、WebRTC、Permissions 至少完成 P0 native path。
- UA/UA-CH/headers/CDP、screen/window/viewport、locale/timezone 通过一致性 audit。
- 所有 remaining gap 都在 `capabilities` 和本计划中如实标注，不能伪装成已实现。
