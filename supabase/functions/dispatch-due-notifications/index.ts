import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🔔 Début du traitement des notifications dues...');

    // Récupérer toutes les notifications planifiées qui sont dues
    const now = new Date().toISOString();
    const { data: dueNotifications, error: fetchError } = await supabase
      .from('session_notifications')
      .select('*')
      .eq('status', 'scheduled')
      .lte('end_at', now);

    if (fetchError) {
      console.error('Erreur lors de la récupération des notifications:', fetchError);
      throw fetchError;
    }

    if (!dueNotifications || dueNotifications.length === 0) {
      console.log('📭 Aucune notification due trouvée');
      return new Response(
        JSON.stringify({ 
          message: 'Aucune notification due',
          processed: 0 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📨 ${dueNotifications.length} notifications dues trouvées`);

    const processedResults = [];
    
    // Traiter chaque notification due
    for (const notification of dueNotifications) {
      try {
        console.log(`📤 Traitement notification ${notification.id} pour user ${notification.user_id}`);
        
        // Récupérer les abonnements push de l'utilisateur
        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', notification.user_id);

        if (subError) {
          throw subError;
        }

        if (!subscriptions || subscriptions.length === 0) {
          console.log(`❌ Aucun abonnement push pour l'utilisateur ${notification.user_id}`);
          // Marquer comme échouée
          await supabase
            .from('session_notifications')
            .update({ 
              status: 'failed',
              sent_at: new Date().toISOString()
            })
            .eq('id', notification.id);
          
          processedResults.push({
            notification_id: notification.id,
            user_id: notification.user_id,
            success: false,
            reason: 'Aucun abonnement push'
          });
          continue;
        }

        // Envoyer la notification à tous les abonnements de l'utilisateur
        let sentCount = 0;
        let errorCount = 0;

        for (const subscription of subscriptions) {
          try {
            await sendSessionEndNotification(subscription, notification);
            sentCount++;
            console.log(`✅ Notification envoyée à ${subscription.device_type || 'desktop'}`);
          } catch (pushError) {
            errorCount++;
            console.error(`❌ Erreur envoi vers ${subscription.device_type}:`, pushError);
            
            // Si abonnement expiré, le supprimer
            if (pushError.message.includes('410')) {
              console.log(`🗑️ Suppression abonnement expiré: ${subscription.id}`);
              await supabase
                .from('push_subscriptions')
                .delete()
                .eq('id', subscription.id);
            }
          }
        }

        // Marquer la notification comme envoyée si au moins un envoi réussi
        const finalStatus = sentCount > 0 ? 'sent' : 'failed';
        await supabase
          .from('session_notifications')
          .update({ 
            status: finalStatus,
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id);

        processedResults.push({
          notification_id: notification.id,
          user_id: notification.user_id,
          success: sentCount > 0,
          sent_count: sentCount,
          error_count: errorCount
        });

        console.log(`📊 Notification ${notification.id}: ${sentCount} envois réussis, ${errorCount} échecs`);

      } catch (error) {
        console.error(`💥 Erreur critique pour notification ${notification.id}:`, error);
        
        // Marquer comme échouée
        await supabase
          .from('session_notifications')
          .update({ 
            status: 'failed',
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id);

        processedResults.push({
          notification_id: notification.id,
          user_id: notification.user_id,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = processedResults.filter(r => r.success).length;
    
    console.log(`🎯 Traitement terminé: ${successCount}/${processedResults.length} notifications envoyées avec succès`);

    return new Response(
      JSON.stringify({ 
        message: 'Notifications traitées',
        processed: processedResults.length,
        success_count: successCount,
        results: processedResults
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Erreur critique dans dispatch-due-notifications:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erreur interne du serveur' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function sendSessionEndNotification(subscription: any, notification: any) {
  const { endpoint, p256dh, auth, device_type } = subscription;

  // Payload de notification d'échéance
  const deviceEmoji = device_type === 'android' ? '📱' : device_type === 'ios' ? '🍎' : '💻';
  
  const payload = JSON.stringify({
    title: notification.title || 'Session terminée 🎉',
    body: notification.body || 'Il est temps de faire tes exercices.',
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { 
      url: "/exercises",
      session_id: notification.session_id,
      device_type: device_type || 'desktop',
      notification_id: notification.id
    },
    actions: [
      { action: 'open-exercises', title: 'Voir exercices' },
      { action: 'restart-timer', title: 'Relancer 5 min' }
    ],
    requireInteraction: true, // Important pour Android
    tag: 'session-end-notification',
    timestamp: Date.now(),
    vibrate: [200, 100, 200, 100, 200]
  });

  // Headers Web Push
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'TTL': '300' // 5 minutes de validité
  };

  // Ajouter l'autorisation VAPID si disponible
  if (vapidPrivateKey && vapidPublicKey) {
    const vapidHeader = `vapid t=${generateJWTToken(vapidPrivateKey, vapidPublicKey, endpoint)}, k=${vapidPublicKey}`;
    headers['Authorization'] = vapidHeader;
  }

  // Envoyer la notification
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: payload
  });

  const responseText = await response.text();

  if (!response.ok) {
    const errorMsg = `HTTP ${response.status}: ${responseText}`;
    throw new Error(errorMsg);
  }

  return {
    status: response.status,
    response: responseText || 'OK'
  };
}

// Fonction utilitaire pour générer le token JWT VAPID
function generateJWTToken(privateKey: string, publicKey: string, endpoint: string): string {
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = btoa(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60), // 12h
    sub: 'mailto:admin@mouvminute.com'
  }));
  
  // Token simple pour test - remplacer par vraie signature ES256 en production
  return `${header}.${payload}.${btoa('mock-signature')}`;
}