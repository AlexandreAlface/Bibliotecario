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
    dedupe: ['@emotion/react', '@emotion/styled'] 
  },
  server: {
   fs: {
      // ① adiciona a **root** do projecto (__dirname)  
      // ② e a pasta externa da biblioteca
      allow: [
        path.resolve(__dirname),                          // frontend
        path.resolve(__dirname, '..', 'bibliotecario-ui') // biblioteca linkada
      ],
      // opcional: desactiva o modo estrito se quiseres evitar dores de cabeça
      // strict: false,
    },
  },
})

 
