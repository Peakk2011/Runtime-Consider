import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@app': path.resolve(__dirname, 'src/core/app'),
      '@config': path.resolve(__dirname, 'src/config'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@window': path.resolve(__dirname, 'src/core/window'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  },
});