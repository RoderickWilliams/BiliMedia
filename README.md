# BiliMedia

BiliMedia — B站视频高清解析下载 + 视频背景音乐网易云音乐识别 + 一键下载的 SaaS 应用。

## 在线体验

| 部署入口      | URL                                                | 适用场景                                                |
| ------------- | -------------------------------------------------- | ------------------------------------------------------- |
| **Vercel**    | https://bili-media.vercel.app                      | 海外 IP / 有代理；所有 API 同源访问                     |
| **GitHub Pages** | https://roderickwilliams.github.io/BiliMedia/   | **国内无代理用户（推荐）**；API 经 Deno Deploy 反代中转 |

> 数据同步说明：两个入口共用同一个后端（Vercel Serverless Functions），所以在任意一处注册/登录、下载/收藏记录都会在另一处看到同一用户的数据。

## 功能

- 📺 **B站视频解析**：粘贴任意含 BV/AV 号的链接，解析视频标题、封面、时长、UP主、多档清晰度直链
- 📥 **视频下载**：4K / 2K / 1080P / 720P 多档选择，实时拉取直链避免过期
- 🎵 **视频音乐识别**：输入视频标题+UP主，在网易云音乐曲库匹配对应歌曲并给出候选
- 🔊 **音乐下载**：网易云音乐支持的歌曲可直接下载 MP3
- 👤 **用户系统**：注册/登录（JWT），下载历史、音乐识别历史、收藏夹云端同步
- 🌏 **国内无代理访问**：GitHub Pages + Deno Deploy 反代，无需梯子即可使用完整功能

## 项目结构

```
BiliMedia/
├── api/                          # Vercel Serverless Functions（7 个端点）
│   ├── auth/login.ts
│   ├── auth/register.ts
│   ├── data.ts                   # 下载/音乐/收藏统一数据接口
│   ├── download/music.ts
│   ├── download/video.ts
│   ├── parse.ts                  # B站视频解析
│   └── recognize.ts              # 网易云音乐识别
├── lib/                          # 共享业务库（供 api/* 导入）
│   ├── bilibili.ts               # Bilibili 公共请求 + playurl
│   ├── http.ts                   # CORS / ok/fail / bearer 工具
│   ├── jwt.ts                    # HMAC-SHA256 JWT + 密码哈希
│   ├── netease.ts                # 网易云搜索 + 详情 + 音源
│   └── storage.ts                # GitHub Contents API 持久化存储
├── bilimedia-frontend/           # React 18 + TypeScript + Vite + Tailwind v4
│   ├── src/components/           # Topbar / Sidebar / VideoCard / LoginModal ...
│   ├── src/pages/                # Home / DownloadHistory / MusicHistory / Favorites / Settings
│   ├── src/services/api.ts       # API 客户端 & 下载链接构造
│   ├── src/services/auth.tsx     # AuthContext（JWT 全局状态）
│   ├── vite.config.mts           # 根据 PAGES_DEPLOY 切换 base='/BiliMedia/'
│   └── package.json
├── bilimedia-backend/            # 独立后端（可选，本地用）
├── deno-proxy/main.ts            # Deno Deploy 反代（国内无代理中转）
├── data/                         # 存储 JSON（users.json、store.json）
├── .github/workflows/deploy-pages.yml   # GitHub Actions 自动构建 + 部署 Pages
├── vercel.json                   # Vercel 构建/路由/函数配置
├── tsconfig.json                 # api + lib 的 TypeScript 配置
├── package.json                  # 根目录通用脚本（含 build）
└── deploy.py                     # 一键部署脚本（Contents API 绕过 git push）
```

## 别人如何克隆并本地运行

### 0. 前置要求

- Node.js **22+**（工作流和 Vercel 均使用 Node 22）
- npm（或 pnpm/yarn 自行替换）
- 可选：Vercel 账号（本地运行不需要）；GitHub 账号（克隆公共仓库不需要）

### 1. 克隆

```bash
git clone https://github.com/RoderickWilliams/BiliMedia.git
cd BiliMedia
```

### 2. 安装依赖（一次性）

```bash
# 根目录（@vercel/node + axios + 根脚本）
npm install --no-audit --no-fund
# 前端
cd bilimedia-frontend && npm install --no-audit --no-fund && cd ..
# 后端（本地想跑 Express 版时执行）
cd bilimedia-backend && npm install --no-audit --no-fund && cd ..
```

### 3. 配置环境变量（可选，影响存储方式）

在 BiliMedia 根目录新建 `.env`（或在系统环境变量中设置）：

```
# JWT 签名密钥（强烈建议生产设置，否则会使用内置值）
BILIMEDIA_JWT_SECRET=随便一串长字符串

# 存储后端：GitHub Contents API 持久化（不设置则降级为服务器内存，重启丢失）
BILIMEDIA_STORAGE_TOKEN=ghp_xxx                # 需要 contents 权限的 PAT
BILIMEDIA_STORAGE_REPO=RoderickWilliams/BiliMedia
BILIMEDIA_STORAGE_BRANCH=main
```

> **说明**：
> - 如果不设置 `BILIMEDIA_STORAGE_TOKEN`，`lib/storage.ts` 会自动降级为**进程内内存**。本地试用完全没问题，但进程重启后用户/数据会丢失。
> - 如果使用 GitHub 作为存储，Token 需要至少 `contents: read&write` 权限。

### 4. 本地开发

**方式 A：使用 Vercel 函数模拟（推荐，最接近线上）**

```bash
# 安装 Vercel CLI（一次性）
npm i -g vercel
# 首次执行会让你选择项目，选 bili-media 或按提示连接
vercel dev
# 默认监听 3000：前端 + api 都有
```

**方式 B：前端 + 本地 Express 后端**

```bash
# 终端 1（后端，5000 端口）
cd bilimedia-backend && npm start
# 终端 2（前端，5173 端口，Vite 代理已把 /api -> localhost:5000）
cd bilimedia-frontend && npm run dev
```

然后浏览器打开 http://localhost:5173

### 5. 本地构建

```bash
# 在仓库根目录执行
npm run build
# 前端产物位于 bilimedia-frontend/dist
```

## 别人如何部署到自己的账号

### 一键部署 Vercel

将仓库 Fork 到自己 GitHub → 登录 Vercel → **Add New → Project** → 导入 Fork 后的仓库 → 直接 Deploy 即可。Vercel 会读取仓库根目录的 `vercel.json`，自动：

1. 执行 `buildCommand`（安装前端依赖并构建）
2. 设置 `outputDirectory=bilimedia-frontend/dist` 作为静态产物
3. 识别 `api/**/*.ts` 为 Serverless Functions
4. 应用 SPA rewrites（所有非 `/api/*` 的路径回到 `/index.html`）

### 一键部署 GitHub Pages

GitHub Actions 工作流 `.github/workflows/deploy-pages.yml` 会在 push 到 `main` 或手动触发时：

1. 使用 Node 22 安装根和前端依赖
2. 以 `PAGES_DEPLOY=1` 构建（vite.config.mts 把 `base` 切换为 `/<仓库名>/`）
3. 通过 `actions/deploy-pages@v5` 部署到 GitHub Pages

需要先在 GitHub 仓库的 **Settings → Pages → Source** 选择 **GitHub Actions**。

### 一键部署 Deno 反代（国内无代理用户体验用）

1. 在 Deno Deploy 创建新项目，选择从 GitHub 仓库的 `deno-proxy/main.ts` 部署
2. 将获得的 `*.deno.net` URL 写入前端 `bilimedia-frontend/src/services/api.ts` 的 `DENO_PROXY_ORIGIN` 常量
3. 重新部署 Vercel / GitHub Pages

## 一键部署脚本（自动化工具）

如果国内网络导致 `git push` 不稳定，直接使用：

```bash
python deploy.py                # 同步所有修改 -> GitHub Contents API -> 触发 Vercel + Actions
python deploy.py --health       # 仅健康检查（Pages/Vercel/Deno + 7条 API 全链路）
python deploy.py --pages-manual # 额外手动推送 dist -> gh-pages（Actions 失败时的兜底）
```

依赖：仅 Python 3.8+，无需第三方包。通过 GitHub Contents API 直接 PUT，不走 git 协议。

## 已知限制 & 提示

1. **B站风控**：`/api/parse` 解析 B 站视频时，调用方的出口 IP（Vercel / Deno Deploy 或你本地网络）会被 Bilibili 风控，可能返回「啥都木有」或 code != 0 的错误。这种情况是 B 站的服务器端防盗链，通常**切换网络环境或更换时段即可**。海外节点、家用宽带 IP 成功率更高。
2. **网易云音源**：受版权、登录态影响，部分歌曲可能返回 `mp3Url = null`，但歌曲候选仍然可用，用户可去网易云客户端自行搜索。
3. **Token workflow 权限**：当前 `ghp_...` Token 缺少 GitHub 官方 `workflow` scope，导致**工作流 YAML 文件无法通过 API 推送**。如需修改 `.github/workflows/*.yml`，请：
   - 在 GitHub Web UI 手动编辑，或
   - 生成**带 workflow scope 的新 PAT**，设置到 `GITHUB_TOKEN` 环境变量后再运行 `deploy.py` 或 `git push`。

## 维护小抄

| 想做什么                                      | 命令/入口                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| 修改前端后重新部署                           | `python deploy.py`（等 1-3 分钟 Vercel + Pages 自动重建）                   |
| 验证三个入口是否都可用                       | `python deploy.py --health`                                                  |
| 本地构建前端产物                              | 根目录执行 `npm run build`，产物在 `bilimedia-frontend/dist`                 |
| 本地启动 dev server                           | `vercel dev` 或（前后端分离）两个 `npm start / npm run dev`                 |
| 修改 Deno 反代 URL                            | 改 `bilimedia-frontend/src/services/api.ts` 的 `DENO_PROXY_ORIGIN`           |
| 检查 Vercel 部署日志                          | https://vercel.com/bili-media/bili-media/deployments                         |
| 检查 Pages 工作流运行日志                     | https://github.com/RoderickWilliams/BiliMedia/actions/workflows/deploy-pages.yml |
