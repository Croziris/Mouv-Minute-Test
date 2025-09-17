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
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json'
];

// Installation du Service Worker
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
  
  // Forcer l'activation immédiate
  self.skipWaiting();
});

// Activation du Service Worker
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
  
  // Prendre le contrôle de tous les onglets immédiatement
  self.clients.claim();
});

// Stratégie de mise en cache pour les requêtes
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-HTTP et les APIs externes (Supabase)
  if (!request.url.startsWith('http') || url.hostname.includes('supabase')) {
    return;
  }
  
  // Stratégie Cache First pour les ressources statiques
  if (request.destination === 'script' || 
      request.destination === 'style' || 
      request.destination === 'image' ||
      request.url.includes('/static/')) {
    
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request).then((fetchResponse) => {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
            return fetchResponse;
          });
        })
        .catch(() => {
          // Fallback pour les images
          if (request.destination === 'image') {
            return caches.match('https://storage.googleapis.com/gpt-engineer-file-uploads/3ui3tQZhwnRq3geG5ea8cbS2Pf32/uploads/1758102737279-Logo app mouv'minute.png');
          }
        })
    );
    return;
  }
  
  // Stratégie Network First pour les pages HTML
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
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

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received:', event);
  
  const options = {
    body: 'C\'est l\'heure de faire une pause et quelques exercices !',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'mouvminute-reminder',
    requireInteraction: true,
    actions: [
      {
        action: 'open-timer',
        title: 'Ouvrir le timer',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Plus tard',
        icon: '/icon-192.png'
      }
    ],
    data: {
      url: '/timer'
    }
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.data.url = data.url || options.data.url;
    } catch (e) {
      console.warn('[SW] Failed to parse push data:', e);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification('Mouv\'Minute', options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/timer';
  
  if (event.action === 'open-timer') {
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  } else if (event.action === 'dismiss') {
    // Ne rien faire, juste fermer la notification
    return;
  } else {
    // Clic sur la notification principale
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Chercher un onglet existant avec l'app
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              client.navigate(urlToOpen);
              return client.focus();
            }
          }
          // Ouvrir un nouvel onglet si aucun trouvé
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Gestion des erreurs
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error);
});

// Synchronisation en arrière-plan (pour futures fonctionnalités)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-sessions') {
    event.waitUntil(
      // Ici on pourrait synchroniser les sessions en attente
      console.log('[SW] Syncing pending sessions...')
    );
  }
});