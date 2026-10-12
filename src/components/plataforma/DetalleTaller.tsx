import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, Car, CalendarCheck, Clock, Mail } from 'lucide-react';

interface Detalle {
  nombre: string;
  slug: string;
  alta_en: string;
  estado_suscripcion: string;
  plan: string | null;
  prueba_termina_en: string | null;
  suscripcion_termina_en: string | null;
  dado_de_baja_en: string | null;
  contacto_nombre: string | null;
  contacto_correo: string | null;
  personas_por_rol: Record<string, number>;
  personas_total: number;
  vehiculos_total: number;
  vehiculos_activos: number;
  citas_total: number;
  ultimo_acceso: string | null;
}

interface Props {
  tallerId: string | null;
  onCerrar: () => void;
  onCambio: () => void;
}

const PLANES = ['basico', 'profesional', 'pro'] as const;

/**
 * Lo que el dueno de la aplicacion puede saber de un taller cliente.
 *
 * Metricas y gestion de la suscripcion. Nada del contenido: ni sus vehiculos,
 * ni sus clientes, ni los nombres de su plantilla. Del personal solo se dice
 * cuantos hay de cada rol.
 */
export function DetalleTaller({ tallerId, onCerrar, onCambio }: Props) {
  const { t } = useTranslation();
  const [d, setD] = useState<Detalle | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!tallerId) return;
    setCargando(true);
    const { data, error } = await supabase.rpc('panel_propietario_detalle' as never, { _taller: tallerId } as never);
    if (error) toast.error(t('plataformaUI.detalle.errorCargar'), { description: error.message });
    setD(((data as unknown as Detalle[]) ?? [])[0] ?? null);
    setCargando(false);
  }, [tallerId, t]);

  useEffect(() => { if (tallerId) cargar(); else setD(null); }, [tallerId, cargar]);

  // El constructor de consultas de Supabase se puede esperar con await, pero no
  // esta declarado como Promise. PromiseLike es lo que realmente cumple.
  const ejecutar = async (fn: () => PromiseLike<{ error: unknown }>, aviso: string) => {
    setGuardando(true);
    const { error } = await fn();
    setGuardando(false);
    if (error) {
      toast.error(t('plataformaUI.detalle.errorGuardar'), {
        description: (error as { message?: string }).message,
      });
      return;
    }
    toast.success(aviso);
    await cargar();
    onCambio();
  };

  const cambiarEstado = (estado: string, hasta?: Date) =>
    ejecutar(
      () => supabase.rpc('panel_propietario_cambiar_estado' as never, {
        _taller: tallerId, _estado: estado, _hasta: hasta?.toISOString() ?? null,
      } as never),
      t('plataformaUI.detalle.guardado'));

  const cambiarPlan = (plan: string) =>
    ejecutar(
      () => supabase.rpc('panel_propietario_cambiar_plan' as never, {
        _taller: tallerId, _plan: plan,
      } as never),
      t('plataformaUI.detalle.guardado'));

  const enMeses = (n: number) => {
    const f = new Date();
    f.setMonth(f.getMonth() + n);
    return f;
  };
  const enDias = (n: number) => {
    const f = new Date();
    f.setDate(f.getDate() + n);
    return f;
  };

  const fecha = (iso: string | null) =>
    iso ? format(new Date(iso), 'd MMM yyyy', { locale: es }) : '—';

  return (
    <Sheet open={!!tallerId} onOpenChange={(abierto) => { if (!abierto) onCerrar(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {cargando || !d ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{d.nombre}</SheetTitle>
              <SheetDescription>
                {t('plataformaUI.detalle.clienteDesde', { fecha: fecha(d.alta_en) })}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('plataformaUI.detalle.contacto')}
                </h3>
                <p className="text-sm font-medium">{d.contacto_nombre || '—'}</p>
                {d.contacto_correo && (
                  <a href={`mailto:${d.contacto_correo}`}
                     className="text-sm text-primary hover:underline flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />{d.contacto_correo}
                  </a>
                )}
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('plataformaUI.detalle.uso')}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Metrica icono={Users} etiqueta={t('plataformaUI.personas')} valor={d.personas_total} />
                  <Metrica icono={Car} etiqueta={t('plataformaUI.detalle.vehiculosActivos')}
                           valor={`${d.vehiculos_activos} / ${d.vehiculos_total}`} />
                  <Metrica icono={CalendarCheck} etiqueta={t('plataformaUI.detalle.citas')} valor={d.citas_total} />
                  <Metrica icono={Clock} etiqueta={t('plataformaUI.detalle.ultimoAcceso')}
                           valor={fecha(d.ultimo_acceso)} />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(d.personas_por_rol ?? {}).map(([rol, n]) => (
                    <Badge key={rol} variant="secondary" className="font-normal">
                      {n} {t(`role.${rol}`, { defaultValue: rol })}
                    </Badge>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  {t('plataformaUI.detalle.sinContenido')}
                </p>
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('plataformaUI.detalle.suscripcion')}
                </h3>

                <dl className="text-sm space-y-1.5">
                  <Fila etiqueta={t('plataformaUI.detalle.estado')}
                        valor={t(`plataformaUI.estados.${
                          d.estado_suscripcion === 'pago_pendiente' ? 'pagoPendiente' : d.estado_suscripcion}`)} />
                  <Fila etiqueta={t('plataformaUI.detalle.renueva')} valor={fecha(d.suscripcion_termina_en)} />
                  <Fila etiqueta={t('plataformaUI.detalle.pruebaHasta')} valor={fecha(d.prueba_termina_en)} />
                </dl>

                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">{t('plataformaUI.detalle.plan')}</p>
                  <Select value={d.plan ?? ''} onValueChange={cambiarPlan} disabled={guardando}>
                    <SelectTrigger><SelectValue placeholder={t('plataformaUI.detalle.sinPlan')} /></SelectTrigger>
                    <SelectContent>
                      {PLANES.map((p) => (
                        <SelectItem key={p} value={p}>{t(`plataformaUI.planes.${p}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('plataformaUI.detalle.acciones')}
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="default" disabled={guardando}
                          onClick={() => cambiarEstado('activa', enMeses(1))}>
                    {t('plataformaUI.detalle.pagoMes')}
                  </Button>
                  <Button variant="outline" disabled={guardando}
                          onClick={() => cambiarEstado('activa', enMeses(12))}>
                    {t('plataformaUI.detalle.pagoAnio')}
                  </Button>
                  <Button variant="outline" disabled={guardando}
                          onClick={() => cambiarEstado('prueba', enDias(7))}>
                    {t('plataformaUI.detalle.alargarPrueba')}
                  </Button>
                  <Button variant="outline" disabled={guardando}
                          onClick={() => cambiarEstado('pago_pendiente')}>
                    {t('plataformaUI.detalle.marcarImpago')}
                  </Button>
                  <Button variant="destructive" className="col-span-2" disabled={guardando}
                          onClick={() => cambiarEstado('cancelada')}>
                    {t('plataformaUI.detalle.darDeBaja')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('plataformaUI.detalle.avisoBaja')}
                </p>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Metrica({ icono: Icono, etiqueta, valor }: {
  icono: typeof Users; etiqueta: string; valor: string | number;
}) {
  return (
    <div className="rounded-lg border p-3">
      <Icono className="w-3.5 h-3.5 text-muted-foreground mb-1.5" />
      <p className="text-lg font-semibold tabular-nums leading-tight">{valor}</p>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}
