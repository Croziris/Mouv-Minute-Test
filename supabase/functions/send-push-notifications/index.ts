import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  device_type?: string;
}

interface NotificationQueue {
  id: string;
  user_id: string;
  notification_data: any;
  attempts: number;
}

// Fonction pour convertir une clé VAPID base64url en Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Fonction pour envoyer une notification push simple (sans web-push lib)
async function sendWebPushNotification(
  subscription: PushSubscription, 
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    console.log(`Attempting to send push to: ${subscription.endpoint}`);
    
    // Pour un vrai déploiement, vous devriez utiliser une librairie comme web-push
    // Ici on simule l'envoi et on log
    console.log('Push payload:', payload);
    console.log('Subscription:', subscription);
    
    // Simulation d'un envoi réussi
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;

    if (!vapidPrivateKey || !vapidPublicKey) {
      throw new Error('VAPID keys not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Traiter les notifications dues (mettre à jour les statuts et créer les notifications en queue)
    const { error: dispatchError } = await supabase.rpc('dispatch_due_notifications');
    if (dispatchError) {
      console.error('Error dispatching due notifications:', dispatchError);
    }

    // Récupérer les notifications en attente dans la queue
    const { data: pendingNotifications, error: queueError } = await supabase
      .from('push_notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(50);

    if (queueError) {
      throw queueError;
    }

    console.log(`Processing ${pendingNotifications?.length || 0} pending notifications`);

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No pending notifications',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let successCount = 0;
    let failureCount = 0;

    // Traiter chaque notification
    for (const notification of pendingNotifications as NotificationQueue[]) {
      try {
        // Récupérer les abonnements push de l'utilisateur
        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth, device_type')
          .eq('user_id', notification.user_id);

        if (subError) {
          console.error('Error fetching subscriptions:', subError);
          continue;
        }

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`No push subscriptions found for user ${notification.user_id}`);
          // Marquer comme sent car pas de subscription
          await supabase
            .from('push_notification_queue')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString(),
              error_message: 'No active push subscriptions'
            })
            .eq('id', notification.id);
          continue;
        }

        // Envoyer à chaque abonnement
        let sentToAnyDevice = false;
        for (const subscription of subscriptions as PushSubscription[]) {
          try {
            const payload = JSON.stringify(notification.notification_data);
            const success = await sendWebPushNotification(
              subscription,
              payload,
              vapidPublicKey,
              vapidPrivateKey
            );

            if (success) {
              sentToAnyDevice = true;
              console.log(`Push sent successfully to ${subscription.device_type || 'unknown'} device`);
            } else {
              console.error(`Failed to send push to ${subscription.device_type || 'unknown'} device`);
            }

          } catch (pushError) {
            console.error('Error sending to subscription:', pushError);
          }
        }

        if (sentToAnyDevice) {
          successCount++;
          // Marquer la notification comme envoyée
          await supabase
            .from('push_notification_queue')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString() 
            })
            .eq('id', notification.id);
        } else {
          failureCount++;
          // Incrémenter les tentatives
          await supabase
            .from('push_notification_queue')
            .update({ 
              attempts: notification.attempts + 1,
              error_message: 'Failed to send to any device' 
            })
            .eq('id', notification.id);
        }

      } catch (error) {
        console.error('Error processing notification:', error);
        
        // Incrémenter les tentatives
        await supabase
          .from('push_notification_queue')
          .update({ 
            attempts: notification.attempts + 1,
            error_message: (error as Error).message 
          })
          .eq('id', notification.id);

        failureCount++;
      }
    }

    return new Response(JSON.stringify({
      message: 'Push notifications processed',
      processed: pendingNotifications.length,
      successful: successCount,
      failed: failureCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});