import { useState, useEffect } from 'react';
import { VehicleWithOwner, Profile, ROLE_LABELS, UserRole, VehicleStatus, VehiclePriority } from '@/lib/types';
import { PriorityBadge } from './PrioritySelector';
import { useWhatsAppMessage } from '@/hooks/useWhatsAppMessage';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { VehicleStatusBadge } from './VehicleStatusBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Car, User, Clock, Wrench, Lock, UserCheck, ArrowRight, ChevronRight, Trash2, MessageCircle, AlertTriangle, Gauge, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { deleteVehiclePermanently } from '@/lib/deleteVehicle';

interface VehicleCardProps {
  vehicle: VehicleWithOwner;
  totalTime?: number;
  messagesCount?: number;
  showNextAction?: boolean;
  onStatusChange?: () => void;
}

const statusOrder: VehicleStatus[] = ['recibido', 'presupuestar', 'presupuestado', 'en_reparacion', 'pendiente_piezas', 'terminado', 'facturado', 'entregado'];

const nextStatusLabels: Record<VehicleStatus, string> = {
  recibido: 'A Presupuestar',
  presupuestar: 'Marcar Presupuestado',
  presupuestado: 'Iniciar Reparación',
  en_reparacion: 'Pend. Piezas',
  pendiente_piezas: 'Terminado',
  terminado: 'Facturar',
  facturado: 'Entregar',
  entregado: '',
};

export function VehicleCard({ vehicle, totalTime = 0, showNextAction = false, onStatusChange }: VehicleCardProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { openWhatsApp } = useWhatsAppMessage();
  const [assignedUser, setAssignedUser] = useState<(Profile & { role?: UserRole }) | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [confirmPlate, setConfirmPlate] = useState('');
  const [deleting, setDeleting] = useState(false);
  const isAdmin = role === 'admin';

  useEffect(() => {
    if (vehicle.assigned_to) {
      fetchAssignedUser();
    }
  }, [vehicle.assigned_to]);

  const fetchAssignedUser = async () => {
    if (!vehicle.assigned_to) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', vehicle.assigned_to)
      .maybeSingle();
    
    if (profile) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', vehicle.assigned_to)
        .maybeSingle();
      
      setAssignedUser({ ...profile, role: roleData?.role as UserRole | undefined });
    }
  };

  const getNextStatus = (current: VehicleStatus): VehicleStatus | null => {
    const currentIndex = statusOrder.indexOf(current);
    if (currentIndex < statusOrder.length - 1) {
      return statusOrder[currentIndex + 1];
    }
    return null;
  };

  const handleNextStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = getNextStatus(vehicle.status);
    if (!nextStatus) return;

    setUpdating(true);
    const { error } = await supabase
      .from('vehicles')
      .update({ status: nextStatus })
      .eq('id', vehicle.id);

    if (error) {
      toast.error('Error al actualizar estado');
    } else {
      toast.success(`Vehículo movido a "${nextStatusLabels[vehicle.status] || nextStatus}"`);
      onStatusChange?.();
    }
    setUpdating(false);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatFinishedDate = (date?: string) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const nextStatus = getNextStatus(vehicle.status);
  const isUrgent = (vehicle.priority as VehiclePriority) === 'urgente';

  return (
    <Card
      className={`glass-card hover:shadow-elevated transition-all duration-200 cursor-pointer group ${
        isUrgent
          ? 'bg-red-500/15 dark:bg-red-500/20 border-red-500/60 ring-1 ring-red-500/40 animate-pulse-slow'
          : ''
      }`}
      onClick={() => navigate(`/vehicles/${vehicle.id}`)}
    >
      <CardHeader className="pb-3 space-y-2">
        <div className="min-w-0 w-full">
          <h3 className="font-bold text-sm md:text-base xl:text-lg tracking-wider leading-none group-hover:text-primary transition-colors whitespace-nowrap break-all">
            {vehicle.plate}
          </h3>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <VehicleStatusBadge status={vehicle.status} />
          <PriorityBadge value={(vehicle.priority as VehiclePriority) || 'normal'} />
        </div>
        <p className="text-xs md:text-sm text-muted-foreground truncate">
          {vehicle.brand} {vehicle.model}
        </p>
        {(vehicle.status === 'terminado' || vehicle.status === 'facturado' || vehicle.status === 'entregado') && vehicle.finished_at && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-md px-2 py-1 -mx-1">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium">Terminado el {formatFinishedDate(vehicle.finished_at)}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Owner info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {vehicle.owner ? (
            <>
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{vehicle.owner.name}</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span className="italic text-xs">Datos restringidos</span>
            </>
          )}
        </div>

        {/* Kilometers info - destacar si falta */}
        <div className={`flex items-center gap-2 text-sm rounded-lg p-1.5 -mx-1.5 ${
          vehicle.mileage
            ? 'text-muted-foreground'
            : 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400'
        }`}>
          <Gauge className="w-4 h-4 flex-shrink-0" />
          {vehicle.mileage ? (
            <span className="text-xs font-medium">{vehicle.mileage.toLocaleString('es-ES')} km</span>
          ) : (
            <span className="text-xs font-medium">⚠️ Falta indicar km</span>
          )}
        </div>

        {/* Assigned user - highlighted */}
        <div className={`flex items-center gap-2 text-sm rounded-lg p-1.5 -mx-1.5 ${assignedUser ? 'bg-primary/10 border border-primary/20' : ''}`}>
          <UserCheck className={`w-4 h-4 flex-shrink-0 ${assignedUser ? 'text-primary' : 'text-muted-foreground'}`} />
          {assignedUser ? (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-5 w-5">
                <AvatarImage src={assignedUser.avatar_url || undefined} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(assignedUser.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-xs font-medium text-primary">{assignedUser.full_name}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Sin asignar</span>
          )}
        </div>

        {/* Client description preview */}
        {vehicle.client_description && (
          <div className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded-lg">
            <Wrench className="w-3 h-3 inline mr-1" />
            {vehicle.client_description}
          </div>
        )}

        {/* WhatsApp button for finished vehicles */}
        {(vehicle.status === 'terminado' || vehicle.status === 'facturado') && vehicle.owner?.phone && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-2 border-green-500/30 text-green-600 hover:bg-green-500/10 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
            onClick={(e) => {
              e.stopPropagation();
              openWhatsApp(vehicle.owner!.phone!, vehicle);
            }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Avisar por WhatsApp
          </Button>
        )}

        {/* Stats and Delete Button */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{formatTime(totalTime)}</span>
          </div>
          {isAdmin && (
            <AlertDialog
              open={deleteOpen}
              onOpenChange={(open) => {
                setDeleteOpen(open);
                if (!open) {
                  setDeleteStep(1);
                  setConfirmPlate('');
                }
              }}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                {deleteStep === 1 ? (
                  <>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Paso 1 de 2 · ¿Eliminar vehículo?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Vas a eliminar permanentemente el vehículo <strong>{vehicle.plate}</strong> ({vehicle.brand} {vehicle.model}) y toda su información asociada (recambios, tiempos, fotos, mensajes...).
                        <br /><br />
                        Esta acción no se puede deshacer. En el siguiente paso tendrás que escribir la matrícula para confirmar.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                      <Button
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteStep(2);
                        }}
                      >
                        Continuar
                      </Button>
                    </AlertDialogFooter>
                  </>
                ) : (
                  <>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Paso 2 de 2 · Confirmación final
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Escribe la matrícula <strong>{vehicle.plate}</strong> para confirmar el borrado definitivo.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-2">
                      <Label htmlFor={`confirm-plate-${vehicle.id}`}>Matrícula</Label>
                      <Input
                        id={`confirm-plate-${vehicle.id}`}
                        value={confirmPlate}
                        onChange={(e) => setConfirmPlate(e.target.value.toUpperCase())}
                        placeholder={vehicle.plate}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                      <Button
                        variant="destructive"
                        disabled={confirmPlate.trim().toUpperCase() !== vehicle.plate.toUpperCase() || deleting}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setDeleting(true);
                          const { error } = await deleteVehiclePermanently(vehicle.id);
                          setDeleting(false);
                          if (error) {
                            toast.error('Error al eliminar el vehículo');
                          } else {
                            toast.success(`Vehículo ${vehicle.plate} eliminado`);
                            setDeleteOpen(false);
                            setDeleteStep(1);
                            setConfirmPlate('');
                            onStatusChange?.();
                          }
                        }}
                      >
                        {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
                      </Button>
                    </AlertDialogFooter>
                  </>
                )}
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Next status action button */}
        {showNextAction && nextStatus && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={handleNextStatus}
            disabled={updating}
          >
            {updating ? (
              'Actualizando...'
            ) : (
              <>
                {nextStatusLabels[vehicle.status]}
                <ChevronRight className="w-3 h-3 ml-1" />
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
