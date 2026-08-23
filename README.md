# BiliMedia

> B 站视频高清解析下载 + 网易云背景音乐识别 SaaS 应用

粘贴 B 站视频链接，一键获取视频信息、多档清晰度下载，并智能识别视频所用的背景音乐（网易云音乐），支持在线试听与下载。

## 在线体验

| 部署方式 | 地址 | 说明 |
| --- | --- | --- |
| 全栈（腾讯云 Docker） | 待部署 | 国内 IP，B 站解析 + 音乐识别全部可用，国内外均可访问 |
| 前端（GitHub Pages） | <https://roderickwilliams.github.io/BiliMedia/> | 静态页面，需配合腾讯云 API 使用 |

> ⚠️ **重要**：B 站 API 对海外 IP 返回 `-404 啥都木有`，网易云音乐搜索 API 同样对海外 IP 返回空结果。因此后端**必须部署在国内服务器上**（推荐腾讯云）。腾讯云域名从海外也可访问，服务器以国内 IP 请求 B 站 API，国内外用户均可正常使用。

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [部署指南](#部署指南)
  - [Docker 部署（推荐）](#docker-部署推荐)
  - [腾讯云 CloudBase 云托管](#腾讯云-cloudbase-云托管)
  - [部署到 GitHub Pages](#部署到-github-pages)
- [环境变量](#环境变量)
- [API 文档](#api-文档)
- [网络架构说明](#网络架构说明)
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
- 下载历史、音乐识别记录、收藏夹持久化

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
| 后端 | Express 5、TypeScript、tsc 编译 |
| 容器化 | Docker（多阶段构建，Node 20 Alpine） |
| 数据存储 | 本地 JSON 文件（默认）或 GitHub Contents API |
| 鉴权 | 自实现 HMAC-SHA256 JWT（`node:crypto`） |
| CI/CD | GitHub Actions（构建 + 部署 GitHub Pages） |
| 外部 API | Bilibili Web API、网易云音乐 Web API |

---

## 项目结构

```
BiliMedia/
├── bilimedia-frontend/             # 前端项目（React + Vite）
│   ├── src/
│   │   ├── components/             #   UI 组件
│   │   ├── pages/                  #   页面
│   │   ├── services/
│   │   │   ├── api.ts              #     Axios 实例 + API 封装
│   │   │   └── auth.tsx            #     Auth Context
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/fonts/               #   Inter 字体 woff2（本地化）
│   ├── index.html
│   ├── vite.config.mts
│   └── package.json
├── bilimedia-backend/              # Express 后端
│   ├── src/
│   │   ├── index.ts                #   Express 入口
│   │   ├── routes/
│   │   │   ├── parse.ts            #     视频解析
│   │   │   ├── recognize.ts        #     音乐识别
│   │   │   ├── download.ts         #     下载代理
│   │   │   ├── auth.ts             #     登录/注册
│   │   │   └── data.ts             #     用户数据 CRUD
│   │   └── services/
│   │       ├── bilibili.ts         #     B 站 API
│   │       ├── netease.ts          #     网易云 API
│   │       ├── jwt.ts              #     JWT 服务
│   │       └── storage.ts          #     本地 JSON + GitHub 双模式存储
│   └── package.json
├── .github/workflows/
│   └── deploy-pages.yml            # GitHub Actions → Pages
├── Dockerfile                      # 根级 Dockerfile（前后端一体镜像）
├── .dockerignore
├── .gitignore
├── start-BiliMedia.bat             # Windows 一键启动（本地开发）
└── README.md
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

### Docker 部署（推荐）

根目录 `Dockerfile` 是多阶段构建，将前端和后端打包为单个镜像：

- 阶段 1：构建前端（Vite → 静态文件）
- 阶段 2：编译后端（tsc → dist/）
- 阶段 3：Node 20 Alpine 运行时，后端同时提供 API 和前端静态页面

一个容器、一个端口（80），前后端同源，无需 CORS 配置。

**构建镜像：**

```bash
docker build -t bilimedia:latest .
```

**运行容器：**

```bash
docker run -d \
  --name bilimedia \
  -p 80:80 \
  -e BILIMEDIA_JWT_SECRET="your-random-secret-here" \
  -v bilimedia-data:/app/data \
  --restart unless-stopped \
  bilimedia:latest
```

访问 `http://<服务器IP>` 即可使用完整功能（前端 + API 同源）。

**环境变量：**

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `PORT` | 监听端口 | `80` |
| `BILIMEDIA_JWT_SECRET` | JWT 签名密钥 | 内置演示密钥（**生产务必修改**） |
| `BILIMEDIA_DATA_DIR` | 本地 JSON 存储目录 | `/app/data` |
| `BILIMEDIA_FRONTEND_DIST` | 前端静态文件路径 | `/app/public`（Docker 默认） |
| `BILIMEDIA_STORAGE_TOKEN` | GitHub PAT（配置后走 GitHub 存储） | 无（走本地 JSON） |
| `BILIMEDIA_STORAGE_REPO` | GitHub 仓库 `owner/repo` | `RoderickWilliams/BiliMedia` |
| `BILIMEDIA_STORAGE_BRANCH` | 数据存储分支 | `main` |

> 未配置 `BILIMEDIA_STORAGE_TOKEN` 时，数据写入容器内 `/app/data` 目录（JSON 文件）。使用 Docker volume 可确保持久化。

### 腾讯云 CloudBase 云托管

腾讯云 CloudBase 云托管支持直接从 GitHub 仓库或容器镜像部署，自带国内 CDN 域名和免费额度。服务器使用国内 IP 出口，B 站解析和网易云音乐识别均可正常工作。腾讯云域名从海外也可访问，无需为海外用户做特殊处理。

**方式一：从 GitHub 仓库部署**

1. 登录 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 创建云托管环境（或使用已有环境）
3. 进入 **云托管 → 服务列表 → 新建服务**
4. 部署方式选择 **GitHub 仓库**，授权并选择 `BiliMedia` 仓库
5. 端口填 `80`
6. 高级配置中添加环境变量 `BILIMEDIA_JWT_SECRET`
7. 部署完成后获得 `https://<service>-<env>.tcloudbaseapp.com` 域名

**方式二：用 Docker 镜像部署**

```bash
# 在本地构建并推送到腾讯云容器镜像服务（TCR）
docker build -t bilimedia:latest .
docker tag bilimedia:latest ccr.ccs.tencentyun.com/<your-namespace>/bilimedia:latest
docker push ccr.ccs.tencentyun.com/<your-namespace>/bilimedia:latest
```

然后在 CloudBase 控制台选择 **镜像拉取**，填入 TCR 镜像地址。

> 根级 Dockerfile 已将前后端打包到同域，无需配置 `VITE_API_ORIGIN`。前端自动走同源 `/api`。

### 部署到 GitHub Pages

GitHub Pages 仅托管前端静态资源。如果同时使用腾讯云 Docker 全栈部署，前端页面和 API 在腾讯云域名下同源访问，GitHub Pages 仅作为备用入口。

仓库已配置 GitHub Actions 工作流，推送到 `main` 分支自动构建部署：

1. 进入仓库 **Settings → Pages**
2. **Source** 选择 **GitHub Actions**
3. 推送代码，等待 Actions 完成
4. 访问 `https://<username>.github.io/BiliMedia/`

> 如果前端部署在 GitHub Pages 而后端在腾讯云，需要在构建时设置 `VITE_API_ORIGIN=https://your-tencent-domain`。可在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中添加 `VITE_API_ORIGIN` 变量，并在 workflow 的 build 步骤中传入。

---

## 环境变量

### Express / Docker 后端

| 变量名 | 说明 | 默认值 |
| --- | --- | --- |
| `PORT` | HTTP 监听端口 | `5000`（开发）/ `80`（Docker） |
| `BILIMEDIA_JWT_SECRET` | JWT 签名密钥 | 内置演示密钥 |
| `BILIMEDIA_DATA_DIR` | 本地 JSON 数据目录 | `./data` |
| `BILIMEDIA_FRONTEND_DIST` | 前端静态文件目录 | 自动推断 |
| `BILIMEDIA_STORAGE_TOKEN` | GitHub PAT（配置后走 GitHub 存储） | 无 |
| `BILIMEDIA_STORAGE_REPO` | 数据仓库 `owner/repo` | `RoderickWilliams/BiliMedia` |
| `BILIMEDIA_STORAGE_BRANCH` | 数据分支 | `main` |
| `NETEASE_API_BASE` | 网易云 API 地址（可选） | 内置默认值 |

### 前端构建时

| 变量名 | 说明 |
| --- | --- |
| `VITE_API_ORIGIN` | 后端 API 地址（前后端不同域时设置，如 GitHub Pages + 腾讯云 API） |

前端 API 地址解析逻辑：

1. 如果设置了 `VITE_API_ORIGIN`，使用该地址 + `/api`
2. 否则使用同源 `/api`（Docker 同域部署、本地开发 Vite 代理均走此路径）

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
    "defaultVideoUrl": "https://...",
    "qualityOptions": [
      { "qn": 80, "label": "1080P 高清", "sub": "1080P", "available": true, "sizeEstimateMB": 114 }
    ],
    "playQnMap": { "80": "https://..." }
  }
}
```

### `POST /api/recognize` — 识别背景音乐

```json
{ "title": "视频标题", "author": "UP主" }
```

返回匹配度评分、歌曲列表（含网易云试听/下载 URL）。

### `GET /api/download/video` — 视频下载代理

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `bvid` | string | ✅ | BV 号 |
| `cid` | number | ✅ | CID |
| `qn` | number | ❌ | 清晰度码（默认 80=1080P） |
| `filename` | string | ❌ | 下载文件名 |

返回 `video/mp4` 流式响应，支持 Range。

### `GET /api/download/music` — 音乐下载代理

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `url` | string | ✅ | 音乐 MP3 URL（URL 编码） |
| `name` | string | ❌ | 文件名 |

返回 `audio/mpeg` 流式响应。

### `POST /api/auth/register` — 注册

```json
{ "username": "user", "email": "user@example.com", "password": "xxx" }
```

### `POST /api/auth/login` — 登录

```json
{ "username": "user", "password": "xxx" }
```

### `GET /api/data?bucket=<bucket>` — 读取用户数据

需要 `Authorization: Bearer <token>`。`bucket`：`downloads`、`music`、`favorites`、`all`。

### `POST /api/data?bucket=<bucket>` — 写入用户数据

```json
{ "record": { ... } }
```

### `GET /health` — 健康检查

```json
{ "ok": true, "ts": 1787462072386, "env": "production" }
```

---

## 网络架构说明

### 为什么海外服务器不能解析 B 站？

B 站 API（`api.bilibili.com`）会校验请求来源 IP：

- **国内 IP**：返回 `code: 0`，完整视频数据
- **海外 IP**：返回 `code: -404`，message: `"啥都木有"`

网易云音乐搜索 API 同样对海外 IP 返回空结果。因此后端必须部署在国内服务器上。

### 推荐部署架构

```
用户（国内 / 海外）
    │
    │  访问腾讯云域名（国内外均可解析）
    │
    ▼
腾讯云 Docker 容器（国内 IP 出口）
    ├── 前端静态页面（同源）
    ├── API 接口
    │
    ├── api.bilibili.com     ✅ 国内 IP 直连
    └── music.126.com        ✅ 国内 IP 直连
```

腾讯云服务器以国内 IP 请求 B 站和网易云 API，无论用户来自国内还是海外，功能均正常可用。

---

## 常见问题

### Q: 视频解析返回"啥都木有"？

这是 B 站 API 对海外 IP 的封锁响应。解决方法：将后端部署到国内服务器（腾讯云、阿里云等）。本地开发（国内 IP）不会有此问题。

### Q: 音乐识别返回 0 条结果？

网易云音乐搜索 API 同样对海外 IP 有限制。和视频解析一样，需要国内 IP 的后端。

### Q: 高清晰度视频不可用？

B 站对未登录用户的高清晰度（4K/2K/1080P+）有限制，部分视频可能只返回 720P。可在后端配置 B 站登录 Cookie（需二次开发）。

### Q: 数据存在哪里？

默认写入本地 JSON 文件（`BILIMEDIA_DATA_DIR`），配置 GitHub Token 后走 GitHub Contents API。Docker 部署时建议挂载 volume 持久化 `/app/data` 目录。

### Q: 如何修改 JWT 密钥？

设置环境变量 `BILIMEDIA_JWT_SECRET` 为随机字符串。修改后所有已签发 Token 失效。

### Q: Windows 本地启动时 Start-Process 报错？

PowerShell 的 `Start-Process` 在修改了 `$env:PATH` 后可能因 Path/PATH 重复键报错。直接使用项目提供的 `start-BiliMedia.bat`，或用 `cmd.exe /c` 包装启动命令。

---

## License

MIT © BiliMedia
