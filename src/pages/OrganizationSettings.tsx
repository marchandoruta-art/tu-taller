import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, Copy, Check, Users, Phone, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function OrganizationSettings() {
  const { t } = useTranslation();
  const { organization, refetch } = useOrganization();
  const { role, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [copied, setCopied] = useState(false);

  // Workshop contact details
  const [tallerTelefono, setTallerTelefono] = useState('');
  const [tallerWhatsapp, setTallerWhatsapp] = useState('');
  const [tallerHorario, setTallerHorario] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);

  const isOwner = organization?.owner_id === user?.id;
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name);
      fetchContactSettings();
    }
  }, [organization]);

  const fetchContactSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_workshop_contact_settings');

      if (error) throw error;

      const workshopData = data?.[0];
      setTallerTelefono(workshopData?.telefono || '');
      setTallerWhatsapp(workshopData?.whatsapp || '');
      setTallerHorario(workshopData?.horario || '');
    } catch (error) {
      console.error('Error fetching contact settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleUpdateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !isAdmin) return;

    setLoading(true);
    try {
      // Update org name
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgName.trim() })
        .eq('id', organization.id);
      if (error) throw error;

      // Save contact settings
      const settings = [
        { key: 'taller_telefono', value: tallerTelefono.trim() },
        { key: 'taller_whatsapp', value: tallerWhatsapp.trim() },
        { key: 'taller_horario', value: tallerHorario.trim() },
      ];

      const results = await Promise.all(
        settings.map((s) =>
          supabase
            .from('app_settings')
            .upsert(
              { key: s.key, value: s.value, organization_id: organization.id, updated_at: new Date().toISOString() },
              { onConflict: 'key,organization_id' }
            )
        )
      );

      const settingError = results.find((result) => result.error)?.error;
      if (settingError) throw settingError;

      await refetch();
      toast.success(t('adminUI.orgSettings.toast.updated'));
    } catch (error: any) {
      console.error('Error updating organization:', error);
      toast.error(t('adminUI.orgSettings.toast.updateError'));
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = async () => {
    if (!organization) return;
    
    try {
      await navigator.clipboard.writeText(organization.slug);
      setCopied(true);
      toast.success(t('adminUI.orgSettings.toast.codeCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('adminUI.orgSettings.toast.copyError'));
    }
  };

  if (!organization) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">{t('adminUI.orgSettings.title')}</h1>
          <p className="text-muted-foreground">{t('adminUI.orgSettings.subtitle')}</p>
        </div>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t('adminUI.orgSettings.infoTitle')}
            </CardTitle>
            <CardDescription>
              {t('adminUI.orgSettings.infoDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateOrganization} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">{t('adminUI.orgSettings.workshopName')}</Label>
                <Input
                  id="org-name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
              {isAdmin && (
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('adminUI.orgSettings.saveChanges')}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Contact Details */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                {t('adminUI.orgSettings.contactTitle')}
              </CardTitle>
              <CardDescription>
                {t('adminUI.orgSettings.contactDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateOrganization} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taller-telefono">{t('adminUI.orgSettings.contactPhone')}</Label>
                  <Input
                    id="taller-telefono"
                    value={tallerTelefono}
                    onChange={(e) => setTallerTelefono(e.target.value)}
                    placeholder="971 322 883"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taller-whatsapp">{t('adminUI.orgSettings.whatsappNumber')}</Label>
                  <Input
                    id="taller-whatsapp"
                    value={tallerWhatsapp}
                    onChange={(e) => setTallerWhatsapp(e.target.value)}
                    placeholder="689 907 343"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taller-horario">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {t('adminUI.orgSettings.businessHours')}
                    </span>
                  </Label>
                  <Input
                    id="taller-horario"
                    value={tallerHorario}
                    onChange={(e) => setTallerHorario(e.target.value)}
                    placeholder={t('adminUI.orgSettings.businessHoursPlaceholder')}
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('adminUI.orgSettings.saveContactDetails')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Invite Code */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('adminUI.orgSettings.inviteCodeTitle')}
            </CardTitle>
            <CardDescription>
              {t('adminUI.orgSettings.inviteCodeDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm">
                {organization.slug}
              </div>
              <Button variant="outline" size="icon" onClick={copyInviteCode}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('adminUI.orgSettings.inviteCodeHelp')}
            </p>
          </CardContent>
        </Card>

        {/* Organization Stats */}
        <Card>
          <CardHeader>
            <CardTitle>{t('adminUI.orgSettings.statusTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('adminUI.orgSettings.yourRole')}</span>
              <Badge variant={isAdmin ? 'destructive' : 'secondary'}>
                {role}
              </Badge>
            </div>
            {isOwner && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('adminUI.orgSettings.owner')}</span>
                <Badge variant="outline">Sí</Badge>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('adminUI.orgSettings.createdAt')}</span>
              <span className="text-sm">
                {new Date(organization.created_at).toLocaleDateString('es-ES')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
