import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Settings as SettingsIcon,
  Save,
  Loader2,
  Trash2,
  AlertTriangle,
  MessageCircle,
  CalendarDays,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { DEFAULT_WHATSAPP_MESSAGE } from '@/hooks/useWhatsAppMessage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Holiday {
  id: string;
  date: string;
  name: string;
}

export default function Settings() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const { organization, loading: organizationLoading } = useOrganization();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appName, setAppName] = useState('');
  const [archiveHours, setArchiveHours] = useState('24');
  const [autoArchive, setAutoArchive] = useState(true);
  const [whatsappMessage, setWhatsappMessage] = useState(DEFAULT_WHATSAPP_MESSAGE);

  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [addingHoliday, setAddingHoliday] = useState(false);

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/');
      return;
    }

    if (!organizationLoading) {
      if (organization) {
        fetchSettings();
        fetchHolidays();
      } else {
        setLoading(false);
      }
    }
  }, [role, navigate, organization, organizationLoading]);

  const fetchSettings = async () => {
    if (!organization) return;

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('organization_id', organization.id);

      if (error) throw error;

      const settings = data?.reduce((acc: Record<string, string>, curr: { key: string; value: string | null }) => {
        acc[curr.key] = curr.value || '';
        return acc;
      }, {});

      setAppName(settings?.app_name || 'Gestión Autos Formentera');
      setArchiveHours(settings?.archive_hours || '24');
      setAutoArchive(settings?.auto_archive !== 'false');
      setWhatsappMessage(settings?.whatsapp_message || DEFAULT_WHATSAPP_MESSAGE);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    if (!organization) return;
    try {
      const { data, error } = await supabase
        .from('organization_holidays')
        .select('id, date, name')
        .eq('organization_id', organization.id)
        .order('date', { ascending: true });

      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  const addHoliday = async () => {
    if (!organization || !newHolidayDate || !newHolidayName.trim()) return;
    setAddingHoliday(true);
    try {
      const { error } = await supabase.from('organization_holidays').insert({
        organization_id: organization.id,
        date: newHolidayDate,
        name: newHolidayName.trim(),
      });
      if (error) throw error;
      toast.success(t('adminUI.settingsPage.toast.holidayAdded'));
      setNewHolidayDate('');
      setNewHolidayName('');
      await fetchHolidays();
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast.error(t('adminUI.settingsPage.toast.addHolidayError'));
    } finally {
      setAddingHoliday(false);
    }
  };

  const deleteHoliday = async (id: string) => {
    try {
      const { error } = await supabase.from('organization_holidays').delete().eq('id', id);
      if (error) throw error;
      toast.success(t('adminUI.settingsPage.toast.holidayDeleted'));
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error(t('adminUI.settingsPage.toast.deleteHolidayError'));
    }
  };

  const saveSetting = async (key: string, value: string) => {
    if (!organization) throw new Error('No organization found');

    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key, value, organization_id: organization.id, updated_at: new Date().toISOString() },
        { onConflict: 'key,organization_id' }
      );

    if (error) throw error;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSetting('app_name', appName);
      await saveSetting('archive_hours', archiveHours);
      await saveSetting('auto_archive', autoArchive.toString());
      await saveSetting('whatsapp_message', whatsappMessage);
      toast.success(t('adminUI.settingsPage.toast.settingsSaved'));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t('adminUI.settingsPage.toast.saveSettingsError'));
    } finally {
      setSaving(false);
    }
  };

  const archiveDeliveredVehicles = async () => {
    try {
      const { error } = await supabase.rpc('archive_old_delivered_vehicles');
      if (error) throw error;
      toast.success(t('adminUI.settingsPage.toast.vehiclesArchived'));
    } catch (error) {
      console.error('Error archiving vehicles:', error);
      toast.error(t('adminUI.settingsPage.toast.archiveError'));
    }
  };

  if (role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('adminUI.settingsPage.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('adminUI.settingsPage.subtitle')}</p>
          </div>
        </div>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle>{t('language.label')}</CardTitle>
            <CardDescription>{t('settings.languageDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <LanguageSelector />
          </CardContent>
        </Card>

        {/* General Settings */}

        <Card>
          <CardHeader>
            <CardTitle>{t('adminUI.settingsPage.generalTitle')}</CardTitle>
            <CardDescription>{t('adminUI.settingsPage.generalDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appName">{t('adminUI.settingsPage.appName')}</Label>
              <Input
                id="appName"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder={t('adminUI.settingsPage.appNamePlaceholder')}
              />
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              {t('adminUI.settingsPage.whatsappTitle')}
            </CardTitle>
            <CardDescription>
              {t('adminUI.settingsPage.whatsappDescription')} <code className="text-xs bg-muted px-1 rounded">{'{matricula}'}</code>{' '}
              <code className="text-xs bg-muted px-1 rounded">{'{marca}'}</code>{' '}
              <code className="text-xs bg-muted px-1 rounded">{'{modelo}'}</code>{' '}
              <code className="text-xs bg-muted px-1 rounded">{'{nombre_taller}'}</code>{' '}
              <code className="text-xs bg-muted px-1 rounded">{'{telefono}'}</code>{' '}
              <code className="text-xs bg-muted px-1 rounded">{'{whatsapp_num}'}</code>{' '}
              <code className="text-xs bg-muted px-1 rounded">{'{horario}'}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              rows={8}
              placeholder={t('adminUI.settingsPage.whatsappPlaceholder')}
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWhatsappMessage(DEFAULT_WHATSAPP_MESSAGE)}
            >
              {t('adminUI.settingsPage.restoreDefaultMessage')}
            </Button>
          </CardContent>
        </Card>

        {/* Archive Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('adminUI.settingsPage.autoArchiveTitle')}</CardTitle>
            <CardDescription>
              {t('adminUI.settingsPage.autoArchiveDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('adminUI.settingsPage.autoArchiveLabel')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('adminUI.settingsPage.autoArchiveHelp')}
                </p>
              </div>
              <Switch checked={autoArchive} onCheckedChange={setAutoArchive} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="archiveHours">{t('adminUI.settingsPage.hoursUntilArchive')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="archiveHours"
                  type="number"
                  min="1"
                  max="168"
                  value={archiveHours}
                  onChange={(e) => setArchiveHours(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">{t('adminUI.settingsPage.hoursAfterDelivery')}</span>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('adminUI.settingsPage.archiveNow')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('adminUI.settingsPage.archiveNowHelp')}
                </p>
              </div>
              <Button variant="outline" onClick={archiveDeliveredVehicles}>
                {t('adminUI.settingsPage.archive')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Holidays */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              {t('adminUI.settingsPage.holidaysTitle')}
            </CardTitle>
            <CardDescription>
              {t('adminUI.settingsPage.holidaysDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="holidayDate">{t('adminUI.settingsPage.date')}</Label>
                <Input
                  id="holidayDate"
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                />
              </div>
              <div className="flex-[2] space-y-2">
                <Label htmlFor="holidayName">{t('adminUI.settingsPage.holidayName')}</Label>
                <Input
                  id="holidayName"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder={t('adminUI.settingsPage.holidayNamePlaceholder')}
                />
              </div>
              <Button
                onClick={addHoliday}
                disabled={addingHoliday || !newHolidayDate || !newHolidayName.trim()}
                size="icon"
              >
                {addingHoliday ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            {holidays.length > 0 ? (
              <div className="space-y-2">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{h.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(h.date)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteHoliday(h.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('adminUI.settingsPage.noHolidays')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {t('adminUI.settingsPage.dangerZoneTitle')}
            </CardTitle>
            <CardDescription>
              {t('adminUI.settingsPage.dangerZoneDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('adminUI.settingsPage.deleteArchivedVehicles')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('adminUI.settingsPage.deleteArchivedVehiclesHelp')}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('adminUI.settingsPage.delete')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('adminUI.settingsPage.confirmDeleteTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('adminUI.settingsPage.confirmDeleteArchivedVehicles')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('adminUI.adminData.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from('vehicles')
                            .delete()
                            .eq('archived', true);
                          if (error) throw error;
                          toast.success(t('adminUI.settingsPage.toast.archivedVehiclesDeleted'));
                        } catch (error) {
                          toast.error(t('adminUI.settingsPage.toast.deleteVehiclesError'));
                        }
                      }}
                    >
                      {t('adminUI.settingsPage.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t('adminUI.settingsPage.saveConfiguration')}
        </Button>
      </div>
    </MainLayout>
  );
}
