/**
 * Hook robuste pour la gestion des notifications push
 * Évite les freeze et gère tous les cas edge (iOS, timeouts, etc.)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { base64UrlToUint8Array } from '@/utils/pushUtils';

// VAPID public key - à définir dans les variables d'environnement
const VAPID_PUBLIC_KEY = 'BH4dYirGhV-uuCLSmy9aALg9F8kFVgWqWJwJzK8ioxfQR1HzBdRYYXHrV-gPf5M6s_4eJ6oXVv2_b1r8f9JZjYM'; // Clé d'exemple, remplacez par la vraie

type PushStatus = 'idle' | 'prompting' | 'subscribing' | 'subscribed' | 'error';

interface UsePushSetupOptions {
  timeout?: number; // Timeout en ms, défaut 10000 (10s)
}

interface UsePushSetupReturn {
  canUsePush: boolean;
  status: PushStatus;
  error?: string;
  requestPermissionAndSubscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  scheduleNotification: (endAt: Date, sessionId?: string) => Promise<void>;
}

export function usePushSetup(options: UsePushSetupOptions = {}): UsePushSetupReturn {
  const { timeout = 10000 } = options;
  
  const [status, setStatus] = useState<PushStatus>('idle');
  const [error, setError] = useState<string | undefined>();
  const [canUsePush, setCanUsePush] = useState(false);

  // Vérifier la compatibilité au montage
  useEffect(() => {
    const checkCompatibility = () => {
      // Vérifications de base
      const hasBasicSupport = 
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window;

      if (!hasBasicSupport) {
        setCanUsePush(false);
        return;
      }

      // Détection iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isIOSVersion16Plus = isIOS && 
        navigator.userAgent.match(/OS (\d+)_/)?.[1] && 
        parseInt(navigator.userAgent.match(/OS (\d+)_/)?.[1] || '0') >= 16;

      if (isIOS) {
        // Sur iOS, les notifications push ne marchent que dans une PWA installée
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           (window.navigator as any).standalone === true;
        
        setCanUsePush(isIOSVersion16Plus && isStandalone);
      } else {
        setCanUsePush(true);
      }
    };

    checkCompatibility();
  }, []);

  // Vérifier l'état existant des abonnements
  useEffect(() => {
    if (!canUsePush) return;

    const checkExistingSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        
        if (existingSubscription) {
          setStatus('subscribed');
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des abonnements:', error);
      }
    };

    checkExistingSubscription();
  }, [canUsePush]);

  const requestPermissionAndSubscribe = useCallback(async () => {
    if (!canUsePush) {
      setError('Les notifications push ne sont pas supportées sur cet appareil');
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      setError('Configuration VAPID manquante');
      setStatus('error');
      return;
    }

    // Créer un AbortController pour le timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      setStatus('prompting');
      setError(undefined);

      // Étape 1: Demander la permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        throw new Error('Permission refusée pour les notifications');
      }

      setStatus('subscribing');

      // Étape 2: S'assurer que le SW est prêt
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => 
          controller.signal.addEventListener('abort', () => 
            reject(new Error('Timeout lors de l\'attente du service worker'))
          )
        )
      ]) as ServiceWorkerRegistration;

      // Étape 3: Vérifier s'il y a déjà un abonnement
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        // Sauvegarder l'abonnement existant si ce n'est pas fait
        await saveSubscriptionToDatabase(existingSubscription);
        setStatus('subscribed');
        clearTimeout(timeoutId);
        return;
      }

      // Étape 4: S'abonner aux notifications push
      const applicationServerKey = base64UrlToUint8Array(VAPID_PUBLIC_KEY);
      
      const subscription = await Promise.race([
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        }),
        new Promise((_, reject) => 
          controller.signal.addEventListener('abort', () => 
            reject(new Error('Timeout lors de l\'abonnement push'))
          )
        )
      ]) as PushSubscription;

      // Étape 5: Sauvegarder l'abonnement en base
      await saveSubscriptionToDatabase(subscription);

      setStatus('subscribed');
      
      toast({
        title: "Notifications activées",
        description: "Vous recevrez des rappels pour vos pauses actives.",
      });

    } catch (error) {
      console.error('Erreur lors de l\'activation des notifications:', error);
      
      let errorMessage = 'Erreur inconnue';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('Timeout')) {
          errorMessage = 'Timeout - Veuillez réessayer';
        } else if (error.message.includes('Permission')) {
          errorMessage = 'Permission refusée';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setStatus('error');
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }, [canUsePush, timeout]);

  const unsubscribe = useCallback(async () => {
    try {
      setStatus('subscribing'); // Réutiliser le statut pour indiquer une action en cours

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await deleteSubscriptionFromDatabase(subscription);
      }

      setStatus('idle');
      
      toast({
        title: "Notifications désactivées",
        description: "Vous ne recevrez plus de rappels automatiques.",
      });
      
    } catch (error) {
      console.error('Erreur lors de la désactivation:', error);
      setError('Erreur lors de la désactivation');
      setStatus('error');
      
      toast({
        title: "Erreur",
        description: "Impossible de désactiver les notifications",
        variant: "destructive",
      });
    }
  }, []);

  const scheduleNotification = useCallback(async (endAt: Date, sessionId?: string) => {
    if (status !== 'subscribed') {
      throw new Error('Notifications non activées');
    }

    try {
      const { data, error } = await supabase.functions.invoke('schedule-session-notification', {
        body: {
          user_id: (await supabase.auth.getUser()).data.user?.id,
          session_id: sessionId,
          end_at: endAt.toISOString(),
          title: 'Session terminée 🎉',
          body: 'Il est temps de faire tes exercices.'
        }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erreur lors de la programmation de la notification:', error);
      throw error;
    }
  }, [status]);

  return {
    canUsePush,
    status,
    error,
    requestPermissionAndSubscribe,
    unsubscribe,
    scheduleNotification
  };
}

// Fonctions utilitaires

async function saveSubscriptionToDatabase(subscription: PushSubscription) {
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error('Utilisateur non connecté');

  const { error } = await supabase.functions.invoke('save-subscription', {
    body: {
      user_id: user.data.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.getKey('p256dh') ? 
        btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))) : null,
      auth: subscription.getKey('auth') ? 
        btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))) : null
    }
  });

  if (error) throw error;
}

async function deleteSubscriptionFromDatabase(subscription: PushSubscription) {
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error('Utilisateur non connecté');

  const { error } = await supabase.functions.invoke('delete-subscription', {
    body: {
      user_id: user.data.user.id,
      endpoint: subscription.endpoint
    }
  });

  if (error) throw error;
}