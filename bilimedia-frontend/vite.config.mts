import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 通过环境变量切换部署目标：
// - Vercel 默认部署（base='/'）或本地开发：PAGES_DEPLOY 未设置
// - GitHub Pages 部署（仓库名子路径 + SPA 404 回退）：PAGES_DEPLOY=1
const isPages = process.env.PAGES_DEPLOY === '1'

// https://vite.dev/config/
export default defineConfig({
  base: isPages ? '/BiliMedia/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // GitHub Pages 构建时产出 404.html（与 index.html 内容一致），作为 SPA 未命中路径的回退
    rollupOptions: isPages
      ? {
          plugins: [
            {
              name: 'pages-404-fallback',
              generateBundle(_opts, bundle) {
                const indexHtml = bundle['index.html'];
                if (indexHtml && indexHtml.type === 'asset') {
                  this.emitFile({
                    type: 'asset',
                    fileName: '404.html',
                    source: indexHtml.source,
                  });
                }
              },
            },
          ],
        }
      : undefined,
  },
})
