# BiliMedia

> B 站视频高清解析下载 + 网易云背景音乐识别

粘贴 B 站视频链接，一键获取视频信息、多档清晰度下载，并智能识别视频所用的背景音乐（网易云音乐），支持在线试听与下载。

## 快速开始

### 方式一：Docker（最简单）

需要安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)。

```bash
git clone https://github.com/RoderickWilliams/BiliMedia.git
cd BiliMedia
docker compose up -d
```

浏览器打开 <http://localhost:5000>，完成。

停止服务：`docker compose down`

### 方式二：Node.js 一键启动

需要安装 [Node.js](https://nodejs.org/) 18+（安装时勾选 Add to PATH）。

**Windows：** 双击 `start.bat`，首次运行会自动安装依赖并构建，之后打开 <http://localhost:5000>。

**macOS / Linux：**

```bash
git clone https://github.com/RoderickWilliams/BiliMedia.git
cd BiliMedia

# 安装依赖 + 构建
cd bilimedia-backend && npm install && npm run build && cd ..
cd bilimedia-frontend && npm install && npm run build && cd ..

# 启动（后端同时提供 API 和前端页面）
cd bilimedia-backend
PORT=5000 NODE_ENV=production \
  BILIMEDIA_FRONTEND_DIST=../bilimedia-frontend/dist \
  BILIMEDIA_DATA_DIR=./data \
  node dist/index.js
```

浏览器打开 <http://localhost:5000>。

### 方式三：开发模式（前后端分离）

适合二次开发，前端热更新：

```bash
# 终端 1 - 后端
cd bilimedia-backend
npm install
npm run dev          # http://localhost:5000

# 终端 2 - 前端
cd bilimedia-frontend
npm install
npm run dev          # http://localhost:5173
```

Vite 已配置代理，`/api/*` 自动转发到后端 5000 端口。打开 <http://localhost:5173>。

> ⚠️ B 站和网易云 API 对海外 IP 有限制，视频解析和音乐识别需要在**国内网络环境**下使用（本机直连即可，无需代理）。

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
- Inter 字体本地化，不依赖 Google Fonts
- 暗色主题、侧边栏导航、卡片式布局
- 纯前端 SPA，支持客户端路由

---

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 18、TypeScript 5、Vite 5、Tailwind CSS 4、Axios |
| 后端 | Express 5、TypeScript |
| 容器化 | Docker（多阶段构建，Node 20 Alpine） |
| 数据存储 | 本地 JSON 文件（默认）或 GitHub Contents API |
| 鉴权 | 自实现 HMAC-SHA256 JWT（node:crypto） |
| 外部 API | Bilibili Web API、网易云音乐 Web API |

---

## 项目结构

```
BiliMedia/
├── bilimedia-frontend/             # 前端（React + Vite）
│   ├── src/
│   │   ├── components/             #   UI 组件
│   │   ├── pages/                  #   页面
│   │   ├── services/
│   │   │   ├── api.ts              #     Axios 实例 + API 封装
│   │   │   └── auth.tsx            #     Auth Context
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/fonts/               #   Inter 字体（本地化）
│   ├── index.html
│   ├── vite.config.mts
│   └── package.json
│
├── bilimedia-backend/              # 后端（Express）
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
│   │       └── storage.ts          #     本地 JSON / GitHub 双模式存储
│   └── package.json
│
├── .github/workflows/
│   └── deploy-pages.yml            # GitHub Actions → Pages
├── Dockerfile                      # 多阶段构建（前后端一体镜像）
├── docker-compose.yml              # Docker Compose 配置
├── .dockerignore
├── .gitignore
├── start.bat                       # Windows 一键启动
└── README.md
```

---

## 环境变量

### 后端

| 变量名 | 说明 | 默认值 |
| --- | --- | --- |
| `PORT` | HTTP 监听端口 | `5000` |
| `BILIMEDIA_JWT_SECRET` | JWT 签名密钥 | 内置演示密钥 |
| `BILIMEDIA_DATA_DIR` | 本地 JSON 数据目录 | `./data` |
| `BILIMEDIA_FRONTEND_DIST` | 前端静态文件目录 | 自动推断 |
| `BILIMEDIA_STORAGE_TOKEN` | GitHub PAT（配置后数据存 GitHub） | 无（存本地 JSON） |
| `BILIMEDIA_STORAGE_REPO` | 数据仓库 `owner/repo` | `RoderickWilliams/BiliMedia` |
| `BILIMEDIA_STORAGE_BRANCH` | 数据分支 | `main` |

### 前端构建时

| 变量名 | 说明 |
| --- | --- |
| `VITE_API_ORIGIN` | 后端 API 地址（前后端不同域时设置） |

前端 API 地址解析逻辑：设置了 `VITE_API_ORIGIN` 时使用该地址 + `/api`，否则使用同源 `/api`（Docker、本地开发均走此路径，无需配置）。

---

## API 文档

所有 API 返回统一格式：

```typescript
// 成功
{ "ok": true, "data": { ... } }
// 失败
{ "ok": false, "message": "错误信息" }
```

### `POST /api/parse` — 解析 B 站视频

```json
{ "url": "https://www.bilibili.com/video/BVxxxxx" }
```

返回视频标题、UP 主、封面、时长、清晰度选项及下载地址。

### `POST /api/recognize` — 识别背景音乐

```json
{ "title": "视频标题", "author": "UP主" }
```

返回匹配度评分和歌曲列表（含网易云试听/下载 URL）。

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

需要 `Authorization: Bearer <token>`。bucket：`downloads`、`music`、`favorites`、`all`。

### `POST /api/data?bucket=<bucket>` — 写入用户数据

```json
{ "record": { ... } }
```

### `GET /health` — 健康检查

```json
{ "ok": true, "ts": 1787462072386, "env": "production" }
```

---

## 常见问题

### Q: 视频解析返回"啥都木有"？

B 站 API 对海外 IP 返回 `-404`。请在国内网络环境下使用，关闭系统代理。

### Q: 音乐识别返回 0 条结果？

网易云搜索 API 同样对海外 IP 有限制，和视频解析一样需要国内 IP。

### Q: 高清晰度视频不可用？

B 站对未登录用户的高清晰度（4K/2K）有限制，部分视频可能只返回 1080P 或 720P。

### Q: 数据存在哪里？

默认写入本地 JSON 文件（`bilimedia-backend/data/`）。配置 GitHub Token 后可走 GitHub Contents API 远程存储。Docker 部署时数据通过 named volume 持久化。

### Q: start.bat 提示找不到 Node.js？

请安装 [Node.js](https://nodejs.org/) 18+，安装时务必勾选 "Add to PATH"，安装后重新打开命令行再运行。

### Q: Docker 方式如何修改端口？

编辑 `docker-compose.yml`，将 `"5000:80"` 中的 `5000` 改为想要的端口即可。

---

## License

MIT © BiliMedia
