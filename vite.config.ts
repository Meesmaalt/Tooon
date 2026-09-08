import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// VITE_BASE_PATH examples:
//   unset or "/"  → root deploy (http://ip:3000/)
//   "/ralli/"      → https://domain/ralli/
//   "./"           → relative assets (works under most reverse-proxy subpaths)
export default defineConfig(() => {
  const base = process.env.VITE_BASE_PATH || './';
  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
