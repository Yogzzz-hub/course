import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [react(), tailwindcss()], build: { manifest: true }, server: { port: 5173 }, preview: { port: 4173 } });
