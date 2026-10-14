import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Profile } from '@/lib/types';
import {
  CalendarCheck,
  Globe,
  Check,
  Plus,
  Phone,
  Clock,
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Paintbrush,
  User,
  Car,
  Edit,
  AlertCircle,
  MessageCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { safeUUID } from '@/lib/uuid';
import { useTranslation } from 'react-i18next';


interface Appointment {
  id: string;
  organization_id: string | null;
  appointment_date: string;
  appointment_time: string | null;
  client_name: string;
  client_phone: string | null;
  vehicle_plate: string | null;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  issue_description: string | null;
  appointment_type: 'mecanica' | 'chapa_pintura';
  assigned_to: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  vehicle_id: string | null;
  confirmation_status: 'pendiente' | 'confirmada' | 'cancelada';
  confirmation_token: string | null;
  confirmed_at: string | null;
  // Lo que trae una solicitud hecha desde la web y una cita del taller no tiene.
  origen?: string | null;
  client_email?: string | null;
  documento_tipo?: string | null;
  documento_numero?: string | null;
  vehicle_year?: number | null;
  servicios?: string[] | null;
  firma?: string | null;
}


function useAppointmentTypeLabels() {
  const { t } = useTranslation();
  return {
    mecanica: t('planningUI.appointments.legend.mecanica'),
    chapa_pintura: t('planningUI.appointments.legend.chapaPintura'),
  } as Record<string, string>;
}

const APPOINTMENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  mecanica: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
  },
  chapa_pintura: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
  },
};

const emptyForm = {
  client_name: '',
  client_phone: '',
  vehicle_plate: '',
  vehicle_brand: '',
  vehicle_model: '',
  issue_description: '',
  appointment_type: 'mecanica' as 'mecanica' | 'chapa_pintura',
  appointment_time: '',
  assigned_to: '',
  notes: '',
};

export default function AppointmentsPage() {
  const { t } = useTranslation();
  const APPOINTMENT_TYPE_LABELS = useAppointmentTypeLabels();
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmationFilter, setConfirmationFilter] = useState<'todas' | 'pendiente' | 'confirmada' | 'cancelada'>('todas');

  // Las solicitudes de internet pueden ser para cualquier dia, y esta pantalla
  // solo ensena el dia elegido. Sin este aviso, una peticion para la semana que
  // viene se quedaria sin responder hasta que alguien navegase hasta ese dia.
  const solicitudesWeb = appointments.filter(
    (a) => a.origen === 'web' && a.confirmation_status === 'pendiente');

  const responderSolicitud = async (apt: Appointment, aceptar: boolean) => {
    const { error } = await supabase
      .from('appointments')
      .update({
        confirmation_status: aceptar ? 'confirmada' : 'cancelada',
        confirmed_at: aceptar ? new Date().toISOString() : null,
      })
      .eq('id', apt.id);

    if (error) {
      toast.error(t('planningUI.appointments.web.errorResponder'), { description: error.message });
      return;
    }
    toast.success(t(aceptar
      ? 'planningUI.appointments.web.aceptada'
      : 'planningUI.appointments.web.rechazada'));
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [currentMonth]);


  const fetchData = async () => {
    setLoading(true);
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const [aptsRes, profilesRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('*')
        .gte('appointment_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('appointment_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true }),
      supabase.from('profiles').select('*'),
    ]);

    if (aptsRes.data) setAppointments(aptsRes.data as Appointment[]);
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    setLoading(false);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (apt: Appointment) => {
    setEditingId(apt.id);
    setForm({
      client_name: apt.client_name,
      client_phone: apt.client_phone || '',
      vehicle_plate: apt.vehicle_plate || '',
      vehicle_brand: apt.vehicle_brand || '',
      vehicle_model: apt.vehicle_model || '',
      issue_description: apt.issue_description || '',
      appointment_type: apt.appointment_type,
      appointment_time: apt.appointment_time || '',
      assigned_to: apt.assigned_to || '',
      notes: apt.notes || '',
    });
    setSelectedDate(new Date(apt.appointment_date));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedDate || !form.client_name.trim() || !form.vehicle_plate.trim() || !form.vehicle_brand.trim() || !form.vehicle_model.trim() || !user) {
      toast.error(t('planningUI.appointments.toast.requiredFields'));
      return;
    }

    setSaving(true);
    const payload = {
      appointment_date: format(selectedDate, 'yyyy-MM-dd'),
      appointment_time: form.appointment_time || null,
      client_name: form.client_name.trim(),
      client_phone: form.client_phone.trim() || null,
      vehicle_plate: form.vehicle_plate.trim().toUpperCase() || null,
      vehicle_brand: form.vehicle_brand.trim() || null,
      vehicle_model: form.vehicle_model.trim() || null,
      issue_description: form.issue_description.trim() || null,
      appointment_type: form.appointment_type,
      assigned_to: form.assigned_to || null,
      notes: form.notes.trim() || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('appointments').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('appointments').insert({
        ...payload,
        created_by: user.id,
        organization_id: organizationId,
      }));
    }

    if (error) {
      toast.error(editingId ? t('planningUI.appointments.toast.updateError') : t('planningUI.appointments.toast.createError'));
    } else {
      toast.success(editingId ? t('planningUI.appointments.toast.updated') : t('planningUI.appointments.toast.created'));
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) {
      toast.error(t('planningUI.appointments.toast.deleteError'));
    } else {
      toast.success(t('planningUI.appointments.toast.deleted'));
      fetchData();
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    const list = appointments.filter((a) => isSameDay(new Date(a.appointment_date), date));
    if (confirmationFilter === 'todas') return list;
    return list.filter((a) => a.confirmation_status === confirmationFilter);
  };

  const requestConfirmation = async (apt: Appointment) => {
    if (!apt.client_phone) {
      toast.error(t('planningUI.appointments.toast.noPhone'));
      return;
    }
    let token = apt.confirmation_token;
    if (!token) {
      token = safeUUID();
      const { error } = await supabase
        .from('appointments')
        .update({ confirmation_token: token })
        .eq('id', apt.id);
      if (error) {
        toast.error(t('planningUI.appointments.toast.linkError'));
        return;
      }
      setAppointments((prev) => prev.map((a) => (a.id === apt.id ? { ...a, confirmation_token: token } : a)));
    }
    const url = `${window.location.origin}/cita/${token}`;
    const dateStr = format(new Date(apt.appointment_date), "d 'de' MMMM", { locale: es });
    const timeStr = apt.appointment_time
      ? t('planningUI.appointments.whatsappTimeSuffix', { time: apt.appointment_time.slice(0, 5) })
      : '';
    const msg = encodeURIComponent(
      t('planningUI.appointments.whatsappMessage', {
        name: apt.client_name,
        date: dateStr,
        time: timeStr,
        plate: apt.vehicle_plate || '',
        url,
      })
    );
    const cleanPhone = apt.client_phone.replace(/[\s\-\(\)]/g, '');
    const phoneWithCode = cleanPhone.startsWith('+') ? cleanPhone : `+34${cleanPhone}`;
    window.open(`https://wa.me/${phoneWithCode.replace('+', '')}?text=${msg}`, '_blank');
  };


  const getDaysWithAppointments = () => {
    const days: Date[] = [];
    const seen = new Set<string>();
    for (const a of appointments) {
      if (!seen.has(a.appointment_date)) {
        seen.add(a.appointment_date);
        days.push(new Date(a.appointment_date));
      }
    }
    return days;
  };

  const getProfileName = (userId: string | null) => {
    if (!userId) return null;
    return profiles.find((p) => p.user_id === userId)?.full_name || null;
  };

  // For calendar day modifiers by type
  const daysMecanica = appointments
    .filter((a) => a.appointment_type === 'mecanica')
    .map((a) => new Date(a.appointment_date));
  const daysChapa = appointments
    .filter((a) => a.appointment_type === 'chapa_pintura')
    .map((a) => new Date(a.appointment_date));

  const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-primary" />
              {t('planningUI.appointments.title')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('planningUI.appointments.subtitle')}
            </p>
          </div>
          <Button className="gap-2" onClick={openNewDialog}>
            <Plus className="h-4 w-4" />
            {t('planningUI.appointments.newAppointment')}
          </Button>
        </div>

        {solicitudesWeb.length > 0 && (
          <Card className="border-primary/40 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                {t('planningUI.appointments.web.pendientes', { count: solicitudesWeb.length })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {solicitudesWeb.map((apt) => (
                <div key={apt.id} className="rounded-lg border bg-background p-3 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{apt.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(apt.appointment_date), "EEEE d 'de' MMMM", { locale: es })}
                        {apt.appointment_time ? ` · ${apt.appointment_time.slice(0, 5)}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => responderSolicitud(apt, true)}>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {t('planningUI.appointments.web.aceptar')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => responderSolicitud(apt, false)}>
                        {t('planningUI.appointments.web.rechazar')}
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>
                      {[apt.vehicle_brand, apt.vehicle_model, apt.vehicle_year].filter(Boolean).join(' ')}
                      {apt.vehicle_plate ? ` · ${apt.vehicle_plate}` : ''}
                    </p>
                    <p>
                      {apt.client_phone}
                      {apt.client_email ? ` · ${apt.client_email}` : ''}
                      {apt.documento_numero ? ` · ${apt.documento_tipo} ${apt.documento_numero}` : ''}
                    </p>
                    {apt.servicios && apt.servicios.length > 0 && (
                      <p className="text-foreground">{apt.servicios.join(', ')}</p>
                    )}
                    {apt.issue_description && <p className="italic">{apt.issue_description}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-muted-foreground">{t('planningUI.appointments.legend.mecanica')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm text-muted-foreground">{t('planningUI.appointments.legend.chapaPintura')}</span>
          </div>
        </div>

        {/* Confirmation filter */}
        <div className="flex flex-wrap gap-2">
          {([
            ['todas', t('planningUI.appointments.filters.all')],
            ['pendiente', t('planningUI.appointments.filters.pending')],
            ['confirmada', t('planningUI.appointments.filters.confirmed')],
            ['cancelada', t('planningUI.appointments.filters.cancelled')],
          ] as const).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={confirmationFilter === key ? 'default' : 'outline'}
              onClick={() => setConfirmationFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </CardTitle>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                locale={es}
                modifiers={{
                  hasMecanica: daysMecanica,
                  hasChapa: daysChapa,
                }}
                modifiersStyles={{
                  hasMecanica: {
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: 'rgb(59, 130, 246)',
                  },
                  hasChapa: {
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: 'rgb(245, 158, 11)',
                  },
                }}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Selected Date Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedDate
                  ? format(selectedDate, "d 'de' MMMM", { locale: es })
                  : t('planningUI.appointments.selectDate')}
              </CardTitle>
              {selectedDate && (
                <p className="text-sm text-muted-foreground">
                  {t('planningUI.appointments.appointmentCount', { count: selectedDateAppointments.length })}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {selectedDateAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarCheck className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-muted-foreground text-sm">{t('planningUI.appointments.noAppointmentsForDay')}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openNewDialog}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t('planningUI.appointments.addAppointment')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDateAppointments.map((apt) => {
                    const colors = APPOINTMENT_TYPE_COLORS[apt.appointment_type];
                    return (
                      <div
                        key={apt.id}
                        className={`p-3 rounded-lg border space-y-2 ${colors.bg} ${colors.border}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                            <span className="font-semibold text-sm truncate">{apt.client_name}</span>
                            {apt.origen === 'web' && (
                              <Globe className="h-3.5 w-3.5 text-primary flex-shrink-0"
                                     aria-label={t('planningUI.appointments.web.porInternet')} />
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditDialog(apt)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(apt.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={`text-xs ${colors.text} ${colors.border}`}>
                            {apt.appointment_type === 'mecanica' ? (
                              <Wrench className="h-3 w-3 mr-1" />
                            ) : (
                              <Paintbrush className="h-3 w-3 mr-1" />
                            )}
                            {APPOINTMENT_TYPE_LABELS[apt.appointment_type]}
                          </Badge>
                          {apt.confirmation_status === 'confirmada' ? (
                            <Badge variant="outline" className="text-xs border-green-500/40 text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> {t('planningUI.appointments.status.confirmed')}
                            </Badge>
                          ) : apt.confirmation_status === 'cancelada' ? (
                            <Badge variant="outline" className="text-xs border-red-500/40 text-red-600 dark:text-red-400">
                              <XCircle className="h-3 w-3 mr-1" /> {t('planningUI.appointments.status.cancelled')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-muted-foreground/40 text-muted-foreground">
                              <HelpCircle className="h-3 w-3 mr-1" /> {t('planningUI.appointments.status.pending')}
                            </Badge>
                          )}
                        </div>

                        {apt.confirmation_status !== 'confirmada' && apt.client_phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 border-green-500/40 text-green-600 hover:bg-green-500/10 dark:text-green-400"
                            onClick={() => requestConfirmation(apt)}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {t('planningUI.appointments.requestConfirmation')}
                          </Button>
                        )}


                        {apt.appointment_time && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {apt.appointment_time.slice(0, 5)}
                          </div>
                        )}

                        {apt.client_phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {apt.client_phone}
                          </div>
                        )}

                        {apt.vehicle_plate && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Car className="h-3 w-3" />
                            <span className="font-mono font-medium">{apt.vehicle_plate}</span>
                            {apt.vehicle_brand && (
                              <span>
                                — {apt.vehicle_brand} {apt.vehicle_model}
                              </span>
                            )}
                          </div>
                        )}

                        {apt.issue_description && (
                          <div className="flex items-start gap-1 text-sm text-muted-foreground pt-1 border-t border-border/50">
                            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{apt.issue_description}</span>
                          </div>
                        )}

                        {apt.assigned_to && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {getProfileName(apt.assigned_to) || t('planningUI.appointments.assignedFallback')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('planningUI.appointments.upcomingAppointments')}</CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t('planningUI.appointments.noAppointmentsThisMonth')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appointments.slice(0, 9).map((apt) => {
                  const colors = APPOINTMENT_TYPE_COLORS[apt.appointment_type];
                  return (
                    <div
                      key={apt.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${colors.border}`}
                      onClick={() => setSelectedDate(new Date(apt.appointment_date))}
                    >
                      <div
                        className={`w-12 h-12 ${colors.bg} rounded-lg flex flex-col items-center justify-center`}
                      >
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(apt.appointment_date), 'MMM', { locale: es })}
                        </span>
                        <span className={`text-lg font-bold ${colors.text}`}>
                          {format(new Date(apt.appointment_date), 'd')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{apt.client_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {apt.vehicle_plate && `${apt.vehicle_plate} · `}
                          {APPOINTMENT_TYPE_LABELS[apt.appointment_type]}
                        </p>
                        {apt.appointment_time && (
                          <p className="text-xs text-muted-foreground">{apt.appointment_time.slice(0, 5)}</p>
                        )}
                      </div>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog for New / Edit Appointment */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? t('planningUI.appointments.dialog.editTitle') : t('planningUI.appointments.dialog.newTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Date */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('planningUI.appointments.dialog.dateLabel')}</label>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={es}
                className="rounded-md border"
              />
            </div>

            {/* Time */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('planningUI.appointments.dialog.timeLabel')}</label>
              <Input
                type="time"
                value={form.appointment_time}
                onChange={(e) => updateField('appointment_time', e.target.value)}
              />
            </div>

            {/* Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('planningUI.appointments.dialog.typeLabel')}</label>
              <Select
                value={form.appointment_type}
                onValueChange={(v) => updateField('appointment_type', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mecanica">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-blue-500" />
                      {t('planningUI.appointments.legend.mecanica')}
                    </div>
                  </SelectItem>
                  <SelectItem value="chapa_pintura">
                    <div className="flex items-center gap-2">
                      <Paintbrush className="h-4 w-4 text-amber-500" />
                      {t('planningUI.appointments.legend.chapaPintura')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Client Name */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('planningUI.appointments.dialog.clientNameLabel')}</label>
              <Input
                value={form.client_name}
                onChange={(e) => updateField('client_name', e.target.value)}
                placeholder={t('planningUI.appointments.dialog.clientNamePlaceholder')}
              />
            </div>

            {/* Client Phone */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('planningUI.appointments.dialog.phoneLabel')}</label>
              <Input
                type="tel"
                value={form.client_phone}
                onChange={(e) => updateField('client_phone', e.target.value)}
                placeholder={t('planningUI.appointments.dialog.phonePlaceholder')}
              />
            </div>

            {/* Vehicle Info */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('planningUI.appointments.dialog.plateLabel')}</label>
                <Input
                  value={form.vehicle_plate}
                  onChange={(e) => updateField('vehicle_plate', e.target.value.toUpperCase())}
                  placeholder={t('planningUI.appointments.dialog.platePlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t('planningUI.appointments.dialog.brandLabel')}</label>
                <Input
                  value={form.vehicle_brand}
                  onChange={(e) => updateField('vehicle_brand', e.target.value)}
                  placeholder={t('planningUI.appointments.dialog.brandPlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t('planningUI.appointments.dialog.modelLabel')}</label>
                <Input
                  value={form.vehicle_model}
                  onChange={(e) => updateField('vehicle_model', e.target.value)}
                  placeholder={t('planningUI.appointments.dialog.modelPlaceholder')}
                  required
                />
              </div>
            </div>

            {/* Issue Description */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('planningUI.appointments.dialog.issueLabel')}</label>
              <Textarea
                value={form.issue_description}
                onChange={(e) => updateField('issue_description', e.target.value)}
                placeholder={t('planningUI.appointments.dialog.issuePlaceholder')}
                rows={3}
              />
            </div>

            {/* Assigned To */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('planningUI.appointments.dialog.assignedToLabel')}</label>
              <Select value={form.assigned_to} onValueChange={(v) => updateField('assigned_to', v)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('planningUI.appointments.dialog.assignedToPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t('planningUI.appointments.dialog.notesLabel')}</label>
              <Textarea
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder={t('planningUI.appointments.dialog.notesPlaceholder')}
                rows={2}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? t('planningUI.appointments.dialog.saveChanges') : t('planningUI.appointments.dialog.createAppointment')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
