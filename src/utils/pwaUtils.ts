/**
 * Utilitaires PWA pour Mouv'Minute
 * Fonctions helper pour la gestion PWA
 */

/**
 * Vérifie si l'application est installée en tant que PWA
 */
export function isPWAInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
}

/**
 * Vérifie si le navigateur supporte les PWA
 */
export function supportsPWA(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Obtient des informations sur le navigateur et la plateforme
 */
export function getBrowserInfo() {
  const userAgent = navigator.userAgent.toLowerCase();
  
  return {
    isIOS: /iphone|ipad|ipod/.test(userAgent),
    isAndroid: /android/.test(userAgent),
    isSafari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
    isChrome: /chrome/.test(userAgent),
    isFirefox: /firefox/.test(userAgent),
    isEdge: /edge/.test(userAgent),
    isMobile: /mobile|android|iphone|ipad/.test(userAgent),
  };
}

/**
 * Génère des instructions d'installation spécifiques au navigateur
 */
export function getInstallInstructions(): string {
  const { isIOS, isAndroid, isSafari, isChrome } = getBrowserInfo();
  
  if (isIOS && isSafari) {
    return "Appuyez sur le bouton de partage puis 'Ajouter à l'écran d'accueil'";
  }
  
  if (isAndroid && isChrome) {
    return "Une bannière d'installation apparaîtra, ou allez dans Menu > Ajouter à l'écran d'accueil";
  }
  
  if (isChrome) {
    return "Cliquez sur l'icône d'installation dans la barre d'adresse ou allez dans Menu > Installer Mouv'Minute";
  }
  
  return "Recherchez l'option 'Ajouter à l'écran d'accueil' ou 'Installer l'application' dans votre navigateur";
}

/**
 * Vérifie si les notifications sont supportées et autorisées
 */
export function canShowNotifications(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Formatage des données de notification pour le service worker
 */
export function formatNotificationData(title: string, options: NotificationOptions = {}) {
  return {
    title,
    options: {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'mouvminute-notification',
      requireInteraction: false,
      silent: false,
      ...options,
    }
  };
}

/**
 * Envoie une notification locale immédiate
 */
export function sendLocalNotification(title: string, options: NotificationOptions = {}) {
  if (!canShowNotifications()) {
    console.warn('[PWA] Cannot show notification - permission not granted');
    return false;
  }
  
  const notification = new Notification(title, {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    ...options,
  });
  
  // Auto-fermer après 5 secondes si pas d'interaction requise
  if (!options.requireInteraction) {
    setTimeout(() => {
      notification.close();
    }, 5000);
  }
  
  return true;
}

/**
 * Vérifie si une mise à jour du service worker est disponible
 */
export async function checkForSWUpdate(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return false;
    }
    
    await registration.update();
    return registration.waiting !== null;
  } catch (error) {
    console.error('[PWA] Failed to check for SW update:', error);
    return false;
  }
}

/**
 * Force la mise à jour du service worker
 */
export async function updateServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration || !registration.waiting) {
      return;
    }
    
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  } catch (error) {
    console.error('[PWA] Failed to update SW:', error);
  }
}