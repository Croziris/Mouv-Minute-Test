import { useEffect, useRef } from 'react';

/**
 * Hook pour créer des timers sécurisés côté client uniquement
 * Évite les fuites mémoire et les erreurs SSR
 */
export function useSafeTimer() {
  const intervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const timeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());

  const safeSetInterval = (callback: () => void, delay: number) => {
    if (typeof window === 'undefined') return null;
    
    const id = setInterval(callback, delay);
    intervalsRef.current.add(id);
    return id;
  };

  const safeSetTimeout = (callback: () => void, delay: number) => {
    if (typeof window === 'undefined') return null;
    
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id);
      callback();
    }, delay);
    timeoutsRef.current.add(id);
    return id;
  };

  const safeClearInterval = (id: NodeJS.Timeout | null) => {
    if (id) {
      clearInterval(id);
      intervalsRef.current.delete(id);
    }
  };

  const safeClearTimeout = (id: NodeJS.Timeout | null) => {
    if (id) {
      clearTimeout(id);
      timeoutsRef.current.delete(id);
    }
  };

  // Nettoyer automatiquement au unmount
  useEffect(() => {
    return () => {
      // Nettoyer tous les intervals
      intervalsRef.current.forEach(id => clearInterval(id));
      intervalsRef.current.clear();
      
      // Nettoyer tous les timeouts
      timeoutsRef.current.forEach(id => clearTimeout(id));
      timeoutsRef.current.clear();
    };
  }, []);

  return {
    safeSetInterval,
    safeSetTimeout,
    safeClearInterval,
    safeClearTimeout,
    getActiveCount: () => ({
      intervals: intervalsRef.current.size,
      timeouts: timeoutsRef.current.size,
    })
  };
}