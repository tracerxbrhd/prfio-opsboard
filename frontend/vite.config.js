import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5103,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8101',
      '/admin': 'http://127.0.0.1:8101',
      '/static': 'http://127.0.0.1:8101',
    },
  },
});
