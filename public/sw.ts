/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'tradevision-cache-v1';
const STATIC_CACHE_NAME = 'tradevision-static-v1';
const API_CACHE_NAME = 'tradevision-api-v1';

// Resources to cache immediately on install
const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/manifest.json',
];

// API endpoints to cache with network-first strategy
const API_PATTERNS = [
    /^https:\/\/api\.binance\.com\/api\/v3\/klines/,
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static resources');
            return cache.addAll(STATIC_RESOURCES);
        })
    );
    // Activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => {
                        return name.startsWith('tradevision-') && 
                               name !== CACHE_NAME && 
                               name !== STATIC_CACHE_NAME &&
                               name !== API_CACHE_NAME;
                    })
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    // Take control of all clients immediately
    self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip WebSocket connections
    if (url.protocol === 'ws:' || url.protocol === 'wss:') {
        return;
    }

    // API requests - network first, then cache
    if (API_PATTERNS.some(pattern => pattern.test(request.url))) {
        event.respondWith(networkFirstStrategy(request, API_CACHE_NAME));
        return;
    }

    // Static resources - cache first, then network
    if (request.destination === 'document' || 
        request.destination === 'script' || 
        request.destination === 'style' ||
        request.destination === 'image' ||
        request.destination === 'font') {
        event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME));
        return;
    }

    // Default - network first
    event.respondWith(networkFirstStrategy(request, CACHE_NAME));
});

/**
 * Cache-first strategy
 * Try cache first, fall back to network
 */
async function cacheFirstStrategy(request: Request, cacheName: string): Promise<Response> {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        // Return cached response and update cache in background
        fetchAndCache(request, cacheName);
        return cachedResponse;
    }
    
    return fetchAndCache(request, cacheName);
}

/**
 * Network-first strategy
 * Try network first, fall back to cache
 */
async function networkFirstStrategy(request: Request, cacheName: string): Promise<Response> {
    try {
        const response = await fetchAndCache(request, cacheName);
        return response;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            console.log('[SW] Serving from cache (offline):', request.url);
            return cachedResponse;
        }
        
        // Return offline fallback for navigation requests
        if (request.mode === 'navigate') {
            const offlineResponse = await caches.match('/');
            if (offlineResponse) {
                return offlineResponse;
            }
        }
        
        throw error;
    }
}

/**
 * Fetch from network and cache the response
 */
async function fetchAndCache(request: Request, cacheName: string): Promise<Response> {
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response.ok) {
        const cache = await caches.open(cacheName);
        // Clone the response because it can only be consumed once
        cache.put(request, response.clone());
    }
    
    return response;
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data === 'clearCache') {
        caches.keys().then((cacheNames) => {
            cacheNames.forEach((name) => {
                if (name.startsWith('tradevision-')) {
                    caches.delete(name);
                }
            });
        });
    }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-alerts') {
        console.log('[SW] Syncing alerts...');
        // Implement sync logic for alerts here
    }
});

// Push notifications (for future price alerts)
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    try {
        const data = event.data.json();
        
        const options: NotificationOptions = {
            body: data.body || 'New notification',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            // vibrate: [100, 50, 100], // Not all browsers support this
            data: {
                url: data.url || '/',
            },
            // actions: [ // Not supported in standard NotificationOptions
                //     { action: 'open', title: 'Open' },
                //     { action: 'dismiss', title: 'Dismiss' },
            // ],
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || 'TradeVision AI', options)
        );
    } catch (error) {
        console.error('[SW] Push notification error:', error);
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'dismiss') {
        return;
    }
    
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clients) => {
            // Focus existing window if available
            for (const client of clients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window
            return self.clients.openWindow(urlToOpen);
        })
    );
});

export {};
