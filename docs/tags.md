Findings
P1 [tmp.json (line 4680)](e:/work/chromium/broium-138/sync/docs/tmp.json:4680)
chromium.config.screen.values.window.outerWidth=1920 但 innerWidth=939，同时 outerHeight=1040 / innerHeight=953。这像是采集时 DevTools/docked panel 或非自然窗口状态被写进 profile。后续按这个模拟会得到很怪的 screen/window 组合。建议采集用于“基础身份”的 profile 时关闭 DevTools，并让窗口状态明确：最大化或固定窗口尺寸。
P1 [tmp.json (line 4737)](e:/work/chromium/broium-138/sync/docs/tmp.json:4737)
Windows 桌面、maxTouchPoints=0，但 media query 里 hover=false / pointerFine=false / anyPointerFine=false。这更像无指针/headless/异常输入环境，不像普通桌面 Chrome。这个字段很高信号，建议重新采集或在 chromium 节点里标记为 capture-environment-sensitive，避免直接当成稳定指纹。
P2 [tmp.json (line 4949)](e:/work/chromium/broium-138/sync/docs/tmp.json:4949)
graphics.webgl.values.observed.extensionCount=39，但 contexts.webgl2.supportedExtensions 实际只有 32 个，从 [supportedExtensions (line 5391)](e:/work/chromium/broium-138/sync/docs/tmp.json:5391) 开始数不一致。这里需要统一口径：要么 extensionCount 来自同一个 context 列表，要么改名为 raw summary count，避免实现层不知道该信哪个。
P2 [tmp.json (line 6165)](e:/work/chromium/broium-138/sync/docs/tmp.json:6165)
fonts.values.profile 是 windows_zh_cn，但浏览器语言是 zh-TW，见 [locale (line 4768)](e:/work/chromium/broium-138/sync/docs/tmp.json:4768)。这不是致命问题，但如果后续按 profile preset 选择字体，会把繁中/简中环境混掉。建议 profile 改成 windows_zh_tw 或 windows_zh_mixed，并以 detected font list/hash 为准。
Good
chromium 节点的新结构已经对了：现在是 schema/browser/warnings/config/implementation，没有 Broium/broium138/versionPolicy/sourceVersion/targetVersion 残留。browser.role=observed-browser，品牌和 UA/UA-CH 也保持一致。总体方向没问题，下一步主要修“采集环境污染”和“字段口径一致性”。