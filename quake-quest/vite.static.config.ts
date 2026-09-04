import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VERCEL ? '/quake-quest/' : '/ai-adventure-web-tools/quake-quest/',
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  build: {
    outDir: 'static-dist',
    emptyOutDir: true,
  },
});
