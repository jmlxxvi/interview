import path from 'node:path'
import http from 'node:http'

import cors from 'cors'
import compression from 'compression'
import express, { static as staticExpress } from 'express'

// import config from './config.js';
import config from './config.js'
import log from './platform/log.js'
import { db } from './platform/db/index.js'

// Cron jobs
import { cronStart } from './jobs/cron.js'
import { startMultiCoreRunner } from './jobs/cluster.js'

// Storage
import { storageCreateDirectories } from './platform/storage.js'

// Routes API
import { router as routerApi } from './web/api.js'
// import { router as routerFiles } from './web/files/index.js'

// Middlewares
import { middlewareError } from './web/error.js'
import { middlewareAuthorization } from './web/security.js'

// Websockets
import { websocketsInit } from './web/websockets.js'

const app = express()

const publicDir = path.join(import.meta.dirname, '..', 'public')
const backofficeDir = path.join(import.meta.dirname, '..', 'public', 'backoffice')

// Debug logger middleware
// app.use((req, res, next) => {
//   const now = new Date().toISOString()
//   console.log(`[${now}] ${req.method} ${req.originalUrl}`)
//   // console.log('  Headers:', req.headers)
//   next()
// })

// Security
// https://helmetjs.github.io/faq/you-might-not-need-helmet/
app.disable('x-powered-by')

// Static Files
// https://expressjs.com/en/4x/api.html#express.static
app.use(staticExpress(publicDir, { dotfiles: 'allow', immutable: true, maxAge: 86400000 }))

// CORS
app.use(cors(config.security.cors))

// COMPRESSION
// http://expressjs.com/en/resources/middleware/compression.html
app.use(compression())

// JSON
app.use(express.json({ limit: '64mb' }))

// AUTHORIZATION
app.use(middlewareAuthorization)

// FILES UPLOAD
// app.use(routerFiles)

// API
app.use(routerApi)

// Backoffice SPA fallback
// // app.get(/^\/backoffice(\/.*)?$/, (req, res, next) => {
// app.get(/^\/backoffice(?!.*\.\w+$).*/, (req, res, next) => {
//   // If the request has an extension (e.g. .html, .js), let static handle it
//   if (/\.\w+$/.test(req.path)) return next()

//   res.sendFile(path.join(backofficeDir, 'index.html'))
// })

// // Main SPA fallback
// app.get(/^\/(?!.*\.\w+$).*/, (req, res) => {
//   console.log('main spa: ', req.path)

//   const accept = req.headers.accept || ''
//   if (accept.includes('text/html')) {
//     res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
//     res.sendFile(path.join(publicDir, 'index.html'))
//   } else {
//     res.status(404).end()
//   }
// })

// Dynamic SPA fallback for multiple applications
app.get(/^(?!\/api\/).*$/, (req, res, next) => {
// app.get(/^\/([^/.]+)(?!.*\.\w+$).*/, (req, res, next) => {
  console.log('req.path: ', req.path)

  const fileName = req.path.split('/').filter(Boolean).pop() || 'index.html'
  console.log('fileName: ', fileName)

  if (fileName === 'login.html') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    // next()
    res.sendFile(path.join(publicDir, 'apps', req.path))
    return
  }

  // If the request has an extension (e.g. .html, .js), let static handle it
  if (/\.\w+$/.test(req.path)) return next()

  const accept = req.headers.accept || ''
  if (!accept.includes('text/html')) {
    return res.status(404).end()
  }

  // Extract the application name from the first path segment
  const pathSegments = req.path.split('/').filter(Boolean)
  const appName = pathSegments[0]
  console.log('appName: ', appName)

  if (!appName) {
    // If no app name, redirect to default app or show error
    return res.redirect('/main' + req.path)
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.sendFile(path.join(publicDir, 'apps', appName, 'index.html'))
})

// ERROR
app.use(middlewareError)

const port = config.server.port

const server = http.createServer(app)

// WebSockets
websocketsInit(server)

server.listen(port, async () => {
  log.always(`Server running at http://localhost:${port}/`, 'app')

  // await cache.connect()

  await db.connect()

  // cronStart()
  // startMultiCoreRunner()

  await storageCreateDirectories()
})
