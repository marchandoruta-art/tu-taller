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
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

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
}

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  mecanica: 'Mecánica',
  chapa_pintura: 'Chapa y Pintura',
};

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
      toast.error('Nombre, matrícula, marca y modelo son obligatorios');
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
      toast.error(editingId ? 'Error al actualizar cita' : 'Error al crear cita');
    } else {
      toast.success(editingId ? 'Cita actualizada' : 'Cita creada');
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar cita');
    } else {
      toast.success('Cita eliminada');
      fetchData();
    }
  };

  const getAppointmentsForDate = (date: Date) =>
    appointments.filter((a) => isSameDay(new Date(a.appointment_date), date));

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
              Citas Previas
            </h1>
            <p className="text-muted-foreground text-sm">
              Gestiona las citas del taller por tipo de trabajo
            </p>
          </div>
          <Button className="gap-2" onClick={openNewDialog}>
            <Plus className="h-4 w-4" />
            Nueva Cita
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-muted-foreground">Mecánica</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm text-muted-foreground">Chapa y Pintura</span>
          </div>
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
                  : 'Selecciona una fecha'}
              </CardTitle>
              {selectedDate && (
                <p className="text-sm text-muted-foreground">
                  {selectedDateAppointments.length} cita{selectedDateAppointments.length !== 1 ? 's' : ''}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {selectedDateAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarCheck className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-muted-foreground text-sm">No hay citas para este día</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openNewDialog}>
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir cita
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

                        <Badge variant="outline" className={`text-xs ${colors.text} ${colors.border}`}>
                          {apt.appointment_type === 'mecanica' ? (
                            <Wrench className="h-3 w-3 mr-1" />
                          ) : (
                            <Paintbrush className="h-3 w-3 mr-1" />
                          )}
                          {APPOINTMENT_TYPE_LABELS[apt.appointment_type]}
                        </Badge>

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
                            {getProfileName(apt.assigned_to) || 'Asignado'}
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
            <CardTitle className="text-lg">Próximas Citas</CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay citas este mes</p>
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
            <DialogTitle>{editingId ? 'Editar Cita' : 'Nueva Cita'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Date */}
            <div>
              <label className="text-sm font-medium mb-2 block">Fecha *</label>
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
              <label className="text-sm font-medium mb-2 block">Hora</label>
              <Input
                type="time"
                value={form.appointment_time}
                onChange={(e) => updateField('appointment_time', e.target.value)}
              />
            </div>

            {/* Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de trabajo *</label>
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
                      Mecánica
                    </div>
                  </SelectItem>
                  <SelectItem value="chapa_pintura">
                    <div className="flex items-center gap-2">
                      <Paintbrush className="h-4 w-4 text-amber-500" />
                      Chapa y Pintura
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Client Name */}
            <div>
              <label className="text-sm font-medium mb-2 block">Nombre del cliente *</label>
              <Input
                value={form.client_name}
                onChange={(e) => updateField('client_name', e.target.value)}
                placeholder="Nombre completo"
              />
            </div>

            {/* Client Phone */}
            <div>
              <label className="text-sm font-medium mb-2 block">Teléfono</label>
              <Input
                type="tel"
                value={form.client_phone}
                onChange={(e) => updateField('client_phone', e.target.value)}
                placeholder="600 000 000"
              />
            </div>

            {/* Vehicle Info */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-sm font-medium mb-2 block">Matrícula *</label>
                <Input
                  value={form.vehicle_plate}
                  onChange={(e) => updateField('vehicle_plate', e.target.value.toUpperCase())}
                  placeholder="1234 ABC"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Marca *</label>
                <Input
                  value={form.vehicle_brand}
                  onChange={(e) => updateField('vehicle_brand', e.target.value)}
                  placeholder="Seat"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Modelo *</label>
                <Input
                  value={form.vehicle_model}
                  onChange={(e) => updateField('vehicle_model', e.target.value)}
                  placeholder="León"
                  required
                />
              </div>
            </div>

            {/* Issue Description */}
            <div>
              <label className="text-sm font-medium mb-2 block">Avería / Descripción</label>
              <Textarea
                value={form.issue_description}
                onChange={(e) => updateField('issue_description', e.target.value)}
                placeholder="Describe la avería o trabajo a realizar..."
                rows={3}
              />
            </div>

            {/* Assigned To */}
            <div>
              <label className="text-sm font-medium mb-2 block">Asignar a operario</label>
              <Select value={form.assigned_to} onValueChange={(v) => updateField('assigned_to', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
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
              <label className="text-sm font-medium mb-2 block">Notas internas</label>
              <Textarea
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Notas internas del taller..."
                rows={2}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? 'Guardar cambios' : 'Crear Cita'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
