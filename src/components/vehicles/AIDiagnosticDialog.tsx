import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, Loader2, Wrench, AlertTriangle, ListChecks, Package, ShieldAlert, Cpu } from 'lucide-react';
import { toast } from 'sonner';

interface ProbableCause {
  cause: string;
  probability: 'alta' | 'media' | 'baja';
  why: string;
}

interface Diagnostic {
  summary: string;
  probable_causes: ProbableCause[];
  diagnostic_steps: string[];
  required_tools?: string[];
  parts_likely_needed?: string[];
  dtc_codes_to_check?: string[];
  safety_warnings?: string[];
  confidence: 'baja' | 'media' | 'alta';
  notes?: string;
}

interface Props {
  vehicleId: string;
  initialSymptoms?: string;
  triggerClassName?: string;
}

const probColor = {
  alta: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
  media: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
  baja: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
} as const;

export function AIDiagnosticDialog({ vehicleId, initialSymptoms = '', triggerClassName }: Props) {
  const [open, setOpen] = useState(false);
  const [symptoms, setSymptoms] = useState(initialSymptoms);
  const [extra, setExtra] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Diagnostic | null>(null);

  const run = async () => {
    if (!symptoms.trim()) {
      toast.error('Describe primero los síntomas');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-diagnostic', {
        body: {
          vehicle_id: vehicleId,
          symptoms: symptoms.trim(),
          extra_context: extra.trim() || undefined,
        },
      });
      if (error) {
        toast.error((error as { message?: string }).message || 'Error al diagnosticar');
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setResult(data.diagnostic as Diagnostic);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setResult(null); } }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className={triggerClassName}>
          <Stethoscope className="h-4 w-4 mr-2 text-primary" />
          Asistente de diagnóstico
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Asistente de diagnóstico IA
          </DialogTitle>
          <DialogDescription className="text-xs">
            Describe los síntomas y la IA propondrá causas probables, pasos de inspección y piezas candidatas. Orientativo, no sustituye al criterio del técnico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
              Síntomas
            </label>
            <Textarea
              placeholder="Ej: al frenar en frío hay chirrido metálico en el eje delantero derecho, desaparece tras 5 min conduciendo…"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={4}
              maxLength={2000}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">
              Contexto adicional (opcional)
            </label>
            <Textarea
              placeholder="Últimas intervenciones, códigos DTC leídos, cuándo aparece, condiciones…"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </div>
          <Button onClick={run} disabled={loading || !symptoms.trim()} className="w-full">
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analizando…</>
            ) : (
              <><Stethoscope className="h-4 w-4 mr-2" /> Diagnosticar</>
            )}
          </Button>
        </div>

        {result && (
          <div className="space-y-4 pt-2 border-t">
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Resumen</span>
                <Badge variant="outline">Confianza: {result.confidence}</Badge>
              </div>
              <p className="text-sm">{result.summary}</p>
            </div>

            {result.probable_causes?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Causas probables
                </h4>
                <div className="space-y-2">
                  {result.probable_causes.map((c, i) => (
                    <div key={i} className="rounded border p-2 bg-background">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-medium">{c.cause}</span>
                        <Badge variant="outline" className={probColor[c.probability]}>{c.probability}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.why}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.diagnostic_steps?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <ListChecks className="h-3 w-3" /> Pasos de inspección
                </h4>
                <ol className="space-y-1 text-sm list-decimal list-inside">
                  {result.diagnostic_steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {result.required_tools && result.required_tools.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> Herramientas
                  </h4>
                  <ul className="text-sm space-y-1">
                    {result.required_tools.map((t, i) => <li key={i}>• {t}</li>)}
                  </ul>
                </div>
              )}
              {result.parts_likely_needed && result.parts_likely_needed.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                    <Package className="h-3 w-3" /> Piezas candidatas
                  </h4>
                  <ul className="text-sm space-y-1">
                    {result.parts_likely_needed.map((p, i) => <li key={i}>• {p}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {result.dtc_codes_to_check && result.dtc_codes_to_check.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <Cpu className="h-3 w-3" /> Códigos DTC a comprobar
                </h4>
                <div className="flex flex-wrap gap-1">
                  {result.dtc_codes_to_check.map((d, i) => (
                    <Badge key={i} variant="outline" className="font-mono">{d}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.safety_warnings && result.safety_warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <h4 className="text-xs font-semibold uppercase mb-2 flex items-center gap-1 text-amber-700 dark:text-amber-300">
                  <ShieldAlert className="h-3 w-3" /> Seguridad
                </h4>
                <ul className="text-sm space-y-1">
                  {result.safety_warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
                </ul>
              </div>
            )}

            {result.notes && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                {result.notes}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
