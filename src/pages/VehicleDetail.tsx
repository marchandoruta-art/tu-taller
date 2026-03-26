import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VehicleWithOwner, Part, TimeLog, VehicleStatus, STATUS_LABELS, Profile, ROLE_LABELS, UserRole, VehicleAnomaly, VehicleFile } from '@/lib/types';
import { MainLayout } from '@/components/layout/MainLayout';
import { VehicleStatusBadge } from '@/components/vehicles/VehicleStatusBadge';
import { WorkTimer } from '@/components/timer/WorkTimer';
import { VehicleChat } from '@/components/chat/VehicleChat';
import { AssignUserDialog } from '@/components/vehicles/AssignUserDialog';
import { ViewDepositReceipt } from '@/components/vehicles/reception/ViewDepositReceipt';
import { EditReceptionDataDialog } from '@/components/vehicles/EditReceptionDataDialog';
import { VehiclePhotos } from '@/components/vehicles/VehiclePhotos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Car,
  User,
  Phone,
  Mail,
  Check,
  Clock,
  Package,
  Plus,
  Trash2,
  Loader2,
  MessageSquare,
  Bell,
  Lock,
  FileText,
  UserCheck,
  AlertTriangle,
  Upload,
  Image,
  File,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { useWhatsAppMessage } from '@/hooks/useWhatsAppMessage';

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { organizationId } = useOrganization();
  const { openWhatsApp } = useWhatsAppMessage();
  const [vehicle, setVehicle] = useState<VehicleWithOwner | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [anomalies, setAnomalies] = useState<VehicleAnomaly[]>([]);
  const [vehicleFiles, setVehicleFiles] = useState<VehicleFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPart, setNewPart] = useState({ name: '', quantity: '1', reference: '' });
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editPart, setEditPart] = useState({ name: '', quantity: '1', reference: '' });
  const [newAnomaly, setNewAnomaly] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
   const [workSummary, setWorkSummary] = useState('');
   const [savingSummary, setSavingSummary] = useState(false);
   const [clientDescription, setClientDescription] = useState('');
   const [savingDescription, setSavingDescription] = useState(false);
   const [editingDescription, setEditingDescription] = useState(false);
  const [assignedUser, setAssignedUser] = useState<(Profile & { role?: UserRole }) | null>(null);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [savingCost, setSavingCost] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // Scroll to top on mount/id change
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [id]);

  useEffect(() => {
    fetchVehicleData();
  }, [id]);

  // Scroll to top after render completes
  useEffect(() => {
    if (!loading && topRef.current) {
      topRef.current.scrollIntoView({ block: 'start' });
    }
  }, [loading, id]);

  const fetchVehicleData = async () => {
    if (!id) return;

    const [vehicleRes, partsRes, timeLogsRes, anomaliesRes, filesRes] = await Promise.all([
      supabase.from('vehicles').select('*, owner:owners(*)').eq('id', id).maybeSingle(),
      supabase.from('parts').select('*').eq('vehicle_id', id).order('created_at', { ascending: false }),
      supabase.from('time_logs').select('*').eq('vehicle_id', id).order('started_at', { ascending: false }),
      supabase.from('vehicle_anomalies').select('*').eq('vehicle_id', id).order('created_at', { ascending: false }),
      supabase.from('vehicle_files').select('*').eq('vehicle_id', id).order('created_at', { ascending: false }),
    ]);

    if (vehicleRes.data) {
      setVehicle(vehicleRes.data as VehicleWithOwner);
      setWorkSummary(vehicleRes.data.work_summary || '');
      setClientDescription(vehicleRes.data.client_description || '');
      setEstimatedCost((vehicleRes.data as any).estimated_cost?.toString() || '');
      
      // Fetch assigned user
      if (vehicleRes.data.assigned_to) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', vehicleRes.data.assigned_to)
          .maybeSingle();
        
        if (profile) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', vehicleRes.data.assigned_to)
            .maybeSingle();
          
          setAssignedUser({ ...profile, role: roleData?.role as UserRole | undefined });
        }
      } else {
        setAssignedUser(null);
      }
    }
    if (partsRes.data) setParts(partsRes.data as Part[]);
    if (timeLogsRes.data) setTimeLogs(timeLogsRes.data);
    if (anomaliesRes.data) setAnomalies(anomaliesRes.data as VehicleAnomaly[]);
    if (filesRes.data) {
      const files = filesRes.data as VehicleFile[];
      if (files.length > 0) {
        // Generate signed URLs for private bucket files
        const paths = files.map(f => {
          const marker = '/vehicle-files/';
          const idx = f.file_path.indexOf(marker);
          return idx !== -1 ? decodeURIComponent(f.file_path.substring(idx + marker.length)) : f.file_path;
        });
        const { data: signedData } = await supabase.storage
          .from('vehicle-files')
          .createSignedUrls(paths, 3600);
        const filesWithUrls = files.map((f, i) => ({
          ...f,
          _displayUrl: signedData?.[i]?.signedUrl || f.file_path,
        }));
        setVehicleFiles(filesWithUrls);
      } else {
        setVehicleFiles([]);
      }
    }
    setLoading(false);
  };

  const normalizeDecimalInput = (value: string) => value.replace(/,/g, '.').replace(/[^\d.]/g, '');

  const parseDecimalQuantity = (value: string) => {
    const parsed = Number.parseFloat(normalizeDecimalInput(value));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
      
      // Notify admin when vehicle is finished
      if (newStatus === 'terminado') {
        await notifyAdminVehicleFinished();
      }
    }
  };

  const notifyAdminVehicleFinished = async () => {
    if (!vehicle) return;

    try {
      // Get all admin users
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles && adminRoles.length > 0) {
        const notifications = adminRoles.map(admin => ({
          user_id: admin.user_id,
          vehicle_id: vehicle.id,
          type: 'vehicle_finished',
          message: `Vehículo ${vehicle.plate} (${vehicle.brand} ${vehicle.model}) ha sido marcado como TERMINADO`,
          read: false,
          organization_id: organizationId,
        }));

        await supabase.from('notifications').insert(notifications);
        toast.info('Administradores notificados');
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  };

  const addPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !newPart.name || !user) return;

    const quantity = parseDecimalQuantity(newPart.quantity);
    if (quantity === null) {
      toast.error('Introduce una cantidad válida, por ejemplo 1,5');
      return;
    }

    const { error } = await supabase.from('parts').insert([
      {
        vehicle_id: vehicle.id,
        name: newPart.name,
        quantity,
        reference: newPart.reference || null,
        added_by: user.id,
        organization_id: organizationId,
      },
    ]);

    if (error) {
      toast.error('Error al añadir la pieza');
    } else {
      toast.success('Pieza añadida');
      setNewPart({ name: '', quantity: '1', reference: '' });
      fetchVehicleData();
    }
  };

  const addAnomaly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !newAnomaly.trim() || !user) return;

    const { error } = await supabase.from('vehicle_anomalies').insert([
      {
        vehicle_id: vehicle.id,
        description: newAnomaly.trim(),
        created_by: user.id,
        organization_id: organizationId,
      },
    ]);

    if (error) {
      toast.error('Error al añadir la anomalía');
    } else {
      toast.success('Anomalía registrada');
      setNewAnomaly('');
      fetchVehicleData();
    }
  };

  const deleteAnomaly = async (anomalyId: string) => {
    const { error } = await supabase.from('vehicle_anomalies').delete().eq('id', anomalyId);
    if (error) {
      toast.error('Error al eliminar la anomalía');
    } else {
      setAnomalies(anomalies.filter((a) => a.id !== anomalyId));
      toast.success('Anomalía eliminada');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!vehicle || !user || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploadingFile(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${vehicle.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('vehicle-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store the storage path, not a public URL
      const { error: dbError } = await supabase.from('vehicle_files').insert([
        {
          vehicle_id: vehicle.id,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          uploaded_by: user.id,
          organization_id: organizationId,
        },
      ]);

      if (dbError) throw dbError;

      toast.success('Archivo subido correctamente');
      fetchVehicleData();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir el archivo');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const deleteFile = async (fileId: string, filePath: string) => {
    try {
      // Look up the original storage path from the DB record
      const fileRecord = vehicleFiles.find(f => f.id === fileId);
      const originalPath = fileRecord?.file_path || filePath;
      // Extract clean storage path (no signed URL tokens)
      const marker = '/vehicle-files/';
      const idx = originalPath.indexOf(marker);
      const cleanPath = idx !== -1 ? decodeURIComponent(originalPath.substring(idx + marker.length).split('?')[0]) : originalPath;
      await supabase.storage.from('vehicle-files').remove([cleanPath]);

      const { error } = await supabase.from('vehicle_files').delete().eq('id', fileId);
      if (error) throw error;

      setVehicleFiles(vehicleFiles.filter((f) => f.id !== fileId));
      toast.success('Archivo eliminado');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Error al eliminar el archivo');
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

  const saveWorkSummary = async () => {
    if (!vehicle) return;
    setSavingSummary(true);
    
    const { error } = await supabase
      .from('vehicles')
      .update({ work_summary: workSummary })
      .eq('id', vehicle.id);

    if (error) {
      toast.error('Error al guardar el resumen');
    } else {
      toast.success('Resumen guardado');
      setVehicle({ ...vehicle, work_summary: workSummary });
    }
    setSavingSummary(false);
  };

  const [notifyingClient, setNotifyingClient] = useState(false);

  const notifyClient = async () => {
    if (!vehicle) return;
    
    setNotifyingClient(true);
    
    try {
      // Call edge function with vehicle ID only — server fetches data securely
      const { data, error } = await supabase.functions.invoke('notify-client', {
        body: {
          vehicleId: vehicle.id,
          notificationType: 'completed',
        },
      });

      if (error) throw error;

      // Show results
      if (data.email === 'sent') {
        toast.success('Email enviado al cliente');
      }

      // Open WhatsApp if available
      if (data.whatsapp) {
        window.open(data.whatsapp, '_blank');
        toast.success('Abriendo WhatsApp...');
      }

      if (!data.whatsapp && data.email !== 'sent') {
        toast.warning('El cliente no tiene email ni teléfono registrado');
      }
    } catch (error) {
      console.error('Error notifying client:', error);
      toast.error('Error al notificar al cliente');
    } finally {
      setNotifyingClient(false);
    }
  };

  const getTotalTime = () => {
    return timeLogs.reduce((acc, log) => acc + (log.total_minutes || 0), 0);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const isAdmin = role === 'admin';
  const canViewOwner = role === 'admin' || role === 'oficina';


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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <MainLayout>
      <div ref={topRef} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="self-start">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Car className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">{vehicle.plate}</h1>
                <p className="text-sm text-muted-foreground">
                  {vehicle.brand} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                </p>
              </div>
              <VehicleStatusBadge status={vehicle.status} />
            </div>
            
            {/* Assigned user info */}
            <div className="flex items-center gap-2 mt-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              {assignedUser ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={assignedUser.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(assignedUser.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{assignedUser.full_name}</span>
                  {assignedUser.role && (
                    <span className="text-xs text-muted-foreground">({ROLE_LABELS[assignedUser.role]})</span>
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Sin asignar</span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <EditReceptionDataDialog vehicle={vehicle} onSuccess={fetchVehicleData} />
            <AssignUserDialog 
              vehicleId={vehicle.id} 
              currentAssignedTo={vehicle.assigned_to} 
              onAssigned={fetchVehicleData}
            />
            <Select value={vehicle.status} onValueChange={(v) => updateStatus(v as VehicleStatus)}>
              <SelectTrigger className="w-40 md:w-48">
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
              <div className="flex gap-2">
                {vehicle.owner?.phone && (
                  <Button
                    variant="outline"
                    className="gap-2 border-green-500/30 text-green-600 hover:bg-green-500/10 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                    onClick={() => openWhatsApp(vehicle.owner!.phone!, vehicle)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </Button>
                )}
                <Button onClick={notifyClient} className="gap-2" disabled={notifyingClient}>
                  {notifyingClient ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Avisar Cliente</span>
                </Button>
              </div>
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
                <WorkTimer vehicleId={vehicle.id} vehicleStatus={vehicle.status} onUpdate={fetchVehicleData} />
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Tiempo total acumulado</span>
                  <span className="font-mono font-medium text-lg">{formatTime(getTotalTime())}</span>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Descripción del Cliente</CardTitle>
                  {!editingDescription && (
                    <Button variant="ghost" size="sm" onClick={() => setEditingDescription(true)}>
                      Editar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={clientDescription}
                      onChange={(e) => setClientDescription(e.target.value)}
                      placeholder="Descripción del cliente sobre el problema o trabajo a realizar..."
                      rows={4}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => {
                        setClientDescription(vehicle.client_description || '');
                        setEditingDescription(false);
                      }}>
                        Cancelar
                      </Button>
                      <Button size="sm" disabled={savingDescription} onClick={async () => {
                        setSavingDescription(true);
                        const { error } = await supabase.from('vehicles').update({ client_description: clientDescription }).eq('id', vehicle.id);
                        setSavingDescription(false);
                        if (error) { toast.error('Error al guardar'); return; }
                        setVehicle({ ...vehicle, client_description: clientDescription });
                        setEditingDescription(false);
                        toast.success('Descripción guardada');
                      }}>
                        {savingDescription ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {vehicle.client_description || 'Sin descripción. Pulsa Editar para añadir.'}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Vehicle Photos */}
            {/* Estimated Cost */}
            {(role === 'admin' || role === 'oficina') && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    💰 Presupuesto Estimado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">€</span>
                    <Button
                      size="sm"
                      disabled={savingCost}
                      onClick={async () => {
                        setSavingCost(true);
                        const { error } = await supabase
                          .from('vehicles')
                          .update({ estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null } as any)
                          .eq('id', vehicle.id);
                        if (error) toast.error('Error al guardar');
                        else toast.success('Presupuesto guardado');
                        setSavingCost(false);
                      }}
                    >
                      {savingCost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                  </div>
                  {estimatedCost && (
                    <p className="text-2xl font-bold mt-3 text-primary">
                      {parseFloat(estimatedCost).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <VehiclePhotos vehicleId={vehicle.id} />

            {/* Parts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Package className="h-5 w-5" />
                  Piezas Utilizadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={addPart} className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Cant."
                      value={newPart.quantity}
                      onChange={(e) => setNewPart({ ...newPart, quantity: e.target.value })}
                      className="w-20"
                    />
                    <Input
                      placeholder="Descripción de la pieza"
                      value={newPart.name}
                      onChange={(e) => setNewPart({ ...newPart, name: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Referencia (opcional)"
                      value={newPart.reference}
                      onChange={(e) => setNewPart({ ...newPart, reference: e.target.value })}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
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
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg gap-2"
                      >
                        {editingPartId === part.id ? (
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={editPart.quantity}
                                onChange={(e) => setEditPart({ ...editPart, quantity: e.target.value })}
                                className="w-20"
                              />
                              <Input
                                value={editPart.name}
                                onChange={(e) => setEditPart({ ...editPart, name: e.target.value })}
                                className="flex-1"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Referencia (opcional)"
                                value={editPart.reference}
                                onChange={(e) => setEditPart({ ...editPart, reference: e.target.value })}
                                className="flex-1"
                              />
                              <Button
                                size="icon"
                                className="h-8 w-8"
                                onClick={async () => {
                                   const quantity = parseDecimalQuantity(editPart.quantity);
                                   if (quantity === null) {
                                     toast.error('Introduce una cantidad válida, por ejemplo 1,5');
                                     return;
                                   }

                                  const { error } = await supabase
                                    .from('parts')
                                     .update({ name: editPart.name, quantity, reference: editPart.reference || null })
                                    .eq('id', part.id);
                                  if (error) {
                                    toast.error('Error al actualizar la pieza');
                                  } else {
                                    toast.success('Pieza actualizada');
                                    setEditingPartId(null);
                                    fetchVehicleData();
                                  }
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingPartId(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => {
                                setEditingPartId(part.id);
                                setEditPart({ name: part.name, quantity: String(part.quantity).replace('.', ','), reference: part.reference || '' });
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-muted-foreground">x{part.quantity}</span>
                                <span className="font-medium">{part.name}</span>
                              </div>
                              {part.reference && (
                                <p className="text-xs text-muted-foreground mt-1">Ref: {part.reference}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deletePart(part.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Anomalies */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Anomalías Encontradas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={addAnomaly} className="flex gap-2">
                  <Input
                    placeholder="Describe la anomalía encontrada..."
                    value={newAnomaly}
                    onChange={(e) => setNewAnomaly(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>

                {anomalies.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No hay anomalías registradas
                  </p>
                ) : (
                  <div className="space-y-2">
                    {anomalies.map((anomaly) => (
                      <div
                        key={anomaly.id}
                        className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm">{anomaly.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(anomaly.created_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteAnomaly(anomaly.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Files */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="h-5 w-5" />
                  Archivos y Fotos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                  />
                  <label htmlFor="file-upload" className="flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full cursor-pointer"
                      disabled={uploadingFile}
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      {uploadingFile ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Subir Archivo o Foto
                        </>
                      )}
                    </Button>
                  </label>
                </div>

                {vehicleFiles.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No hay archivos subidos
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {vehicleFiles.map((file) => (
                      <div
                        key={file.id}
                        className="relative group rounded-lg overflow-hidden border bg-muted/30"
                      >
                        {file.file_type?.startsWith('image/') ? (
                          <a href={(file as any)._displayUrl || file.file_path} target="_blank" rel="noopener noreferrer">
                            <img
                              src={(file as any)._displayUrl || file.file_path}
                              alt={file.file_name}
                              className="w-full h-24 object-cover hover:opacity-80 transition-opacity"
                            />
                          </a>
                        ) : (
                          <a
                            href={(file as any)._displayUrl || file.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center h-24 hover:bg-muted/50 transition-colors"
                          >
                            <File className="h-8 w-8 text-muted-foreground" />
                          </a>
                        )}
                        <div className="p-2">
                          <p className="text-xs truncate" title={file.file_name}>
                            {file.file_name}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteFile(file.id, file.file_path)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Work Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Resumen de Trabajos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe los trabajos realizados en el vehículo..."
                  value={workSummary}
                  onChange={(e) => setWorkSummary(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <Button 
                  onClick={saveWorkSummary} 
                  disabled={savingSummary}
                  className="w-full"
                >
                  {savingSummary ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Guardar Resumen
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Deposit Receipt */}
            <ViewDepositReceipt vehicle={vehicle} />

            {/* Owner Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Propietario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {vehicle.owner && canViewOwner ? (
                  <>
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
                    <Separator className="my-2" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/clients/${vehicle.owner_id}`)}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Ver historial del cliente
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span className="italic">Datos restringidos (solo admin)</span>
                  </div>
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
