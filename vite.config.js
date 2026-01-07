import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Proxy untuk Attendance Service
      '/attendance-api': {
        target: 'https://jennie.queenifyofficial.site',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/attendance-api/, ''),
        secure: true,
      },
      // Proxy untuk Identity Service
      '/identity-api': {
        target: 'https://noi.queenifyofficial.site',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/identity-api/, ''),
        secure: true,
      },
    },
  },
})