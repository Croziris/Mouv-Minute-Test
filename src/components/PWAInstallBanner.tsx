/**
 * Composant bannière d'installation PWA
 * Affiche une invitation à installer l'app en tant que PWA
 */

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from '@/hooks/usePWA';

export function PWAInstallBanner() {
  const { canInstall, isInstalled, installApp } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Vérifier si la bannière a été fermée précédemment
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }

    // Afficher la bannière après 3 secondes si les conditions sont remplies
    const timer = setTimeout(() => {
      if (canInstall && !isInstalled && !dismissed) {
        setShowBanner(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [canInstall, isInstalled]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowBanner(false);
    localStorage.setItem('pwa-banner-dismissed', 'true');
  };

  const handleInstall = async () => {
    await installApp();
    setShowBanner(false);
  };

  if (!showBanner || isDismissed || isInstalled || !canInstall) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-gradient-primary border border-primary/20 rounded-lg shadow-glow p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary-foreground" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-heading font-semibold text-primary-foreground mb-1">
              Installer Mouv'Minute
            </h3>
            <p className="text-xs text-primary-foreground/90 leading-relaxed mb-3">
              Ajoutez l'app à votre écran d'accueil pour un accès rapide et des notifications de rappel.
            </p>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleInstall}
                className="text-xs h-8 bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-primary-foreground/30"
              >
                <Download className="w-3 h-3 mr-1" />
                Installer
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-xs h-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                Plus tard
              </Button>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="flex-shrink-0 w-8 h-8 p-0 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}