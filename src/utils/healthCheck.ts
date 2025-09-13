// Diagnostic helper pour le développement
export interface HealthCheckResult {
  timestamp: number;
  browser: {
    hasServiceWorker: boolean;
    hasNotifications: boolean;
    hasPushManager: boolean;
    isSecureContext: boolean;
  };
  timer: {
    durationMs?: number;
    isRunning?: boolean;
    endAt?: number;
    remainingMs?: number;
  };
  activeIntervals: number;
  localStorage: {
    hasTimerState: boolean;
    timerStateValid: boolean;
  };
}

export function runHealthCheck(timerState?: any): HealthCheckResult {
  const result: HealthCheckResult = {
    timestamp: Date.now(),
    browser: {
      hasServiceWorker: typeof window !== 'undefined' && 'serviceWorker' in navigator,
      hasNotifications: typeof window !== 'undefined' && 'Notification' in window,
      hasPushManager: typeof window !== 'undefined' && 'PushManager' in window,
      isSecureContext: typeof window !== 'undefined' && window.isSecureContext,
    },
    timer: {},
    activeIntervals: 0,
    localStorage: {
      hasTimerState: false,
      timerStateValid: false,
    }
  };

  // Timer state
  if (timerState) {
    result.timer = {
      durationMs: timerState.durationMs,
      isRunning: timerState.isRunning,
      endAt: timerState.endAt,
      remainingMs: timerState.remainingMs,
    };
  }

  // LocalStorage check
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('timer_state');
      if (stored) {
        result.localStorage.hasTimerState = true;
        const parsed = JSON.parse(stored);
        result.localStorage.timerStateValid = 
          parsed && 
          typeof parsed.durationMs === 'number' && 
          !isNaN(parsed.durationMs);
      }
    } catch (error) {
      // Silent fail for health check
    }
  }

  // Count active intervals (approximation - pour le dev seulement)
  if (typeof window !== 'undefined') {
    // Cette méthode est approximative et pour le debug seulement
    let intervalCount = 0;
    const originalSetInterval = window.setInterval;
    let tempCount = 0;
    
    // Wrapper temporaire pour compter (pas recommandé en prod)
    window.setInterval = (...args) => {
      tempCount++;
      return originalSetInterval.apply(window, args);
    };
    
    // Restaurer immédiatement
    setTimeout(() => {
      window.setInterval = originalSetInterval;
      result.activeIntervals = tempCount;
    }, 0);
  }

  return result;
}

export function logHealthCheck(timerState?: any): void {
  if (process.env.NODE_ENV === 'production') return;
  
  const health = runHealthCheck(timerState);
  
  console.group('🏥 Timer Health Check');
  console.log('Browser Support:', health.browser);
  console.log('Timer State:', health.timer);
  console.log('LocalStorage:', health.localStorage);
  console.log('Active Intervals:', health.activeIntervals);
  console.groupEnd();
  
  // Warnings
  if (!health.browser.hasServiceWorker) {
    console.warn('⚠️ Service Worker not supported');
  }
  if (!health.browser.isSecureContext) {
    console.warn('⚠️ Not in secure context (HTTPS required for SW/Push)');
  }
  if (health.timer.durationMs && isNaN(health.timer.durationMs)) {
    console.error('❌ Timer duration is NaN!');
  }
}