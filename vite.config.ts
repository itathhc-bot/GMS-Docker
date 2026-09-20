import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import laravel from 'laravel-vite-plugin'
import path from 'path'

export default defineConfig({
  plugins: [
    laravel({
      input: ['resources/js/main.tsx', 'resources/css/app.css'],
      refresh: true,
    }),
    react(),
  ],
  build: {
    outDir: 'public/build',
    emptyOutDir: true,
    manifest: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'resources/js'),
    },
  },
})
