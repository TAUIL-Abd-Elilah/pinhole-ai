/* global self */

// GitHub Pages cannot emit COOP/COEP response headers. This service worker
// adds them to same-origin responses after its one-time installation reload,
// enabling SharedArrayBuffer and multi-threaded ONNX Runtime WASM. It also
// keeps the existing installable/offline app-shell behavior.

const manifest = self.__WB_MANIFEST

function manifestHash(entries) {
  let hash = 2166136261
  for (const entry of entries) {
    const value = typeof entry === 'string' ? entry : `${entry.url}:${entry.revision ?? ''}`
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
  }
  return (hash >>> 0).toString(16)
}

const buildHash = manifestHash(manifest)
const shellCache = `pinhole-shell-${buildHash}`
const runtimeCache = `pinhole-runtime-${buildHash}`
const cachePrefix = 'pinhole-'
const scopeUrl = new URL('./', self.location.href)
const shellUrls = manifest.map((entry) =>
  new URL(typeof entry === 'string' ? entry : entry.url, scopeUrl).href,
)
const fallbackUrl =
  shellUrls.find((url) => new URL(url).pathname.endsWith('/index.html')) ??
  new URL('index.html', scopeUrl).href

function isolatedResponse(response) {
  if (!response || response.type === 'opaque') return response
  const headers = new Headers(response.headers)
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(shellCache).then((cache) =>
        Promise.all(
          shellUrls.map(async (url) => {
            const response = await fetch(new Request(url, { cache: 'reload' }))
            if (!response.ok) throw new Error(`Could not precache ${url}: ${response.status}`)
            await cache.put(url, response)
          }),
        ),
      ),
      self.skipWaiting(),
    ]),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter(
              (name) =>
                (name.startsWith(cachePrefix) && name !== shellCache && name !== runtimeCache) ||
                name.startsWith('workbox-precache'),
            )
            .map((name) => caches.delete(name)),
        ),
      ),
      self.clients.claim(),
    ]),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'pinhole-isolation-status') {
    event.source?.postMessage({ type: 'pinhole-isolation-ready' })
  }
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const requestUrl = new URL(request.url)
  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return
  // Transformers.js already owns a versioned Cache API entry for each model.
  // Leaving those requests alone avoids a duplicate service-worker stream.
  if (requestUrl.pathname.includes('/models/')) return

  event.respondWith(
    (async () => {
      const shell = await caches.open(shellCache)
      const shellMatch = await shell.match(request, {
        ignoreSearch: request.mode === 'navigate',
      })
      if (shellMatch) {
        return isolatedResponse(shellMatch)
      }
      const runtime = await caches.open(runtimeCache)
      const runtimeMatch = await runtime.match(request, {
        ignoreSearch: request.mode === 'navigate',
      })
      if (runtimeMatch) {
        return isolatedResponse(runtimeMatch)
      }

      try {
        const network = await fetch(request)
        const response = isolatedResponse(network)

        // Transformers.js owns its versioned model cache. Avoid storing a
        // second copy of large ONNX files while caching the WASM runtime and
        // demo media needed for a subsequent offline session.
        if (network.ok && !requestUrl.pathname.includes('/models/')) {
          await runtime.put(request, response.clone())
        }
        return response
      } catch (error) {
        if (request.mode === 'navigate') {
          const fallback = await caches.match(fallbackUrl)
          if (fallback) return isolatedResponse(fallback)
        }
        throw error
      }
    })(),
  )
})
