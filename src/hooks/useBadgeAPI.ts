import { useEffect, useCallback } from 'react';

/**
 * Hook pour gérer le badge de l'application (compteur sur l'icône)
 * Disponible sur certains navigateurs comme Chrome/Edge
 */
export function useBadgeAPI() {
  // Vérifier si l'API Badge est supportée
  const isSupported = 'setAppBadge' in navigator && 'clearAppBadge' in navigator;

  const setBadge = useCallback((count?: number) => {
    if (!isSupported) return false;

    try {
      if (count && count > 0) {
        (navigator as any).setAppBadge(count);
      } else {
        (navigator as any).setAppBadge();
      }
      return true;
    } catch (error) {
      console.warn('Erreur lors de la définition du badge:', error);
      return false;
    }
  }, [isSupported]);

  const clearBadge = useCallback(() => {
    if (!isSupported) return false;

    try {
      (navigator as any).clearAppBadge();
      return true;
    } catch (error) {
      console.warn('Erreur lors de l\'effacement du badge:', error);
      return false;
    }
  }, [isSupported]);

  // Nettoyer le badge au démontage du composant
  useEffect(() => {
    return () => {
      clearBadge();
    };
  }, [clearBadge]);

  return {
    isSupported,
    setBadge,
    clearBadge
  };
}