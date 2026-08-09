import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wrench, Loader2, Building2, UserPlus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { LanguageSelector } from '@/components/settings/LanguageSelector';

export default function Onboarding() {
  const { t } = useTranslation();
  const { user, profile, signOut } = useAuth();
  const { refetch } = useOrganization();
  const navigate = useNavigate();

  const handleGoBack = async () => {
    await signOut();
    navigate('/');
  };
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !orgName.trim()) return;

    setLoading(true);
    try {
      const slug = generateSlug(orgName) + '-' + Date.now().toString(36);

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName.trim(),
          slug,
          owner_id: user.id,
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Update profile with organization_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update user_roles with organization_id and make user admin
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ organization_id: org.id, role: 'admin' })
        .eq('user_id', user.id);

      if (roleError) throw roleError;

      await refetch();
      toast.success(t('authUI.onboarding.createSuccess'));
      navigate('/');
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error(t('authUI.onboarding.createErrorTitle'), { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;

    setLoading(true);
    try {
      // Normalize invite code: trim whitespace, newlines, etc.
      const normalizedCode = inviteCode.trim().replace(/[\s\n\r]+/g, '');

      // Find organization by slug (invite code) using secure RPC function
      const { data: orgs, error: findError } = await supabase
        .rpc('lookup_organization_by_slug', { _slug: normalizedCode });

      if (findError) {
        console.error('Error looking up organization:', findError);
        toast.error(t('authUI.onboarding.lookupError'));
        setLoading(false);
        return;
      }

      if (!orgs || orgs.length === 0) {
        toast.error(t('authUI.onboarding.invalidCodeTitle'), {
          description: t('authUI.onboarding.invalidCodeDescription'),
        });
        setLoading(false);
        return;
      }

      const org = orgs[0];

      // Update profile with organization_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('user_id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }

      // Update user_roles with organization_id
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ organization_id: org.id })
        .eq('user_id', user.id);

      if (roleError) {
        console.error('Error updating role:', roleError);
        throw roleError;
      }

      await refetch();
      toast.success(t('authUI.onboarding.joinSuccess', { name: org.name }));
      navigate('/');
    } catch (error: any) {
      console.error('Error joining organization:', error);
      toast.error(t('authUI.onboarding.joinErrorTitle'), { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-elevated">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
            <Wrench className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">{t('authUI.onboarding.welcome', { name: profile?.full_name })}</CardTitle>
            <CardDescription>
              {t('authUI.onboarding.subtitle')}
            </CardDescription>
          </div>
          <div className="flex justify-center">
            <LanguageSelector compact className="w-auto" />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t('authUI.onboarding.createTab')}
              </TabsTrigger>
              <TabsTrigger value="join" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                {t('authUI.onboarding.joinTab')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <form onSubmit={handleCreateOrganization} className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">{t('authUI.onboarding.createInfoTitle')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('authUI.onboarding.createInfoDescription')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-name">{t('authUI.onboarding.orgNameLabel')}</Label>
                  <Input
                    id="org-name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={t('authUI.onboarding.orgNamePlaceholder')}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('authUI.onboarding.createButton')}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join">
              <form onSubmit={handleJoinOrganization} className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">{t('authUI.onboarding.joinInfoTitle')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('authUI.onboarding.joinInfoDescription')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-code">{t('authUI.onboarding.inviteCodeLabel')}</Label>
                  <Input
                    id="invite-code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder={t('authUI.onboarding.inviteCodePlaceholder')}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('authUI.onboarding.joinButton')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('authUI.onboarding.signOutAndBack')}
            </button>
            <Link
              to="/forgot-password"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {t('authUI.onboarding.forgotPassword')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
