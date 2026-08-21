# BiliMedia

B站视频高清解析下载 + 网易云背景音乐识别 SaaS 应用。

## 功能

- **B站视频解析**：粘贴 B 站链接，自动提取视频信息（标题、UP主、封面、时长、播放量）
- **多清晰度下载**：支持 4K / 2K / 1080P / 720P 等多档清晰度下载
- **背景音乐识别**：基于视频标题智能匹配网易云音乐，提供在线试听和下载

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS
- **后端**：Vercel Serverless Functions (Node.js + TypeScript)
- **API**：Bilibili Web API + 网易云音乐 Web API

## 项目结构

```
BiliMedia/
├── api/                        # Vercel Serverless Functions
│   ├── parse.ts                # B站视频解析
│   ├── recognize.ts            # 网易云音乐识别
│   └── download/
│       ├── video.ts            # 视频下载代理
│       └── music.ts            # 音乐下载代理
├── lib/                        # 共享服务模块
│   ├── bilibili.ts             # B站 API 封装
│   └── netease.ts              # 网易云 API 封装
├── bilimedia-frontend/         # 前端项目 (React + Vite)
├── bilimedia-backend/          # 后端项目 (本地开发用 Express)
├── vercel.json                 # Vercel 部署配置
└── package.json                # 根依赖
```

## 本地开发

### 前端

```bash
cd bilimedia-frontend
npm install
npm run dev
```

### 后端 (本地 Express)

```bash
cd bilimedia-backend
npm install
npm run dev
```

## 部署 (Vercel)

1. 推送代码到 GitHub
2. 在 [vercel.com](https://vercel.com) 导入仓库
3. Vercel 自动识别配置，一键部署
4. 部署完成后通过 Vercel 提供的域名访问

## License

MIT
