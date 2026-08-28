import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { format, addWeeks, addMonths, addYears, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Printer, Loader2, CalendarDays } from 'lucide-react';
import {
  RegistroJornada, Periodo, rangoDelPeriodo, formatearDuracion, sumarMinutos,
  esFabricado, esCorregido, estaAbierto,
} from '@/lib/jornada';
import { RegistroImprimible } from './RegistroImprimible';

/**
 * El registro de jornada que ve el trabajador de si mismo.
 *
 * Hasta ahora solo podia ver el dia en curso, y el art. 34.9 ET exige que el
 * registro este a su disposicion. Aqui lo consulta por periodos y se lo lleva
 * impreso o en PDF.
 */
export function MiRegistroJornada() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { organization } = useOrganization();

  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [referencia, setReferencia] = useState(new Date());
  const [registros, setRegistros] = useState<RegistroJornada[]>([]);
  const [cargando, setCargando] = useState(true);

  const { desde, hasta } = rangoDelPeriodo(periodo, referencia);

  const cargar = useCallback(async () => {
    if (!user) return;
    setCargando(true);

    const { data } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('clock_in', desde.toISOString())
      .lte('clock_in', hasta.toISOString())
      .order('clock_in', { ascending: false });

    setRegistros((data ?? []) as unknown as RegistroJornada[]);
    setCargando(false);
  }, [user, desde.getTime(), hasta.getTime()]);

  useEffect(() => { cargar(); }, [cargar]);

  const desplazar = (pasos: number) => {
    const mover = periodo === 'semana' ? addWeeks : periodo === 'mes' ? addMonths : addYears;
    setReferencia((actual) => mover(actual, pasos));
  };

  const etiquetaPeriodo = () => {
    if (periodo === 'semana') {
      return `${format(desde, 'd MMM', { locale: es })} — ${format(hasta, 'd MMM yyyy', { locale: es })}`;
    }
    if (periodo === 'mes') return format(desde, 'MMMM yyyy', { locale: es });
    return format(desde, 'yyyy', { locale: es });
  };

  const total = sumarMinutos(registros);
  const fabricados = registros.filter(esFabricado).length;
  const abiertos = registros.filter(estaAbierto).length;

  return (
    <>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              {t('jornadaUI.mio.titulo')}
            </CardTitle>

            <div className="flex items-center gap-2">
              <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semana">{t('jornadaUI.periodo.semana')}</SelectItem>
                  <SelectItem value="mes">{t('jornadaUI.periodo.mes')}</SelectItem>
                  <SelectItem value="anio">{t('jornadaUI.periodo.anio')}</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => window.print()}
                disabled={cargando}
              >
                <Printer className="w-4 h-4 mr-2" />
                {t('jornadaUI.mio.descargar')}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => desplazar(-1)} aria-label={t('jornadaUI.mio.anterior')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium capitalize">{etiquetaPeriodo()}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => desplazar(1)}
              disabled={isFuture(hasta)}
              aria-label={t('jornadaUI.mio.siguiente')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Resumen etiqueta={t('jornadaUI.mio.totalHoras')} valor={formatearDuracion(total)} />
            <Resumen etiqueta={t('jornadaUI.mio.jornadas')} valor={String(registros.length)} />
            {abiertos > 0 && (
              <Resumen etiqueta={t('jornadaUI.mio.sinCerrar')} valor={String(abiertos)} alerta />
            )}
          </div>

          {fabricados > 0 && (
            <p className="text-xs text-muted-foreground border-l-2 border-amber-500 pl-3">
              {t('jornadaUI.mio.avisoFabricado', { count: fabricados })}
            </p>
          )}

          {cargando ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : registros.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t('jornadaUI.mio.sinRegistros')}
            </p>
          ) : (
            <div className="divide-y">
              {registros.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize">
                      {format(new Date(r.clock_in), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.clock_in), 'HH:mm')}
                      {' — '}
                      {r.clock_out ? format(new Date(r.clock_out), 'HH:mm') : t('jornadaUI.tabla.sinCerrar')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {esFabricado(r) && (
                      <Badge variant="outline" className="text-amber-600 border-amber-500">
                        {t('jornadaUI.origen.automatico')}
                      </Badge>
                    )}
                    {esCorregido(r) && (
                      <Badge variant="outline">{t('jornadaUI.origen.correccion')}</Badge>
                    )}
                    <span className="text-sm font-semibold tabular-nums">
                      {estaAbierto(r) ? '—' : formatearDuracion(r.total_minutes)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RegistroImprimible
        registros={registros}
        nombreTrabajador={profile?.full_name ?? user?.email ?? ''}
        nombreTaller={organization?.name ?? ''}
        desde={desde}
        hasta={hasta}
      />
    </>
  );
}

function Resumen({ etiqueta, valor, alerta }: { etiqueta: string; valor: string; alerta?: boolean }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className={`text-lg font-semibold tabular-nums ${alerta ? 'text-amber-600' : ''}`}>{valor}</p>
    </div>
  );
}
