import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  
    // Restrict to internal/cron callers presenting the service role key
    const _auth = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
    const _svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!_auth || !_svc || _auth !== _svc) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action } = await req.json();

    if (action === 'clock_in') {
      // Get all users with an organization (active employees)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, organization_id')
        .not('organization_id', 'is', null);

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) {
        return new Response(JSON.stringify({ action: 'clock_in', processed: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let clockedIn = 0;
      const today = new Date().toISOString().split('T')[0];

      for (const profile of profiles) {
        // Check if user already has an active session or clocked in today
        const { data: existing } = await supabase
          .from('attendance_logs')
          .select('id')
          .eq('user_id', profile.user_id)
          .gte('clock_in', `${today}T00:00:00`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Auto clock-in
        const { error: insertError } = await supabase
          .from('attendance_logs')
          .insert({
            user_id: profile.user_id,
            organization_id: profile.organization_id,
            clock_in: `${today}T08:00:00+02:00`, // 8:00 hora España
            exit_type: null,
          });

        if (insertError) {
          console.error(`Failed to clock in ${profile.user_id}:`, insertError);
          continue;
        }
        clockedIn++;
      }

      console.log(`Auto clock-in: ${clockedIn} users`);
      return new Response(JSON.stringify({ action: 'clock_in', processed: clockedIn }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'clock_out') {
      // Find all active sessions (no clock_out)
      const { data: activeSessions, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .is('clock_out', null);

      if (error) throw error;
      if (!activeSessions || activeSessions.length === 0) {
        return new Response(JSON.stringify({ action: 'clock_out', processed: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let clockedOut = 0;
      const now = new Date();

      for (const session of activeSessions) {
        const clockIn = new Date(session.clock_in);
        const totalMinutes = Math.floor((now.getTime() - clockIn.getTime()) / 60000);

        const { error: updateError } = await supabase
          .from('attendance_logs')
          .update({
            clock_out: now.toISOString(),
            total_minutes: totalMinutes,
            exit_type: 'auto_16h',
          })
          .eq('id', session.id);

        if (updateError) {
          console.error(`Failed to clock out ${session.id}:`, updateError);
          continue;
        }
        clockedOut++;
      }

      console.log(`Auto clock-out: ${clockedOut} users`);
      return new Response(JSON.stringify({ action: 'clock_out', processed: clockedOut }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use clock_in or clock_out' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in auto-attendance:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
