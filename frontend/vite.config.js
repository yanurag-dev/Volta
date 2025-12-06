import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external connections (needed for Docker)
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://web:8000',
        changeOrigin: true,
        rewrite: (path) => path, // Keep /api prefix
      },
    },
  },
})
