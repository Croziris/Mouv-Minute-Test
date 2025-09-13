import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export function usePushNotifications() {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Vérifier si les notifications push sont supportées
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;

  // Charger l'état d'abonnement existant
  useEffect(() => {
    if (!user || !isSupported) return;

    const checkExistingSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();
        
        if (existingSubscription) {
          setSubscription(existingSubscription);
          setIsSubscribed(true);
          
          // Vérifier si l'abonnement existe en base
          const { data } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('endpoint', existingSubscription.endpoint)
            .single();
            
          if (!data) {
            // L'abonnement n'existe pas en base, l'enregistrer
            await savePushSubscription(existingSubscription);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'abonnement existant:', error);
      }
    };

    checkExistingSubscription();
  }, [user, isSupported]);

  // Sauvegarder l'abonnement en base de données
  const savePushSubscription = async (pushSubscription: PushSubscription) => {
    if (!user) return false;

    try {
      const p256dh = pushSubscription.getKey('p256dh');
      const auth = pushSubscription.getKey('auth');

      if (!p256dh || !auth) {
        throw new Error('Clés de chiffrement manquantes');
      }

      // Convertir les clés en base64
      const p256dhBase64 = btoa(String.fromCharCode(...new Uint8Array(p256dh)));
      const authBase64 = btoa(String.fromCharCode(...new Uint8Array(auth)));

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: pushSubscription.endpoint,
          p256dh: p256dhBase64,
          auth: authBase64
        });

      if (error) throw error;

      console.log('Abonnement push sauvegardé avec succès');
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'abonnement:', error);
      return false;
    }
  };

  // S'abonner aux notifications push
  const subscribe = useCallback(async () => {
    if (!user || !isSupported) {
      toast({
        title: "Non supporté",
        description: "Les notifications push ne sont pas supportées sur ce navigateur.",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      // Demander la permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({
          title: "Permission refusée",
          description: "Veuillez autoriser les notifications dans les paramètres de votre navigateur.",
          variant: "destructive",
        });
        return false;
      }

      // Obtenir le service worker
      const registration = await navigator.serviceWorker.ready;

      // Clé publique VAPID (à configurer)
      const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI8YnaTNJHjzdGlYBjBahjgfhWlYjZTQKlkN5a2X8SaCQqJYdOv-0lQ';
      
      // Créer l'abonnement
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Sauvegarder en base de données
      const saved = await savePushSubscription(pushSubscription);
      
      if (saved) {
        setSubscription(pushSubscription);
        setIsSubscribed(true);
        
        toast({
          title: "Notifications activées",
          description: "Vous recevrez des notifications à la fin de vos sessions.",
        });
        
        return true;
      } else {
        throw new Error('Erreur lors de la sauvegarde');
      }

    } catch (error) {
      console.error('Erreur lors de l\'abonnement aux notifications:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'activer les notifications. Veuillez réessayer.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, isSupported]);

  // Se désabonner des notifications push
  const unsubscribe = useCallback(async () => {
    if (!user || !subscription) return false;

    setLoading(true);
    try {
      // Désabonner du service worker
      await subscription.unsubscribe();

      // Supprimer de la base de données
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', subscription.endpoint);

      setSubscription(null);
      setIsSubscribed(false);

      toast({
        title: "Notifications désactivées",
        description: "Vous ne recevrez plus de notifications.",
      });

      return true;
    } catch (error) {
      console.error('Erreur lors du désabonnement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de désactiver les notifications.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, subscription]);

  // Programmer une notification de fin de session
  const scheduleSessionEndNotification = useCallback(async (endAt: Date, sessionId?: string) => {
    if (!user || !isSubscribed) return false;

    try {
      const { data, error } = await supabase.functions.invoke('schedule-session-notification', {
        body: {
          user_id: user.id,
          session_id: sessionId,
          end_at: endAt.toISOString(),
          title: 'Session terminée 🎉',
          body: 'Il est temps de faire tes exercices.'
        }
      });

      if (error) throw error;

      console.log('Notification de fin de session programmée:', data);
      return true;
    } catch (error) {
      console.error('Erreur lors de la programmation de la notification:', error);
      return false;
    }
  }, [user, isSubscribed]);

  return {
    isSupported,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    scheduleSessionEndNotification
  };
}

// Utilitaire pour convertir la clé VAPID
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}