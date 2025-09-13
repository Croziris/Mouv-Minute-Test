import * as React from 'react';
import * as ReactDOM from 'react-dom';

/**
 * Utilitaires pour tester les corrections de crash React
 */

export function testReactInstance() {
  const tests = {
    reactAvailable: typeof React !== 'undefined',
    reactDOMAvailable: typeof ReactDOM !== 'undefined',
    windowAvailable: typeof window !== 'undefined',
    documentAvailable: typeof document !== 'undefined',
    useRefWorking: false,
    tooltipsSafe: false,
  };

  // Test useRef disponible
  try {
    if (React && React.useRef) {
      const testRef = React.useRef(null);
      tests.useRefWorking = testRef !== null;
    }
  } catch (error) {
    console.warn('useRef test failed:', error);
  }

  // Test environnement tooltip
  try {
    tests.tooltipsSafe = import.meta.env.VITE_ENABLE_TOOLTIP !== 'false';
  } catch (error) {
    console.warn('Tooltip env test failed:', error);
  }

  return tests;
}

export function logCrashTestResults() {
  if (process.env.NODE_ENV === 'production') return;
  
  const results = testReactInstance();
  
  console.group('🔧 Crash Test Results');
  console.log('React Available:', results.reactAvailable ? '✅' : '❌');
  console.log('ReactDOM Available:', results.reactDOMAvailable ? '✅' : '❌');
  console.log('Window Available:', results.windowAvailable ? '✅' : '❌');
  console.log('Document Available:', results.documentAvailable ? '✅' : '❌');
  console.log('useRef Working:', results.useRefWorking ? '✅' : '❌');
  console.log('Tooltips Safe:', results.tooltipsSafe ? '✅' : '❌');
  
  const allGood = Object.values(results).every(Boolean);
  console.log('Overall Status:', allGood ? '✅ ALL GOOD' : '❌ ISSUES DETECTED');
  console.groupEnd();
  
  return results;
}