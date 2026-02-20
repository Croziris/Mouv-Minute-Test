/**
 * Service Worker pour Mouv'Minute PWA
 * Gère le cache des ressources statiques et le mode hors connexion basique
 */

const CACHE_NAME = 'mouvminute-v1.0.0';
const STATIC_CACHE_URLS = [
  '/',
  '/timer',
  '/exercises',
  '/profile',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Installation
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .catch((error) => {
        console.warn('[SW] Failed to cache static resources:', error);
      })
  );
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (!request.url.startsWith('http')) return;

  // Ignorer les appels API PocketBase et Notion (toujours réseau)
  if (
    request.url.includes('pocketbase') ||
    request.url.includes('pb-mouv') ||
    request.url.includes('api.notion.com')
  ) {
    return;
  }

  // Cache First pour ressources statiques
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.url.includes('/static/')
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) return response;
        return fetch(request).then((fetchResponse) => {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return fetchResponse;
        });
      })
    );
    return;
  }

  // Network First pour pages HTML
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((response) => {
            return response || caches.match('/');
          });
        })
    );
    return;
  }
});

// Push notification
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);
  if (!event.data) return;

  try {
    const data = event.data.json();

    const title = data.title || "Mouv Minute - Temps de pause !";
    const options = {
      body: data.body || "C'est l'heure de faire quelques exercices !",
      icon: data.icon || '/icon-192.png',
      badge: data.badge || '/icon-192.png',
      tag: data.tag || 'mouv-minute-notification',
      requireInteraction: data.requireInteraction || true,
      actions: data.actions || [
        { action: 'open', title: 'Voir les exercices' },
        { action: 'dismiss', title: 'Plus tard' }
      ],
      data: data.data || { url: '/timer' }
    };

    event.waitUntil(self.registration.showNotification(title, options));

  } catch (error) {
    console.error('[SW] Error handling push event:', error);
    event.waitUntil(
      self.registration.showNotification("Mouv Minute - Temps de pause !", {
        body: "C'est l'heure de faire quelques exercices !",
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'mouv-minute-fallback',
        requireInteraction: true,
        actions: [
          { action: 'open', title: "Ouvrir l'app" },
          { action: 'dismiss', title: 'Fermer' }
        ],
        data: { url: '/timer' }
      })
    );
  }
});

// Clic sur notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  const action = event.action;
  const url = event.notification.data?.url || '/timer';

  if (action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          if (url && !client.url.includes(url)) {
            return client.navigate(url).then((c) => c?.focus());
          }
          return client.focus();
        }
      }
      return clients.openWindow(self.location.origin + url);
    })
  );
});

// Erreurs
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

// Background sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-sessions') {
    console.log('[SW] Syncing pending sessions...');
  }
});
