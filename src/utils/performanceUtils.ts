// Utilitaires de performance pour le monitoring
export function markStart(name: string) {
  if (typeof window !== 'undefined' && 'performance' in window && performance.mark) {
    try {
      performance.mark(`${name}-start`);
    } catch (error) {
      console.warn(`Failed to mark performance start for ${name}:`, error);
    }
  }
}

export function markEnd(name: string) {
  if (typeof window !== 'undefined' && 'performance' in window && performance.mark) {
    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    } catch (error) {
      console.warn(`Failed to mark performance end for ${name}:`, error);
    }
  }
}

export function logPerformanceMeasures() {
  if (typeof window !== 'undefined' && 'performance' in window && performance.getEntriesByType) {
    try {
      const measures = performance.getEntriesByType('measure');
      if (measures.length > 0 && process.env.NODE_ENV !== 'production') {
        console.group('Performance Measures');
        measures.forEach((measure: any) => {
          console.log(`${measure.name}: ${measure.duration.toFixed(2)}ms`);
        });
        console.groupEnd();
      }
    } catch (error) {
      console.warn('Failed to log performance measures:', error);
    }
  }
}

// Hook pour surveiller les performances d'un composant
export function usePerformanceMonitor(componentName: string) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    markStart(componentName);
    
    // Nettoyer au unmount
    return () => {
      markEnd(componentName);
    };
  }
  
  return () => {}; // No-op function for production
}