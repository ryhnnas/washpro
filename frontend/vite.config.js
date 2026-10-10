import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { getSeoTags } from './seo.mjs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), {
    name: 'washpro-seo',
    transformIndexHtml() {
      return getSeoTags()
    },
  }],
  envDir: '../',
  optimizeDeps: {
    include: ['xlsx-js-style']
  }
})
