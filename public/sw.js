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
            return caches.match('/icon-192.png');
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
          // Mettre en cache la réponse pour usage hors ligne
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // Fallback vers le cache ou page hors ligne
          return caches.match(request)
            .then((response) => {
              return response || caches.match('/offline.html');
            });
        })
    );
    return;
  }
});

// Gestion des événements push (notifications)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'Session terminée 🎉',
    body: 'Il est temps de faire tes exercices.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/timer' },
    actions: [
      { action: 'open-exercises', title: 'Voir exercices' },
      { action: 'restart-timer', title: 'Relancer 5 min' }
    ],
    requireInteraction: true,
    tag: 'session-end',
    renotify: true,
    vibrate: [200, 100, 200]
  };

  // Parser les données de la notification push si présentes
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData,
        data: { ...notificationData.data, ...pushData.data }
      };
    } catch (error) {
      console.warn('[SW] Erreur lors du parsing des données push:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      actions: notificationData.actions,
      requireInteraction: notificationData.requireInteraction,
      tag: notificationData.tag,
      renotify: notificationData.renotify,
      vibrate: notificationData.vibrate
    }).then(() => {
      console.log('[SW] Notification affichée avec succès');
    }).catch((error) => {
      console.error('[SW] Erreur lors de l\'affichage de la notification:', error);
    })
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked, action:', event.action);
  
  event.notification.close();

  let targetUrl = '/timer';
  
  // Gérer les différentes actions
  switch (event.action) {
    case 'open-exercises':
      targetUrl = '/exercises';
      break;
    case 'restart-timer':
      targetUrl = '/timer?restart=300'; // 5 minutes
      break;
    case 'dismiss':
      // Ne rien faire, juste fermer
      return;
    default:
      // Action par défaut ou clic sur la notification
      targetUrl = event.notification.data?.url || '/timer';
      break;
  }

  // Ouvrir ou focuser l'application
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      // Chercher si une fenêtre de l'app est déjà ouverte
      const appClient = clientList.find(client => 
        client.url.startsWith(self.location.origin)
      );
      
      if (appClient) {
        // Naviguer vers l'URL cible et focuser
        return appClient.navigate(targetUrl).then(() => appClient.focus());
      } else {
        // Aucune fenêtre ouverte, en créer une nouvelle
        return clients.openWindow(targetUrl);
      }
    }).catch((error) => {
      console.error('[SW] Erreur lors de l\'ouverture de l\'app:', error);
      // Fallback: ouvrir une nouvelle fenêtre
      return clients.openWindow(targetUrl);
    })
  );
});

// Gestion du badge API (si supporté)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_BADGE') {
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(event.data.count).catch(console.error);
    }
  } else if (event.data && event.data.type === 'CLEAR_BADGE') {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(console.error);
    }
  }
});

// Gestion des erreurs
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker error:', event.error);
});

// Gestion de la synchronisation en arrière-plan (pour de futures fonctionnalités)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Ici on pourrait synchroniser des données en attente
      Promise.resolve()
    );
  }
});