/**
 * Utilitaires pour la gestion des clés VAPID
 */

/**
 * Convertit une clé VAPID publique de base64url vers Uint8Array
 * Nécessaire pour l'API PushManager.subscribe()
 */
export function base64UrlToUint8Array(base64String: string): Uint8Array {
  // Ajouter le padding nécessaire
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Décoder de base64 vers string
  const rawData = atob(base64);
  
  // Convertir en Uint8Array
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

/**
 * Valide qu'une clé VAPID publique est au bon format
 */
export function isValidVapidPublicKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  
  // Une clé VAPID publique fait généralement 65 caractères en base64url
  if (key.length < 40 || key.length > 90) return false;
  
  // Vérifier que c'est bien du base64url
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  return base64UrlRegex.test(key);
}

/**
 * Obtient la clé VAPID publique depuis l'environnement
 * avec validation
 */
export function getVapidPublicKey(): string {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  
  if (!key) {
    throw new Error('VITE_VAPID_PUBLIC_KEY non définie dans l\'environnement');
  }
  
  if (!isValidVapidPublicKey(key)) {
    throw new Error('VITE_VAPID_PUBLIC_KEY invalide');
  }
  
  return key;
}