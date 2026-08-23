import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';

import parseRouter from './routes/parse';
import recognizeRouter from './routes/recognize';
import downloadRouter from './routes/download';
import authRouter from './routes/auth';
import dataRouter from './routes/data';

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now(), env: process.env.NODE_ENV || 'dev' });
});

// 业务路由
app.use('/api/parse', parseRouter);
app.use('/api/recognize', recognizeRouter);
app.use('/api/download', downloadRouter);
app.use('/api/auth', authRouter);
app.use('/api/data', dataRouter);

// 静态前端（可选：部署时挂载 dist；Docker 中通过 BILIMEDIA_FRONTEND_DIST 指定）
const FE_DIST = process.env.BILIMEDIA_FRONTEND_DIST
  ? path.resolve(process.env.BILIMEDIA_FRONTEND_DIST)
  : path.resolve(__dirname, '../../bilimedia-frontend/dist');
try {
  const fs = require('fs');
  if (fs.existsSync(FE_DIST)) {
    app.use(express.static(FE_DIST));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(FE_DIST, 'index.html'));
    });
  }
} catch { /* ignore */ }

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server error]', err?.stack || err);
  res.status(500).json({ ok: false, message: err?.message || 'Internal Server Error' });
});

// 腾讯云 CloudBase / 云函数需要导出 app
export default app;

// 直接运行时启动监听
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BiliMedia Backend 已启动: http://localhost:${PORT}`);
  });
}
