import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Loader2, ArrowLeft, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    // Always show success to not reveal if email exists
    setSent(true);
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
            <CardTitle className="text-2xl">{t('authUI.forgotPassword.title')}</CardTitle>
            <CardDescription>
              {sent
                ? t('authUI.forgotPassword.descriptionSent')
                : t('authUI.forgotPassword.descriptionDefault')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('authUI.auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('authUI.auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {t('authUI.forgotPassword.sendButton')}
              </Button>
            </form>
          ) : (
            <div className="text-center py-4">
              <Mail className="h-12 w-12 mx-auto text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                {t('authUI.forgotPassword.sentMessage')}
              </p>
            </div>
          )}
          <Link to="/" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t('authUI.forgotPassword.backToSignIn')}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
