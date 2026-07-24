import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Timer, Loader2, ChevronRight, Car } from 'lucide-react';
import { STATUS_LABELS, PRIORITY_LABELS, VehicleStatus, VehiclePriority } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ActiveRow {
  id: string;
  user_id: string;
  vehicle_id: string;
  started_at: string;
  user_name: string;
  plate: string;
  brand: string;
  model: string;
  status: VehicleStatus;
  priority: VehiclePriority | null;
}

const PRIORITY_COLORS: Record<VehiclePriority, string> = {
  urgente: 'bg-destructive text-destructive-foreground',
  alta: 'bg-orange-500 text-white',
  normal: 'bg-secondary text-secondary-foreground',
  baja: 'bg-muted text-muted-foreground',
};

function useTicker(intervalMs = 1000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

function formatElapsed(startedAt: string) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function ActiveWork() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { organizationId } = useOrganization();
  const [rows, setRows] = useState<ActiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<string>('all');

  useTicker(1000);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;

    const load = async () => {
      const { data: logs } = await supabase
        .from('time_logs')
        .select('id, user_id, vehicle_id, started_at')
        .eq('organization_id', organizationId)
        .is('ended_at', null)
        .order('started_at', { ascending: true });

      if (!logs || logs.length === 0) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      const userIds = [...new Set(logs.map((l) => l.user_id))];
      const vehicleIds = [...new Set(logs.map((l) => l.vehicle_id))];

      const [{ data: profiles }, { data: vehicles }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name').in('user_id', userIds),
        supabase
          .from('vehicles')
          .select('id, plate, brand, model, status, priority')
          .in('id', vehicleIds),
      ]);

      const profMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p.full_name]));
      const vehMap = new Map((vehicles ?? []).map((v: any) => [v.id, v]));

      const combined: ActiveRow[] = logs
        .map((l) => {
          const v: any = vehMap.get(l.vehicle_id);
          if (!v) return null;
          return {
            id: l.id,
            user_id: l.user_id,
            vehicle_id: l.vehicle_id,
            started_at: l.started_at,
            user_name: profMap.get(l.user_id) || 'Operario',
            plate: v.plate,
            brand: v.brand,
            model: v.model,
            status: v.status,
            priority: v.priority,
          };
        })
        .filter(Boolean) as ActiveRow[];

      if (!cancelled) {
        setRows(combined);
        setLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`active-work-${organizationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'time_logs' },
        () => load(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vehicles' },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const operators = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.user_id, r.user_name));
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filtered = useMemo(
    () => (userFilter === 'all' ? rows : rows.filter((r) => r.user_id === userFilter)),
    [rows, userFilter],
  );

  const canView = role === 'admin' || role === 'oficina';

  if (!canView) {
    return (
      <MainLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No tienes permisos para ver esta página.
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Timer className="h-6 w-6 text-primary" />
              Trabajo en curso
            </h1>
            <p className="text-sm text-muted-foreground">
              Vehículos con cronómetro activo ahora mismo · actualización en tiempo real
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {rows.length} activo{rows.length === 1 ? '' : 's'}
            </Badge>
            {operators.length > 1 && (
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos los operarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los operarios</SelectItem>
                  {operators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center space-y-2">
              <Car className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="font-medium">Ahora mismo no hay ningún cronómetro activo</p>
              <p className="text-sm text-muted-foreground">
                Cuando un operario inicie un vehículo aparecerá aquí automáticamente.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((r) => (
              <Card
                key={r.id}
                onClick={() => navigate(`/vehicles/${r.vehicle_id}`)}
                className="cursor-pointer hover:border-primary transition-colors"
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Timer className="h-5 w-5 animate-pulse" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg tracking-wide">{r.plate}</span>
                      <span className="text-sm text-muted-foreground truncate">
                        {r.brand} {r.model}
                      </span>
                      {r.priority && r.priority !== 'normal' && (
                        <Badge className={cn('text-xs', PRIORITY_COLORS[r.priority])}>
                          {PRIORITY_LABELS[r.priority]}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {STATUS_LABELS[r.status]}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium text-foreground">{r.user_name}</span>
                      {' · desde '}
                      {new Date(r.started_at).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-mono tabular-nums text-xl font-bold text-primary">
                      {formatElapsed(r.started_at)}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      en curso
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
