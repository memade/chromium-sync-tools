#!/usr/bin/env python3
"""Experimental launcher for Chromium headless --dump-dom mode."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


DEFAULT_URL = "https://google.com/search?q=martell"
DEFAULT_HEADLESS = "new"


def workspace_root() -> Path:
    # sync/docs/chromium/headless_dump_dom.py -> repo root
    return Path(__file__).resolve().parents[3]


def find_chrome(explicit_path: str | None) -> Path:
    if explicit_path:
        chrome = Path(explicit_path).expanduser()
        if chrome.exists():
            return chrome.resolve()
        raise FileNotFoundError(f"chrome executable does not exist: {chrome}")

    root = workspace_root()
    candidates = [
        root / "src" / "out" / "release" / "chrome.exe",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()

    for name in ("chrome.exe", "chrome", "chromium"):
        resolved = shutil.which(name)
        if resolved:
            return Path(resolved).resolve()

    raise FileNotFoundError(
        "chrome executable was not found. Pass --chrome <path-to-chrome.exe>."
    )


def build_command(args: argparse.Namespace) -> list[str]:
    chrome = find_chrome(args.chrome)
    headless_switch = (
        "--headless" if args.headless == "plain" else f"--headless={args.headless}"
    )
    command = [
        str(chrome),
        headless_switch,
        "--dump-dom",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-sync",
        "--disable-component-update",
        "--no-first-run",
        "--no-default-browser-check",
        "--incognito",
        "--disable-blink-features=AutomationControlled",
        "--lang=en-US",
        "--window-size=1280,800",
    ]
    if args.user_data_dir:
        command.append(f"--user-data-dir={args.user_data_dir}")
    command.extend(args.extra_arg)
    command.append(args.url)
    return command


def create_temp_user_data_dir() -> Path:
    return Path(tempfile.mkdtemp(prefix="broium-headless-profile-")).resolve()


def remove_tree_with_retry(path: Path) -> bool:
    for _ in range(4):
        try:
            shutil.rmtree(path)
            return True
        except FileNotFoundError:
            return True
        except OSError:
            pass
    return False


def looks_like_google_challenge(html: str) -> bool:
    markers = (
        "/sorry/index",
        "www.google.com/sorry",
        "recaptcha/enterprise",
        "g-recaptcha",
        "solveSimpleChallenge",
    )
    return any(marker in html for marker in markers)


def run_chrome(command: list[str]) -> tuple[int, str]:
    completed = subprocess.run(
        command,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if completed.stderr:
        print(completed.stderr, file=sys.stderr, end="")
    return completed.returncode, completed.stdout


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run chrome.exe in headless --dump-dom mode and capture HTML."
    )
    parser.add_argument("url", nargs="?", default=DEFAULT_URL)
    parser.add_argument("--chrome", help="Path to chrome.exe.")
    parser.add_argument(
        "--headless",
        choices=("new", "old", "plain"),
        default=DEFAULT_HEADLESS,
        help="Headless mode argument. 'plain' emits --headless without a value.",
    )
    parser.add_argument("--output", type=Path, help="Write dumped DOM to this file.")
    parser.add_argument(
        "--user-data-dir",
        type=Path,
        help="Use this Chromium profile directory. Defaults to a fresh temp dir.",
    )
    parser.add_argument(
        "--keep-user-data-dir",
        action="store_true",
        help="Keep the temporary user-data-dir after Chromium exits.",
    )
    parser.add_argument(
        "--extra-arg",
        action="append",
        default=[],
        help="Append an extra Chromium command-line argument. Can be repeated.",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Do not print the chrome command to stderr before running.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    created_user_data_dir = False
    if not args.user_data_dir:
        args.user_data_dir = create_temp_user_data_dir()
        created_user_data_dir = True
    else:
        args.user_data_dir = args.user_data_dir.resolve()

    try:
        command = build_command(args)
    except FileNotFoundError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if not args.quiet:
        print("running:", subprocess.list2cmdline(command), file=sys.stderr)

    returncode, stdout = run_chrome(command)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(stdout, encoding="utf-8")
        if not args.quiet:
            print(f"wrote DOM to: {args.output}", file=sys.stderr)
    else:
        print(stdout, end="")

    if looks_like_google_challenge(stdout):
        print(
            "warning: dumped DOM looks like a Google sorry/reCAPTCHA challenge, "
            "not normal search results.",
            file=sys.stderr,
        )

    if created_user_data_dir and not args.keep_user_data_dir:
        if not remove_tree_with_retry(args.user_data_dir) and not args.quiet:
            print(
                f"warning: could not delete temporary user-data-dir: "
                f"{args.user_data_dir}",
                file=sys.stderr,
            )
    elif created_user_data_dir and not args.quiet:
        print(f"kept temporary user-data-dir: {args.user_data_dir}", file=sys.stderr)

    return returncode


if __name__ == "__main__":
    raise SystemExit(main())
