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

    const { user_id, endpoint, p256dh, auth } = await req.json();

    if (!user_id || !endpoint) {
      return new Response(
        JSON.stringify({ error: 'user_id et endpoint sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si un abonnement avec ce endpoint existe déjà
    const { data: existingSub } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user_id)
      .eq('endpoint', endpoint)
      .single();

    if (existingSub) {
      // Abonnement déjà existant, mettre à jour les clés
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({
          p256dh,
          auth,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSub.id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour de l\'abonnement:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la mise à jour de l\'abonnement' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Abonnement mis à jour pour l'utilisateur ${user_id}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Abonnement mis à jour',
          subscription_id: existingSub.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Créer un nouvel abonnement
    const { data: newSub, error: insertError } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id,
        endpoint,
        p256dh,
        auth
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Erreur lors de la création de l\'abonnement:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la sauvegarde de l\'abonnement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Nouvel abonnement créé pour l'utilisateur ${user_id}, ID: ${newSub.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Abonnement sauvegardé',
        subscription_id: newSub.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur dans save-subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});