import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.COCKPIT_API_TARGET ?? 'http://127.0.0.1:4314'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 4320,
    proxy: {
      '/api': apiTarget,
    },
  },
})
