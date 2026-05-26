#!/usr/bin/env python3
"""Sync Chromium toolchains without re-checking out Git source dependencies.

This script is for a flattened company Chromium source tree where v8, skia,
angle, dawn, and other DEPS Git dependencies are committed as normal files.
It generates src/DEPS.toolchain by keeping GCS/CIPD dependencies and hooks, but
removing Git dependencies and recursive DEPS traversal.
"""

from __future__ import annotations

import argparse
import copy
import datetime
import os
from pathlib import Path
import pprint
import shutil
import stat
import subprocess
import sys
import time
from typing import Any


GENERATED_DEPS = "DEPS.toolchain"
SOLUTION_NAME = "src"

NESTED_TOOLCHAIN_DEPS: dict[str, dict[str, set[str]]] = {
    "third_party/devtools-frontend/src": {
        "deps": {
            "third_party/esbuild",
        },
        "optional_deps": {
            "third_party/rollup_libs",
        },
        "hooks": {
            "sync_rollup_libs",
        },
    },
}

TOOLCHAIN_GIT_DEPS = (
    "src/third_party/gperf",
    "src/third_party/microsoft_dxheaders/src",
    "src/third_party/microsoft_webauthn/src",
    "src/third_party/openxr/src",
    "src/third_party/perl",
)

TOOLCHAIN_GIT_CLEANUP_GLOBS = (
    "third_party/gperf",
    "third_party/microsoft_dxheaders/src",
    "third_party/microsoft_webauthn/src",
    "third_party/openxr/src",
    "third_party/perl",
)

PLATFORM_PAYLOAD_CLEANUP_GLOBS = (
    "third_party/devtools-frontend/src/third_party/esbuild",
    "third_party/devtools-frontend/src/third_party/rollup_libs",
    "third_party/devtools-frontend/src/node_modules/@rollup/rollup-*",
    *TOOLCHAIN_GIT_CLEANUP_GLOBS,
)

LOCAL_GIT_EXCLUDE_ENTRIES = (
    f"/{GENERATED_DEPS}",
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
    "/third_party/depot_tools/.cipd_bin/",
    "/third_party/depot_tools/.cipd_client_cache/",
)


class ConstantString:
    """Represents Chromium DEPS Str('...') values when regenerating DEPS."""

    def __init__(self, value: str):
        self.value = value

    def __format__(self, format_spec: str) -> str:
        del format_spec
        return self.value

    def __repr__(self) -> str:
        return f"Str({self.value!r})"


def log(message: str) -> None:
    print(f"==> {message}")


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def run(args: list[str], cwd: Path | None = None) -> None:
    log("Running " + " ".join(args))
    subprocess.run(args, cwd=str(cwd) if cwd else None, check=True)


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


def find_gclient(source: Path, depot_tools: str | None) -> str:
    search_path = os.environ.get("PATH", "")
    if depot_tools:
        search_path = str(Path(depot_tools).resolve()) + os.pathsep + search_path
        os.environ["PATH"] = search_path

    gclient = shutil.which("gclient", path=search_path)
    if gclient:
        return gclient

    embedded_depot_tools = source / "third_party" / "depot_tools"
    if embedded_depot_tools.is_dir():
        os.environ["PATH"] = str(embedded_depot_tools) + os.pathsep + search_path
        gclient = shutil.which("gclient", path=os.environ["PATH"])
        if gclient:
            return gclient

    fail("gclient was not found. Install depot_tools or pass --depot-tools.")


def git_output(source: Path, args: list[str]) -> str | None:
    try:
        result = subprocess.run(
            ["git", "-C", str(source), *args],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    return result.stdout.strip()


def source_url(source: Path, fallback: str | None) -> str:
    if fallback:
        return fallback

    for remote in ("company", "origin"):
        url = git_output(source, ["remote", "get-url", remote])
        if url:
            return url

    return str(source)


def load_deps(deps_path: Path) -> dict[str, Any]:
    text = deps_path.read_text(encoding="utf-8")
    scope: dict[str, Any] = {"__builtins__": {}}

    def var(name: str) -> Any:
        value = scope["vars"][name]
        if isinstance(value, ConstantString):
            return value.value
        return value

    def str_var(value: str) -> ConstantString:
        return ConstantString(value)

    scope["Var"] = var
    scope["Str"] = str_var
    exec(compile(text, str(deps_path), "exec"), scope)
    return scope


def is_git_dep(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return True
    if isinstance(value, dict):
        dep_type = value.get("dep_type", "git")
        return dep_type == "git" or "url" in value
    return False


def filter_deps_map(deps: dict[str, Any]) -> tuple[dict[str, Any], int]:
    kept: dict[str, Any] = {}
    skipped = 0
    for name, value in deps.items():
        if is_git_dep(value) and name not in TOOLCHAIN_GIT_DEPS:
            skipped += 1
        else:
            kept[name] = value
    return kept, skipped


def format_assignment(name: str, value: Any) -> str:
    formatted = pprint.pformat(value, width=100, sort_dicts=False)
    return f"{name} = {formatted}\n"


def deps_path(*parts: str) -> str:
    return "/".join(part.strip("/").replace("\\", "/") for part in parts if part)


def add_nested_toolchain_deps(
    source: Path, deps: dict[str, Any]
) -> tuple[list[dict[str, Any]], int]:
    hooks: list[dict[str, Any]] = []
    kept = 0

    for nested_root, config in NESTED_TOOLCHAIN_DEPS.items():
        nested_deps_path = source / Path(nested_root.replace("/", os.sep)) / "DEPS"
        if not nested_deps_path.is_file():
            fail(f"nested DEPS file is missing: {nested_deps_path}")

        nested_scope = load_deps(nested_deps_path)
        nested_deps = nested_scope.get("deps", {})

        for dep_name in sorted(config["deps"]):
            if dep_name not in nested_deps:
                fail(
                    f"nested dependency {dep_name!r} is missing from {nested_deps_path}"
                )

            dep_value = nested_deps[dep_name]
            if is_git_dep(dep_value):
                fail(f"nested dependency {dep_name!r} is a Git dependency")

            deps[deps_path(SOLUTION_NAME, nested_root, dep_name)] = copy.deepcopy(
                dep_value
            )
            kept += 1

        for dep_name in sorted(config.get("optional_deps", set())):
            if dep_name not in nested_deps:
                continue

            dep_value = nested_deps[dep_name]
            if is_git_dep(dep_value):
                fail(f"nested dependency {dep_name!r} is a Git dependency")

            deps[deps_path(SOLUTION_NAME, nested_root, dep_name)] = copy.deepcopy(
                dep_value
            )
            kept += 1

        for hook in nested_scope.get("hooks", []):
            if hook.get("name") not in config["hooks"]:
                continue

            nested_hook = copy.deepcopy(hook)
            nested_hook["cwd"] = deps_path(
                SOLUTION_NAME, nested_root, nested_hook.get("cwd", "")
            )
            hooks.append(nested_hook)

    return hooks, kept


def write_toolchain_deps(source: Path) -> tuple[Path, int, int]:
    scope = load_deps(source / "DEPS")
    filtered_deps, skipped = filter_deps_map(dict(scope.get("deps", {})))
    nested_hooks, nested_kept = add_nested_toolchain_deps(source, filtered_deps)

    output: list[str] = [
        "# Generated by sync-toolchain.py. Do not commit.\n",
        "# This file keeps Chromium GCS/CIPD toolchain deps and hooks, while\n",
        "# removing Git source dependencies and recursive DEPS traversal.\n\n",
    ]

    for name in (
        "git_dependencies",
        "gclient_gn_args_file",
        "gclient_gn_args",
        "vars",
        "allowed_hosts",
    ):
        if name in scope:
            output.append(format_assignment(name, scope[name]))
            output.append("\n")

    output.append(format_assignment("deps", filtered_deps))
    output.append("\n")

    hooks = list(scope.get("hooks", [])) + nested_hooks
    output.append(format_assignment("hooks", hooks))
    output.append("\n")

    for name in ("hooks_os", "pre_deps_hooks"):
        if name in scope:
            output.append(format_assignment(name, scope[name]))
            output.append("\n")

    output.append("recursedeps = []\n")

    generated = source / GENERATED_DEPS
    generated.write_text("".join(output), encoding="utf-8")
    return generated, skipped, nested_kept


def ensure_local_git_exclude(source: Path) -> None:
    git_dir_text = git_output(source, ["rev-parse", "--git-dir"])
    if not git_dir_text:
        return

    git_dir = Path(git_dir_text)
    if not git_dir.is_absolute():
        git_dir = source / git_dir

    info_dir = git_dir / "info"
    exclude_file = info_dir / "exclude"
    if not info_dir.is_dir():
        return

    existing = exclude_file.read_text(encoding="utf-8") if exclude_file.exists() else ""
    missing = [
        entry for entry in LOCAL_GIT_EXCLUDE_ENTRIES if f"{entry}\n" not in existing
    ]
    if missing:
        with exclude_file.open("a", encoding="utf-8") as handle:
            if existing and not existing.endswith("\n"):
                handle.write("\n")
            for entry in missing:
                handle.write(f"{entry}\n")


def clean_platform_payloads(source: Path) -> int:
    removed = 0
    source_root = source.resolve()

    def make_writable_and_retry(func: Any, path: str, exc_info: Any) -> None:
        del exc_info
        os.chmod(path, stat.S_IWRITE)
        func(path)

    for pattern in PLATFORM_PAYLOAD_CLEANUP_GLOBS:
        for path in source.glob(pattern):
            if pattern in TOOLCHAIN_GIT_CLEANUP_GLOBS and (path / ".git").exists():
                continue

            resolved = path.resolve()
            try:
                resolved.relative_to(source_root)
            except ValueError:
                fail(f"refusing to clean path outside source checkout: {resolved}")

            if path.is_dir():
                shutil.rmtree(path, onerror=make_writable_and_retry)
            else:
                path.chmod(stat.S_IWRITE)
                path.unlink()
            removed += 1

    return removed


def source_version_info(source: Path) -> tuple[str, int]:
    git_info = git_output(source, ["log", "-1", "--format=%H %ct"])
    if git_info:
        parts = git_info.split()
        if len(parts) >= 2:
            try:
                timestamp = int(parts[1])
            except ValueError:
                timestamp = 0
            if timestamp > 0:
                return parts[0], timestamp

    return "0" * 40, int(time.time())


def ensure_lastchange_timestamp(source: Path) -> bool:
    committime_file = source / "build" / "util" / "LASTCHANGE.committime"
    try:
        current_timestamp = int(committime_file.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        current_timestamp = 0

    if current_timestamp > 0:
        return False

    revision, timestamp = source_version_info(source)
    year = datetime.datetime.fromtimestamp(
        timestamp, datetime.timezone.utc
    ).year
    lastchange_file = source / "build" / "util" / "LASTCHANGE"
    lastchange_file.write_text(
        f"LASTCHANGE={revision}\nLASTCHANGE_YEAR={year}\n", encoding="utf-8"
    )
    committime_file.write_text(str(timestamp), encoding="utf-8")
    return True


def write_gclient(workspace: Path, url: str, custom_vars: dict[str, Any]) -> Path:
    formatted_custom_vars = pprint.pformat(custom_vars, width=100, sort_dicts=False)
    content = f"""solutions = [
  {{
    "name": "src",
    "url": "{url}",
    "deps_file": "{GENERATED_DEPS}",
    "managed": False,
    "custom_deps": {{}},
    "custom_vars": {formatted_custom_vars},
  }},
]
"""
    path = workspace / ".gclient"
    path.write_text(content, encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sync Chromium toolchains from a flattened company source tree."
    )
    parser.add_argument("--src", help="Path to Chromium src. Default: auto-detect.")
    parser.add_argument("--repo-url", help="Company src Git URL for .gclient.")
    parser.add_argument("--depot-tools", help="Path to depot_tools.")
    parser.add_argument("--jobs", type=int, default=os.cpu_count() or 8)
    parser.add_argument("--nohooks", action="store_true", help="Run gclient sync without hooks.")
    parser.add_argument("--dry-run", action="store_true", help="Generate files but do not run gclient.")
    parser.add_argument("--force", action="store_true", help="Pass --force to gclient sync.")
    parser.add_argument(
        "--no-pgo-profiles",
        action="store_true",
        help="Do not download platform PGO profiles. Use this only with chrome_pgo_phase=0.",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Pass --reset to gclient sync. Avoid this with local toolchain changes.",
    )
    args = parser.parse_args()

    source = find_source_dir(args.src)
    workspace = source.parent
    gclient = find_gclient(source, args.depot_tools)

    if os.name == "nt" and not args.dry_run:
        run(["git", "config", "--global", "core.longpaths", "true"])

    generated_deps, skipped_git_deps, nested_toolchain_deps = write_toolchain_deps(
        source
    )
    ensure_local_git_exclude(source)

    custom_vars: dict[str, Any] = {}
    if not args.no_pgo_profiles:
        custom_vars["checkout_pgo_profiles"] = True

    gclient_path = write_gclient(workspace, source_url(source, args.repo_url), custom_vars)
    log(f"Wrote {generated_deps}")
    log(f"Wrote {gclient_path}")
    log(f"Skipped {skipped_git_deps} Git source deps")
    log(f"Kept {nested_toolchain_deps} nested toolchain deps")
    if custom_vars:
        log(f"Enabled custom vars: {custom_vars}")

    command = [
        gclient,
        "sync",
        "--with_branch_heads",
        "--with_tags",
        "--jobs",
        str(args.jobs),
    ]
    if args.force:
        command.append("--force")
    if args.reset:
        command.append("--reset")
    if args.nohooks:
        command.append("--nohooks")
        if custom_vars:
            log(
                "PGO profiles are enabled, but --nohooks skips downloading them; "
                "run gclient runhooks later."
            )

    if args.dry_run:
        log("Dry run complete; gclient was not executed")
        return 0

    removed_platform_payloads = clean_platform_payloads(source)
    if removed_platform_payloads:
        log(f"Removed {removed_platform_payloads} stale platform payload paths")

    run(command, cwd=workspace)
    if ensure_lastchange_timestamp(source):
        log("Repaired build/util/LASTCHANGE timestamp for flattened checkout")
    log("Toolchain sync complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
