import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Clock, Wrench, AlertTriangle, Database } from 'lucide-react';
import { toast } from 'sonner';

interface RepairEstimate {
  min_hours: number;
  max_hours: number;
  difficulty: 'baja' | 'media' | 'alta';
  operations: string[];
  possible_complications: string[];
  confidence: 'baja' | 'media' | 'alta';
  notes: string;
}

interface Props {
  vehicleId: string;
  anomalyDescription: string;
  disabled?: boolean;
}

export function AIRepairEstimateButton({ vehicleId, anomalyDescription, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [estimate, setEstimate] = useState<RepairEstimate | null>(null);
  const [usedHistory, setUsedHistory] = useState(false);

  const handleEstimate = async () => {
    if (!anomalyDescription.trim()) {
      toast.error('Describe la anomalía primero');
      return;
    }
    setLoading(true);
    setEstimate(null);
    try {
      const { data, error } = await supabase.functions.invoke('estimate-repair-time', {
        body: { vehicle_id: vehicleId, anomaly_description: anomalyDescription.trim() },
      });
      if (error) {
        const msg = (error as { message?: string }).message || 'Error al estimar';
        toast.error(msg);
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setEstimate(data.estimate);
      setUsedHistory(!!data.used_workshop_history);
      setOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  };

  const difficultyColor = {
    baja: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
    media: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
    alta: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
  } as const;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleEstimate}
        disabled={disabled || loading || !anomalyDescription.trim()}
        title="Estimar tiempo con IA"
        className="border-primary/40 hover:bg-primary/10"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Estimación con IA
            </DialogTitle>
            <DialogDescription className="text-xs">
              Estimación orientativa. El tiempo real puede variar según el estado del vehículo.
            </DialogDescription>
          </DialogHeader>

          {estimate && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs mb-1">
                  <Clock className="h-3 w-3" /> Tiempo estimado
                </div>
                <div className="text-3xl font-bold">
                  {estimate.min_hours}h – {estimate.max_hours}h
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Dificultad:</span>
                  <Badge variant="outline" className={difficultyColor[estimate.difficulty]}>
                    {estimate.difficulty}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Confianza:</span>
                  <Badge variant="outline">{estimate.confidence}</Badge>
                </div>
              </div>

              {estimate.operations.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> Operaciones probables
                  </h4>
                  <ul className="space-y-1">
                    {estimate.operations.map((op, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{op}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {estimate.possible_complications.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" /> A vigilar
                  </h4>
                  <ul className="space-y-1">
                    {estimate.possible_complications.map((c, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-amber-500">⚠</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {estimate.notes && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                  {estimate.notes}
                </p>
              )}

              {usedHistory && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 rounded p-2">
                  <Database className="h-3 w-3 text-primary" />
                  Calibrado con el histórico real de tu taller
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
