/**
 * Service Worker for NexusRank AI Tools
 * Provides offline functionality and caching
 */

const CACHE_NAME = 'nexusrank-v1.0.0';
const RUNTIME_CACHE = 'nexusrank-runtime-v1.0.0';

// Files to cache immediately (app shell)
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  '/favicon.ico',
  '/pages/about.html',
  '/pages/contact.html',
  '/pages/privacy.html',
  '/pages/terms.html',
  '/pages/cookie-policy.html',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap',
  'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.woff2'
];

// Routes that require network (API calls)
const NETWORK_ONLY_URLS = [
  '/ai/',
  '/health'
];

// Install event - cache app shell
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] App shell cached successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Failed to cache app shell:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Old caches cleaned up');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different types of requests
  if (isNetworkOnlyRequest(url.pathname)) {
    // Network-only requests (API calls)
    event.respondWith(handleNetworkOnlyRequest(request));
  } else if (isNavigationRequest(request)) {
    // Navigation requests (page loads)
    event.respondWith(handleNavigationRequest(request));
  } else {
    // Static assets
    event.respondWith(handleStaticAssetRequest(request));
  }
});

/**
 * Check if request should go to network only
 */
function isNetworkOnlyRequest(pathname) {
  return NETWORK_ONLY_URLS.some(pattern => pathname.includes(pattern));
}

/**
 * Check if request is a navigation request
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

/**
 * Handle network-only requests (API calls)
 */
async function handleNetworkOnlyRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('[SW] Network request failed:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Network Error',
        message: 'Please check your internet connection and try again.',
        offline: true 
      }), 
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle navigation requests with cache-first strategy
 */
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation network failed, trying cache:', error);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return await getOfflinePage();
  }
}

/**
 * Handle static asset requests with cache-first strategy
 */
async function handleStaticAssetRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Try network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Static asset request failed:', error);
    
    // Return placeholder for failed image requests
    if (request.destination === 'image') {
      return getImagePlaceholder();
    }
    
    // Return basic error response for other assets
    return new Response('Asset not available offline', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Get offline page
 */
async function getOfflinePage() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - NexusRank</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #0a0a0a, #1a1a2e);
                color: #ffffff;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 20px;
            }
            .offline-container {
                max-width: 500px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(0, 204, 255, 0.3);
                border-radius: 16px;
                padding: 40px 30px;
                backdrop-filter: blur(20px);
            }
            .offline-icon {
                font-size: 4rem;
                margin-bottom: 20px;
                color: #00ccff;
            }
            .offline-title {
                font-size: 2rem;
                font-weight: 700;
                margin-bottom: 15px;
                color: #00ccff;
            }
            .offline-message {
                font-size: 1.1rem;
                color: #b8c5d6;
                margin-bottom: 30px;
                line-height: 1.6;
            }
            .retry-button {
                background: linear-gradient(135deg, #00ccff, #0099ff);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.3s ease;
            }
            .retry-button:hover {
                transform: translateY(-2px);
            }
            .feature-list {
                margin-top: 30px;
                text-align: left;
            }
            .feature-list h3 {
                color: #00ccff;
                margin-bottom: 15px;
                text-align: center;
            }
            .feature-list ul {
                list-style: none;
                color: #b8c5d6;
            }
            .feature-list li {
                padding: 5px 0;
                padding-left: 20px;
                position: relative;
            }
            .feature-list li:before {
                content: "✓";
                position: absolute;
                left: 0;
                color: #00ccff;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="offline-container">
            <div class="offline-icon">📡</div>
            <h1 class="offline-title">You're Offline</h1>
            <p class="offline-message">
                It looks like you're not connected to the internet. NexusRank's AI tools require an internet connection to process your content.
            </p>
            <button class="retry-button" onclick="window.location.reload()">
                Try Again
            </button>
            
            <div class="feature-list">
                <h3>Available Offline:</h3>
                <ul>
                    <li>Browse cached pages</li>
                    <li>View app information</li>
                    <li>Access offline documentation</li>
                    <li>Review your previous work</li>
                </ul>
            </div>
        </div>
        
        <script>
            // Auto-retry when connection is restored
            window.addEventListener('online', function() {
                window.location.reload();
            });
            
            // Show connection status
            function updateConnectionStatus() {
                if (navigator.onLine) {
                    window.location.reload();
                }
            }
            
            setInterval(updateConnectionStatus, 5000);
        </script>
    </body>
    </html>
  `;
  
  return new Response(offlineHTML, {
    headers: { 'Content-Type': 'text/html' }
  });
}

/**
 * Get image placeholder for failed image requests
 */
function getImagePlaceholder() {
  // Simple SVG placeholder
  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="#1a1a2e"/>
      <text x="100" y="100" text-anchor="middle" dy=".3em" fill="#00ccff" font-family="sans-serif" font-size="14">
        Image Unavailable
      </text>
    </svg>
  `;
  
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml' }
  });
}

// Background sync for failed requests
self.addEventListener('sync', event => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

/**
 * Handle background sync
 */
async function handleBackgroundSync() {
  console.log('[SW] Handling background sync');
  // This could be used to retry failed API requests when connection is restored
  // For now, we'll just log the event
}

// Push notification handling (for future features)
self.addEventListener('push', event => {
  console.log('[SW] Push event received');
  
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'Open NexusRank',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Close notification',
          icon: '/icons/icon-192x192.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('NexusRank', options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling for communication with main app
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
        
      case 'CLEAR_CACHE':
        clearAllCaches().then(() => {
          event.ports[0].postMessage({ success: true });
        });
        break;
        
      default:
        console.log('[SW] Unknown message type:', event.data.type);
    }
  }
});

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('[SW] All caches cleared');
}

// Periodic cleanup of old cache entries
self.addEventListener('periodicsync', event => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupOldCacheEntries());
  }
});

/**
 * Cleanup old cache entries
 */
async function cleanupOldCacheEntries() {
  const cache = await caches.open(RUNTIME_CACHE);
  const requests = await cache.keys();
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
  
  for (const request of requests) {
    const response = await cache.match(request);
    const dateHeader = response.headers.get('date');
    
    if (dateHeader) {
      const responseDate = new Date(dateHeader).getTime();
      if (now - responseDate > oneWeek) {
        await cache.delete(request);
        console.log('[SW] Deleted old cache entry:', request.url);
      }
    }
  }
}

console.log('[SW] Service Worker script loaded successfully');
