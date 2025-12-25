import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/law/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // SECURITY: API keys are no longer exposed to frontend
      // All AI calls are proxied through the backend
      define: {
        'process.env.API_URL': JSON.stringify(env.VITE_API_URL || 'https://trendy.storydot.kr/law/api')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Target modern browsers for smaller bundle
        target: 'es2020',
        // Enable source maps for debugging
        sourcemap: false,
        // Chunk splitting strategy
        rollupOptions: {
          output: {
            manualChunks: {
              // Vendor chunks
              'vendor-react': ['react', 'react-dom'],
              'vendor-motion': ['framer-motion'],
              'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
              'vendor-pdf': ['jspdf', 'html2canvas'],
              // NOTE: @google/genai removed - AI calls now go through backend proxy
            },
            // Optimize chunk file names
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]',
          },
        },
        // Chunk size warnings
        chunkSizeWarningLimit: 500,
        // Minification
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
        },
      },
    };
});
