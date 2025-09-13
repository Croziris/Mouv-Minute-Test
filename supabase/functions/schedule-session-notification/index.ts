import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { user_id, session_id, end_at, title, body } = await req.json();

    if (!user_id || !end_at) {
      return new Response(
        JSON.stringify({ error: 'user_id et end_at sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'utilisateur a des abonnements push actifs
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subError) {
      console.error('Erreur lors de la récupération des abonnements:', subError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification des abonnements' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun abonnement push trouvé pour cet utilisateur' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer l'entrée de notification programmée
    const { data: notification, error: notifError } = await supabase
      .from('session_notifications')
      .insert({
        user_id,
        session_id: session_id || null,
        end_at,
        title: title || 'Session terminée 🎉',
        body: body || 'Il est temps de faire tes exercices.',
        status: 'scheduled'
      })
      .select()
      .single();

    if (notifError) {
      console.error('Erreur lors de la création de la notification:', notifError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la programmation de la notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Notification programmée pour ${end_at}, ID: ${notification.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id: notification.id,
        scheduled_for: end_at 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur dans schedule-session-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});