import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5137,
    host: true, // Escolta a 0.0.0.0 (permet accedir per localhost, 127.0.0.1 i la xarxa local)
    strictPort: false
  }
})
