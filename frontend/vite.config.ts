import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json', '.mjs'],
  },
  build: {
    // Clean old hashed assets so stale bundles do not linger with outdated UI strings.
    emptyOutDir: true,
    // Also avoid writing into an already-in-use `dist/` folder.
    outDir: 'dist-build',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    fs: {
      allow: ['..'],
    },
    hmr: {
      overlay: false,
    },
    watch: {
      // Files under /mnt/* can miss native file events in WSL/Windows setups.
      // Polling keeps HMR reliable without needing to restart `npm run dev`.
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/trpc': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/trpc': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
