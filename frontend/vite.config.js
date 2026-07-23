import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),   // Tailwind v4 uses a Vite plugin instead of postcss
  ],
  server: {
    // Proxy /api requests to the Express backend during development.
    // WHY? Avoids CORS preflight entirely in dev — the browser sees both
    // frontend and API on the same origin (localhost:5173).
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})

