import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BellRing, CalendarClock, Loader2, MessageCircle, Check, X, RefreshCw, ShieldCheck, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface Reminder {
  id: string;
  vehicle_id: string | null;
  plate: string;
  brand: string | null;
  model: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
  reminder_type: 'itv' | 'mantenimiento';
  due_date: string;
  status: 'pendiente' | 'enviado' | 'descartado';
  sent_at: string | null;
  channel: string | null;
}

const DEFAULT_LEAD_DAYS = 30;

export default function Reminders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { organization, organizationId } = useOrganization();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<'pendiente' | 'enviado' | 'descartado'>('pendiente');
  const [typeFilter, setTypeFilter] = useState<'all' | 'itv' | 'mantenimiento'>('all');
  const [leadDays, setLeadDays] = useState<string>(String(DEFAULT_LEAD_DAYS));
  const [savingLead, setSavingLead] = useState(false);

  const canManage = role === 'admin' || role === 'oficina';

  useEffect(() => {
    if (role && !canManage) {
      navigate('/');
      return;
    }
    if (canManage) {
      fetchReminders();
      fetchLeadDays();
    }
  }, [role, canManage]);

  const fetchReminders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_reminders')
      .select('id, vehicle_id, plate, brand, model, owner_name, owner_phone, owner_email, reminder_type, due_date, status, sent_at, channel')
      .order('due_date', { ascending: true });
    if (error) toast.error(t('reminders.toast.loadError'));
    setReminders((data as Reminder[]) || []);
    setLoading(false);
  };

  const fetchLeadDays = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'reminder_lead_days')
      .maybeSingle();
    if (data?.value) setLeadDays(data.value);
  };

  const saveLeadDays = async () => {
    if (!organizationId) return;
    const parsed = parseInt(leadDays, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 365) {
      toast.error(t('reminders.toast.invalidLead'));
      return;
    }
    setSavingLead(true);
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', 'reminder_lead_days')
      .maybeSingle();
    const { error } = existing
      ? await supabase.from('app_settings').update({ value: String(parsed) }).eq('id', existing.id)
      : await supabase.from('app_settings').insert([{ key: 'reminder_lead_days', value: String(parsed), organization_id: organizationId }]);
    setSavingLead(false);
    if (error) return toast.error(t('reminders.toast.saveError'));
    toast.success(t('reminders.toast.leadSaved'));
  };

  const generateNow = async () => {
    setGenerating(true);
    const { error } = await supabase.rpc('generate_client_reminders');
    setGenerating(false);
    if (error) return toast.error(t('reminders.toast.generateError'));
    toast.success(t('reminders.toast.generated'));
    fetchReminders();
  };

  const buildMessage = (r: Reminder) => {
    const workshop = organization?.name || t('reminders.workshopFallback');
    const vehicleLabel = [r.brand, r.model].filter(Boolean).join(' ');
    const due = new Date(r.due_date).toLocaleDateString();
    const key = r.reminder_type === 'itv' ? 'reminders.message.itv' : 'reminders.message.maintenance';
    return t(key, {
      name: r.owner_name || t('reminders.clientFallback'),
      plate: r.plate,
      vehicle: vehicleLabel,
      date: due,
      workshop,
    });
  };

  const sendWhatsApp = async (r: Reminder) => {
    if (!r.owner_phone) return toast.error(t('reminders.toast.noPhone'));
    const clean = r.owner_phone.replace(/[\s\-()]/g, '');
    const phone = (clean.startsWith('+') ? clean : `+34${clean}`).replace('+', '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildMessage(r))}`, '_blank');
    await markSent(r, 'whatsapp');
  };

  const sendEmail = async (r: Reminder) => {
    if (!r.owner_email) return toast.error(t('reminders.toast.noEmail'));
    const subject = r.reminder_type === 'itv' ? t('reminders.subject.itv') : t('reminders.subject.maintenance');
    window.open(
      `mailto:${r.owner_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildMessage(r))}`,
      '_blank',
    );
    await markSent(r, 'email');
  };

  const markSent = async (r: Reminder, channel: string) => {
    const { error } = await supabase
      .from('client_reminders')
      .update({ status: 'enviado', channel, sent_at: new Date().toISOString(), sent_by: user?.id ?? null })
      .eq('id', r.id);
    if (error) return toast.error(t('reminders.toast.saveError'));
    setReminders((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, status: 'enviado', channel, sent_at: new Date().toISOString() } : x)),
    );
  };

  const dismiss = async (r: Reminder) => {
    const { error } = await supabase.from('client_reminders').update({ status: 'descartado' }).eq('id', r.id);
    if (error) return toast.error(t('reminders.toast.saveError'));
    setReminders((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'descartado' } : x)));
  };

  const reopen = async (r: Reminder) => {
    const { error } = await supabase
      .from('client_reminders')
      .update({ status: 'pendiente', channel: null, sent_at: null })
      .eq('id', r.id);
    if (error) return toast.error(t('reminders.toast.saveError'));
    setReminders((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: 'pendiente', channel: null, sent_at: null } : x)));
  };

  const counts = useMemo(
    () => ({
      pendiente: reminders.filter((r) => r.status === 'pendiente').length,
      enviado: reminders.filter((r) => r.status === 'enviado').length,
      descartado: reminders.filter((r) => r.status === 'descartado').length,
    }),
    [reminders],
  );

  const visible = reminders.filter(
    (r) => r.status === tab && (typeFilter === 'all' || r.reminder_type === typeFilter),
  );

  const daysLeft = (due: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(`${due}T00:00:00`);
    return Math.round((d.getTime() - today.getTime()) / 86400000);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-wide">
              <BellRing className="h-6 w-6 text-primary" />
              {t('reminders.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('reminders.subtitle')}</p>
          </div>
          <Button onClick={generateNow} disabled={generating} variant="outline">
            {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {t('reminders.generateNow')}
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              {t('reminders.settings.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="lead">{t('reminders.settings.leadDays')}</Label>
              <Input
                id="lead"
                className="w-28"
                inputMode="numeric"
                value={leadDays}
                onChange={(e) => setLeadDays(e.target.value.replace(/[^\d]/g, ''))}
              />
            </div>
            <Button onClick={saveLeadDays} disabled={savingLead}>
              {savingLead ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('reminders.settings.save')}
            </Button>
            <p className="text-xs text-muted-foreground sm:ml-auto">{t('reminders.settings.hint')}</p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="pendiente">{t('reminders.tabs.pending')} ({counts.pendiente})</TabsTrigger>
              <TabsTrigger value="enviado">{t('reminders.tabs.sent')} ({counts.enviado})</TabsTrigger>
              <TabsTrigger value="descartado">{t('reminders.tabs.dismissed')} ({counts.descartado})</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <TabsList>
              <TabsTrigger value="all">{t('reminders.types.all')}</TabsTrigger>
              <TabsTrigger value="itv">{t('reminders.types.itv')}</TabsTrigger>
              <TabsTrigger value="mantenimiento">{t('reminders.types.maintenance')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">{t('reminders.empty')}</CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {visible.map((r) => {
              const left = daysLeft(r.due_date);
              const overdue = left < 0;
              return (
                <Card key={r.id} className={overdue ? 'border-destructive/50' : ''}>
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold tracking-widest">{r.plate}</span>
                        <Badge variant={r.reminder_type === 'itv' ? 'default' : 'secondary'} className="gap-1">
                          {r.reminder_type === 'itv' ? <ShieldCheck className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                          {r.reminder_type === 'itv' ? t('reminders.types.itv') : t('reminders.types.maintenance')}
                        </Badge>
                        <Badge variant={overdue ? 'destructive' : 'outline'}>
                          {overdue
                            ? t('reminders.overdue', { days: Math.abs(left) })
                            : t('reminders.inDays', { days: left })}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {[r.brand, r.model].filter(Boolean).join(' ')}
                        {r.owner_name ? ` · ${r.owner_name}` : ''}
                        {r.owner_phone ? ` · ${r.owner_phone}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('reminders.dueOn', { date: new Date(r.due_date).toLocaleDateString() })}
                        {r.sent_at ? ` · ${t('reminders.sentOn', { date: new Date(r.sent_at).toLocaleDateString(), channel: r.channel ?? '' })}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {r.vehicle_id && (
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/vehicles/${r.vehicle_id}`)}>
                          {t('reminders.openVehicle')}
                        </Button>
                      )}
                      {r.status === 'pendiente' ? (
                        <>
                          <Button size="sm" onClick={() => sendWhatsApp(r)} disabled={!r.owner_phone}>
                            <MessageCircle className="mr-1 h-4 w-4" />
                            WhatsApp
                          </Button>
                          {r.owner_email && (
                            <Button size="sm" variant="outline" onClick={() => sendEmail(r)}>
                              Email
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => markSent(r, 'manual')}>
                            <Check className="mr-1 h-4 w-4" />
                            {t('reminders.markSent')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => dismiss(r)}>
                            <X className="mr-1 h-4 w-4" />
                            {t('reminders.dismiss')}
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => reopen(r)}>
                          {t('reminders.reopen')}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
