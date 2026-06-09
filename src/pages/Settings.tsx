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
      toast.success('Festivo añadido');
      setNewHolidayDate('');
      setNewHolidayName('');
      await fetchHolidays();
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast.error('Error al añadir festivo');
    } finally {
      setAddingHoliday(false);
    }
  };

  const deleteHoliday = async (id: string) => {
    try {
      const { error } = await supabase.from('organization_holidays').delete().eq('id', id);
      if (error) throw error;
      toast.success('Festivo eliminado');
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Error al eliminar festivo');
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
      toast.success('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const archiveDeliveredVehicles = async () => {
    try {
      const { error } = await supabase.rpc('archive_old_delivered_vehicles');
      if (error) throw error;
      toast.success('Vehículos entregados archivados correctamente');
    } catch (error) {
      console.error('Error archiving vehicles:', error);
      toast.error('Error al archivar vehículos');
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
            <h1 className="text-2xl font-bold">Ajustes</h1>
            <p className="text-sm text-muted-foreground">Configuración general de la aplicación</p>
          </div>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración General</CardTitle>
            <CardDescription>Personaliza el nombre y apariencia de la aplicación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appName">Nombre de la Aplicación</Label>
              <Input
                id="appName"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Nombre de tu taller"
              />
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Message */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Mensaje de WhatsApp
            </CardTitle>
            <CardDescription>
              Personaliza el mensaje que se envía al cliente cuando su vehículo está terminado.
              Variables disponibles: <code className="text-xs bg-muted px-1 rounded">{'{matricula}'}</code>{' '}
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
              placeholder="Escribe aquí el mensaje de WhatsApp..."
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWhatsappMessage(DEFAULT_WHATSAPP_MESSAGE)}
            >
              Restaurar mensaje por defecto
            </Button>
          </CardContent>
        </Card>

        {/* Archive Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Archivado Automático</CardTitle>
            <CardDescription>
              Los vehículos entregados se archivan automáticamente y se mueven al historial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Archivado automático</Label>
                <p className="text-sm text-muted-foreground">
                  Archivar vehículos entregados automáticamente
                </p>
              </div>
              <Switch checked={autoArchive} onCheckedChange={setAutoArchive} />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="archiveHours">Horas hasta archivar</Label>
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
                <span className="text-sm text-muted-foreground">horas después de entregar</span>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Archivar ahora</Label>
                <p className="text-sm text-muted-foreground">
                  Archivar manualmente todos los vehículos entregados con más de 24h
                </p>
              </div>
              <Button variant="outline" onClick={archiveDeliveredVehicles}>
                Archivar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Holidays */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Festivos del Taller
            </CardTitle>
            <CardDescription>
              Define los días que el taller está cerrado. Los temporizadores de reparación no se pararán automáticamente en festivos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="holidayDate">Fecha</Label>
                <Input
                  id="holidayDate"
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                />
              </div>
              <div className="flex-[2] space-y-2">
                <Label htmlFor="holidayName">Nombre del festivo</Label>
                <Input
                  id="holidayName"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder="Ej: Festividad local, Puente..."
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
                No hay festivos configurados. Los temporizadores se pararán de lunes a viernes a las 17:15.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Zona de Peligro
            </CardTitle>
            <CardDescription>
              Acciones que pueden afectar permanentemente los datos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Eliminar vehículos archivados</Label>
                <p className="text-sm text-muted-foreground">
                  Esta acción no se puede deshacer
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción eliminará permanentemente todos los vehículos archivados y no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from('vehicles')
                            .delete()
                            .eq('archived', true);
                          if (error) throw error;
                          toast.success('Vehículos archivados eliminados');
                        } catch (error) {
                          toast.error('Error al eliminar vehículos');
                        }
                      }}
                    >
                      Eliminar
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
          Guardar Configuración
        </Button>
      </div>
    </MainLayout>
  );
}
