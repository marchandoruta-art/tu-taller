import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Detects auth callback tokens in the URL (invite, recovery, magiclink)
 * and redirects to the appropriate page.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check URL hash for auth tokens (Supabase appends them as hash fragments)
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.substring(1));
    const type = params.get('type');

    // For invite and recovery flows, redirect to reset-password
    if (type === 'invite' || type === 'recovery') {
      navigate('/reset-password' + window.location.hash, { replace: true });
      return;
    }

    // Also listen for auth state changes for edge cases
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location]);

  return null;
}
