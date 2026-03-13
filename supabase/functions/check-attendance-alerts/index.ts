import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find active attendance sessions (no clock_out)
    const { data: activeSessions, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .is('clock_out', null);

    if (error) {
      throw error;
    }

    if (!activeSessions || activeSessions.length === 0) {
      return new Response(JSON.stringify({ checked: 0, autoStopped: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    let autoStopped = 0;

    for (const session of activeSessions) {
      const clockIn = new Date(session.clock_in);
      const elapsedMinutes = Math.floor((now.getTime() - clockIn.getTime()) / 60000);

      if (elapsedMinutes >= 480) {
        // Auto clock-out
        const { error: updateError } = await supabase
          .from('attendance_logs')
          .update({
            clock_out: now.toISOString(),
            total_minutes: elapsedMinutes,
            exit_type: 'auto_8h',
          })
          .eq('id', session.id);

        if (updateError) {
          console.error(`Failed to auto clock-out ${session.id}:`, updateError);
          continue;
        }

        // Send push notification to the user
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              type: 'attendance_8h',
              title: '⏰ Jornada completada',
              body: '¡Has cumplido 8 horas! Se registró tu salida automáticamente.',
              user_ids: [session.user_id],
            }),
          });
        } catch (pushError) {
          console.error(`Failed to send push for ${session.user_id}:`, pushError);
        }

        autoStopped++;
      }
    }

    return new Response(JSON.stringify({ checked: activeSessions.length, autoStopped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in check-attendance-alerts:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
