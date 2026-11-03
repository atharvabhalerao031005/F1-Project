import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('/node_modules/')) {
            if (normalized.includes('/three/') || normalized.includes('/@react-three/')) {
              return 'vendor-three';
            }
            if (normalized.includes('/react/') || normalized.includes('/react-dom/')) {
              return 'vendor-react';
            }
            if (
              normalized.includes('/zustand/') ||
              normalized.includes('/lucide-react/') ||
              normalized.includes('/clsx/') ||
              normalized.includes('/tailwind-merge/')
            ) {
              return 'vendor-ui';
            }
          }
        },
      },
    },
  },
});
