import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function minimMonLocalSavePlugin() {
  const attachMiddleware = (middlewares) => {
    middlewares.use('/__minim_mon_save_image', (req, res, next) => {
      if (req.method !== 'POST') return next()

      let body = ''
      req.on('data', (chunk) => {
        body += chunk
      })
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}')
          const { targetFolder, fileName, dataUrl } = payload

          const allowedFolders = {
            materials: path.join(__dirname, 'public', 'imatges', 'materials'),
            productes: path.join(__dirname, 'public', 'imatges', 'productes'),
            projectes: path.join(__dirname, 'public', 'imatges', 'projectes'),
          }

          const destDir = allowedFolders[targetFolder]
          if (!destDir) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'Carpeta de destinació no vàlida' }))
            return
          }

          const safeFileName = path.basename(String(fileName || 'imatge.jpg')).replace(/[<>:"/\\|?*]+/g, '_')
          const base64Match = String(dataUrl || '').match(/^data:[^;]+;base64,(.+)$/)
          if (!base64Match) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: 'Dades d\'imatge no vàlides' }))
            return
          }

          fs.mkdirSync(destDir, { recursive: true })
          const fullPath = path.join(destDir, safeFileName)
          const buffer = Buffer.from(base64Match[1], 'base64')
          fs.writeFileSync(fullPath, buffer)

          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, savedPath: fullPath, fileName: safeFileName }))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: err.message || 'Error desant el fitxer' }))
        }
      })
    })
  }

  return {
    name: 'minim-mon-local-save',
    configureServer(server) {
      attachMiddleware(server.middlewares)
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares)
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), minimMonLocalSavePlugin()],
  base: './',
  server: {
    port: 5173,
    host: true, // Escolta a 0.0.0.0 (permet accedir per localhost, 127.0.0.1 i la xarxa local)
    strictPort: false
  }
})
