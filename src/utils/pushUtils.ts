/**
 * Utilitaires pour les notifications push
 */

/**
 * Convertit une clé VAPID en format Base64URL vers Uint8Array
 * Nécessaire pour l'API PushManager.subscribe()
 * 
 * @param base64UrlString - Clé VAPID publique au format Base64URL
 * @returns Uint8Array compatible avec l'API PushManager
 * @throws Error si la clé est invalide
 */
export function base64UrlToUint8Array(base64UrlString: string): Uint8Array {
  // Validation de base
  if (!base64UrlString || typeof base64UrlString !== 'string') {
    throw new Error('La clé VAPID doit être une chaîne non vide');
  }

  // Nettoyer la chaîne (supprimer espaces et retours à la ligne)
  const cleanedString = base64UrlString.trim();
  
  if (cleanedString.length === 0) {
    throw new Error('La clé VAPID ne peut pas être vide');
  }

  try {
    // Ajouter le padding manquant si nécessaire
    const padding = '='.repeat((4 - (cleanedString.length % 4)) % 4);
    const base64 = (cleanedString + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    // Décoder en string binaire
    const rawData = window.atob(base64);
    
    // Convertir en Uint8Array
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    // Vérifier que la taille est raisonnable pour une clé VAPID (généralement 65 bytes)
    if (outputArray.length < 32 || outputArray.length > 100) {
      console.warn(`Taille de clé VAPID inattendue: ${outputArray.length} bytes (attendu: ~65)`);
    }
    
    return outputArray;
  } catch (error) {
    console.error('Erreur lors de la conversion Base64URL:', error);
    throw new Error('Clé VAPID invalide - vérifiez le format Base64URL');
  }
}

/**
 * Détecte si l'appareil est iOS et sa version
 */
export function detectIOSVersion(): { isIOS: boolean; version?: number; canUsePush: boolean } {
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  
  if (!isIOS) {
    return { isIOS: false, canUsePush: true };
  }

  const versionMatch = userAgent.match(/OS (\d+)_/);
  const version = versionMatch ? parseInt(versionMatch[1]) : undefined;
  
  // Sur iOS, les notifications push ne sont disponibles qu'à partir d'iOS 16.4
  // et seulement dans une PWA installée
  const canUsePush = (version ?? 0) >= 16;
  
  return { isIOS: true, version, canUsePush };
}

/**
 * Vérifie si l'app est lancée en mode standalone (PWA installée)
 */
export function isStandalonePWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

/**
 * Vérifie la compatibilité complète des notifications push
 */
export function checkPushCompatibility(): {
  isSupported: boolean;
  reason?: string;
  canUsePush: boolean;
} {
  // Vérifications de base
  if (!('Notification' in window)) {
    return {
      isSupported: false,
      reason: 'API Notification non supportée',
      canUsePush: false
    };
  }

  if (!('serviceWorker' in navigator)) {
    return {
      isSupported: false,
      reason: 'Service Workers non supportés',
      canUsePush: false
    };
  }

  if (!('PushManager' in window)) {
    return {
      isSupported: false,
      reason: 'API Push non supportée',
      canUsePush: false
    };
  }

  // Vérifications spécifiques iOS
  const iosInfo = detectIOSVersion();
  
  if (iosInfo.isIOS) {
    if (!iosInfo.canUsePush) {
      return {
        isSupported: true,
        reason: `iOS ${iosInfo.version} ne supporte pas les notifications push (iOS 16.4+ requis)`,
        canUsePush: false
      };
    }
    
    if (!isStandalonePWA()) {
      return {
        isSupported: true,
        reason: 'Sur iOS, les notifications push nécessitent une PWA installée',
        canUsePush: false
      };
    }
  }

  return {
    isSupported: true,
    canUsePush: true
  };
}

/**
 * Enregistre le service worker si ce n'est pas déjà fait
 */
export async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Workers non supportés');
  }

  try {
    // Vérifier s'il y a déjà une registration active
    const existingRegistration = await navigator.serviceWorker.getRegistration();
    
    if (existingRegistration) {
      // Mettre à jour en arrière-plan si nécessaire
      existingRegistration.update().catch(console.warn);
      return existingRegistration;
    }

    // Enregistrer le service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('Service Worker enregistré:', registration.scope);
    return registration;
    
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du Service Worker:', error);
    throw error;
  }
}