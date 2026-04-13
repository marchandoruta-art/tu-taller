import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Owner, Vehicle } from '@/lib/types';
import { Loader2, Database, Car, Users, Edit, Save, X, Search, History } from 'lucide-react';
import { VehicleHistoryDialog } from '@/components/vehicles/VehicleHistoryDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AdminData() {
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [searchVehicles, setSearchVehicles] = useState('');
  const [searchOwners, setSearchOwners] = useState('');
  
  // Edit states
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyVehicleId, setHistoryVehicleId] = useState<string | null>(null);
  const [historyVehiclePlate, setHistoryVehiclePlate] = useState<string>('');

  useEffect(() => {
    if (role === 'admin') {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [role]);

  const fetchData = async () => {
    setLoading(true);
    
    const [vehiclesRes, ownersRes] = await Promise.all([
      supabase.from('vehicles').select('*').order('created_at', { ascending: false }),
      supabase.from('owners').select('*').order('name', { ascending: true }),
    ]);

    if (vehiclesRes.data) setVehicles(vehiclesRes.data as Vehicle[]);
    if (ownersRes.data) setOwners(ownersRes.data as Owner[]);
    
    setLoading(false);
  };

  const handleSaveVehicle = async () => {
    if (!editingVehicle) return;
    setSaving(true);

    const { error } = await supabase
      .from('vehicles')
      .update({
        plate: editingVehicle.plate,
        brand: editingVehicle.brand,
        model: editingVehicle.model,
        year: editingVehicle.year,
        color: editingVehicle.color,
        vin: editingVehicle.vin,
        client_description: editingVehicle.client_description,
      })
      .eq('id', editingVehicle.id);

    if (error) {
      toast.error('Error al guardar vehículo');
    } else {
      toast.success('Vehículo actualizado');
      setEditingVehicle(null);
      fetchData();
    }
    setSaving(false);
  };

  const handleSaveOwner = async () => {
    if (!editingOwner) return;
    setSaving(true);

    const { error } = await supabase
      .from('owners')
      .update({
        name: editingOwner.name,
        phone: editingOwner.phone,
        email: editingOwner.email,
        dni: editingOwner.dni,
        address: editingOwner.address,
      })
      .eq('id', editingOwner.id);

    if (error) {
      toast.error('Error al guardar propietario');
    } else {
      toast.success('Propietario actualizado');
      setEditingOwner(null);
      fetchData();
    }
    setSaving(false);
  };

  const filteredVehicles = vehicles.filter(v => 
    v.plate.toLowerCase().includes(searchVehicles.toLowerCase()) ||
    v.brand.toLowerCase().includes(searchVehicles.toLowerCase()) ||
    v.model.toLowerCase().includes(searchVehicles.toLowerCase())
  );

  const filteredOwners = owners.filter(o => 
    o.name.toLowerCase().includes(searchOwners.toLowerCase()) ||
    (o.phone && o.phone.includes(searchOwners)) ||
    (o.email && o.email.toLowerCase().includes(searchOwners.toLowerCase())) ||
    (o.dni && o.dni.toLowerCase().includes(searchOwners.toLowerCase()))
  );

  if (role !== 'admin') {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acceso Restringido</h2>
          <p className="text-muted-foreground">Solo los administradores pueden acceder a esta sección.</p>
        </div>
      </MainLayout>
    );
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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Gestión de Datos
          </h1>
          <p className="text-muted-foreground">Administrar vehículos y propietarios</p>
        </div>

        <Tabs defaultValue="vehicles" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="vehicles" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Vehículos ({vehicles.length})
            </TabsTrigger>
            <TabsTrigger value="owners" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Propietarios ({owners.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg">Listado de Vehículos</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar vehículo..."
                      value={searchVehicles}
                      onChange={(e) => setSearchVehicles(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Matrícula</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Año</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>VIN</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                        <TableHead>Estado</TableHead>
                    </TableHeader>
                    <TableBody>
                      {filteredVehicles.map((vehicle) => (
                        <TableRow key={vehicle.id}>
                          <TableCell className="font-medium">{vehicle.plate}</TableCell>
                          <TableCell>{vehicle.brand}</TableCell>
                          <TableCell>{vehicle.model}</TableCell>
                          <TableCell>{vehicle.year || '-'}</TableCell>
                          <TableCell>{vehicle.color || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{vehicle.vin || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingVehicle(vehicle)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="owners" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg">Listado de Propietarios</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar propietario..."
                      value={searchOwners}
                      onChange={(e) => setSearchOwners(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>DNI</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOwners.map((owner) => (
                        <TableRow key={owner.id}>
                          <TableCell className="font-medium">{owner.name}</TableCell>
                          <TableCell>{owner.phone || '-'}</TableCell>
                          <TableCell>{owner.email || '-'}</TableCell>
                          <TableCell>{owner.dni || '-'}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{owner.address || '-'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingOwner(owner)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Vehicle Dialog */}
        <Dialog open={!!editingVehicle} onOpenChange={() => setEditingVehicle(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Vehículo</DialogTitle>
            </DialogHeader>
            {editingVehicle && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Matrícula</Label>
                    <Input
                      value={editingVehicle.plate}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, plate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Marca</Label>
                    <Input
                      value={editingVehicle.brand}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, brand: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Modelo</Label>
                    <Input
                      value={editingVehicle.model}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, model: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Año</Label>
                    <Input
                      type="number"
                      value={editingVehicle.year || ''}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, year: parseInt(e.target.value) || undefined })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Color</Label>
                    <Input
                      value={editingVehicle.color || ''}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, color: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>VIN</Label>
                    <Input
                      value={editingVehicle.vin || ''}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, vin: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditingVehicle(null)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveVehicle} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Owner Dialog */}
        <Dialog open={!!editingOwner} onOpenChange={() => setEditingOwner(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Propietario</DialogTitle>
            </DialogHeader>
            {editingOwner && (
              <div className="space-y-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={editingOwner.name}
                    onChange={(e) => setEditingOwner({ ...editingOwner, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={editingOwner.phone || ''}
                      onChange={(e) => setEditingOwner({ ...editingOwner, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>DNI</Label>
                    <Input
                      value={editingOwner.dni || ''}
                      onChange={(e) => setEditingOwner({ ...editingOwner, dni: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editingOwner.email || ''}
                    onChange={(e) => setEditingOwner({ ...editingOwner, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Dirección</Label>
                  <Input
                    value={editingOwner.address || ''}
                    onChange={(e) => setEditingOwner({ ...editingOwner, address: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditingOwner(null)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveOwner} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
