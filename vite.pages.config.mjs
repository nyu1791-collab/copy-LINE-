import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('./pages-board', import.meta.url)),
  base: '/line-rangers-pvp/boards/',
  plugins: [react()],
  resolve: {alias: {'@': fileURLToPath(new URL('.', import.meta.url))}},
  build: {
    outDir: fileURLToPath(new URL('./dist-pages/boards', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
});
