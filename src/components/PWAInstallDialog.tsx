/**
 * Dialog d'installation PWA
 * Popup centré pour encourager l'installation de l'app
 */

import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Tablet, Monitor, Zap, Bell, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePWA } from '@/hooks/usePWA';
import { getBrowserInfo, getInstallInstructions } from '@/utils/pwaUtils';

export function PWAInstallDialog() {
  const { canInstall, isInstalled, installApp } = usePWA();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Vérifier si le dialog a été fermé récemment (dans les 24h)
    const dismissedTime = localStorage.getItem('pwa-dialog-dismissed');
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    if (dismissedTime && (now - parseInt(dismissedTime)) < dayInMs) {
      setIsDismissed(true);
      return;
    }

    // Vérifier si l'utilisateur a visité plusieurs fois
    const visitCount = parseInt(localStorage.getItem('pwa-visit-count') || '0');
    localStorage.setItem('pwa-visit-count', (visitCount + 1).toString());

    // Afficher le dialog après 10 secondes si les conditions sont remplies
    // et que l'utilisateur a visité au moins 2 fois
    const timer = setTimeout(() => {
      if (canInstall && !isInstalled && !isDismissed && visitCount >= 1) {
        setIsOpen(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [canInstall, isInstalled, isDismissed]);

  const handleDismiss = () => {
    setIsOpen(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-dialog-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    await installApp();
    setIsOpen(false);
  };

  const handleLater = () => {
    setIsOpen(false);
    // Redemander dans 2 heures
    const twoHoursFromNow = Date.now() + (2 * 60 * 60 * 1000);
    localStorage.setItem('pwa-dialog-dismissed', twoHoursFromNow.toString());
  };

  const browserInfo = getBrowserInfo();
  const instructions = getInstallInstructions();

  if (!canInstall || isInstalled || isDismissed) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-primary-foreground" />
            </div>
            Installer Mouv'Minute
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Profitez pleinement de Mouv'Minute en installant l'application sur votre appareil !
          </p>
          
          {/* Avantages */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Accès instantané</p>
                <p className="text-xs text-muted-foreground">Lancez l'app depuis votre écran d'accueil</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Notifications de rappel</p>
                <p className="text-xs text-muted-foreground">Recevez des rappels pour vos pauses</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Wifi className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Fonctionne hors ligne</p>
                <p className="text-xs text-muted-foreground">Utilisez l'app même sans connexion</p>
              </div>
            </div>
          </div>

          {/* Instructions spécifiques au navigateur/OS */}
          {!canInstall && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Instructions :</strong> {instructions}
              </p>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleInstall}
              className="flex-1"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Installer maintenant
            </Button>
            
            <Button
              onClick={handleLater}
              variant="outline"
              size="sm"
            >
              Plus tard
            </Button>
            
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="px-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Support d'appareils */}
          <div className="flex items-center justify-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Smartphone className="w-3 h-3" />
              Mobile
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Tablet className="w-3 h-3" />
              Tablette
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Monitor className="w-3 h-3" />
              Ordinateur
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}