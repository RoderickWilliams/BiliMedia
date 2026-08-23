# BiliMedia

B 站视频高清解析下载与视频背景音乐识别的 SaaS 应用，基于 React 18 + TypeScript + Vite 前端与 Vercel Serverless Functions 后端构建，集成 Bilibili 视频解析、网易云音乐识别、用户系统与跨入口数据同步能力。

## 目录

- [在线访问](#在线访问)
- [核心功能](#核心功能)
- [技术架构](#技术架构)
- [项目结构](#项目结构)
- [环境要求](#环境要求)
- [本地开发](#本地开发)
- [构建产物](#构建产物)
- [部署指南](#部署指南)
- [一键部署脚本](#一键部署脚本)
- [环境变量参考](#环境变量参考)
- [API 接口说明](#api-接口说明)
- [已知限制](#已知限制)
- [许可证](#许可证)

## 在线访问

项目部署两个独立入口，共享同一后端服务与持久化存储，任一入口注册的账号与产生的历史记录在另一入口均可访问。

| 部署入口         | URL                                                | 适用场景                                  |
| ---------------- | -------------------------------------------------- | ----------------------------------------- |
| Vercel           | <https://bili-media.vercel.app>                    | 海外 IP 或开启代理的网络环境，API 同源访问 |
| GitHub Pages     | <https://roderickwilliams.github.io/BiliMedia/>    | 国内直连环境，API 经 Deno Deploy 反代中转 |

> 由于 `*.vercel.app` 域名在中国大陆存在 DNS 污染，国内无代理网络环境下推荐使用 GitHub Pages 入口。该入口的前端会自动将 API 请求转发至 Deno Deploy 反代地址，由反代服务中转至 Vercel 后端。

## 核心功能

### 视频解析与下载

- 支持 BV/AV 号链接解析，返回视频标题、封面、时长、UP 主、播放量等元数据
- 调用 Bilibili `playurl` 接口获取 4K / 2K / 1080P / 720P 多档清晰度直链
- 下载直链实时拉取，避免链接过期

### 视频音乐识别

- 输入视频标题与 UP 主信息，在网易云音乐曲库匹配对应歌曲
- 返回候选列表，包含歌曲名、艺术家、专辑、封面、时长、匹配度
- 支持直接下载可用的 MP3 音源

### 用户系统

- 注册 / 登录基于 HMAC-SHA256 JWT 鉴权，有效期 30 天
- 密码使用 SHA-256 + 每用户 salt 存储
- 用户数据（下载历史、识别历史、收藏夹）通过 GitHub Contents API 持久化至仓库 JSON 文件
- 跨入口数据一致：Vercel 与 GitHub Pages 共用同一后端与存储层

### 网络兼容

- 前端根据访问域名动态切换 API 源
  - `localhost` / `*.vercel.app`：使用相对路径 `/api`，同源访问
  - 其他域名（GitHub Pages 等）：使用 Deno Deploy 反代绝对地址
- Deno Deploy 反代服务负责转发请求至 Vercel 后端并补齐 CORS 头

## 技术架构

### 前端

- **框架**：React 18 + TypeScript
- **构建工具**：Vite 5
- **样式**：Tailwind CSS v4
- **图标**：lucide-react
- **HTTP 客户端**：axios
- **路由**：基于条件渲染的页面切换

### 后端

- **运行时**：Vercel Serverless Functions（Node.js 22）
- **API 协议**：RESTful JSON，统一响应格式 `{ ok: boolean, data?: T, message?: string }`
- **鉴权**：JWT（HMAC-SHA256，自实现，无第三方依赖）
- **持久化**：GitHub Contents API 读写仓库 JSON 文件，无独立数据库
- **备用后端**：`bilimedia-backend/` 提供 Express 版本，用于本地开发

### 跨域与反代

- 所有 Serverless Function 响应均包含 `Access-Control-Allow-Origin: *`
- Deno Deploy 反代（`deno-proxy/main.ts`）负责：
  - 转发请求至 Vercel 上游
  - 补齐 CORS 响应头
  - 透传流式响应（视频/音乐下载）

### 持久化存储

`lib/storage.ts` 通过 GitHub Contents API 读写仓库内 `data/users.json` 与 `data/store.json`：

- `data/users.json`：用户账号信息
- `data/store.json`：用户数据，结构为 `{ downloads: [], music: [], favorites: [] }`

凭证来源优先级：

1. `BILIMEDIA_STORAGE_TOKEN` + `BILIMEDIA_STORAGE_REPO`（显式配置）
2. `GITHUB_TOKEN` + `GITHUB_REPOSITORY`（Vercel 环境变量）
3. 内置兜底 Token（仅适用于当前部署，生产环境应通过环境变量覆盖）

未配置 Token 时自动降级为进程内内存缓存，重启后数据丢失。

## 项目结构

```
BiliMedia/
├── api/                              # Vercel Serverless Functions
│   ├── auth/
│   │   ├── login.ts                  # 登录接口
│   │   └── register.ts               # 注册接口
│   ├── download/
│   │   ├── video.ts                  # 视频下载代理
│   │   └── music.ts                  # 音乐下载代理
│   ├── data.ts                       # 用户数据统一接口
│   ├── parse.ts                      # B 站视频解析
│   └── recognize.ts                  # 网易云音乐识别
├── lib/                              # 共享业务库（api/* 导入）
│   ├── bilibili.ts                   # Bilibili API 请求与 playurl 解析
│   ├── netease.ts                    # 网易云搜索、详情、音源获取
│   ├── jwt.ts                        # JWT 签发与校验、密码哈希
│   ├── http.ts                       # CORS、统一响应、Bearer Token 解析
│   └── storage.ts                    # GitHub Contents API 持久化存储
├── bilimedia-frontend/               # 前端应用
│   ├── src/
│   │   ├── components/               # Topbar / Sidebar / VideoCard / LoginModal 等
│   │   ├── pages/                    # Home / DownloadHistory / MusicHistory / Favorites / Settings
│   │   ├── services/
│   │   │   ├── api.ts                # API 客户端、下载链接构造、JWT 解析
│   │   │   └── auth.tsx              # AuthContext，JWT 全局状态管理
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.mts               # 根据 PAGES_DEPLOY 切换 base 路径与 404 回退
│   └── package.json
├── bilimedia-backend/                # 独立 Express 后端（本地开发可选）
│   ├── src/
│   │   ├── routes/                   # download / parse / recognize
│   │   ├── services/                 # bilibili / netease
│   │   └── index.ts
│   └── package.json
├── deno-proxy/main.ts                # Deno Deploy 反向代理
├── data/                             # 持久化 JSON 文件
│   ├── users.json
│   └── store.json
├── .github/workflows/deploy-pages.yml  # GitHub Actions 自动部署工作流
├── vercel.json                       # Vercel 构建、路由、函数配置
├── tsconfig.json                     # api + lib 的 TypeScript 配置
├── package.json                      # 根目录脚本与依赖
├── deploy.py                         # 一键部署脚本
├── deploy-gh-pages.mjs               # GitHub Pages 手动部署辅助脚本
└── start-BiliMedia.bat               # Windows 本地启动批处理
```

## 环境要求

- **Node.js**：22+（GitHub Actions 工作流与 Vercel 均使用 Node 22）
- **npm**：随 Node.js 安装（或使用 pnpm / yarn 替代）
- **Python**：3.8+（仅在使用 `deploy.py` 部署脚本时需要）
- **Git**：用于克隆仓库

## 本地开发

### 1. 克隆仓库

```bash
git clone https://github.com/RoderickWilliams/BiliMedia.git
cd BiliMedia
```

### 2. 安装依赖

```bash
# 根目录依赖（@vercel/node、axios 等）
npm install --no-audit --no-fund

# 前端依赖
cd bilimedia-frontend && npm install --no-audit --no-fund && cd ..

# 独立后端依赖（仅在使用 Express 版本时需要）
cd bilimedia-backend && npm install --no-audit --no-fund && cd ..
```

### 3. 配置环境变量

在仓库根目录创建 `.env` 文件，或通过系统环境变量设置：

```bash
# JWT 签名密钥（生产环境必须配置，否则使用内置默认值）
BILIMEDIA_JWT_SECRET=your-random-long-string

# 持久化存储凭证（不配置则降级为进程内内存，重启丢失）
BILIMEDIA_STORAGE_TOKEN=ghp_xxx         # 需要 contents 读写权限的 PAT
BILIMEDIA_STORAGE_REPO=RoderickWilliams/BiliMedia
BILIMEDIA_STORAGE_BRANCH=main
```

### 4. 启动开发服务

**方式 A：Vercel CLI（推荐，最接近线上环境）**

```bash
npm i -g vercel
vercel dev
# 默认监听 3000 端口，前端与 API 同源
```

**方式 B：前后端分离启动**

```bash
# 终端 1：后端（5000 端口）
cd bilimedia-backend && npm start

# 终端 2：前端（5173 端口，Vite 代理 /api -> localhost:5000）
cd bilimedia-frontend && npm run dev
```

浏览器访问 <http://localhost:5173>。

## 构建产物

```bash
# 在仓库根目录执行
npm run build
# 产物位于 bilimedia-frontend/dist
```

GitHub Pages 构建时通过 `PAGES_DEPLOY=1` 环境变量切换：

- `base` 设置为 `/BiliMedia/`（仓库名子路径）
- 生成 `404.html` 作为 SPA 路由回退

## 部署指南

### Vercel 部署

1. Fork 仓库至个人 GitHub 账号
2. 登录 Vercel，选择 **Add New → Project**
3. 导入 Fork 后的仓库
4. Vercel 自动读取根目录 `vercel.json`：
   - 执行 `buildCommand`：安装前端依赖并构建
   - 设置 `outputDirectory`：`bilimedia-frontend/dist`
   - 识别 `api/**/*.ts` 为 Serverless Functions
   - 应用 SPA rewrites：非 `/api/*` 路径回退至 `/index.html`
5. 在 Vercel 项目设置中配置环境变量（`BILIMEDIA_JWT_SECRET`、`BILIMEDIA_STORAGE_TOKEN` 等）

### GitHub Pages 部署

GitHub Actions 工作流 `.github/workflows/deploy-pages.yml` 在以下事件触发：

- push 到 `main` 分支
- 手动触发（`workflow_dispatch`）

工作流执行步骤：

1. Checkout 代码
2. 安装 Node 22 与根目录、前端依赖
3. 以 `PAGES_DEPLOY=1` 构建前端
4. 生成 `404.html` 作为 SPA 回退
5. 通过 `actions/configure-pages@v6` 配置 Pages
6. 通过 `actions/upload-pages-artifact@v5` 上传构件
7. 通过 `actions/deploy-pages@v5` 部署至 GitHub Pages

前置条件：

- 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**
- 推送工作流文件的 Token 需具备 `workflow` scope

### Deno Deploy 反代部署

1. 在 Deno Deploy 创建新项目
2. 关联 GitHub 仓库，入口选择 `deno-proxy/main.ts`
3. 部署后获得 `*.deno.net` 地址
4. 将该地址写入 `bilimedia-frontend/src/services/api.ts` 的 `DENO_PROXY_ORIGIN` 常量
5. 重新部署 Vercel 与 GitHub Pages

## 一键部署脚本

`deploy.py` 通过 GitHub Contents API 直接推送文件，绕过国内 `git push` 网络问题。

```bash
# 同步本地修改至 GitHub，触发 Vercel 与 Actions 自动构建
python deploy.py

# 仅执行端到端健康检查（Pages / Vercel / Deno + API 全链路）
python deploy.py --health

# 手动构建前端并推送至 gh-pages 分支（Actions 失败时的备用路径）
python deploy.py --pages-manual
```

环境变量：

| 变量名             | 说明                                          | 默认值                       |
| ------------------ | --------------------------------------------- | ---------------------------- |
| `GITHUB_TOKEN`     | GitHub PAT，需 `contents` 与 `workflow` 权限  | 无（必填）                   |
| `BILIMEDIA_REPO`   | 仓库名称                                      | `RoderickWilliams/BiliMedia` |
| `BILIMEDIA_BRANCH` | 分支名称                                      | `main`                       |

## 环境变量参考

| 变量名                       | 作用                                 | 必填 | 默认值                              |
| ---------------------------- | ------------------------------------ | ---- | ----------------------------------- |
| `BILIMEDIA_JWT_SECRET`       | JWT 签名密钥                         | 否   | 内置默认值（生产环境必须覆盖）      |
| `BILIMEDIA_STORAGE_TOKEN`    | GitHub PAT，用于持久化存储           | 否   | 内置兜底 Token                      |
| `BILIMEDIA_STORAGE_REPO`     | 存储目标仓库                         | 否   | `RoderickWilliams/BiliMedia`        |
| `BILIMEDIA_STORAGE_BRANCH`   | 存储目标分支                         | 否   | `main`                              |
| `GITHUB_TOKEN`               | Vercel 环境下的备用存储凭证          | 否   | 无                                  |
| `GITHUB_REPOSITORY`          | Vercel 环境下的备用仓库名            | 否   | 无                                  |

## API 接口说明

所有接口响应统一格式：`{ ok: boolean, data?: T, message?: string }`，均包含 CORS 头。

| 方法   | 路径                  | 鉴权 | 说明                                    |
| ------ | --------------------- | ---- | --------------------------------------- |
| POST   | `/api/auth/register`  | 否   | 注册账号，返回 JWT                      |
| POST   | `/api/auth/login`     | 否   | 登录，返回 JWT                          |
| POST   | `/api/parse`          | 否   | 解析 B 站视频，返回元数据与多档直链     |
| POST   | `/api/recognize`      | 否   | 识别视频背景音乐，返回网易云候选列表   |
| GET    | `/api/data`           | 是   | 读取用户数据（downloads/music/favorites）|
| POST   | `/api/data`           | 是   | 新增用户数据记录                        |
| DELETE | `/api/data`           | 是   | 删除用户数据记录                        |
| GET    | `/api/download/video` | 否   | 视频下载代理，流式响应                  |
| GET    | `/api/download/music` | 否   | 音乐下载代理，流式响应                  |

## 已知限制

1. **B 站风控**：`/api/parse` 调用 Bilibili API 时，出口 IP（Vercel / Deno Deploy 或本地网络）可能触发风控，返回错误或空数据。海外节点与家用宽带 IP 成功率较高，切换网络环境或更换时段通常可恢复。

2. **网易云音源**：受版权与登录态影响，部分歌曲可能返回 `mp3Url = null`，候选列表仍可用于在网易云客户端手动搜索。

3. **存储写入频率**：GitHub Contents API 通过 commit 实现写入，存在速率限制。高并发写入场景可能触发 409 冲突，`lib/storage.ts` 内置重试机制但仍有上限。

4. **Token 权限**：推送 `.github/workflows/*.yml` 文件的 Token 必须具备 `workflow` scope，否则 API 调用返回 403。

## 许可证

MIT License
