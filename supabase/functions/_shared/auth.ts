// Shared auth helpers for edge functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

export async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return { userId: data.claims.sub as string, claims: data.claims };
}

// Allow only cron-style invocations: must present service role key as Bearer token.
export function requireServiceRole(req: Request): boolean {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  return token.length > 0 && serviceKey.length > 0 && token === serviceKey;
}
