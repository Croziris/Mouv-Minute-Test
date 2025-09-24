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

// Gestionnaire d'événements push
self.addEventListener('push', event => {
  console.log('Push event received:', event);
  
  if (!event.data) {
    console.log('No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const notificationOptions = {
      body: data.body || 'C\'est l\'heure de faire quelques exercices !',
      icon: data.icon || '/Logo.png',
      badge: data.badge || '/Logo.png',
      tag: data.tag || 'mouv-minute-notification',
      requireInteraction: data.requireInteraction || true,
      actions: data.actions || [
        { action: 'open', title: 'Voir les exercices' },
        { action: 'dismiss', title: 'Plus tard' }
      ],
      data: data.data || { url: '/timer' }
    };

    const title = data.title || 'Mouv\'Minute - Temps de pause !';
    
    event.waitUntil(
      self.registration.showNotification(title, notificationOptions)
    );
  } catch (error) {
    console.error('Error handling push event:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Mouv\'Minute - Temps de pause !', {
        body: 'C\'est l\'heure de faire quelques exercices !',
        icon: '/Logo.png',
        badge: '/Logo.png',
        tag: 'mouv-minute-fallback',
        requireInteraction: true,
        actions: [
          { action: 'open', title: 'Ouvrir l\'app' },
          { action: 'dismiss', title: 'Fermer' }
        ],
        data: { url: '/timer' }
      })
    );
  }
});

// Gestionnaire de clic sur notification
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data || {};
  const url = notificationData.url || '/timer';
  
  if (action === 'dismiss') {
    // Ne rien faire, juste fermer
    return;
  }
  
  // Ouvrir ou focuser la fenêtre de l'app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Chercher une fenêtre existante
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          // Naviguer vers l'URL appropriée si nécessaire
          if (url && !client.url.includes(url)) {
            return client.navigate(url).then(client => client?.focus());
          }
          return client.focus();
        }
      }
      
      // Ouvrir une nouvelle fenêtre si aucune n'existe
      const fullUrl = self.location.origin + url;
      return clients.openWindow(fullUrl);
    }).catch(error => {
      console.error('Error handling notification click:', error);
      // Fallback: ouvrir juste la page d'accueil
      return clients.openWindow(self.location.origin);
    })
  );
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