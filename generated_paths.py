#!/usr/bin/env python3
"""Shared generated/toolchain path lists for flattened Chromium checkouts."""

from __future__ import annotations


GENERATED_PATHS = (
    "DEPS.toolchain",
    ".landmines",
    "build/config/gclient_args.gni",
    "build/config/siso/.sisoenv",
    "build/config/siso/.sisorc",
    "build/config/siso/backend_config/backend.star",
    "build/util/LASTCHANGE",
    "build/util/LASTCHANGE.committime",
    "build/util/LASTCHANGE_commit_position.h",
    "buildtools/reclient",
    "buildtools/reclient_cfgs/reproxy.cfg",
    "buildtools/reclient_cfgs/chromium-browser-clang",
    "buildtools/reclient_cfgs/python",
    "buildtools/reclient_cfgs/win-cross",
    "chromeos/tast_control.gni",
    "gpu/config/gpu_lists_version.h",
    "gpu/webgpu/DAWN_VERSION",
    "gpu/webgpu/dawn_commit_hash.h",
    "skia/ext/skia_commit_hash.h",
    "testing/location_tags.json",
    "third_party/depot_tools/.cipd_client_cache",
)

COMMON_PAYLOAD_PATHS = (
    "chrome/build/pgo_profiles",
    "third_party/devtools-frontend/src/third_party/esbuild",
    "third_party/devtools-frontend/src/third_party/rollup_libs",
    "third_party/devtools-frontend/src/node_modules/@rollup/rollup-*",
)

PLATFORM_TOOL_PATHS = (
    "third_party/depot_tools/.cipd_client",
    "third_party/depot_tools/.versions/.cipd_client.cipd_version",
    "third_party/ninja/ninja",
    "third_party/siso/cipd/.versions/siso.cipd_version",
    "third_party/siso/cipd/siso",
    "tools/luci-go/.versions/cas.cipd_version",
    "tools/luci-go/.versions/isolate.cipd_version",
    "tools/luci-go/.versions/swarming.cipd_version",
    "tools/luci-go/cas",
    "tools/luci-go/isolate",
    "tools/luci-go/swarming",
    "tools/resultdb/.versions/result_adapter.cipd_version",
    "tools/resultdb/result_adapter",
)

PLATFORM_PAYLOAD_PATHS = (
    "third_party/widevine/cdm/mac",
)

TOOLCHAIN_PAYLOAD_PATHS = (
    "third_party/depot_tools/.cipd_bin",
    "third_party/gperf",
    "third_party/microsoft_dxheaders/src",
    "third_party/microsoft_webauthn/src",
    "third_party/openxr/src",
    "third_party/perl",
    "build/linux/debian_*-sysroot",
    "third_party/dawn/build/linux/debian_*-sysroot",
    "third_party/llvm-build",
    "third_party/rust-toolchain",
    "third_party/node/linux",
    "third_party/node/mac",
    "third_party/node/mac_arm64",
    "third_party/node/win",
    "third_party/node/node_modules",
    "buildtools/linux64-format",
    "buildtools/mac-format",
    "buildtools/mac_arm64-format",
    "buildtools/win-format",
)

LOCAL_EXCLUDE_ENTRIES = (
    "/DEPS.toolchain",
    "/.landmines",
    "/build/config/gclient_args.gni",
    "/build/config/siso/.sisoenv",
    "/build/config/siso/.sisorc",
    "/build/config/siso/backend_config/backend.star",
    "/build/util/LASTCHANGE",
    "/build/util/LASTCHANGE.committime",
    "/build/util/LASTCHANGE_commit_position.h",
    "/buildtools/reclient/",
    "/buildtools/reclient_cfgs/reproxy.cfg",
    "/buildtools/reclient_cfgs/chromium-browser-clang/",
    "/buildtools/reclient_cfgs/python/",
    "/buildtools/reclient_cfgs/win-cross/",
    "/chromeos/tast_control.gni",
    "/gpu/config/gpu_lists_version.h",
    "/gpu/webgpu/DAWN_VERSION",
    "/gpu/webgpu/dawn_commit_hash.h",
    "/skia/ext/skia_commit_hash.h",
    "/testing/location_tags.json",
    "/chrome/build/pgo_profiles/",
    "/third_party/devtools-frontend/src/third_party/esbuild/",
    "/third_party/devtools-frontend/src/third_party/rollup_libs/",
    "/third_party/devtools-frontend/src/node_modules/@rollup/rollup-*/",
    "/third_party/depot_tools/.cipd_client",
    "/third_party/depot_tools/.versions/.cipd_client.cipd_version",
    "/third_party/gperf/",
    "/third_party/microsoft_dxheaders/src/",
    "/third_party/microsoft_webauthn/src/",
    "/third_party/openxr/src/",
    "/third_party/perl/",
    "/build/linux/debian_*-sysroot/",
    "/third_party/dawn/build/linux/debian_*-sysroot/",
    "/third_party/llvm-build/",
    "/third_party/rust-toolchain/",
    "/third_party/node/linux/",
    "/third_party/node/mac/",
    "/third_party/node/mac_arm64/",
    "/third_party/node/win/",
    "/third_party/node/node_modules/",
    "/buildtools/linux64-format/",
    "/buildtools/mac-format/",
    "/buildtools/mac_arm64-format/",
    "/buildtools/win-format/",
    "/third_party/depot_tools/.cipd_bin/",
    "/third_party/depot_tools/.cipd_client_cache/",
    "/third_party/ninja/ninja",
    "/third_party/siso/cipd/.versions/siso.cipd_version",
    "/third_party/siso/cipd/siso",
    "/third_party/widevine/cdm/mac/",
    "/tools/luci-go/.versions/cas.cipd_version",
    "/tools/luci-go/.versions/isolate.cipd_version",
    "/tools/luci-go/.versions/swarming.cipd_version",
    "/tools/luci-go/cas",
    "/tools/luci-go/isolate",
    "/tools/luci-go/swarming",
    "/tools/resultdb/.versions/result_adapter.cipd_version",
    "/tools/resultdb/result_adapter",
)

DEFAULT_CLEAN_PATHS = GENERATED_PATHS + COMMON_PAYLOAD_PATHS + PLATFORM_TOOL_PATHS
FULL_CLEAN_PATHS = DEFAULT_CLEAN_PATHS + PLATFORM_PAYLOAD_PATHS + TOOLCHAIN_PAYLOAD_PATHS

PROTECTED_GIT_PATHS = FULL_CLEAN_PATHS
