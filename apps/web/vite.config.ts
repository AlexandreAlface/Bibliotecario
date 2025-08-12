import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
   plugins: [react()],
   resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    dedupe: ['@emotion/react', '@emotion/styled'] ,
    preserveSymlinks: true
  },
  server: {
     fs: {  allow: [ path.resolve(__dirname, '../../') ] } 
  },
})

 
