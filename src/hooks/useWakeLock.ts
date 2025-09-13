import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook pour gérer le Wake Lock API (maintenir l'écran allumé)
 * Utile pendant les sessions de timer
 */
export function useWakeLock() {
  const [isSupported] = useState(() => 'wakeLock' in navigator);
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if (!isSupported) {
      console.warn('Wake Lock API non supportée');
      return false;
    }

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      
      wakeLockRef.current.addEventListener('release', () => {
        console.log('Wake Lock released');
        setIsActive(false);
      });

      setIsActive(true);
      console.log('Wake Lock activé - écran maintenu allumé');
      return true;
      
    } catch (error) {
      console.error('Erreur lors de la demande de Wake Lock:', error);
      return false;
    }
  }, [isSupported]);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        console.log('Wake Lock libéré');
        return true;
      } catch (error) {
        console.error('Erreur lors de la libération du Wake Lock:', error);
        return false;
      }
    }
    return false;
  }, []);

  // Gérer la visibilité de la page (réactiver si nécessaire)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isActive && !wakeLockRef.current) {
        // Réactiver le wake lock si la page redevient visible
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, requestWakeLock]);

  // Nettoyer au démontage
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return {
    isSupported,
    isActive,
    requestWakeLock,
    releaseWakeLock
  };
}