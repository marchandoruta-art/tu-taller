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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      toast.error(t('adminExtraUI.data.toast.vehicleSaveError'));
    } else {
      toast.success(t('adminExtraUI.data.toast.vehicleUpdated'));
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
      toast.error(t('adminExtraUI.data.toast.ownerSaveError'));
    } else {
      toast.success(t('adminExtraUI.data.toast.ownerUpdated'));
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
          <h2 className="text-xl font-semibold mb-2">{t('adminExtraUI.data.restrictedTitle')}</h2>
          <p className="text-muted-foreground">{t('adminExtraUI.data.restrictedDescription')}</p>
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
            {t('adminExtraUI.data.title')}
          </h1>
          <p className="text-muted-foreground">{t('adminExtraUI.data.subtitle')}</p>
        </div>

        <Tabs defaultValue="vehicles" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="vehicles" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              {t('adminExtraUI.data.vehiclesTab', { count: vehicles.length })}
            </TabsTrigger>
            <TabsTrigger value="owners" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('adminExtraUI.data.ownersTab', { count: owners.length })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg">{t('adminExtraUI.data.vehiclesListTitle')}</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('adminExtraUI.data.searchVehiclePlaceholder')}
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
                        <TableHead>{t('adminExtraUI.data.table.plate')}</TableHead>
                        <TableHead>{t('adminExtraUI.data.table.brand')}</TableHead>
                        <TableHead>{t('adminExtraUI.data.table.model')}</TableHead>
                        <TableHead>{t('adminExtraUI.data.table.year')}</TableHead>
                        <TableHead>{t('adminExtraUI.data.table.color')}</TableHead>
                        <TableHead>{t('adminExtraUI.data.table.vin')}</TableHead>
                        <TableHead>{t('adminExtraUI.data.table.status')}</TableHead>
                        <TableHead className="text-right">{t('adminExtraUI.data.table.actions')}</TableHead>
                      </TableRow>
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
                          <TableCell className="text-xs">{vehicle.status}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setHistoryVehicleId(vehicle.id); setHistoryVehiclePlate(vehicle.plate); }}
                                title={t('adminExtraUI.data.viewHistory')}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingVehicle(vehicle)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
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
                  <CardTitle className="text-lg">{t('adminExtraUI.data.ownersListTitle')}</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('adminExtraUI.data.searchOwnerPlaceholder')}
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
                        <TableHead>{t('adminExtraUI.data.table.name')}</TableHead>
                        <TableHead>{t('adminExtraUI.data.table.phone')}</TableHead>
                        <TableHead>{t('adminExtraUI.data.table.email')}</TableHead>
                        <TableHead>{t('adminExtraUI.data.table.dni')}</TableHead>
                        <TableHead>{t('adminExtraUI.data.table.address')}</TableHead>
                        <TableHead className="text-right">{t('adminExtraUI.data.table.actions')}</TableHead>
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
              <DialogTitle>{t('adminExtraUI.data.editVehicleTitle')}</DialogTitle>
            </DialogHeader>
            {editingVehicle && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('adminExtraUI.data.table.plate')}</Label>
                    <Input
                      value={editingVehicle.plate}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, plate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('adminExtraUI.data.table.brand')}</Label>
                    <Input
                      value={editingVehicle.brand}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, brand: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('adminExtraUI.data.table.model')}</Label>
                    <Input
                      value={editingVehicle.model}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, model: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('adminExtraUI.data.table.year')}</Label>
                    <Input
                      type="number"
                      value={editingVehicle.year || ''}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, year: parseInt(e.target.value) || undefined })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('adminExtraUI.data.table.color')}</Label>
                    <Input
                      value={editingVehicle.color || ''}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, color: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('adminExtraUI.data.table.vin')}</Label>
                    <Input
                      value={editingVehicle.vin || ''}
                      onChange={(e) => setEditingVehicle({ ...editingVehicle, vin: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditingVehicle(null)}>
                    <X className="h-4 w-4 mr-2" />
                    {t('adminExtraUI.data.cancel')}
                  </Button>
                  <Button onClick={handleSaveVehicle} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? t('adminExtraUI.data.saving') : t('adminExtraUI.data.save')}
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
              <DialogTitle>{t('adminExtraUI.data.editOwnerTitle')}</DialogTitle>
            </DialogHeader>
            {editingOwner && (
              <div className="space-y-4">
                <div>
                  <Label>{t('adminExtraUI.data.table.name')}</Label>
                  <Input
                    value={editingOwner.name}
                    onChange={(e) => setEditingOwner({ ...editingOwner, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('adminExtraUI.data.table.phone')}</Label>
                    <Input
                      value={editingOwner.phone || ''}
                      onChange={(e) => setEditingOwner({ ...editingOwner, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('adminExtraUI.data.table.dni')}</Label>
                    <Input
                      value={editingOwner.dni || ''}
                      onChange={(e) => setEditingOwner({ ...editingOwner, dni: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('adminExtraUI.data.table.email')}</Label>
                  <Input
                    type="email"
                    value={editingOwner.email || ''}
                    onChange={(e) => setEditingOwner({ ...editingOwner, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('adminExtraUI.data.table.address')}</Label>
                  <Input
                    value={editingOwner.address || ''}
                    onChange={(e) => setEditingOwner({ ...editingOwner, address: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditingOwner(null)}>
                    <X className="h-4 w-4 mr-2" />
                    {t('adminExtraUI.data.cancel')}
                  </Button>
                  <Button onClick={handleSaveOwner} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? t('adminExtraUI.data.saving') : t('adminExtraUI.data.save')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <VehicleHistoryDialog
          vehicleId={historyVehicleId}
          vehiclePlate={historyVehiclePlate}
          onClose={() => setHistoryVehicleId(null)}
        />
      </div>
    </MainLayout>
  );
}
