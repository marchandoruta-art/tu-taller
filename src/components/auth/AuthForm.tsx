import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wrench, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LanguageSelector } from '@/components/settings/LanguageSelector';

export function AuthForm() {
  const { t } = useTranslation();
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    if (error) {
      toast.error(t('authUI.auth.signInErrorTitle'), { description: error.message });
    } else {
      toast.success(t('authUI.auth.signInSuccess'));
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    const { error } = await signUp(email, password, fullName);
    if (error) {
      toast.error(t('authUI.auth.signUpErrorTitle'), { description: error.message });
    } else {
      toast.success(t('authUI.auth.signUpSuccessTitle'), { description: t('authUI.auth.signUpSuccessDescription') });
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
            <CardTitle className="text-2xl">{t('authUI.brand')}</CardTitle>
            <CardDescription>{t('authUI.tagline')}</CardDescription>
          </div>
          <div className="flex justify-center">
            <LanguageSelector compact className="w-auto" />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">{t('authUI.auth.signInTab')}</TabsTrigger>
              <TabsTrigger value="signup">{t('authUI.auth.signUpTab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t('authUI.auth.email')}</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder={t('authUI.auth.emailPlaceholder')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t('authUI.auth.password')}</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('authUI.auth.signInButton')}
                </Button>
                <div className="text-center">
                  <a href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {t('authUI.auth.forgotPassword')}
                  </a>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t('authUI.auth.fullName')}</Label>
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    placeholder={t('authUI.auth.fullNamePlaceholder')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('authUI.auth.email')}</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder={t('authUI.auth.emailPlaceholder')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('authUI.auth.password')}</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('authUI.auth.signUpButton')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
