import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // 监听所有网络接口
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // 后端端口改为 3001
        changeOrigin: true
      }
    }
  }
})
