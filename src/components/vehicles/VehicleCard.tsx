import { useState, useEffect } from 'react';
import { VehicleWithOwner, Profile, ROLE_LABELS, UserRole, VehicleStatus } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { VehicleStatusBadge } from './VehicleStatusBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Car, User, Clock, Wrench, Lock, UserCheck, ArrowRight, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VehicleCardProps {
  vehicle: VehicleWithOwner;
  totalTime?: number;
  messagesCount?: number;
  showNextAction?: boolean;
  onStatusChange?: () => void;
}

const statusOrder: VehicleStatus[] = ['recibido', 'en_reparacion', 'pendiente_piezas', 'terminado', 'entregado'];

const nextStatusLabels: Record<VehicleStatus, string> = {
  recibido: 'Iniciar Reparación',
  en_reparacion: 'Pend. Piezas',
  pendiente_piezas: 'Terminado',
  terminado: 'Entregar',
  entregado: '',
};

export function VehicleCard({ vehicle, totalTime = 0, showNextAction = false, onStatusChange }: VehicleCardProps) {
  const navigate = useNavigate();
  const [assignedUser, setAssignedUser] = useState<(Profile & { role?: UserRole }) | null>(null);
  const [updating, setUpdating] = useState(false);

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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const nextStatus = getNextStatus(vehicle.status);

  return (
    <Card className="glass-card hover:shadow-elevated transition-all duration-200 cursor-pointer group"
          onClick={() => navigate(`/vehicles/${vehicle.id}`)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Car className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-base md:text-lg group-hover:text-primary transition-colors truncate">
                {vehicle.plate}
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                {vehicle.brand} {vehicle.model}
              </p>
            </div>
          </div>
          <VehicleStatusBadge status={vehicle.status} />
        </div>
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

        {/* Assigned user */}
        <div className="flex items-center gap-2 text-sm">
          <UserCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {assignedUser ? (
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-5 w-5">
                <AvatarImage src={assignedUser.avatar_url || undefined} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(assignedUser.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-xs">{assignedUser.full_name}</span>
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

        {/* Stats */}
        <div className="flex items-center gap-4 pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{formatTime(totalTime)}</span>
          </div>
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
