# Chromium Source And Toolchain Split

This directory now has only two operational scripts:

```text
separate-source.sh   Export a source-only Chromium tree on the current machine.
sync-toolchain.py    Sync platform toolchains from a flattened source checkout.
```

## 1. Export Source

Run this from the current Ubuntu checkout:

```bash
sync/separate-source.sh --out ../chromium-company-src
```

If the output already exists:

```bash
sync/separate-source.sh --out ../chromium-company-src --force
```

The export keeps source files, including `v8`, `third_party/skia`,
`third_party/angle`, and similar dependency contents. It excludes:

- all `.git` directories
- `out/`
- `chrome/build/pgo_profiles`
- DevTools platform payloads such as `third_party/devtools-frontend/src/third_party/esbuild`
  and generated Rollup native packages
- `third_party/gperf`
- Windows/OpenXR Git tool/source payloads such as `third_party/microsoft_dxheaders/src`,
  `third_party/microsoft_webauthn/src`, `third_party/openxr/src`, and `third_party/perl`
- `build/linux/debian_*-sysroot`
- `third_party/llvm-build`
- `third_party/rust-toolchain`
- platform `third_party/node` payloads
- `buildtools/*-format`
- hook/build metadata generated locally by Chromium, including `.landmines`,
  `build/config/gclient_args.gni`, `build/util/LASTCHANGE*`,
  `buildtools/reclient_cfgs/reproxy.cfg`, `chromeos/tast_control.gni`,
  `gpu/config/gpu_lists_version.h`, `gpu/webgpu/DAWN_VERSION`,
  `gpu/webgpu/dawn_commit_hash.h`, `skia/ext/skia_commit_hash.h`, and
  `testing/location_tags.json`
- depot_tools local CIPD caches such as `third_party/depot_tools/.cipd_bin`
  and `third_party/depot_tools/.cipd_client_cache`
- `_gclient_*` temporary directories

`build/config/unsafe_buffers_paths.txt` is intentionally not excluded; treat it
as source.

Initialize and push the company repository from the exported directory:

```bash
cd ../chromium-company-src
git init
git remote add origin <company repo url>
git add -A -f .
git commit -m "Import Chromium source snapshot"
git push -u origin main
```

The `-f` is required because Chromium `.gitignore` files ignore many paths that
are normally separate `gclient` Git checkouts, such as `third_party/swiftshader`
and Vulkan/SPIR-V dependencies. In this flattened company source repository,
those files must be tracked.

If an earlier import already tracked generated hook/build files, remove them
from the company repository once after re-exporting, for example with
`git rm --cached <path>` or by committing the deletions produced by the new
export. Otherwise later `gclient sync` or local builds can keep showing them as
modified even though they are not source changes.

## 2. Sync Toolchain On Each Platform

Clone the company source repo as `src` inside a Chromium workspace:

```bash
mkdir chromium-workspace
cd chromium-workspace
git clone <company repo url> src
```

Copy or keep the `sync` directory next to `src`, then run:

```bash
python3 sync/sync-toolchain.py --repo-url <company repo url>
```

On Windows:

```bat
py sync\sync-toolchain.py --repo-url <company repo url>
```

The script writes:

```text
workspace/.gclient
workspace/src/DEPS.toolchain
```

`DEPS.toolchain` is generated from `src/DEPS`. It removes Git source
dependencies and disables recursive DEPS traversal, but keeps GCS/CIPD
dependencies and hooks so Clang, Rust, sysroots, Node payloads, GN/Ninja, and
other platform toolchain pieces can be synced locally.

By default the generated `.gclient` enables `checkout_pgo_profiles`, so the
Chromium PGO hooks download the profiles needed by the current platform. This
keeps Linux profiles out of the exported source repository while allowing
Windows, Linux, macOS, and Android workspaces to fetch their own profiles during
toolchain sync. If you intentionally build with `chrome_pgo_phase = 0`, pass
`--no-pgo-profiles` to skip those downloads.

The generated `DEPS.toolchain` also keeps the platform CIPD payloads from the
flattened DevTools checkout that Chromium builds need, including esbuild and the
Rollup native package. Those are intentionally excluded from the source export
and re-synced per platform.

Some small platform Git dependencies are also preserved because they provide
Windows-only build inputs that a Linux source export will not contain, such as
gperf, Microsoft DirectX headers, Microsoft WebAuthn headers, OpenXR, and Perl.

For flattened source repositories whose commits do not carry Chromium
`Change-Id` metadata, Chromium's `lastchange.py` can write a zero commit time.
`sync-toolchain.py` repairs that metadata after hooks run so Windows linkers get
a valid positive `/TIMESTAMP` value.

## Important

Do not run normal `gclient sync` against the original `DEPS` after flattening
the source tree. Use `sync-toolchain.py`, otherwise gclient may try to fetch
`v8`, `skia`, `angle`, `dawn`, and other source dependencies from their original
Git URLs.
