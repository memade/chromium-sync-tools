#!/usr/bin/env python3
"""Copy macOS arm64 Widevine CDM from local Google Chrome into Chromium src."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import platform
import plistlib
import shutil
import subprocess
import sys


DEFAULT_CHROME_APP = Path("/Applications/Google Chrome.app")
WIDEVINE_RELATIVE_DIR = Path(
    "Contents/Frameworks/Google Chrome Framework.framework/Versions"
)
CDM_DEST_DIR = Path("third_party/widevine/cdm/mac/arm64")
LOCAL_EXCLUDE_ENTRY = "/third_party/widevine/cdm/mac/"


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


def version_key(path: Path) -> tuple[int, ...]:
    try:
        return tuple(int(part) for part in path.name.split("."))
    except ValueError:
        return ()


def chrome_version_from_info(chrome_app: Path) -> str | None:
    info_plist = chrome_app / "Contents" / "Info.plist"
    if not info_plist.is_file():
        return None

    with info_plist.open("rb") as handle:
        info = plistlib.load(handle)
    version = info.get("CFBundleShortVersionString")
    return version if isinstance(version, str) else None


def widevine_dir_for_version(chrome_app: Path, version: str) -> Path:
    return chrome_app / WIDEVINE_RELATIVE_DIR / version / "Libraries" / "WidevineCdm"


def find_widevine_dir(chrome_app: Path, version: str | None) -> Path:
    if version:
        widevine_dir = widevine_dir_for_version(chrome_app, version)
        if not widevine_dir.is_dir():
            fail(f"WidevineCdm was not found for Chrome version {version}: {widevine_dir}")
        return widevine_dir

    info_version = chrome_version_from_info(chrome_app)
    if info_version:
        widevine_dir = widevine_dir_for_version(chrome_app, info_version)
        if widevine_dir.is_dir():
            return widevine_dir

    versions_dir = chrome_app / WIDEVINE_RELATIVE_DIR
    if not versions_dir.is_dir():
        fail(f"Chrome versions directory was not found: {versions_dir}")

    candidates = [
        child / "Libraries" / "WidevineCdm"
        for child in versions_dir.iterdir()
        if child.is_dir() and version_key(child)
    ]
    candidates = [path for path in candidates if path.is_dir()]
    if not candidates:
        fail(f"No WidevineCdm directory was found under: {versions_dir}")

    return max(candidates, key=lambda path: version_key(path.parents[1]))


def required_sources(widevine_dir: Path) -> dict[Path, Path]:
    platform_dir = widevine_dir / "_platform_specific" / "mac_arm64"
    return {
        widevine_dir / "manifest.json": CDM_DEST_DIR / "manifest.json",
        platform_dir / "libwidevinecdm.dylib": CDM_DEST_DIR / "libwidevinecdm.dylib",
        platform_dir
        / "libwidevinecdm.dylib.sig": CDM_DEST_DIR
        / "libwidevinecdm.dylib.sig",
    }


def copy_sources(source: Path, widevine_dir: Path, dry_run: bool) -> None:
    copies = required_sources(widevine_dir)
    missing = [path for path in copies if not path.is_file()]
    if missing:
        for path in missing:
            print(path)
        fail("required Widevine source file(s) are missing")

    dest_root = source / CDM_DEST_DIR
    log(f"Chrome Widevine: {widevine_dir}")
    log(f"Chromium destination: {dest_root}")

    if dry_run:
        for src, dest in copies.items():
            print(f"{src} -> {source / dest}")
        return

    dest_root.mkdir(parents=True, exist_ok=True)
    for src, dest in copies.items():
        target = source / dest
        shutil.copy2(src, target)
        log(f"Copied {target.relative_to(source)}")


def git_dir_path(source: Path) -> Path | None:
    result = subprocess.run(
        ["git", "-C", str(source), "rev-parse", "--git-dir"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    if result.returncode != 0:
        return None

    git_dir = Path(result.stdout.strip())
    if not git_dir.is_absolute():
        git_dir = source / git_dir
    return git_dir


def ensure_local_git_exclude(source: Path, dry_run: bool) -> None:
    git_dir = git_dir_path(source)
    if not git_dir:
        return

    exclude_file = git_dir / "info" / "exclude"
    existing = exclude_file.read_text(encoding="utf-8") if exclude_file.exists() else ""
    entries = {line.strip() for line in existing.splitlines()}
    if LOCAL_EXCLUDE_ENTRY in entries:
        return

    if dry_run:
        log(f"Would add {LOCAL_EXCLUDE_ENTRY} to {exclude_file}")
        return

    exclude_file.parent.mkdir(parents=True, exist_ok=True)
    with exclude_file.open("a", encoding="utf-8") as handle:
        if existing and not existing.endswith("\n"):
            handle.write("\n")
        handle.write(f"{LOCAL_EXCLUDE_ENTRY}\n")
    log(f"Added {LOCAL_EXCLUDE_ENTRY} to {exclude_file}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Copy local Google Chrome Widevine CDM into Chromium src for macOS arm64 builds."
    )
    parser.add_argument("--src", help="Path to Chromium src. Default: auto-detect.")
    parser.add_argument(
        "--chrome-app",
        default=str(DEFAULT_CHROME_APP),
        help="Path to Google Chrome.app.",
    )
    parser.add_argument(
        "--chrome-version",
        help="Chrome Framework version to copy from. Default: Info.plist version, then newest available.",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Run even if the host is not macOS arm64.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not args.force and (platform.system() != "Darwin" or platform.machine() != "arm64"):
        fail("this script is intended for macOS arm64 hosts; pass --force to override")

    source = find_source_dir(args.src)
    chrome_app = Path(args.chrome_app).resolve()
    if not chrome_app.is_dir():
        fail(f"Google Chrome.app was not found: {chrome_app}")

    widevine_dir = find_widevine_dir(chrome_app, args.chrome_version)
    copy_sources(source, widevine_dir, args.dry_run)
    ensure_local_git_exclude(source, args.dry_run)
    if not args.dry_run:
        log("Widevine copy complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
