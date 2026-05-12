#!/usr/bin/env python3
"""Stop tracking generated/toolchain files in a flattened Chromium checkout."""

from __future__ import annotations

import argparse
from pathlib import Path
import subprocess
import sys


GENERATED_PATHS = (
    ".landmines",
    "build/config/gclient_args.gni",
    "build/config/siso/.sisoenv",
    "build/config/siso/.sisorc",
    "build/config/siso/backend_config/backend.star",
    "build/util/LASTCHANGE",
    "build/util/LASTCHANGE.committime",
    "build/util/LASTCHANGE_commit_position.h",
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
)


def log(message: str) -> None:
    print(f"==> {message}")


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def find_source_dir(value: str | None) -> Path:
    if value:
        source = Path(value).resolve()
    else:
        cwd = Path.cwd().resolve()
        if (cwd / "DEPS").is_file():
            source = cwd
        elif (cwd / "src" / "DEPS").is_file():
            source = cwd / "src"
        else:
            script_dir = Path(__file__).resolve().parent
            source = (script_dir / ".." / "src").resolve()

    if not (source / "DEPS").is_file():
        fail(f"not a Chromium src checkout: {source}")
    return source


def git_command(source: Path, args: list[str]) -> list[str]:
    safe_path = source.as_posix()
    return ["git", "-c", f"safe.directory={safe_path}", "-C", str(source), *args]


def git_output(source: Path, args: list[str]) -> str:
    result = subprocess.run(
        git_command(source, args),
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return result.stdout


def git_output_bytes(source: Path, args: list[str]) -> bytes:
    result = subprocess.run(
        git_command(source, args),
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout


def tracked_paths(source: Path, pathspecs: tuple[str, ...]) -> list[str]:
    data = git_output_bytes(source, ["ls-files", "-z", "--", *pathspecs])
    return sorted(path for path in data.decode("utf-8").split("\0") if path)


def batched(values: list[str], size: int = 100) -> list[list[str]]:
    return [values[index:index + size] for index in range(0, len(values), size)]


def untrack_paths(source: Path, paths: list[str]) -> None:
    for batch in batched(paths):
        subprocess.run(
            git_command(source, ["rm", "--cached", "-r", "-f", "--", *batch]),
            check=True,
        )


def ensure_local_git_exclude(source: Path, entries: tuple[str, ...]) -> int:
    missing = missing_local_git_exclude_entries(source, entries)
    if not missing:
        return 0

    git_dir = git_dir_path(source)
    exclude_file = git_dir / "info" / "exclude"
    existing = exclude_file.read_text(encoding="utf-8") if exclude_file.exists() else ""
    with exclude_file.open("a", encoding="utf-8") as handle:
        if existing and not existing.endswith("\n"):
            handle.write("\n")
        for entry in missing:
            handle.write(f"{entry}\n")
    return len(missing)


def git_dir_path(source: Path) -> Path:
    git_dir_text = git_output(source, ["rev-parse", "--git-dir"]).strip()
    git_dir = Path(git_dir_text)
    if not git_dir.is_absolute():
        git_dir = source / git_dir
    return git_dir


def missing_local_git_exclude_entries(
    source: Path, entries: tuple[str, ...]
) -> list[str]:
    git_dir = git_dir_path(source)
    exclude_file = git_dir / "info" / "exclude"
    exclude_file.parent.mkdir(parents=True, exist_ok=True)
    existing = exclude_file.read_text(encoding="utf-8") if exclude_file.exists() else ""
    return [entry for entry in entries if f"{entry}\n" not in existing]


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Remove generated/toolchain paths from the Git index without "
            "deleting working-tree files."
        )
    )
    parser.add_argument("--src", help="Path to Chromium src. Defaults to ./src.")
    parser.add_argument(
        "--all-toolchains",
        action="store_true",
        help="Also untrack larger platform toolchain payload directories.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print tracked paths that would be removed from the index.",
    )
    args = parser.parse_args()

    source = find_source_dir(args.src)
    pathspecs = GENERATED_PATHS + COMMON_PAYLOAD_PATHS
    if args.all_toolchains:
        pathspecs += TOOLCHAIN_PAYLOAD_PATHS

    paths = tracked_paths(source, pathspecs)
    missing_excludes = missing_local_git_exclude_entries(source, LOCAL_EXCLUDE_ENTRIES)

    if args.dry_run:
        log(f"Source: {source}")
        log(f"Would add {len(missing_excludes)} entries to .git/info/exclude")
        if paths:
            log(f"Would untrack {len(paths)} path(s):")
            for path in paths:
                print(path)
        else:
            log("No tracked generated/toolchain paths matched")
        return 0

    exclude_count = ensure_local_git_exclude(source, LOCAL_EXCLUDE_ENTRIES)

    if paths:
        log(f"Untracking {len(paths)} generated/toolchain path(s)")
        untrack_paths(source, paths)
    else:
        log("No tracked generated/toolchain paths matched")

    if exclude_count:
        log(f"Added {exclude_count} entries to .git/info/exclude")

    log("Working-tree files were preserved. Commit the staged deletions once.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
