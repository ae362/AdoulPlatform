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
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('react') ||
              id.includes('react-dom') ||
              id.includes('react-router-dom') ||
              id.includes('@tanstack/react-query')
            ) {
              return 'vendor-react';
            }
            if (
              id.includes('pdf-lib') ||
              id.includes('pdfjs-dist') ||
              id.includes('jspdf') ||
              id.includes('html2canvas')
            ) {
              return 'vendor-pdf';
            }
            if (
              id.includes('docx') ||
              id.includes('docxtemplater') ||
              id.includes('pizzip') ||
              id.includes('jszip')
            ) {
              return 'vendor-office';
            }
            if (
              id.includes('chart.js') ||
              id.includes('react-chartjs-2') ||
              id.includes('leaflet') ||
              id.includes('react-leaflet')
            ) {
              return 'vendor-charts';
            }
            if (id.includes('@tiptap')) {
              return 'vendor-editor';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
          }
        },
      },
    },
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
