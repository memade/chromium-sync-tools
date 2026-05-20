# Broium 跨平台安全同步流程

这份文档用于 Windows、macOS、Linux 三个平台共享同一份公司 `src`
源码仓库时的日常操作。核心原则是：

- `src` 仓库只提交源码和项目自定义改动。
- 各平台本地生成或下载的工具链、CIPD payload、PGO、sysroot、Node、
  `ninja`、`siso`、`cipd_client` 等不要提交到公司 Git。
- 日常更新和提交统一走 `sync/safe-git.py`，不要直接裸跑
  `git pull` / `git push`。
- 工具链同步统一走 `sync/sync-toolchain.py`，不要对 flattened source
  直接跑普通 `gclient sync`。

## 目录约定

推荐每个平台都使用同样的工作区结构：

```text
broium-workspace/
  src/     公司 Chromium 源码仓库
  sync/    同步和安全 Git 脚本仓库
```

下面命令都默认在 `broium-workspace` 目录下执行。

## 首次克隆

Linux/macOS:

```bash
mkdir broium-workspace
cd broium-workspace
git clone <公司 src 仓库地址> src
git clone <公司 sync 仓库地址> sync
```

Windows:

```bat
mkdir C:\work\broium-workspace
cd /d C:\work\broium-workspace
git config --global core.longpaths true
git clone <公司 src 仓库地址> src
git clone <公司 sync 仓库地址> sync
```

Windows 必须开启 `core.longpaths`，Chromium 路径很深，否则 checkout 或
build 时容易遇到路径长度问题。

## 安装基础工具

三个平台都需要：

- Git
- Python 3
- depot_tools，并确保 `gclient`、`gn`、`autoninja` 在 `PATH` 里

如果不想把 depot_tools 加进全局 `PATH`，后面的 `sync-toolchain.py` 可以
显式传入 `--depot-tools <depot_tools 路径>`。

## 首次同步平台工具链

Linux/macOS:

```bash
python3 sync/sync-toolchain.py --src src --repo-url <公司 src 仓库地址>
```

Windows:

```bat
py sync\sync-toolchain.py --src src --repo-url <公司 src 仓库地址>
```

如果找不到 `gclient`：

Linux/macOS:

```bash
python3 sync/sync-toolchain.py --src src --repo-url <公司 src 仓库地址> --depot-tools <depot_tools 路径>
```

Windows:

```bat
py sync\sync-toolchain.py --src src --repo-url <公司 src 仓库地址> --depot-tools C:\path\to\depot_tools
```

这个脚本会生成：

```text
broium-workspace/.gclient
broium-workspace/src/DEPS.toolchain
```

并同步当前平台需要的 Clang、Rust、GN/Ninja、Node、sysroot、PGO 等工具链
内容。这些内容是本机环境的一部分，不应该提交到 `src` 仓库。

## 日常拉取代码

以后更新源码，不要进入 `src` 后直接 `git pull`。统一使用：

Linux/macOS:

```bash
python3 sync/safe-git.py pull --src src
```

Windows:

```bat
py sync\safe-git.py pull --src src
```

`safe-git.py pull` 会先 `git fetch`，检查远端新增提交是否修改了受保护的
平台生成文件。如果发现远端会新增或修改这些路径，它会拒绝 pull，避免把
macOS 的 Mach-O 工具、Windows 的 exe/dll 工具或 Linux 的 ELF 工具互相覆盖。

检查通过后，它才会执行安全的 rebase pull。

## 日常提交代码

正常改源码后，先在 `src` 仓库提交：

Linux/macOS:

```bash
git -C src status
git -C src add <你的源码文件>
git -C src commit -m "<提交说明>"
python3 sync/safe-git.py push --src src
```

Windows:

```bat
git -C src status
git -C src add <你的源码文件>
git -C src commit -m "<提交说明>"
py sync\safe-git.py push --src src
```

不要直接 `git -C src push`。`safe-git.py push` 会在真正 push 前扫描即将推送
的提交，发现工具链、PGO、sysroot、`ninja`、`siso`、`cipd_client` 等平台
生成内容被新增或修改时会拒绝推送。

## 首次清理已被 Git 跟踪的平台文件

如果历史上已经把平台工具文件提交进 `src` 仓库，先在一台机器上做一次清理：

Linux/macOS:

```bash
python3 sync/safe-git.py clean --src src
git -C src commit -m "Stop tracking generated toolchain files"
python3 sync/safe-git.py push --src src
```

Windows:

```bat
py sync\safe-git.py clean --src src
git -C src commit -m "Stop tracking generated toolchain files"
py sync\safe-git.py push --src src
```

`clean` 会执行 `git rm --cached`，只把这些路径从 Git index 里移除，不删除你
本机磁盘上的文件。提交后，远端最终状态会变成“不再跟踪这些平台生成文件”。

其他机器 pull 到这个清理提交后，如果本地工具链缺东西，再运行一次：

Linux/macOS:

```bash
python3 sync/sync-toolchain.py --src src --repo-url <公司 src 仓库地址>
```

Windows:

```bat
py sync\sync-toolchain.py --src src --repo-url <公司 src 仓库地址>
```

## 编译入口

工具链同步完成后，再在 `src` 里生成和编译。

Linux:

```bash
cd src
gn gen out/release
autoninja -C out/release chrome
```

macOS:

```bash
cd src
gn gen out/release
autoninja -C out/release chrome
```

Windows:

```bat
cd src
gn gen out\release
autoninja -C out\release chrome
```

如果项目有固定 `args.gn` 模板，可以把 `sync/build/release/args.gn` 或
`sync/build/debug/args.gn` 复制到对应的 `out/.../args.gn` 后再运行 `gn gen`。

## 各平台日常命令速查

Linux:

```bash
python3 sync/safe-git.py pull --src src
python3 sync/sync-toolchain.py --src src --repo-url <公司 src 仓库地址>
python3 sync/safe-git.py push --src src
```

macOS:

```bash
python3 sync/safe-git.py pull --src src
python3 sync/sync-toolchain.py --src src --repo-url <公司 src 仓库地址>
python3 sync/safe-git.py push --src src
```

Windows:

```bat
py sync\safe-git.py pull --src src
py sync\sync-toolchain.py --src src --repo-url <公司 src 仓库地址>
py sync\safe-git.py push --src src
```

## 事故处理

如果有人误把平台工具推到了远端：

1. 不要继续裸 `git pull`。
2. 先在一台已修好的机器上运行：

```bash
python3 sync/safe-git.py clean --src src
git -C src commit -m "Remove generated platform toolchain files"
python3 sync/safe-git.py push --src src
```

Windows 用 `py sync\safe-git.py ...`。

3. 其他机器再执行：

```bash
python3 sync/safe-git.py pull --src src
python3 sync/sync-toolchain.py --src src --repo-url <公司 src 仓库地址>
```

Windows 同样替换成 `py sync\...`。

如果只是某台机器本地工具链坏了，但远端没问题，通常重新跑
`sync-toolchain.py` 即可。

## 禁止事项

不要在 flattened source 工作区直接执行：

```bash
git -C src pull
git -C src push
gclient sync
```

请改用：

```bash
python3 sync/safe-git.py pull --src src
python3 sync/safe-git.py push --src src
python3 sync/sync-toolchain.py --src src --repo-url <公司 src 仓库地址>
```

Windows 使用 `py sync\...`。这样可以避免各平台生成物污染公司源码仓库。
