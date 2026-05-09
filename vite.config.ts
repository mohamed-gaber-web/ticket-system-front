import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite';
import * as path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://ticket-system-back-en-production.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core framework — cached long-term
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // State management
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          // Heavy UI libraries — only loaded when needed
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'vendor-xlsx': ['xlsx'],
          'vendor-alerts': ['sweetalert2', 'sweetalert2-react-content'],
        },
      },
    },
  },
})
