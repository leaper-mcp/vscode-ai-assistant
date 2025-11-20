import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: 'webview',
  build: {
    outDir: '../out/webview',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})