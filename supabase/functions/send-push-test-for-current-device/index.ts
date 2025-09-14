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

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { user_id, subscription_id, user_agent } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Récupérer l'abonnement spécifique (device courant)
    let query = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    // Filtrer par subscription_id ou user_agent si fourni
    if (subscription_id) {
      query = query.eq('subscription_id', subscription_id);
    } else if (user_agent) {
      query = query.eq('user_agent', user_agent);
    }

    // Prendre le plus récent si pas de filtre spécifique
    const { data: subscriptions, error: fetchError } = await query
      .order('updated_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Erreur lors de la récupération de l\'abonnement:', fetchError);
      throw new Error('Impossible de récupérer l\'abonnement');
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun abonnement push trouvé pour cet appareil' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const subscription = subscriptions[0];
    
    try {
      const result = await sendTestPushNotification(subscription);
      
      return new Response(
        JSON.stringify({ 
          message: 'Notification de test envoyée avec succès',
          device_type: subscription.device_type,
          success: true,
          ...result
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (error) {
      console.error(`Erreur lors de l'envoi de la notification test:`, error);
      
      // Si l'abonnement est expiré (410), le supprimer
      if (error.message.includes('410')) {
        console.log(`Suppression de l'abonnement expiré: ${subscription.id}`);
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', subscription.id);
      }

      return new Response(
        JSON.stringify({ 
          error: 'Échec de l\'envoi de la notification de test',
          details: error.message,
          device_type: subscription.device_type,
          success: false
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Erreur dans send-push-test-for-current-device:', error);
    
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
  const { endpoint, p256dh, auth, device_type } = subscription;

  // Payload de test spécifique au device
  const deviceEmoji = device_type === 'android' ? '📱' : device_type === 'ios' ? '🍎' : '💻';
  
  const payload = JSON.stringify({
    title: `Test Mouv'Minute ${deviceEmoji}`,
    body: `Notification de test sur ${device_type || 'cet appareil'}. Tout fonctionne !`,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { 
      url: "/timer",
      test: true,
      device_type: device_type || 'desktop'
    },
    actions: [
      { action: 'open-timer', title: 'Ouvrir Timer' },
      { action: 'dismiss', title: 'Fermer' }
    ],
    requireInteraction: false,
    tag: 'test-notification-device',
    timestamp: Date.now(),
    vibrate: [200, 100, 200]
  });

  // Headers Web Push avec TTL court pour le test
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'TTL': '60' // 1 minute de validité pour le test
  };

  // Ajouter l'autorisation VAPID si disponible
  if (vapidPrivateKey && vapidPublicKey) {
    // Format VAPID correct pour WebPush
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
    console.error('Erreur Web Push:', errorMsg);
    throw new Error(errorMsg);
  }

  return {
    status: response.status,
    response: responseText || 'OK',
    device_type: device_type || 'desktop'
  };
}

// Fonction utilitaire pour générer le token JWT VAPID
function generateJWTToken(privateKey: string, publicKey: string, endpoint: string): string {
  // Simplification pour demo - dans un vrai système, utiliser une librairie JWT/VAPID complète
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = btoa(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60), // 12h
    sub: 'mailto:admin@mouvminute.com'
  }));
  
  // Token simple pour test - remplacer par vraie signature ES256 en production
  return `${header}.${payload}.${btoa('mock-signature')}`;
}