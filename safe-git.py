#!/usr/bin/env python3
"""Guarded pull/push wrapper for flattened Chromium source repositories."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
import subprocess
import sys

from generated_paths import FULL_CLEAN_PATHS, LOCAL_EXCLUDE_ENTRIES, PROTECTED_GIT_PATHS


DEFAULT_REMOTE = "origin"
EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"


@dataclass(frozen=True)
class PathStatus:
    status: str
    paths: tuple[str, ...]

    def display(self) -> str:
        if len(self.paths) == 2:
            return f"{self.status} {self.paths[0]} -> {self.paths[1]}"
        if self.paths:
            return f"{self.status} {self.paths[0]}"
        return self.status


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


def run_git(source: Path, args: list[str]) -> None:
    log("Running git " + " ".join(args))
    result = subprocess.run(git_command(source, args))
    if result.returncode != 0:
        fail(f"git {' '.join(args)} failed with exit code {result.returncode}")


def git_output(source: Path, args: list[str]) -> str:
    result = subprocess.run(
        git_command(source, args),
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    return result.stdout


def git_output_or_none(source: Path, args: list[str]) -> str | None:
    result = subprocess.run(
        git_command(source, args),
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    if result.returncode != 0:
        return None
    return result.stdout


def git_success(source: Path, args: list[str]) -> bool:
    result = subprocess.run(
        git_command(source, args),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return result.returncode == 0


def git_output_bytes(source: Path, args: list[str]) -> bytes:
    result = subprocess.run(
        git_command(source, args),
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout


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


def ensure_local_git_exclude(source: Path, entries: tuple[str, ...]) -> int:
    missing = missing_local_git_exclude_entries(source, entries)
    if not missing:
        return 0

    exclude_file = git_dir_path(source) / "info" / "exclude"
    existing = exclude_file.read_text(encoding="utf-8") if exclude_file.exists() else ""
    with exclude_file.open("a", encoding="utf-8") as handle:
        if existing and not existing.endswith("\n"):
            handle.write("\n")
        for entry in missing:
            handle.write(f"{entry}\n")
    return len(missing)


def tracked_paths(source: Path, pathspecs: tuple[str, ...]) -> list[str]:
    data = git_output_bytes(source, ["ls-files", "-z", "--", *pathspecs])
    return sorted(path for path in data.decode("utf-8").split("\0") if path)


def batched(values: list[str], size: int = 100) -> list[list[str]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def untrack_paths(source: Path, paths: list[str]) -> None:
    for batch in batched(paths):
        run_git(source, ["rm", "--cached", "-r", "-f", "--", *batch])


def clean_index(
    source: Path, pathspecs: tuple[str, ...], dry_run: bool = False
) -> list[str]:
    paths = tracked_paths(source, pathspecs)
    if paths and not dry_run:
        untrack_paths(source, paths)
    return paths


def parse_name_status(text: str) -> list[PathStatus]:
    statuses: list[PathStatus] = []
    for line in text.splitlines():
        if not line:
            continue
        parts = line.split("\t")
        statuses.append(PathStatus(parts[0], tuple(parts[1:])))
    return statuses


def diff_name_status(
    source: Path, base: str, target: str, pathspecs: tuple[str, ...]
) -> list[PathStatus]:
    output = git_output(source, ["diff", "--name-status", base, target, "--", *pathspecs])
    return parse_name_status(output)


def staged_name_status(
    source: Path, pathspecs: tuple[str, ...]
) -> list[PathStatus]:
    output = git_output(source, ["diff", "--cached", "--name-status", "--", *pathspecs])
    return parse_name_status(output)


def unstaged_name_status(
    source: Path, pathspecs: tuple[str, ...]
) -> list[PathStatus]:
    output = git_output(source, ["diff", "--name-status", "--", *pathspecs])
    return parse_name_status(output)


def changed_statuses(statuses: list[PathStatus]) -> list[PathStatus]:
    return [status for status in statuses if not status.status.startswith("D")]


def print_statuses(title: str, statuses: list[PathStatus]) -> None:
    if not statuses:
        return
    log(title)
    for status in statuses:
        print(f"  {status.display()}")


def upstream_ref(source: Path) -> str | None:
    output = git_output_or_none(
        source, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]
    )
    if output is None:
        return None
    ref = output.strip()
    return ref or None


def current_branch(source: Path) -> str:
    branch = git_output(source, ["branch", "--show-current"]).strip()
    if not branch:
        fail("detached HEAD is not supported by safe-git")
    return branch


def remote_ref_exists(source: Path, remote_ref: str) -> bool:
    return git_success(source, ["rev-parse", "--verify", "--quiet", f"{remote_ref}^{{commit}}"])


def merge_base(source: Path, left: str, right: str) -> str:
    return git_output(source, ["merge-base", left, right]).strip()


def select_remote_branch(
    source: Path, remote: str, branch: str | None
) -> tuple[str, str]:
    if branch:
        return branch, f"{remote}/{branch}"

    upstream = upstream_ref(source)
    if upstream:
        prefix = f"{remote}/"
        if upstream.startswith(prefix):
            return upstream[len(prefix) :], upstream
        return current_branch(source), upstream

    local_branch = current_branch(source)
    return local_branch, f"{remote}/{local_branch}"


def ensure_clean_for_pull(source: Path) -> None:
    status = git_output(source, ["status", "--porcelain"]).strip()
    if status:
        fail(
            "working tree has local changes; commit/stash them before safe pull\n"
            + status
        )


def ensure_no_protected_local_modifications(source: Path) -> None:
    staged_bad = changed_statuses(staged_name_status(source, PROTECTED_GIT_PATHS))
    unstaged_bad = changed_statuses(unstaged_name_status(source, PROTECTED_GIT_PATHS))
    if staged_bad:
        print_statuses("Protected paths staged for add/modify:", staged_bad)
    if unstaged_bad:
        print_statuses("Protected paths modified in the working tree:", unstaged_bad)
    if staged_bad or unstaged_bad:
        fail(
            "protected generated/toolchain paths are modified. "
            "Run safe-git clean, commit the cleanup, then retry."
        )


def check_remote_for_pull(
    source: Path, remote_ref: str, allow_protected: bool
) -> list[PathStatus]:
    if not remote_ref_exists(source, remote_ref):
        fail(f"remote ref was not found after fetch: {remote_ref}")

    base = merge_base(source, "HEAD", remote_ref)
    protected = diff_name_status(source, base, remote_ref, PROTECTED_GIT_PATHS)
    bad = changed_statuses(protected)
    if bad and not allow_protected:
        print_statuses("Incoming protected path changes:", bad)
        fail(
            "refusing to pull because the remote would add/modify generated "
            "or platform-specific toolchain files"
        )
    return protected


def check_outgoing_for_push(
    source: Path, remote_ref: str, allow_protected: bool
) -> list[PathStatus]:
    if remote_ref_exists(source, remote_ref):
        base = merge_base(source, "HEAD", remote_ref)
        protected = diff_name_status(source, base, "HEAD", PROTECTED_GIT_PATHS)
    else:
        protected = diff_name_status(source, EMPTY_TREE, "HEAD", PROTECTED_GIT_PATHS)

    bad = changed_statuses(protected)
    if bad and not allow_protected:
        print_statuses("Outgoing protected path changes:", bad)
        fail(
            "refusing to push because outgoing commits add/modify generated "
            "or platform-specific toolchain files"
        )
    return protected


def command_clean(args: argparse.Namespace) -> int:
    source = find_source_dir(args.src)
    missing_count = ensure_local_git_exclude(source, LOCAL_EXCLUDE_ENTRIES)
    paths = clean_index(source, FULL_CLEAN_PATHS, dry_run=args.dry_run)

    log(f"Source: {source}")
    if args.dry_run:
        log(f"Would add {missing_count} entries to .git/info/exclude")
        log(f"Would untrack {len(paths)} protected generated/toolchain path(s)")
        for path in paths:
            print(path)
        return 0

    if missing_count:
        log(f"Added {missing_count} entries to .git/info/exclude")
    if paths:
        log(f"Untracked {len(paths)} protected generated/toolchain path(s)")
        log("Commit the staged deletions once, then run safe-git push again")
    else:
        log("No tracked protected generated/toolchain paths matched")
    return 0


def command_pull(args: argparse.Namespace) -> int:
    source = find_source_dir(args.src)
    branch, remote_ref = select_remote_branch(source, args.remote, args.branch)
    missing_count = ensure_local_git_exclude(source, LOCAL_EXCLUDE_ENTRIES)
    if missing_count:
        log(f"Added {missing_count} entries to .git/info/exclude")

    ensure_clean_for_pull(source)
    run_git(source, ["fetch", args.remote])
    protected = check_remote_for_pull(source, remote_ref, args.allow_protected)

    if args.dry_run:
        print_statuses("Incoming protected path deletions allowed:", protected)
        log("Dry run complete; pull was not executed")
        return 0

    pull_args = ["pull", "--ff-only" if args.ff_only else "--rebase", args.remote, branch]
    run_git(source, pull_args)
    protected_deletions = [status for status in protected if status.status.startswith("D")]
    if protected_deletions:
        print_statuses("Pulled protected path deletions:", protected_deletions)
        log("Run sync-toolchain.py if local build tools need to be restored")
    return 0


def command_push(args: argparse.Namespace) -> int:
    source = find_source_dir(args.src)
    branch, remote_ref = select_remote_branch(source, args.remote, args.branch)
    missing_count = ensure_local_git_exclude(source, LOCAL_EXCLUDE_ENTRIES)
    if missing_count:
        log(f"Added {missing_count} entries to .git/info/exclude")

    if not args.skip_clean:
        paths = clean_index(source, FULL_CLEAN_PATHS, dry_run=args.dry_run)
        if paths and args.dry_run:
            log(f"Would untrack {len(paths)} protected generated/toolchain path(s)")
            for path in paths:
                print(path)
            return 0
        if paths:
            log(f"Untracked {len(paths)} protected generated/toolchain path(s)")
            fail("commit the staged cleanup deletions before pushing")

    ensure_no_protected_local_modifications(source)
    run_git(source, ["fetch", args.remote])
    protected = check_outgoing_for_push(source, remote_ref, args.allow_protected)
    protected_deletions = [status for status in protected if status.status.startswith("D")]
    if protected_deletions:
        print_statuses("Outgoing protected path deletions allowed:", protected_deletions)

    push_args = ["push"]
    if args.dry_run:
        push_args.append("--dry-run")
    push_args.extend([args.remote, f"HEAD:{branch}"])
    if args.set_upstream:
        push_args.insert(1, "-u")
    run_git(source, push_args)
    return 0


def command_check(args: argparse.Namespace) -> int:
    source = find_source_dir(args.src)
    branch, remote_ref = select_remote_branch(source, args.remote, args.branch)
    log(f"Source: {source}")
    log(f"Remote ref: {remote_ref}")
    ensure_no_protected_local_modifications(source)
    if args.fetch:
        run_git(source, ["fetch", args.remote])

    if remote_ref_exists(source, remote_ref):
        base = merge_base(source, "HEAD", remote_ref)
        incoming = diff_name_status(source, base, remote_ref, PROTECTED_GIT_PATHS)
        outgoing = diff_name_status(source, base, "HEAD", PROTECTED_GIT_PATHS)
        print_statuses("Incoming protected path changes:", incoming)
        print_statuses("Outgoing protected path changes:", outgoing)
    else:
        log(f"Remote ref does not exist yet: {remote_ref}")
    log("Check complete")
    return 0


def build_parser() -> argparse.ArgumentParser:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--src", help="Path to Chromium src. Default: auto-detect.")
    common.add_argument("--remote", default=DEFAULT_REMOTE, help="Git remote name.")
    common.add_argument("--branch", help="Remote branch name. Default: upstream/current.")
    common.add_argument(
        "--allow-protected",
        action="store_true",
        help="Allow protected generated/toolchain path modifications.",
    )

    parser = argparse.ArgumentParser(
        description="Safely pull or push a flattened Chromium src checkout."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    clean = subparsers.add_parser(
        "clean",
        parents=[common],
        help="Untrack generated/toolchain paths and update .git/info/exclude.",
    )
    clean.add_argument("--dry-run", action="store_true")
    clean.set_defaults(func=command_clean)

    pull = subparsers.add_parser(
        "pull", parents=[common], help="Fetch, scan incoming paths, then pull."
    )
    pull.add_argument("--ff-only", action="store_true", help="Use git pull --ff-only.")
    pull.add_argument("--dry-run", action="store_true", help="Fetch and scan only.")
    pull.set_defaults(func=command_pull)

    push = subparsers.add_parser(
        "push", parents=[common], help="Clean, scan outgoing paths, then push."
    )
    push.add_argument("--dry-run", action="store_true")
    push.add_argument("--skip-clean", action="store_true", help="Do not untrack paths.")
    push.add_argument("-u", "--set-upstream", action="store_true")
    push.set_defaults(func=command_push)

    check = subparsers.add_parser(
        "check", parents=[common], help="Inspect protected path changes."
    )
    check.add_argument("--fetch", action="store_true")
    check.set_defaults(func=command_check)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
