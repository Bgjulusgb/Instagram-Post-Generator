import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` produces relative asset URLs which work identically when the
// page is served by Vite, a static host, OR loaded via `file://` from inside
// the Electron shell. Without this the packaged app would fail to find its
// JS/CSS chunks.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    host: true,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          konva: ['konva', 'react-konva'],
          motion: ['framer-motion'],
          export: ['jspdf', 'jszip', 'file-saver'],
        },
      },
    },
  },
});
