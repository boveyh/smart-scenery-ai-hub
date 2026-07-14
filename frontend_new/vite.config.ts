import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@framework': path.resolve(__dirname, '../CubismSdkForWeb-5-r.5/Framework/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        headers: { 'X-Tenant-Id': 'ling_shan' },
      },
      '/static/audio': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:9000',
        ws: true,
      },
    },
  },
})
