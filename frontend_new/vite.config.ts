import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const AI_ENGINE_TARGET = 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@framework': path.resolve(__dirname, '../CubismSdkForWeb-5-r.5/Framework/src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api/v1/vision': {
        target: AI_ENGINE_TARGET,
        changeOrigin: true,
        timeout: 60000,
      },
      '/api/v1/digitalhuman': {
        target: AI_ENGINE_TARGET,
        changeOrigin: true,
        timeout: 60000,
      },
      '/api/v1/asr': {
        target: AI_ENGINE_TARGET,
        changeOrigin: true,
        timeout: 60000,
      },
      '/api/v1/tts': {
        target: AI_ENGINE_TARGET,
        changeOrigin: true,
        timeout: 60000,
      },
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        headers: { 'X-Tenant-Id': 'ling_shan' },
      },
      '/static/audio': {
        target: AI_ENGINE_TARGET,
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:9000',
        ws: true,
      },
    },
  },
})
