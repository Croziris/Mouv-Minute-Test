/**
 * Hook personnalisé pour gérer les fonctionnalités PWA
 * - Installation de l'app
 * - Notifications push
 * - Détection du support PWA
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  supportsNotifications: boolean;
  notificationPermission: NotificationPermission | null;
  swRegistration: ServiceWorkerRegistration | null;
}

export function usePWA() {
  const [pwaState, setPwaState] = useState<PWAState>({
    canInstall: false,
    isInstalled: false,
    isStandalone: false,
    supportsNotifications: false,
    notificationPermission: null,
    swRegistration: null,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Initialisation du Service Worker et détection PWA
  useEffect(() => {
    const initializePWA = async () => {
      // Détecter si l'app est en mode standalone (déjà installée)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           (window.navigator as any).standalone === true;

      // Vérifier le support des notifications
      const supportsNotifications = 'Notification' in window;
      const notificationPermission = supportsNotifications ? Notification.permission : null;

      setPwaState(prev => ({
        ...prev,
        isStandalone,
        supportsNotifications,
        notificationPermission,
        isInstalled: isStandalone,
      }));

      // Enregistrer le Service Worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('[PWA] Service Worker registered:', registration);
          
          setPwaState(prev => ({
            ...prev,
            swRegistration: registration,
          }));

          // Vérifier les mises à jour du SW
          registration.addEventListener('updatefound', () => {
            console.log('[PWA] Service Worker update found');
            toast({
              title: "Mise à jour disponible",
              description: "Une nouvelle version de l'app est disponible. Rechargez la page.",
            });
          });
        } catch (error) {
          console.error('[PWA] Service Worker registration failed:', error);
        }
      }
    };

    initializePWA();
  }, []);

  // Gérer l'événement beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] Before install prompt triggered');
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPwaState(prev => ({ ...prev, canInstall: true }));
    };

    const handleAppInstalled = () => {
      console.log('[PWA] App installed');
      setPwaState(prev => ({ 
        ...prev, 
        canInstall: false, 
        isInstalled: true,
        isStandalone: true 
      }));
      setDeferredPrompt(null);
      
      toast({
        title: "App installée !",
        description: "Mouv'Minute est maintenant installé sur votre appareil.",
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Fonction pour installer l'app
  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      toast({
        title: "Installation non disponible",
        description: "L'installation automatique n'est pas supportée sur ce navigateur.",
        variant: "destructive",
      });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('[PWA] Install prompt result:', outcome);
      
      if (outcome === 'accepted') {
        setPwaState(prev => ({ ...prev, canInstall: false }));
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('[PWA] Install failed:', error);
      toast({
        title: "Erreur d'installation",
        description: "Impossible d'installer l'application.",
        variant: "destructive",
      });
    }
  }, [deferredPrompt]);

  // Fonction pour demander la permission de notifications
  const requestNotificationPermission = useCallback(async () => {
    if (!pwaState.supportsNotifications) {
      toast({
        title: "Notifications non supportées",
        description: "Votre navigateur ne supporte pas les notifications.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPwaState(prev => ({ ...prev, notificationPermission: permission }));
      
      if (permission === 'granted') {
        toast({
          title: "Notifications activées",
          description: "Vous recevrez des rappels pour vos pauses actives.",
        });
        return true;
      } else {
        toast({
          title: "Notifications refusées",
          description: "Vous ne recevrez pas de rappels automatiques.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('[PWA] Notification permission error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de configurer les notifications.",
        variant: "destructive",
      });
      return false;
    }
  }, [pwaState.supportsNotifications]);

  // Fonction pour s'abonner aux notifications push
const subscribeToNotifications = useCallback(async () => {
  if (!pwaState.swRegistration) {
    console.error('[PWA] No service worker registration')
    return null
  }

  try {
    const subscription = await pwaState.swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: null, // À remplacer par ta clé VAPID plus tard
    })

    console.log('[PWA] Push subscription:', subscription)

    // ✅ Sauvegarde dans PocketBase
    const { pushService } = await import('@/lib/pocketbase')
    await pushService.save(subscription)
    console.log('[PWA] Subscription saved to PocketBase ✅')

    return subscription
  } catch (error) {
    console.error('[PWA] Push subscription failed:', error)
    return null
  }
}, [pwaState.swRegistration])

  // Fonction pour envoyer une notification locale
  const showLocalNotification = useCallback((title: string, options: NotificationOptions = {}) => {
    if (pwaState.notificationPermission === 'granted') {
      new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        ...options,
      });
    }
  }, [pwaState.notificationPermission]);

  return {
    ...pwaState,
    installApp,
    requestNotificationPermission,
    subscribeToNotifications,
    showLocalNotification,
  };
}