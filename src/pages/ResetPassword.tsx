import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);

  useEffect(() => {
    const establishSessionFromUrl = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith('#') ? window.location.hash.substring(1) : ''
      );

      const authCode = searchParams.get('code') || hashParams.get('code');
      const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash');
      const type = (searchParams.get('type') || hashParams.get('type')) as
        | 'recovery'
        | 'invite'
        | null;
      const errorDescription =
        searchParams.get('error_description') || hashParams.get('error_description');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      // Link explicitly expired/invalid from email provider
      if (errorDescription) {
        setLinkInvalid(true);
        return;
      }

      // CRITICAL: do NOT signOut before checking the session.
      // With detectSessionInUrl (default), the SDK auto-consumes the hash
      // tokens from the recovery email and creates a session. signing out
      // here would wipe that recovery session and break the flow.
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        setSessionReady(true);
        if (window.location.hash || window.location.search) {
          window.history.replaceState({}, '', '/reset-password');
        }
        return;
      }

      // No auto-session yet. Try manual flows for other link formats.
      // Format 1: PKCE code in query (?code=...)
      if (authCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(authCode);
        if (!error) {
          setSessionReady(true);
          window.history.replaceState({}, '', '/reset-password');
          return;
        }
      }

      // Format 2: token_hash + type (newer email links)
      if (tokenHash && (type === 'recovery' || type === 'invite')) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        if (!error) {
          setSessionReady(true);
          window.history.replaceState({}, '', '/reset-password');
          return;
        }
      }

      // Format 3: legacy hash with access_token & refresh_token
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          setSessionReady(true);
          window.history.replaceState({}, '', '/reset-password');
          return;
        }
      }

      // Give the SDK a brief moment in case PASSWORD_RECOVERY is still firing
      await new Promise((r) => setTimeout(r, 600));
      const { data: { session: laterSession } } = await supabase.auth.getSession();
      if (laterSession) {
        setSessionReady(true);
        return;
      }

      setLinkInvalid(true);
    };

    void establishSessionFromUrl();

    // Also listen for recovery/invite events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessionReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error('Error al actualizar la contraseña', { description: error.message });
    } else {
      toast.success('Contraseña actualizada correctamente');
      await supabase.auth.signOut();
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elevated">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Wrench className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Nueva contraseña</CardTitle>
            <CardDescription>Introduce tu nueva contraseña</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!sessionReady && !linkInvalid ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validando enlace…
            </div>
          ) : linkInvalid ? (
            <div className="space-y-3 py-2 text-center">
              <p className="text-sm text-muted-foreground">
                El enlace no es válido o ha caducado. Solicita uno nuevo.
              </p>
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/forgot-password')}>
                Solicitar nuevo enlace
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Actualizar contraseña
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
