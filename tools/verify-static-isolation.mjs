import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { spawn } from 'node:child_process'

const root = resolve('dist')
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.onnx', 'application/octet-stream'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.wasm', 'application/wasm'],
  ['.webp', 'image/webp'],
  ['.woff2', 'font/woff2'],
])

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const pathname = decodeURIComponent(url.pathname)
    const requestedPath = pathname === '/' ? '/index.html' : pathname
    const filePath = resolve(root, `.${requestedPath}`)
    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end()
      return
    }
    const details = await stat(filePath)
    if (!details.isFile()) throw new Error('Not a file')
    response.writeHead(200, {
      'Content-Type': mimeTypes.get(extname(filePath)) ?? 'application/octet-stream',
      'Content-Length': details.size,
    })
    createReadStream(filePath).pipe(response)
  } catch {
    response.writeHead(404).end()
  }
})

function run(script, extraEnvironment = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [script], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PINHOLE_URL: testUrl,
        PINHOLE_EXPECT_ISOLATED: 'true',
        ...extraEnvironment,
      },
    })
    child.once('error', rejectRun)
    child.once('exit', (code) => {
      if (code === 0) resolveRun()
      else rejectRun(new Error(`${script} exited with code ${code}`))
    })
  })
}

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen)
  server.listen(0, '127.0.0.1', resolveListen)
})

const address = server.address()
if (!address || typeof address === 'string') throw new Error('Static test server did not bind')
const testUrl = `http://127.0.0.1:${address.port}`

try {
  await run('tools/browser-flow.mjs', {
    PINHOLE_SCREENSHOT: '.cache/pinhole-isolated-local.png',
    PINHOLE_MODEL_TIMEOUT: process.env.PINHOLE_MODEL_TIMEOUT ?? '120000',
  })
  await run('tools/browser-offline.mjs')
} finally {
  await new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()))
  })
}
