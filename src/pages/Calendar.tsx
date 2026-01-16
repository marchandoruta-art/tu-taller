import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { VehicleWithOwner, STATUS_LABELS } from '@/lib/types';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Car, 
  Clock, 
  Loader2,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

interface ScheduledDelivery {
  id: string;
  vehicle_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  vehicle?: VehicleWithOwner;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [deliveries, setDeliveries] = useState<ScheduledDelivery[]>([]);
  const [vehicles, setVehicles] = useState<VehicleWithOwner[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    setLoading(true);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Fetch scheduled deliveries for the current month
    const { data: deliveriesData } = await supabase
      .from('scheduled_deliveries')
      .select('*')
      .gte('scheduled_date', format(monthStart, 'yyyy-MM-dd'))
      .lte('scheduled_date', format(monthEnd, 'yyyy-MM-dd'))
      .order('scheduled_date', { ascending: true });

    // Fetch active vehicles
    const { data: vehiclesData } = await supabase
      .from('vehicles')
      .select('*, owner:owners(*)')
      .eq('archived', false)
      .neq('status', 'entregado');

    if (deliveriesData && vehiclesData) {
      // Attach vehicle info to deliveries
      const enrichedDeliveries = deliveriesData.map(d => ({
        ...d,
        vehicle: vehiclesData.find(v => v.id === d.vehicle_id),
      }));
      setDeliveries(enrichedDeliveries as ScheduledDelivery[]);
    }

    if (vehiclesData) {
      setVehicles(vehiclesData as VehicleWithOwner[]);
    }

    setLoading(false);
  };

  const handleAddDelivery = async () => {
    if (!selectedDate || !selectedVehicle || !user) {
      toast.error('Selecciona un vehículo y fecha');
      return;
    }

    setSaving(true);

    const { error } = await supabase.from('scheduled_deliveries').insert({
      vehicle_id: selectedVehicle,
      scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
      scheduled_time: selectedTime || null,
      notes: notes || null,
      created_by: user.id,
    });

    if (error) {
      toast.error('Error al programar entrega');
    } else {
      toast.success('Entrega programada');
      setDialogOpen(false);
      setSelectedVehicle('');
      setSelectedTime('');
      setNotes('');
      fetchData();
    }

    setSaving(false);
  };

  const handleDeleteDelivery = async (id: string) => {
    const { error } = await supabase.from('scheduled_deliveries').delete().eq('id', id);
    if (error) {
      toast.error('Error al eliminar');
    } else {
      toast.success('Entrega eliminada');
      fetchData();
    }
  };

  const getDeliveriesForDate = (date: Date) => {
    return deliveries.filter(d => isSameDay(new Date(d.scheduled_date), date));
  };

  const getDaysWithDeliveries = () => {
    return deliveries.map(d => new Date(d.scheduled_date));
  };

  const selectedDateDeliveries = selectedDate ? getDeliveriesForDate(selectedDate) : [];

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              Calendario de Entregas
            </h1>
            <p className="text-muted-foreground">Planifica y gestiona las entregas de vehículos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Programar Entrega
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Programar Entrega</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Fecha</label>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={es}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Vehículo</label>
                  <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un vehículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.plate} - {v.brand} {v.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Hora (opcional)</label>
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Notas (opcional)</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas adicionales..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleAddDelivery} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Programar Entrega
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
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
                  hasDelivery: getDaysWithDeliveries(),
                }}
                modifiersStyles={{
                  hasDelivery: {
                    fontWeight: 'bold',
                    backgroundColor: 'hsl(var(--primary) / 0.2)',
                    color: 'hsl(var(--primary))',
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
                {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : 'Selecciona una fecha'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateDeliveries.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">
                  No hay entregas programadas para este día
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDateDeliveries.map(delivery => (
                    <div 
                      key={delivery.id} 
                      className="p-3 bg-muted/50 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-primary" />
                          <span className="font-medium">
                            {delivery.vehicle?.plate || 'Vehículo'}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteDelivery(delivery.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {delivery.vehicle && (
                        <p className="text-sm text-muted-foreground">
                          {delivery.vehicle.brand} {delivery.vehicle.model}
                        </p>
                      )}
                      {delivery.scheduled_time && (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {delivery.scheduled_time}
                        </div>
                      )}
                      {delivery.notes && (
                        <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                          {delivery.notes}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => navigate(`/vehicles/${delivery.vehicle_id}`)}
                      >
                        Ver vehículo
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Deliveries Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximas Entregas</CardTitle>
          </CardHeader>
          <CardContent>
            {deliveries.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No hay entregas programadas este mes
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliveries.slice(0, 6).map(delivery => (
                  <div
                    key={delivery.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedDate(new Date(delivery.scheduled_date));
                    }}
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(delivery.scheduled_date), 'MMM', { locale: es })}
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {format(new Date(delivery.scheduled_date), 'd')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {delivery.vehicle?.plate || 'Vehículo'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {delivery.vehicle?.brand} {delivery.vehicle?.model}
                      </p>
                      {delivery.scheduled_time && (
                        <p className="text-xs text-muted-foreground">{delivery.scheduled_time}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}