import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@bibliotecario/ui-web': path.resolve(__dirname, '../../packages/ui-web/src'),
    },
    preserveSymlinks: true,
  },
  server: {
    fs: {
      // permite servir node_modules e packages na raiz do monorepo
      allow: [
        '..',
        path.resolve(__dirname, '../../'),
        path.resolve(__dirname, '../../packages/ui-web'),
        path.resolve(__dirname, '../../node_modules'),
      ],
    },
    proxy: {
      // /rss/eventos -> https://www.bertrand.pt/feeds/eventos
      '/rss': {
        target: 'https://www.bertrand.pt',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/rss/, '/feeds'),
      },
    },
  },
  optimizeDeps: {
    exclude: ['@bibliotecario/ui-web'],
  },
})
