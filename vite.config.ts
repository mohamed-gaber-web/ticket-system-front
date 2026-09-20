import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite';
import * as path from 'path';

const PRODUCTION_API = 'https://ticket-system-back-en-production.up.railway.app';

// Where the dev server forwards /api (and the socket.io handshake).
//   - default:               production (Railway)
//   - VITE_PROXY_TARGET set: that backend, e.g. http://localhost:5000 for the
//                            local server + local MongoDB (put it in .env.local,
//                            which is git-ignored, or run `npm run dev:local`).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const target = env.VITE_PROXY_TARGET || PRODUCTION_API;
  const isLocal = /localhost|127\.0\.0\.1/.test(target);
  console.log(`
  API proxy → ${target}${isLocal ? '  (LOCAL backend)' : '  (PRODUCTION backend)'}
`);

  return {
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target,
        changeOrigin: true,
        secure: !isLocal,
        configure: (proxy) => {
          // Backend's CORS middleware 500s on non-whitelisted origins.
          // Requests with no Origin header succeed, so strip it before forwarding.
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          });
        },
      },
      // Real-time notifications (socket.io) go to the same backend.
      '/socket.io': { target, changeOrigin: true, secure: !isLocal, ws: true },
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
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'vendor-xlsx': ['xlsx'],
          'vendor-alerts': ['sweetalert2', 'sweetalert2-react-content'],
        },
      },
    },
  },
};
});
