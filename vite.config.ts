import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/nvd': {
        target: 'https://services.nvd.nist.gov',
        changeOrigin: true,
        rewrite: (pathName) => pathName.replace(/^\/api\/nvd/, ''),
      },
      '/api/cisa': {
        target: 'https://www.cisa.gov',
        changeOrigin: true,
        rewrite: (pathName) => pathName.replace(/^\/api\/cisa/, ''),
      },
      '/api/hn': {
        target: 'https://hn.algolia.com',
        changeOrigin: true,
        rewrite: (pathName) => pathName.replace(/^\/api\/hn/, ''),
      },
      '/api/remoteok': {
        target: 'https://remoteok.com',
        changeOrigin: true,
        headers: {
          'user-agent': 'CyberPulse personal dashboard',
        },
        rewrite: (pathName) => pathName.replace(/^\/api\/remoteok/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
