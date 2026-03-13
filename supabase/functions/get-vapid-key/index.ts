import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if VAPID keys already exist
    const { data: existing } = await supabase
      .from('app_settings')
      .select('key, value')
      .is('organization_id', null)
      .in('key', ['vapid_public_key', 'vapid_private_key']);

    const publicKeyEntry = existing?.find(e => e.key === 'vapid_public_key');

    if (publicKeyEntry?.value) {
      return new Response(JSON.stringify({ publicKey: publicKeyEntry.value }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate new VAPID keys
    const vapidKeys = webpush.generateVAPIDKeys();

    // Store both keys in app_settings (service role bypasses RLS)
    await supabase.from('app_settings').insert([
      { key: 'vapid_public_key', value: vapidKeys.publicKey, organization_id: null },
      { key: 'vapid_private_key', value: vapidKeys.privateKey, organization_id: null },
    ]);

    return new Response(JSON.stringify({ publicKey: vapidKeys.publicKey }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-vapid-key:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
