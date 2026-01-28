import { defineConfig } from 'vite';
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@app': path.resolve(__dirname, 'src/core/app'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@preload': path.resolve(__dirname, 'src/preload'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
    },
  },
});