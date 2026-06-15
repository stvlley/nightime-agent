// Service Worker for PWA functionality
const CACHE_NAME = 'nightime-agent-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Files to precache (app shell)
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/assets/images/icon-192.png',
  '/assets/images/icon-512.png',
  // Add other critical assets
];

// Install event - precache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Handle API requests with Stale While Revalidate for GETs
  if (url.pathname.startsWith('/api/')) {
    if (request.method === 'GET') {
      event.respondWith(staleWhileRevalidate(request));
    } else {
      // Handle POST requests with background sync
      event.respondWith(handlePostRequest(request));
    }
    return;
  }

  // Handle static assets with Cache First
  if (request.destination === 'image' || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default to network first
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// Background Sync for offline POST requests
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'background-send-message') {
    event.waitUntil(processPendingMessages());
  }
  
  if (event.tag === 'background-upload') {
    event.waitUntil(processPendingUploads());
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Push received:', event);
  
  const options = {
    body: 'You have a new message requiring approval',
    icon: '/assets/images/icon-192.png',
    badge: '/assets/images/badge-72.png',
    tag: 'message-approval',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Message',
        icon: '/assets/images/view-icon.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/assets/images/dismiss-icon.png'
      }
    ],
    data: {
      url: '/inbox?filter=approval',
      threadId: null
    }
  };

  if (event.data) {
    const payload = event.data.json();
    options.body = payload.body || options.body;
    options.data.url = payload.url || options.data.url;
    options.data.threadId = payload.threadId;
  }

  event.waitUntil(
    self.registration.showNotification('Nightime Agent', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (let client of clientList) {
          if (client.url.includes(new URL(urlToOpen).pathname) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Caching strategies
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache first failed:', error);
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cachedResponse = await caches.match(request);
  
  const networkResponsePromise = fetch(request).then((response) => {
    if (response.status === 200) {
      const cache = caches.open(CACHE_NAME);
      cache.then((c) => c.put(request, response.clone()));
    }
    return response;
  });
  
  return cachedResponse || networkResponsePromise;
}

async function handlePostRequest(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Store for background sync
    if (request.url.includes('/api/messages/send') || request.url.includes('/api/approval')) {
      await storeForBackgroundSync(request);
      return new Response(JSON.stringify({ queued: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw error;
  }
}

async function storeForBackgroundSync(request) {
  const data = {
    url: request.url,
    method: request.method,
    headers: [...request.headers.entries()],
    body: await request.text()
  };
  
  // Store in IndexedDB for background sync
  // Implementation depends on your preferred IndexedDB wrapper
  console.log('Storing for background sync:', data);
}

async function processPendingMessages() {
  // Process messages stored for background sync
  console.log('Processing pending messages...');
  // Implementation depends on your IndexedDB structure
}

async function processPendingUploads() {
  // Process uploads stored for background sync
  console.log('Processing pending uploads...');
  // Implementation depends on your IndexedDB structure
}
