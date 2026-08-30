import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: {
    host: true,
    watch: {
      ignored: ['**/music/**']
    }
  }
})
