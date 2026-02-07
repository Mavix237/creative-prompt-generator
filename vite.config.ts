import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ghPages } from 'vite-plugin-gh-pages'


export default defineConfig({
  plugins: [react(), ghPages()],
  base: '/creative-prompt-generator/', // Replace with your repo name
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        chunkFileNames: 'chunk-[hash].js',
        assetFileNames: 'assets/[hash].[ext]'
      }
    }
  }
})
