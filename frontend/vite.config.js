import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',  // 여기를 원하는 폴더명으로 변경 가능
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
