const CACHE_NAME = 'minddump-v1'

// Static assets that benefit from cache-first strategy
const STATIC_PATTERNS = [
  /^\/_next\/static\//,
  /\/icon$/,
  /\/apple-icon$/,
  /\/api\/icon-512$/,
  /\.(woff2?|ico)$/,
]

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // Never intercept auth or Supabase-bound API calls
  if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/icon')) return
  if (url.pathname.startsWith('/login')) return

  const isStatic = STATIC_PATTERNS.some(p => p.test(url.pathname))

  if (isStatic) {
    // Cache-first: fast on repeat visits
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone))
          }
          return response
        })
      })
    )
  } else {
    // Network-first with cache fallback for pages
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone))
          }
          return response
        })
        .catch(() => caches.match(event.request))
    )
  }
})
