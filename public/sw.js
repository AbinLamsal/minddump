var CACHE_NAME = 'minddump-v2'

self.addEventListener('install', function() {
  self.skipWaiting()
})

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME }).map(function(k) {
          return caches.delete(k)
        })
      )
    }).then(function() {
      return self.clients.claim()
    })
  )
})

// Extract pathname from a URL string without using the URL constructor
function getPathname(urlStr) {
  var idx = urlStr.indexOf('://')
  if (idx === -1) return urlStr
  var afterProto = urlStr.indexOf('/', idx + 3)
  if (afterProto === -1) return '/'
  var withQuery = urlStr.slice(afterProto)
  var qIdx = withQuery.indexOf('?')
  return qIdx === -1 ? withQuery : withQuery.slice(0, qIdx)
}

// Check same origin without URL constructor or self.location.origin
function isSameOrigin(urlStr) {
  var scope = self.registration.scope // always available, e.g. "https://example.com/"
  var originEnd = scope.indexOf('/', scope.indexOf('://') + 3)
  var origin = originEnd === -1 ? scope : scope.slice(0, originEnd)
  return urlStr.slice(0, origin.length) === origin
}

function isStaticAsset(pathname) {
  return (
    pathname.slice(0, 15) === '/_next/static/' ||
    pathname === '/icon'          ||
    pathname === '/apple-icon'    ||
    pathname === '/api/icon-512'  ||
    pathname.slice(-5)  === '.woff'  ||
    pathname.slice(-6)  === '.woff2' ||
    pathname.slice(-4)  === '.ico'
  )
}

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return

  var urlStr = event.request.url

  if (!isSameOrigin(urlStr)) return

  var pathname = getPathname(urlStr)

  // Skip data API calls and login so we never serve stale auth
  if (pathname.slice(0, 5) === '/api/' && pathname !== '/api/icon-512') return
  if (pathname.slice(0, 6) === '/login') return

  if (isStaticAsset(pathname)) {
    // Cache-first: static assets rarely change
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached
        return fetch(event.request).then(function(response) {
          if (response && response.ok) {
            var clone = response.clone()
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone)
            })
          }
          return response
        })
      })
    )
  } else {
    // Network-first: always try fresh page, fall back to cache offline
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response && response.ok) {
          var clone = response.clone()
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone)
          })
        }
        return response
      }).catch(function() {
        return caches.match(event.request)
      })
    )
  }
})
