import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite';
import * as path from 'path';

// Where the dev server forwards /api. Defaults to production; put
// `VITE_PROXY_TARGET=http://localhost:5000` in .env.local (git-ignored) to
// work against a backend running on this machine.
const PRODUCTION_API = 'https://ticket-system-back-en-production.up.railway.app';

export default defineConfig(({ mode }) => {
  const proxyTarget = loadEnv(mode, process.cwd(), 'VITE_').VITE_PROXY_TARGET || PRODUCTION_API;
  return {
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: proxyTarget.startsWith('https'),
        configure: (proxy) => {
          // Backend's CORS middleware 500s on non-whitelisted origins.
          // Requests with no Origin header succeed, so strip it before forwarding.
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
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
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'vendor-xlsx': ['xlsx'],
          'vendor-alerts': ['sweetalert2', 'sweetalert2-react-content'],
        },
      },
    },
  },
  };
});
