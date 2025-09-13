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

if (!vapidPrivateKey || !vapidPublicKey) {
  console.error('VAPID keys are required but not found in environment variables');
}

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
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
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

    // Envoyer une notification de test à chaque abonnement
    for (const subscription of subscriptions) {
      try {
        const result = await sendTestPushNotification(subscription);
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

        // Si l'abonnement est expiré (410), on pourrait le supprimer
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
        message: 'Notifications de test envoyées',
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
    console.error('Erreur dans test-push-notification:', error);
    
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

async function sendTestPushNotification(subscription: any) {
  const { endpoint, p256dh, auth } = subscription;

  // Payload de test
  const payload = JSON.stringify({
    title: "Test Mouv'Minute 🧪",
    body: "Ceci est une notification de test. Tout fonctionne parfaitement !",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { 
      url: "/timer",
      test: true 
    },
    actions: [
      { action: 'open-timer', title: 'Ouvrir Timer' },
      { action: 'dismiss', title: 'Fermer' }
    ],
    requireInteraction: false,
    tag: 'test-notification',
    timestamp: Date.now()
  });

  // Construire les headers Web Push
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'TTL': '60' // 1 minute de validité
  };

  // Ajouter l'autorisation VAPID si disponible
  if (vapidPrivateKey && vapidPublicKey) {
    // Simplification : on assume que l'endpoint Firebase/FCM accepte les payloads directement
    // Dans un vrai système, il faudrait signer avec VAPID
    headers['Authorization'] = `key=${vapidPrivateKey}`;
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
    console.error('Erreur Web Push:', errorMsg);
    throw new Error(errorMsg);
  }

  return {
    status: response.status,
    response: responseText || 'OK'
  };
}