import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSuscripcion } from '@/hooks/useSuscripcion';
import { useAuth } from '@/hooks/useAuth';
import { puedeGestionar } from '@/lib/permisos';
import { Loader2, Check, CreditCard, ExternalLink } from 'lucide-react';

interface PlanContratable {
  codigo: string;
  nombre: string;
  precio_mensual: number;
  precio_anual: number | null;
  orden: number;
  se_puede_pagar: boolean;
  es_el_mio: boolean;
}

type Intervalo = 'mensual' | 'anual';

/**
 * Contratar o cambiar de plan.
 *
 * Esta pantalla no marca a nadie como pagado: solo manda al cliente a Stripe.
 * Quien cambia el estado es el webhook, cuando Stripe confirma que el dinero
 * ha entrado de verdad.
 */
export default function Planes() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const { suscripcion, recargar } = useSuscripcion();
  const [parametros, setParametros] = useSearchParams();

  const [planes, setPlanes] = useState<PlanContratable[]>([]);
  const [intervalo, setIntervalo] = useState<Intervalo>('mensual');
  const [cargando, setCargando] = useState(true);
  const [yendoAPagar, setYendoAPagar] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc('planes_para_contratar' as never);
    setPlanes((data ?? []) as unknown as PlanContratable[]);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Vuelta desde Stripe. El estado lo cambia el webhook, no esto: aqui solo se
  // avisa y se recarga, porque el aviso puede llegar con unos segundos de
  // retraso.
  useEffect(() => {
    const pago = parametros.get('pago');
    if (!pago) return;
    if (pago === 'hecho') {
      toast.success(t('planesUI.pagoHecho'), { description: t('planesUI.pagoHechoDetalle') });
      setTimeout(() => { recargar(); cargar(); }, 2500);
    } else {
      toast.info(t('planesUI.pagoCancelado'));
    }
    parametros.delete('pago');
    setParametros(parametros, { replace: true });
  }, [parametros, setParametros, t, recargar, cargar]);

  const irAPagar = async (codigo: string) => {
    setYendoAPagar(codigo);
    const { data, error } = await supabase.functions.invoke('pago-crear-sesion', {
      body: { plan: codigo, intervalo },
    });
    setYendoAPagar(null);

    if (error || !data?.url) {
      toast.error(t('planesUI.errorPago'), { description: data?.error ?? error?.message });
      return;
    }
    window.location.href = data.url;
  };

  const abrirPortal = async () => {
    const { data, error } = await supabase.functions.invoke('pago-portal');
    if (error || !data?.url) {
      toast.error(t('planesUI.errorPortal'), { description: data?.error ?? error?.message });
      return;
    }
    window.location.href = data.url;
  };

  const puedeContratar = puedeGestionar(role);

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold">{t('planesUI.titulo')}</h1>
          <p className="text-muted-foreground">{t('planesUI.subtitulo')}</p>
        </div>

        {suscripcion && (
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <p className="font-medium">
                  {t('planesUI.tuPlan', { plan: suscripcion.plan_nombre ?? '—' })}
                  {suscripcion.estado === 'prueba' && (
                    <Badge variant="outline" className="ml-2">{t('planesUI.enPrueba')}</Badge>
                  )}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {suscripcion.estado === 'prueba' && suscripcion.prueba_termina_en
                    ? t('planesUI.pruebaHasta', {
                        fecha: format(new Date(suscripcion.prueba_termina_en), "d 'de' MMMM", { locale: es }) })
                    : suscripcion.suscripcion_termina_en
                      ? t('planesUI.renuevaEl', {
                          fecha: format(new Date(suscripcion.suscripcion_termina_en), "d 'de' MMMM yyyy", { locale: es }) })
                      : t('planesUI.sinRenovacion')}
                </p>
              </div>
              {puedeContratar && (
                <Button variant="outline" size="sm" onClick={abrirPortal}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  {t('planesUI.gestionar')}
                  <ExternalLink className="w-3 h-3 ml-1.5" />
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center">
          <div className="inline-flex rounded-lg bg-muted p-1">
            {(['mensual', 'anual'] as const).map((i) => (
              <button
                key={i}
                onClick={() => setIntervalo(i)}
                className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                  intervalo === i ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'
                }`}
              >
                {t(`planesUI.${i}`)}
                {i === 'anual' && (
                  <span className="ml-1.5 text-xs text-green-600 font-medium">
                    {t('planesUI.dosMesesGratis')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {cargando ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {planes.map((p) => {
              const precio = intervalo === 'anual' ? p.precio_anual : p.precio_mensual;
              return (
                <Card key={p.codigo} className={p.es_el_mio ? 'border-primary' : undefined}>
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold">{p.nombre}</h2>
                        {p.es_el_mio && (
                          <Badge variant="secondary" className="text-xs">
                            {t('planesUI.actual')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-3xl font-bold tabular-nums mt-2">
                        {Number(precio ?? 0).toFixed(2).replace('.', ',')} €
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                          {t(intervalo === 'anual' ? 'planesUI.alAnio' : 'planesUI.alMes')}
                        </span>
                      </p>
                    </div>

                    {p.es_el_mio ? (
                      <Button variant="outline" className="w-full" disabled>
                        <Check className="w-4 h-4 mr-2" />
                        {t('planesUI.esTuPlan')}
                      </Button>
                    ) : Number(p.precio_mensual) === 0 ? (
                      <p className="text-xs text-muted-foreground">{t('planesUI.gratisNota')}</p>
                    ) : !p.se_puede_pagar ? (
                      <Button variant="outline" className="w-full" disabled>
                        {t('planesUI.sinConfigurar')}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        disabled={!puedeContratar || yendoAPagar === p.codigo}
                        onClick={() => irAPagar(p.codigo)}
                      >
                        {yendoAPagar === p.codigo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t('planesUI.contratar')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!puedeContratar && (
          <p className="text-sm text-muted-foreground text-center">
            {t('planesUI.soloDireccion')}
          </p>
        )}
      </div>
    </MainLayout>
  );
}
