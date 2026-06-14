import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  
  // Кэш и временные файлы Vite хранятся в проекте, а не в node_modules
  // потому что node_modules может быть symlink на readonly папку
  cacheDir: '.vite',
  
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/lucide-react') || id.includes('node_modules/recharts')) {
            return 'vendor-ui'
          }
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'vendor-3d'
          }
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix'
          }
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/zod')) {
            return 'vendor-forms'
          }
        },
      },
    },
    chunkSizeWarningLimit: 300,
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    // Временные файлы сервера в .vite вместо node_modules/.vite-temp
    fs: {},
  },
  
})
