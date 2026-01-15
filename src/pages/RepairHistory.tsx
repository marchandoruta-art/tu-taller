import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VehicleWithOwner, VehicleStatus, STATUS_LABELS } from '@/lib/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { History, Search, Loader2, Eye, Trash2, RotateCcw, Car } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function RepairHistory() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [vehicles, setVehicles] = useState<VehicleWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');

  const isAdmin = role === 'admin';

  useEffect(() => {
    fetchArchivedVehicles();
  }, []);

  const fetchArchivedVehicles = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, owner:owners(*)')
      .eq('archived', true)
      .order('delivered_at', { ascending: false });

    if (data) {
      setVehicles(data as any);
    }
    if (error) {
      console.error('Error fetching archived vehicles:', error);
    }
    setLoading(false);
  };

  const deleteVehicle = async (vehicleId: string) => {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId);

    if (error) {
      toast.error('Error al eliminar el vehículo');
    } else {
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
      toast.success('Vehículo eliminado del historial');
    }
  };

  const restoreVehicle = async (vehicleId: string) => {
    const { error } = await supabase
      .from('vehicles')
      .update({ archived: false, status: 'recibido' as VehicleStatus })
      .eq('id', vehicleId);

    if (error) {
      toast.error('Error al restaurar el vehículo');
    } else {
      setVehicles(vehicles.filter(v => v.id !== vehicleId));
      toast.success('Vehículo restaurado al taller');
    }
  };

  const getYears = () => {
    const years = new Set(vehicles.map(v => 
      v.delivered_at ? new Date(v.delivered_at).getFullYear() : new Date(v.created_at).getFullYear()
    ));
    return Array.from(years).sort((a, b) => b - a);
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      vehicle.plate.toLowerCase().includes(searchLower) ||
      vehicle.brand.toLowerCase().includes(searchLower) ||
      vehicle.model.toLowerCase().includes(searchLower) ||
      vehicle.owner?.name?.toLowerCase().includes(searchLower);

    const vehicleYear = vehicle.delivered_at 
      ? new Date(vehicle.delivered_at).getFullYear().toString()
      : new Date(vehicle.created_at).getFullYear().toString();
    const matchesYear = yearFilter === 'all' || vehicleYear === yearFilter;

    return matchesSearch && matchesYear;
  });

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
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Historial de Reparaciones</h1>
              <p className="text-sm text-muted-foreground">
                {vehicles.length} reparaciones archivadas
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por matrícula, marca, modelo o cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar por año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los años</SelectItem>
                  {getYears().map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {filteredVehicles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Car className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay reparaciones en el historial</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha Entrega</TableHead>
                      <TableHead>Resumen</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.plate}</TableCell>
                        <TableCell>
                          {vehicle.brand} {vehicle.model}
                          {vehicle.year && <span className="text-muted-foreground"> ({vehicle.year})</span>}
                        </TableCell>
                        <TableCell>{vehicle.owner?.name || 'Sin asignar'}</TableCell>
                        <TableCell>
                          {vehicle.delivered_at ? (
                            format(new Date(vehicle.delivered_at), 'dd MMM yyyy', { locale: es })
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {vehicle.work_summary || <span className="text-muted-foreground">Sin resumen</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => restoreVehicle(vehicle.id)}
                                  title="Restaurar al taller"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Eliminar vehículo?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción eliminará permanentemente el vehículo {vehicle.plate} y toda su información asociada.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onClick={() => deleteVehicle(vehicle.id)}
                                      >
                                        Eliminar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
