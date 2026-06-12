import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/apply/',
  server: {
    port: 5174,
    proxy: { '/api': 'http://localhost:3001' },
  },
})
