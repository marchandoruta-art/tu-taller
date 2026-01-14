import { VehicleWithOwner } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { VehicleStatusBadge } from './VehicleStatusBadge';
import { Car, User, Clock, MessageSquare, Wrench, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VehicleCardProps {
  vehicle: VehicleWithOwner;
  totalTime?: number;
  messagesCount?: number;
}

export function VehicleCard({ vehicle, totalTime = 0, messagesCount = 0 }: VehicleCardProps) {
  const navigate = useNavigate();

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Card className="glass-card hover:shadow-elevated transition-all duration-200 cursor-pointer group"
          onClick={() => navigate(`/vehicles/${vehicle.id}`)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                {vehicle.plate}
              </h3>
              <p className="text-sm text-muted-foreground">
                {vehicle.brand} {vehicle.model}
              </p>
            </div>
          </div>
          <VehicleStatusBadge status={vehicle.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Owner info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {vehicle.owner ? (
            <>
              <User className="w-4 h-4" />
              <span>{vehicle.owner.name}</span>
              {vehicle.owner.phone && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {vehicle.owner.phone}
                </span>
              )}
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span className="italic">Datos restringidos</span>
            </>
          )}
        </div>

        {/* Client description preview */}
        {vehicle.client_description && (
          <div className="text-sm text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded-lg">
            <Wrench className="w-3.5 h-3.5 inline mr-1.5" />
            {vehicle.client_description}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 pt-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(totalTime)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            <span>{messagesCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
