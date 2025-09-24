import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationQueue {
  id: string;
  user_id: string;
  notification_data: any;
  attempts: number;
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

    // Traiter les notifications dues
    await supabase.rpc('dispatch_due_notifications');

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
        for (const subscription of subscriptions as PushSubscription[]) {
          try {
            const pushPayload = {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth
              }
            };

            // Créer le JWT pour VAPID
            const vapidHeader = {
              "typ": "JWT",
              "alg": "ES256"
            };

            const now = Math.floor(Date.now() / 1000);
            const vapidPayload = {
              "aud": new URL(subscription.endpoint).origin,
              "exp": now + 12 * 60 * 60, // 12 heures
              "sub": "mailto:contact@mouvminute.app"
            };

            const encoder = new TextEncoder();
            const vapidHeaderEncoded = btoa(JSON.stringify(vapidHeader)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
            const vapidPayloadEncoded = btoa(JSON.stringify(vapidPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
            
            const unsignedToken = `${vapidHeaderEncoded}.${vapidPayloadEncoded}`;
            
            // Pour simplifier, on utilise fetch directement avec un service externe ou on log
            console.log(`Would send push notification to ${subscription.endpoint}`);
            console.log('Notification data:', notification.notification_data);

            // Ici, dans un vrai système, vous utiliseriez une bibliothèque comme web-push
            // Pour l'instant, on simule l'envoi
            
            successCount++;
          } catch (pushError) {
            console.error('Error sending to subscription:', pushError);
            failureCount++;
          }
        }

        // Marquer la notification comme envoyée
        await supabase
          .from('push_notification_queue')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', notification.id);

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
      message: 'Notifications processed',
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