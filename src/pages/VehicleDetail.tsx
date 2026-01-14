import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle, Owner, Part, TimeLog, VehicleStatus, STATUS_LABELS } from '@/lib/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { VehicleStatusBadge } from '@/components/vehicles/VehicleStatusBadge';
import { WorkTimer } from '@/components/timer/WorkTimer';
import { VehicleChat } from '@/components/chat/VehicleChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Car,
  User,
  Phone,
  Mail,
  Clock,
  Package,
  Plus,
  Trash2,
  Loader2,
  MessageSquare,
  Bell,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<(Vehicle & { owner: Owner }) | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPart, setNewPart] = useState({ name: '', quantity: 1, unit_price: '' });

  useEffect(() => {
    fetchVehicleData();
  }, [id]);

  const fetchVehicleData = async () => {
    if (!id) return;

    const [vehicleRes, partsRes, timeLogsRes] = await Promise.all([
      supabase.from('vehicles').select('*, owner:owners(*)').eq('id', id).single(),
      supabase.from('parts').select('*').eq('vehicle_id', id).order('created_at', { ascending: false }),
      supabase.from('time_logs').select('*').eq('vehicle_id', id).order('started_at', { ascending: false }),
    ]);

    if (vehicleRes.data) setVehicle(vehicleRes.data as any);
    if (partsRes.data) setParts(partsRes.data);
    if (timeLogsRes.data) setTimeLogs(timeLogsRes.data);
    setLoading(false);
  };

  const updateStatus = async (newStatus: VehicleStatus) => {
    if (!vehicle) return;

    const { error } = await supabase
      .from('vehicles')
      .update({ status: newStatus })
      .eq('id', vehicle.id);

    if (error) {
      toast.error('Error al actualizar el estado');
    } else {
      setVehicle({ ...vehicle, status: newStatus });
      toast.success(`Estado actualizado a: ${STATUS_LABELS[newStatus]}`);
    }
  };

  const addPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !newPart.name || !user) return;

    const { error } = await supabase.from('parts').insert([
      {
        vehicle_id: vehicle.id,
        name: newPart.name,
        quantity: newPart.quantity,
        unit_price: newPart.unit_price ? parseFloat(newPart.unit_price) : null,
        added_by: user.id,
      },
    ]);

    if (error) {
      toast.error('Error al añadir la pieza');
    } else {
      toast.success('Pieza añadida');
      setNewPart({ name: '', quantity: 1, unit_price: '' });
      fetchVehicleData();
    }
  };

  const deletePart = async (partId: string) => {
    const { error } = await supabase.from('parts').delete().eq('id', partId);
    if (error) {
      toast.error('Error al eliminar la pieza');
    } else {
      setParts(parts.filter((p) => p.id !== partId));
      toast.success('Pieza eliminada');
    }
  };

  const notifyClient = async () => {
    if (!vehicle) return;
    // Here you would implement the notification logic (email, SMS, etc.)
    toast.success('Notificación enviada al cliente');
  };

  const getTotalTime = () => {
    return timeLogs.reduce((acc, log) => acc + (log.total_minutes || 0), 0);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getTotalPartsPrice = () => {
    return parts.reduce((acc, p) => acc + (p.unit_price || 0) * p.quantity, 0);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!vehicle) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Vehículo no encontrado</p>
          <Button variant="link" onClick={() => navigate('/')}>
            Volver al dashboard
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{vehicle.plate}</h1>
                <p className="text-muted-foreground">
                  {vehicle.brand} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                </p>
              </div>
              <VehicleStatusBadge status={vehicle.status} />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={vehicle.status} onValueChange={(v) => updateStatus(v as VehicleStatus)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {vehicle.status === 'terminado' && (
              <Button onClick={notifyClient} className="gap-2">
                <Bell className="h-4 w-4" />
                Avisar Cliente
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timer */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Control de Tiempo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <WorkTimer vehicleId={vehicle.id} onUpdate={fetchVehicleData} />
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Tiempo total acumulado</span>
                  <span className="font-mono font-medium text-lg">{formatTime(getTotalTime())}</span>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {vehicle.client_description && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Descripción del Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{vehicle.client_description}</p>
                </CardContent>
              </Card>
            )}

            {/* Parts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" />
                  Piezas Utilizadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={addPart} className="flex gap-2">
                  <Input
                    placeholder="Nombre de la pieza"
                    value={newPart.name}
                    onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Cant."
                    value={newPart.quantity}
                    onChange={(e) => setNewPart({ ...newPart, quantity: parseInt(e.target.value) || 1 })}
                    className="w-20"
                    min={1}
                  />
                  <Input
                    type="number"
                    placeholder="Precio €"
                    value={newPart.unit_price}
                    onChange={(e) => setNewPart({ ...newPart, unit_price: e.target.value })}
                    className="w-24"
                    step="0.01"
                  />
                  <Button type="submit" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>

                {parts.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No hay piezas registradas
                  </p>
                ) : (
                  <div className="space-y-2">
                    {parts.map((part) => (
                      <div
                        key={part.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium">{part.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">x{part.quantity}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {part.unit_price && (
                            <span className="font-mono">
                              {(part.unit_price * part.quantity).toFixed(2)}€
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deletePart(part.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between pt-3 border-t border-border">
                      <span className="font-medium">Total Piezas</span>
                      <span className="font-mono font-bold">{getTotalPartsPrice().toFixed(2)}€</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Owner Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Propietario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="font-medium">{vehicle.owner.name}</div>
                {vehicle.owner.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${vehicle.owner.phone}`} className="hover:text-primary">
                      {vehicle.owner.phone}
                    </a>
                  </div>
                )}
                {vehicle.owner.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${vehicle.owner.email}`} className="hover:text-primary">
                      {vehicle.owner.email}
                    </a>
                  </div>
                )}
                {vehicle.owner.dni && (
                  <div className="text-sm text-muted-foreground">DNI: {vehicle.owner.dni}</div>
                )}
              </CardContent>
            </Card>

            {/* Chat */}
            <div>
              <h3 className="flex items-center gap-2 font-semibold mb-3">
                <MessageSquare className="h-5 w-5" />
                Comunicación Interna
              </h3>
              <VehicleChat vehicleId={vehicle.id} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
