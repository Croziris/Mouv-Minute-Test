import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Clés VAPID - À configurer dans les variables d'environnement
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:crz.pierre13@gmail.com';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Créer le client Supabase avec la clé service
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Recherche des notifications dues...');

    // Récupérer les notifications dues (end_at <= maintenant)
    const { data: dueNotifications, error: fetchError } = await supabase
      .from('session_notifications')
      .select('*')
      .eq('status', 'scheduled')
      .lte('end_at', new Date().toISOString())
      .limit(100); // Limiter pour éviter la surcharge

    if (fetchError) {
      console.error('Erreur lors de la récupération des notifications dues:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la récupération des notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!dueNotifications || dueNotifications.length === 0) {
      console.log('Aucune notification due trouvée');
      return new Response(
        JSON.stringify({ message: 'Aucune notification due', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`${dueNotifications.length} notifications dues trouvées`);

    let processedCount = 0;
    let errorCount = 0;

    // Traiter chaque notification
    for (const notification of dueNotifications) {
      try {
        // Récupérer les abonnements push de l'utilisateur
        const { data: subscriptions, error: subError } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', notification.user_id);

        if (subError || !subscriptions || subscriptions.length === 0) {
          console.warn(`Aucun abonnement trouvé pour l'utilisateur ${notification.user_id}`);
          // Marquer comme envoyée même si pas d'abonnement pour éviter les répétitions
          await supabase
            .from('session_notifications')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', notification.id);
          continue;
        }

        // Envoyer la notification à tous les abonnements de l'utilisateur
        for (const subscription of subscriptions) {
          await sendWebPushNotification(subscription, notification);
        }

        // Marquer la notification comme envoyée
        await supabase
          .from('session_notifications')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', notification.id);

        processedCount++;
        console.log(`Notification ${notification.id} envoyée avec succès`);

      } catch (error) {
        console.error(`Erreur lors de l'envoi de la notification ${notification.id}:`, error);
        errorCount++;
        
        // Ne pas marquer comme envoyée en cas d'erreur pour permettre une nouvelle tentative
        // Optionnel: incrémenter un compteur d'erreur ou marquer comme échouée après X tentatives
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Traitement terminé`, 
        processed: processedCount,
        errors: errorCount,
        total: dueNotifications.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur dans dispatch-due-notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendWebPushNotification(subscription: any, notification: any) {
  // Pour cette démo, nous utilisons une approche simplifiée
  // En production, vous devriez utiliser une bibliothèque Web Push complète
  
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      session_id: notification.session_id,
      notification_id: notification.id,
      url: '/timer'
    },
    actions: [
      {
        action: 'open-exercises',
        title: 'Voir exercices'
      },
      {
        action: 'restart-timer',
        title: 'Relancer 5 min'
      }
    ],
    requireInteraction: true,
    tag: 'session-end'
  });

  // Ici, nous devrions utiliser la Web Push Protocol
  // Pour la démo, nous simulons l'envoi
  console.log(`Envoi de notification push à ${subscription.endpoint.substring(0, 50)}...`);
  console.log(`Payload: ${payload}`);
  
  // TODO: Implémenter l'envoi réel avec les clés VAPID
  // Cette partie nécessiterait une bibliothèque Web Push complète
  
  return Promise.resolve();
}