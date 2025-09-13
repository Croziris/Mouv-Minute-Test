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

    const { user_id, endpoint } = await req.json();

    if (!user_id || !endpoint) {
      return new Response(
        JSON.stringify({ error: 'user_id et endpoint sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supprimer l'abonnement spécifique
    const { data: deletedSub, error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user_id)
      .eq('endpoint', endpoint)
      .select('id');

    if (deleteError) {
      console.error('Erreur lors de la suppression de l\'abonnement:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la suppression de l\'abonnement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deletedCount = deletedSub?.length || 0;
    
    if (deletedCount === 0) {
      console.log(`Aucun abonnement trouvé pour l'endpoint ${endpoint} et user ${user_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Aucun abonnement à supprimer',
          deleted_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Abonnement supprimé pour l'utilisateur ${user_id}, endpoint: ${endpoint}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Abonnement supprimé',
        deleted_count: deletedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erreur dans delete-subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});