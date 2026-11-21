import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' damit die App unter https://<user>.github.io/rescue-ge/ und lokal läuft
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { target: 'es2020', sourcemap: false },
  test: { environment: 'node' },
} as any)
