# BiliMedia

> B 站视频高清解析下载 + 网易云背景音乐识别 SaaS 应用

粘贴 B 站视频链接，一键获取视频信息、多档清晰度下载，并智能识别视频所用的背景音乐（网易云音乐），支持在线试听与下载。开箱即用，**国内无代理环境也能完整使用全部功能**。

- 🌐 在线体验（GitHub Pages）：<https://roderickwilliams.github.io/BiliMedia/>
- ⚡ Vercel 后端：<https://bili-media.vercel.app>
- 🔁 Deno Deploy 反代（国内中转）：<https://eerie-sheep-3515.roderickwilliams.deno.net>

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
  - [一键启动（Windows）](#一键启动windows)
  - [手动启动](#手动启动)
- [部署指南](#部署指南)
  - [部署到 Vercel](#部署到-vercel)
  - [部署到 GitHub Pages](#部署到-github-pages)
  - [部署 Deno Deploy 反代](#部署-deno-deploy-反代国内无代理用户)
- [环境变量](#环境变量)
- [API 文档](#api-文档)
- [国内无代理访问说明](#国内无代理访问说明)
- [常见问题](#常见问题)
- [License](#license)

---

## 功能特性

### 🎬 B 站视频解析下载

- 支持 BV 号 / AV 号链接自动识别
- 自动提取视频元信息：标题、UP 主、封面、时长、发布日期、播放量、简介
- 多档清晰度可选：4K（2160P）/ 2K（1440P）/ 1080P / 720P
- 文件大小预估
- 服务端流式代理下载，自动处理 Referer 校验和防盗链
- 支持 HTTP Range 断点续传

### 🎵 网易云背景音乐识别

- 基于视频标题 + UP 主信息智能清洗关键词，过滤"4K/1080P/官方/完整版"等噪声词
- 多策略匹配网易云音乐曲库，返回匹配度评分
- 展示歌曲名、艺人、专辑、封面、时长
- 在线试听 + MP3 下载

### 👤 用户系统

- 注册 / 登录（JWT 鉴权，30 天有效期）
- 密码 SHA-256 + 每用户随机盐值哈希
- 下载历史、音乐识别记录、收藏夹本地持久化

### 🎨 产品体验

- React 18 + TypeScript + Tailwind CSS 4，响应式现代 UI
- Inter 字体本地化，**不依赖 Google Fonts**，国内打开不白屏
- 暗色主题、侧边栏导航、卡片式布局
- 纯前端 SPA，支持客户端路由

---

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 18、TypeScript 5、Vite 5、Tailwind CSS 4、Axios、Lucide Icons |
| 后端（Serverless） | Vercel Node.js Functions、TypeScript |
| 后端（本地开发） | Express 5、ts-node、Nodemon |
| 反代 | Deno Deploy（TypeScript，Deno.serve） |
| 数据存储 | GitHub Contents API（JSON 文件，无数据库） |
| 鉴权 | 自实现 HMAC-SHA256 JWT（`node:crypto`） |
| CI/CD | GitHub Actions（构建 + 部署 GitHub Pages） |
| 外部 API | Bilibili Web API、网易云音乐 Web API |

---

## 项目结构

```
BiliMedia/
├── api/                            # Vercel Serverless Functions
│   ├── parse.ts                    #   视频解析
│   ├── recognize.ts                #   音乐识别
│   ├── data.ts                     #   用户数据读写（历史/收藏）
│   ├── auth/
│   │   ├── login.ts                #   登录
│   │   └── register.ts             #   注册
│   └── download/
│       ├── video.ts                #   视频流式下载代理
│       └── music.ts                #   音乐流式下载代理
├── lib/                            # 服务端共享模块
│   ├── bilibili.ts                 #   B 站 API 封装（视频信息 + 播放源）
│   ├── netease.ts                  #   网易云 API 封装（搜索 + 详情 + 试听）
│   ├── http.ts                     #   HTTP 客户端封装
│   ├── jwt.ts                      #   JWT 签发/校验 + 密码哈希
│   └── storage.ts                  #   GitHub Contents API 持久化
├── deno-proxy/
│   └── main.ts                     # Deno Deploy 反代（国内中转 Vercel）
├── bilimedia-frontend/             # 前端项目（React + Vite）
│   ├── src/
│   │   ├── components/             #   UI 组件（Sidebar/Topbar/VideoCard/MusicList...）
│   │   ├── pages/                  #   页面（Home/DownloadHistory/MusicHistory/Favorites/Settings）
│   │   ├── services/
│   │   │   ├── api.ts              #     Axios 实例 + API 调用封装
│   │   │   └── auth.tsx            #     Auth Context
│   │   ├── assets/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css               #   Tailwind + 本地 @font-face
│   ├── public/fonts/               #   Inter 字体 woff2（本地化）
│   ├── index.html
│   ├── vite.config.mts             #   支持 PAGES_DEPLOY 切换 base 路径
│   └── package.json
├── bilimedia-backend/              # 本地开发用 Express 后端
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   └── services/
│   └── package.json
├── .github/workflows/
│   └── deploy-pages.yml            # GitHub Actions：构建并部署到 GitHub Pages
├── start-BiliMedia.bat             # Windows 一键启动脚本
├── deploy-gh-pages.mjs             # GitHub Pages 部署辅助脚本
├── vercel.json                     # Vercel 部署配置
├── tsconfig.json
└── package.json
```

---

## 快速开始

### 环境要求

- **Node.js** ≥ 18（推荐 20.x）
- **npm** ≥ 9
- Windows / macOS / Linux

### 一键启动（Windows）

项目根目录提供了 `start-BiliMedia.bat`，会自动完成以下工作：

1. 定位 Node.js（优先 `F:\项目\_tools\nodejs`，再查系统 PATH）
2. 在独立窗口启动 Express 后端（`http://localhost:5000`）
3. 在独立窗口启动 Vite 前端（`http://localhost:5173`）
4. 5 秒后自动打开浏览器

```cmd
start-BiliMedia.bat
```

关闭对应窗口即可停止服务。

### 手动启动

**1. 克隆仓库**

```bash
git clone https://github.com/RoderickWilliams/BiliMedia.git
cd BiliMedia
```

**2. 启动后端**

```bash
cd bilimedia-backend
npm install
npm run dev
# 后端运行在 http://localhost:5000
```

**3. 启动前端（新开终端）**

```bash
cd bilimedia-frontend
npm install
npm run dev
# 前端运行在 http://localhost:5173
```

Vite 已配置代理：`/api/*` 请求会自动转发到 `http://localhost:5000`，无需额外配置跨域。

打开浏览器访问 <http://localhost:5173> 即可使用。

---

## 部署指南

项目支持三种独立部署，按需组合：

### 部署到 Vercel

Vercel 同时承载前端静态资源和 Serverless API。

1. Fork 本仓库到你的 GitHub 账号
2. 登录 [vercel.com](https://vercel.com)，点击 **New Project** 导入仓库
3. Vercel 会自动读取根目录的 `vercel.json`：
   - 构建命令：`cd bilimedia-frontend && npm install && npm run build`
   - 输出目录：`bilimedia-frontend/dist`
   - API 函数：`api/**/*.ts`（超时 60 秒）
4. （可选）在 Project Settings → Environment Variables 配置环境变量（见[环境变量](#环境变量)）
5. 点击 Deploy，等待构建完成
6. 部署成功后通过 `https://<your-project>.vercel.app` 访问

> **注意**：`vercel.json` 中的 SPA 重写规则会将所有非 `/api` 路径回退到 `index.html`，支持客户端路由。

### 部署到 GitHub Pages

GitHub Pages 仅托管前端静态资源，API 请求直接打到 Vercel 或 Deno 反代。

仓库已配置 GitHub Actions 工作流（`.github/workflows/deploy-pages.yml`），推送到 `main` 分支会自动：

1. 使用 Node 22 安装依赖
2. 以 `PAGES_DEPLOY=1` 构建（自动设置 `base: '/BiliMedia/'`，并生成 `404.html` 用于 SPA 回退）
3. 通过 `configure-pages` / `upload-pages-artifact` / `deploy-pages` 部署

**首次使用前需要在 GitHub 仓库设置中开启 Pages：**

1. 进入仓库 **Settings → Pages**
2. **Build and deployment → Source** 选择 **GitHub Actions**
3. 推送代码到 `main` 分支，等待 Actions 构建完成
4. 访问 `https://<username>.github.io/BiliMedia/`

> **Action 版本兼容性**：项目已将所有 action 升级到 Node 24 兼容版本（checkout@v5、setup-node@v5、configure-pages@v6、upload-pages-artifact@v5、deploy-pages@v5），避免 GitHub runner 强制升级导致的构建失败。

### 部署 Deno Deploy 反代（国内无代理用户）

Deno Deploy 在国内网络下可达，用于中转对 Vercel 的 API 请求。

1. 注册 [Deno Deploy](https://deno.com/deploy)
2. 创建新项目，选择 **Deploy from GitHub** 或直接粘贴 `deno-proxy/main.ts`
3. 入口文件设为 `deno-proxy/main.ts`
4. 部署后获得 `https://<your-app>.deno.dev` 域名
5. 修改 `bilimedia-frontend/src/services/api.ts` 中的反代地址常量，或通过后续配置使其指向你的域名

反代会将所有请求原样转发到 `https://bili-media.vercel.app`，并补齐 CORS 头，支持流式响应透传。

---

## 环境变量

在 Vercel 项目设置中配置以下环境变量（均为可选，不配置时有合理兜底）：

| 变量名 | 说明 | 默认值 |
| --- | --- | --- |
| `BILIMEDIA_JWT_SECRET` | JWT 签名密钥 | 内置演示密钥（**生产环境务必修改**） |
| `BILIMEDIA_STORAGE_TOKEN` | GitHub Personal Access Token，用于数据持久化 | 内置兜底 Token |
| `BILIMEDIA_STORAGE_REPO` | 数据存储的 GitHub 仓库（`owner/repo`） | `RoderickWilliams/BiliMedia` |
| `BILIMEDIA_STORAGE_BRANCH` | 数据存储分支 | `main` |
| `GITHUB_TOKEN` | Vercel 自动注入的 GitHub Token（Vercel 集成时可用） | — |
| `GITHUB_REPOSITORY` | Vercel 自动注入的仓库名 | — |

> **数据存储说明**：项目使用 GitHub Contents API 读写仓库中的 `data/store.json` 和 `data/users.json`，无需数据库。如果没有配置 Token，会降级到进程内内存缓存（重启丢失），但不影响首次体验。

---

## API 文档

所有 API 均接受 JSON 请求，返回统一格式：

```typescript
// 成功
{ "ok": true, "data": { ... } }
// 失败
{ "ok": false, "message": "错误信息" }
```

### `POST /api/parse` — 解析 B 站视频

**请求体**

```json
{ "url": "https://www.bilibili.com/video/BVxxxxx" }
```

**响应**

```json
{
  "ok": true,
  "data": {
    "bvid": "BV...",
    "cid": 123456,
    "title": "视频标题",
    "author": "UP主",
    "cover": "https://...",
    "duration": 300,
    "durationText": "05:00",
    "pubdate": "2026-01-01",
    "description": "...",
    "views": 10000,
    "defaultVideoUrl": "...",
    "qualityOptions": [
      { "qn": 80, "label": "1080P 高清", "sub": "1080P", "available": true, "sizeEstimateMB": 114 }
    ],
    "playQnMap": { "80": "https://..." }
  }
}
```

### `POST /api/recognize` — 识别背景音乐

**请求体**

```json
{ "title": "视频标题", "author": "UP主" }
```

**响应**

```json
{
  "ok": true,
  "data": {
    "accuracy": 85.5,
    "total": 5,
    "list": [
      {
        "id": 12345,
        "name": "歌曲名",
        "artists": "艺人",
        "album": "专辑",
        "cover": "https://...",
        "duration": 240,
        "durationText": "04:00",
        "mp3Url": "https://...",
        "available": true,
        "source": "网易云音乐",
        "matchScore": 0.92
      }
    ]
  }
}
```

### `GET /api/download/video` — 视频下载代理

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `bvid` | string | ✅ | 视频 BV 号 |
| `cid` | number | ✅ | 视频 CID |
| `qn` | number | ❌ | 清晰度码（默认 80=1080P） |
| `filename` | string | ❌ | 下载文件名（不含扩展名） |

返回 `video/mp4` 流式响应，支持 Range 请求。

### `GET /api/download/music` — 音乐下载代理

**Query 参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `url` | string | ✅ | 音乐 MP3 URL（需 URL 编码） |
| `name` | string | ❌ | 下载文件名 |

返回 `audio/mpeg` 流式响应。

### `POST /api/auth/register` — 注册

```json
{ "username": "user", "email": "user@example.com", "password": "xxx" }
```

返回 JWT Token 和用户信息。

### `POST /api/auth/login` — 登录

```json
{ "username": "user", "password": "xxx" }
```

### `GET /api/data?bucket=<bucket>` — 读取用户数据

需要 `Authorization: Bearer <token>` 头。`bucket` 可选值：`downloads`、`music`、`favorites`、`all`。

### `POST /api/data?bucket=<bucket>` — 写入用户数据

```json
{ "record": { ... } }
```

---

## 国内无代理访问说明

项目针对国内无系统代理的新电脑做了以下专项优化：

1. **Inter 字体本地化**：移除了对 `fonts.googleapis.com` 的依赖，5 个字重的 woff2 文件放在 `public/fonts/`，通过 CSS `@font-face` 本地加载，避免页面白屏。
2. **Deno Deploy 反代**：前端 `resolveApiBase()` 会根据当前域名自动选择 API 入口：
   - `localhost` / `*.vercel.app` → 直接走 `/api` 同源
   - `github.io` 等其他域名 → 走 Vercel 直连或 Deno 反代
3. **CORS 全开放**：所有 Serverless Function 设置 `Access-Control-Allow-Origin: *`，支持任意域名前端跨域调用。
4. **GitHub Actions 已适配 Node 24**：不会因 runner 升级导致构建失败。

---

## 常见问题

### Q: 视频解析失败？

B 站对未登录用户的高清晰度（4K/2K/1080P+）有限制，部分视频可能只返回 720P 或 480P。可以尝试更换视频链接，或在后端配置 B 站登录 Cookie（需二次开发）。

### Q: 音乐识别不准？

识别基于标题关键词匹配，视频标题中如果含有大量噪声词（如音效、翻唱、remix 等）可能影响准确度。算法已对常见清晰度标签（4K/1080P/超清）和修饰词（官方/完整版/MV）做了过滤，但无法做到 100% 准确。

### Q: Vercel 被限流？

Vercel 免费版有函数调用频率限制（Hobby 计划每月 100,000 次）。如果触发限流，前端会通过 Deno Deploy 反代重试。长期大量使用建议升级 Vercel Pro 或自行部署后端。

### Q: 本地开发时 `npm install` 报 esbuild 错误？

确保 `node` 在系统 PATH 中。Windows 用户可以直接使用项目根目录的 `start-BiliMedia.bat`，它会自动处理 PATH。如果 Node.js 未安装，推荐放到 `F:\项目\_tools\nodejs\`（与 bat 脚本同级目录的 `_tools`）。

### Q: 数据存在哪里？

默认通过 GitHub Contents API 存在仓库的 `data/` 目录下（JSON 文件）。你也可以配置 `BILIMEDIA_STORAGE_TOKEN` / `BILIMEDIA_STORAGE_REPO` 使用自己的仓库。未配置 Token 时降级到内存存储，重启数据丢失。

### Q: 如何修改 JWT 密钥？

在 Vercel 环境变量中设置 `BILIMEDIA_JWT_SECRET` 为一个随机字符串即可。修改后所有已签发的 Token 会失效，用户需要重新登录。

---

## License

MIT © BiliMedia
