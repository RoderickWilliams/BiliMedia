#!/usr/bin/env python3
"""
BiliMedia 一键部署脚本（同时部署 Vercel + GitHub Pages + 同步缺失文件）
用法:
  python deploy.py                 # 同步本地修改到 GitHub（通过 Contents API，避免 git push 网络问题），触发 Vercel & Actions 自动构建
  python deploy.py --pages-manual  # 额外手动构建前端并推送 gh-pages（Actions 失败时的备份路径）
  python deploy.py --health        # 仅执行端到端健康检查，不推送

环境变量（可选）:
  GITHUB_TOKEN                    GitHub 个人访问令牌（需要 contents 权限；若需推送 workflow 需额外 workflow 权限）
  BILIMEDIA_REPO                  仓库名，默认 RoderickWilliams/BiliMedia
  BILIMEDIA_BRANCH                分支名，默认 main
"""
import argparse
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.environ.get("BILIMEDIA_REPO", "RoderickWilliams/BiliMedia")
BRANCH = os.environ.get("BILIMEDIA_BRANCH", "main")
API = "https://api.github.com"
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("BILIMEDIA_GITHUB_TOKEN") or ""
# 注意：请将 Token 放到环境变量 GITHUB_TOKEN，不要硬编码。
# 可在 Windows 中设置：$env:GITHUB_TOKEN="ghp_xxxx"
# 或在类 Unix 中设置：export GITHUB_TOKEN=ghp_xxxx
if not TOKEN:
    print("错误：未找到 GitHub Token，请设置环境变量 GITHUB_TOKEN。", file=sys.stderr)
    print("示例 (PowerShell):  $env:GITHUB_TOKEN=\"ghp_xxxxxxxx\" ; python deploy.py", file=sys.stderr)
    print("示例 (bash):        export GITHUB_TOKEN=ghp_xxxxxxxx && python deploy.py", file=sys.stderr)
    sys.exit(2)

# 本地到仓库相对路径的文件清单（相对 BiliMedia/）
SYNC_FILES = [
    "package.json",
    "vercel.json",
    "tsconfig.json",
    ".github/workflows/deploy-pages.yml",
    "api/parse.ts",
    "api/recognize.ts",
    "api/data.ts",
    "api/auth/login.ts",
    "api/auth/register.ts",
    "api/download/video.ts",
    "api/download/music.ts",
    "lib/http.ts",
    "lib/jwt.ts",
    "lib/bilibili.ts",
    "lib/netease.ts",
    "lib/storage.ts",
    "data/users.json",
    "data/store.json",
    "deno-proxy/main.ts",
]


def request(method, url, headers=None, body=None, timeout=30):
    rq = urllib.request.Request(url, method=method, headers=headers or {})
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        rq.data = data
        rq.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(rq, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace")


def gh():
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": "Bearer " + TOKEN,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "BiliMedia-deployer",
    }


def get_sha(repo_path):
    st, txt = request(
        "GET",
        f"{API}/repos/{REPO}/contents/{repo_path}?ref={BRANCH}",
        gh(),
    )
    if st == 200:
        try:
            return json.loads(txt).get("sha")
        except Exception:
            return None
    return None


def read_local(repo_path):
    if os.path.dirname(__file__).endswith("BiliMedia"):
        full = os.path.join(ROOT, repo_path)
    else:
        full = os.path.join(ROOT, "BiliMedia", repo_path)
    if not os.path.exists(full):
        print(f"  [SKIP] 本地不存在：{repo_path}")
        return None
    with open(full, "r", encoding="utf-8") as f:
        return f.read()


def sync_file(repo_path, idx, total):
    content = read_local(repo_path)
    if content is None:
        return False
    b64 = base64.b64encode(content.encode("utf-8")).decode("ascii")
    sha = get_sha(repo_path)
    body = {
        "message": f"chore(deploy): sync {repo_path}",
        "content": b64,
        "branch": BRANCH,
    }
    if sha:
        body["sha"] = sha
    url = f"{API}/repos/{REPO}/contents/{repo_path}"
    for attempt in range(4):
        st, txt = request("PUT", url, gh(), body)
        if 200 <= st < 300:
            verb = "UPDATED" if sha else "CREATED"
            print(f"  [{idx}/{total}] {verb}: {repo_path}")
            return True
        if 400 <= st < 500 and attempt < 3:
            time.sleep(2 * (attempt + 1))
            continue
        print(f"  [{idx}/{total}] FAIL {st}: {repo_path} -> {txt[:200]}")
        return False
    return False


def run_cmd(cmd, cwd=None, check=True, env=None):
    e = os.environ.copy()
    if env:
        e.update(env)
    print(f"  $ {cmd}")
    r = subprocess.run(cmd, shell=True, cwd=cwd, text=True, capture_output=True, env=e)
    if r.stdout:
        print(r.stdout)
    if r.stderr:
        print(r.stderr, file=sys.stderr)
    if check and r.returncode != 0:
        raise RuntimeError(f"命令失败: {cmd}")
    return r


def manual_deploy_pages():
    """构建前端并推送 dist 到 gh-pages 分支（备份方式，绕过 Actions）"""
    print("\n=== 手动部署 GitHub Pages ===")
    front = os.path.join(ROOT, "BiliMedia", "bilimedia-frontend")
    if not os.path.exists(front):
        print("  bilimedia-frontend 不存在，跳过手动 gh-pages")
        return
    run_cmd("npm install --no-audit --no-fund", cwd=front)
    run_cmd("npm run build", cwd=front, env={**os.environ, "PAGES_DEPLOY": "1"})
    dist = os.path.join(front, "dist")
    if not os.path.exists(os.path.join(dist, "index.html")):
        print("  dist/index.html 不存在，构建失败？")
        return
    # 使用 gh-pages 分支的方式：初始化临时 git 仓库于 dist 并强制推送
    cwd = dist
    run_cmd('git init && git checkout -b gh-pages && git add -A && git commit -m "deploy: pages"', cwd=cwd, check=False)
    remote = f"https://{TOKEN[:8]}...@{REPO.split('/')[0]}:x-access-token:{TOKEN}@github.com/{REPO}.git"
    # 更标准：使用 token 认证 https
    remote_clean = f"https://x-access-token:{TOKEN}@github.com/{REPO}.git"
    run_cmd(f'git remote add origin "{remote_clean}" || git remote set-url origin "{remote_clean}"', cwd=cwd, check=False)
    run_cmd("git push --force origin gh-pages", cwd=cwd, check=False)
    print("  gh-pages 分支已推送完成")


def health_check():
    VERCEL = "https://bili-media.vercel.app"
    DENO = "https://eerie-sheep-3515.roderickwilliams.deno.net"
    PAGES = "https://roderickwilliams.github.io/BiliMedia"
    ORIGIN = "https://roderickwilliams.github.io"

    def req(method, url, headers=None, body=None):
        for _ in range(3):
            try:
                h = {"User-Agent": "BiliMedia-deployer"}
                if headers:
                    h.update(headers)
                data = None
                if body is not None:
                    data = json.dumps(body).encode("utf-8")
                    h["Content-Type"] = "application/json"
                rq = urllib.request.Request(url, method=method, headers=h, data=data)
                with urllib.request.urlopen(rq, timeout=25) as r:
                    return {"status": r.status, "cors": r.headers.get("Access-Control-Allow-Origin")}
            except Exception as e:
                err = str(e)
                time.sleep(1.5)
        return {"error": err}

    print("\n=== 端到端健康检查 ===")
    cases = [
        ("Pages 首页", req("GET", PAGES + "/"), [200]),
        ("Vercel 首页", req("GET", VERCEL + "/"), [200]),
        ("Deno 反代 首页", req("GET", DENO + "/"), [200]),
    ]
    for a in [
        "/api/auth/register", "/api/auth/login",
        "/api/parse", "/api/recognize", "/api/data",
        "/api/download/video", "/api/download/music",
    ]:
        cases.append((f"Deno {a} OPTIONS", req("OPTIONS", DENO + a, {"Origin": ORIGIN}), [204], "*"))
        cases.append((f"Vercel {a} OPTIONS", req("OPTIONS", VERCEL + a, {"Origin": ORIGIN}), [204], "*"))

    passed = 0
    total = len(cases)
    for name, r, statuses, *cors in cases:
        expected_cors = cors[0] if cors else None
        ok = (r.get("status") in statuses)
        if expected_cors is not None:
            ok = ok and r.get("cors") == expected_cors
        if ok:
            passed += 1
            print(f"  [PASS] {name}: status={r.get('status')} cors={r.get('cors')}")
        else:
            print(f"  [FAIL] {name}: {r}")
    print(f"\n  通过: {passed}/{total}")
    return passed == total


def main():
    ap = argparse.ArgumentParser(description="BiliMedia 一键部署脚本")
    ap.add_argument("--health", action="store_true", help="仅健康检查，不推送")
    ap.add_argument("--pages-manual", action="store_true", help="手动构建并推送 gh-pages 分支")
    args = ap.parse_args()

    if args.health:
        ok = health_check()
        sys.exit(0 if ok else 1)

    print("=== BiliMedia 推送至 GitHub（Contents API）===")
    print(f"仓库: {REPO}  分支: {BRANCH}")
    total = len(SYNC_FILES)
    ok = 0
    for i, rp in enumerate(SYNC_FILES, 1):
        if sync_file(rp, i, total):
            ok += 1
        time.sleep(0.5)
    print(f"完成: {ok}/{total} 个文件")

    if args.pages_manual:
        manual_deploy_pages()

    # 推送后给 Vercel 与 Actions 一点时间启动，做健康检查
    print("\n等待 60 秒，让 Vercel/Actions 开始构建...")
    time.sleep(60)
    health_check()


if __name__ == "__main__":
    main()
