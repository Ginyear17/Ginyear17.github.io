import { defineConfig } from 'vite'
import { cpSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))

// 这些资源是在 JS 字符串里拼接路径引用的（Vite 无法静态分析），
// 构建时原样复制到 dist，不做哈希处理：
// - assets/music  音乐播放器的 mp3 / 封面（music-card.js 中字符串引用）
// - vendors       lunar-javascript 农历库（经典 <script> 标签引入）
const staticDirs = ['assets/music', 'vendors']

// 多页应用（MPA）入口：每个 HTML 页面都是一个入口
export default defineConfig({
  base: '/', // 部署在 ginyear17.github.io 根域名下
  server: {
    // 开发时把 /api 转发到本地 FastAPI（npm run dev 时后端需在 8000 端口运行）
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(rootDir, 'index.html'),
        about: resolve(rootDir, 'pages/about/index.html'),
        album: resolve(rootDir, 'pages/album/index.html'),
        blogAliyunDdns: resolve(rootDir, 'pages/blog/aliyun_ddns.html'),
        board: resolve(rootDir, 'pages/board/index.html'),
        moments: resolve(rootDir, 'pages/moments/index.html'),
        momentsNote: resolve(rootDir, 'pages/moments/write_a_note.html'),
      },
    },
  },
  plugins: [
    {
      name: 'copy-static-assets',
      apply: 'build',
      closeBundle() {
        for (const dir of staticDirs) {
          cpSync(resolve(rootDir, dir), resolve(rootDir, 'dist', dir), {
            recursive: true,
          })
        }
        cpSync(resolve(rootDir, 'sitemap.xml'), resolve(rootDir, 'dist/sitemap.xml'))
      },
    },
  ],
})
