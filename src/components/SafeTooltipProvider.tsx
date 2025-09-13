import { ReactNode } from 'react';
import { ClientOnly } from './ClientOnly';
import { TooltipProvider } from '@/components/ui/tooltip';

interface SafeTooltipProviderProps {
  children: ReactNode;
  delayDuration?: number;
}

/**
 * SafeTooltipProvider - Wrapper sûr pour TooltipProvider
 * Utilise ClientOnly et feature flag pour éviter les crashes
 */
export function SafeTooltipProvider({ 
  children, 
  delayDuration = 200 
}: SafeTooltipProviderProps) {
  // Feature flag pour désactiver les tooltips en cas de problème
  const enableTooltips = import.meta.env.VITE_ENABLE_TOOLTIP !== 'false';

  if (!enableTooltips) {
    // Mode dégradé : pas de tooltips mais app fonctionnelle
    return <>{children}</>;
  }

  return (
    <ClientOnly
      fallback={
        <div className="opacity-0 animate-pulse">
          {children}
        </div>
      }
    >
      <TooltipProvider delayDuration={delayDuration}>
        {children}
      </TooltipProvider>
    </ClientOnly>
  );
}