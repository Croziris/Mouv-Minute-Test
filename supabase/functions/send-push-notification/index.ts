import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { user_id, title, body, data, target_url } = await req.json();

    if (!user_id || !title) {
      return new Response(
        JSON.stringify({ error: 'user_id and title are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Récupérer les abonnements push de l'utilisateur
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (fetchError) {
      console.error('Erreur lors de la récupération des abonnements:', fetchError);
      throw new Error('Impossible de récupérer les abonnements');
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun abonnement push trouvé pour cet utilisateur' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const results = [];

    // Envoyer la notification à chaque abonnement
    for (const subscription of subscriptions) {
      try {
        const result = await sendWebPushNotification(subscription, {
          title,
          body: body || 'Notification de Mouv\'Minute',
          data: {
            url: target_url || '/timer',
            ...data
          }
        });
        
        results.push({
          subscription_id: subscription.id,
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          success: true,
          ...result
        });
      } catch (error) {
        console.error(`Erreur pour l'abonnement ${subscription.id}:`, error);
        results.push({
          subscription_id: subscription.id,
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          success: false,
          error: error.message
        });

        // Si l'abonnement est expiré (410), on le supprime
        if (error.message.includes('410')) {
          console.log(`Suppression de l'abonnement expiré: ${subscription.id}`);
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Notifications envoyées',
        results,
        sent_count: results.filter(r => r.success).length,
        total_count: results.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erreur dans send-push-notification:', error);
    
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

async function sendWebPushNotification(subscription: any, notificationData: any) {
  const { endpoint, p256dh, auth } = subscription;

  // Payload
  const payload = JSON.stringify({
    title: notificationData.title,
    body: notificationData.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: notificationData.data,
    actions: [
      { action: 'open-timer', title: 'Ouvrir Timer' },
      { action: 'open-exercises', title: 'Voir Exercices' }
    ],
    requireInteraction: false,
    tag: 'mouv-minute-notification',
    timestamp: Date.now()
  });

  // Headers Web Push
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'TTL': '3600' // 1 heure de validité
  };

  // Envoyer la notification
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: payload
  });

  const responseText = await response.text();

  if (!response.ok) {
    const errorMsg = `HTTP ${response.status}: ${responseText}`;
    console.error('Erreur Web Push:', errorMsg);
    throw new Error(errorMsg);
  }

  return {
    status: response.status,
    response: responseText || 'OK'
  };
}