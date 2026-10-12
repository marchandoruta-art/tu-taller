import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePropietarioPlataforma } from '@/hooks/usePropietarioPlataforma';
import {
  Building2, CheckCircle2, Clock, AlertTriangle, XCircle, ShieldAlert,
  Search, Loader2, Users, Car,
} from 'lucide-react';

interface Taller {
  id: string;
  nombre: string;
  slug: string;
  plan: string | null;
  estado_suscripcion: string;
  prueba_termina_en: string | null;
  suscripcion_termina_en: string | null;
  dado_de_baja_en: string | null;
  alta_en: string;
  correo_propietario: string | null;
  nombre_propietario: string | null;
  personas: number;
  vehiculos: number;
}

const ESTADOS: Record<string, { clave: string; clase: string; icono: typeof CheckCircle2 }> = {
  activa:         { clave: 'activa',        clase: 'text-green-600 border-green-600/30 bg-green-600/10',   icono: CheckCircle2 },
  prueba:         { clave: 'prueba',        clase: 'text-amber-600 border-amber-600/30 bg-amber-600/10',   icono: Clock },
  pago_pendiente: { clave: 'pagoPendiente', clase: 'text-red-600 border-red-600/30 bg-red-600/10',         icono: AlertTriangle },
  cancelada:      { clave: 'cancelada',     clase: 'text-muted-foreground border-border bg-muted',         icono: XCircle },
};

const FILTROS = ['todos', 'activa', 'prueba', 'pago_pendiente', 'cancelada'] as const;

/**
 * Lo que ve quien vende la aplicacion: todos los talleres a la vez.
 *
 * Ninguna otra pantalla de la aplicacion cruza la frontera del taller. Esta si,
 * y por eso los datos no vienen de una consulta normal sino de una funcion que
 * comprueba primero quien pregunta.
 */
export default function PanelPropietario() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { esPropietario, cargando: comprobandoPermiso } = usePropietarioPlataforma();

  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<string>('todos');

  useEffect(() => {
    if (!comprobandoPermiso && !esPropietario) navigate('/');
  }, [comprobandoPermiso, esPropietario, navigate]);

  const cargar = useCallback(async () => {
    const { data } = await supabase.rpc('panel_propietario_talleres' as never);
    setTalleres((data ?? []) as unknown as Taller[]);
    setCargando(false);
  }, []);

  useEffect(() => { if (esPropietario) cargar(); }, [esPropietario, cargar]);

  if (comprobandoPermiso || !esPropietario) return null;

  const vivos = talleres.filter((x) => !x.dado_de_baja_en);
  const diasPara = (iso: string | null) =>
    iso ? differenceInCalendarDays(new Date(iso), new Date()) : null;

  const pruebaCaducada = vivos.filter(
    (x) => x.estado_suscripcion === 'prueba' && (diasPara(x.prueba_termina_en) ?? 1) <= 0);
  const conIncidencia = vivos.filter((x) => x.estado_suscripcion === 'pago_pendiente');

  const resumen = [
    { clave: 'total',     valor: vivos.length, icono: Building2,    color: 'text-blue-600' },
    { clave: 'suscritos', valor: vivos.filter((x) => x.estado_suscripcion === 'activa').length, icono: CheckCircle2, color: 'text-green-600' },
    { clave: 'enPrueba',  valor: vivos.filter((x) => x.estado_suscripcion === 'prueba').length, icono: Clock, color: 'text-amber-600' },
    { clave: 'caducados', valor: pruebaCaducada.length, icono: ShieldAlert,  color: 'text-orange-600' },
    { clave: 'incidencias', valor: conIncidencia.length, icono: AlertTriangle, color: 'text-red-600' },
    { clave: 'bajas',     valor: talleres.filter((x) => x.dado_de_baja_en).length, icono: XCircle, color: 'text-muted-foreground' },
  ];

  const listados = talleres.filter((x) => {
    const texto = busqueda.trim().toLowerCase();
    const coincideTexto = !texto
      || x.nombre?.toLowerCase().includes(texto)
      || x.correo_propietario?.toLowerCase().includes(texto);
    const coincideFiltro = filtro === 'todos' || x.estado_suscripcion === filtro;
    return coincideTexto && coincideFiltro && (filtro === 'cancelada' || !x.dado_de_baja_en);
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('plataformaUI.titulo')}</h1>
          <p className="text-muted-foreground">{t('plataformaUI.subtitulo')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {resumen.map(({ clave, valor, icono: Icono, color }) => (
            <Card key={clave}>
              <CardContent className="p-4">
                <Icono className={`w-4 h-4 mb-2 ${color}`} />
                <p className="text-2xl font-bold tabular-nums">{valor}</p>
                <p className="text-xs text-muted-foreground">{t(`plataformaUI.resumen.${clave}`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {(pruebaCaducada.length > 0 || conIncidencia.length > 0) && (
          <Card className="border-red-600/30 bg-red-600/5">
            <CardContent className="p-4">
              <p className="font-semibold text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {t('plataformaUI.requiereAtencion')}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {[...conIncidencia, ...pruebaCaducada].map((x) => (
                  <li key={`${x.id}-aviso`} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{x.nombre}</span>
                    {' — '}
                    {t(x.estado_suscripcion === 'pago_pendiente'
                      ? 'plataformaUI.avisos.sinPagar'
                      : 'plataformaUI.avisos.pruebaAcabada')}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t('plataformaUI.buscar')}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {FILTROS.map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  filtro === f ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(`plataformaUI.filtros.${f === 'pago_pendiente' ? 'pagoPendiente' : f}`)}
              </button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {cargando ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : listados.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">
                {t('plataformaUI.sinResultados')}
              </p>
            ) : (
              <div className="divide-y">
                {listados.map((x) => {
                  const estado = ESTADOS[x.dado_de_baja_en ? 'cancelada' : x.estado_suscripcion] ?? ESTADOS.prueba;
                  const IconoEstado = estado.icono;
                  const vence = x.estado_suscripcion === 'activa' ? x.suscripcion_termina_en : x.prueba_termina_en;
                  const dias = diasPara(vence);

                  return (
                    <div key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                      <div className="min-w-[180px] flex-1">
                        <p className="font-medium">{x.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {x.nombre_propietario || '—'}
                          {x.correo_propietario ? ` · ${x.correo_propietario}` : ''}
                        </p>
                      </div>

                      <Badge variant="outline" className={`gap-1.5 ${estado.clase}`}>
                        <IconoEstado className="w-3 h-3" />
                        {t(`plataformaUI.estados.${estado.clave}`)}
                      </Badge>

                      <div className="text-xs text-muted-foreground min-w-[120px]">
                        {vence
                          ? t(dias !== null && dias < 0 ? 'plataformaUI.vencio' : 'plataformaUI.vence', {
                              fecha: format(new Date(vence), 'd MMM yyyy', { locale: es }),
                            })
                          : '—'}
                      </div>

                      <div className="flex items-center gap-4 text-sm tabular-nums">
                        <span className="flex items-center gap-1.5" title={t('plataformaUI.personas')}>
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />{x.personas}
                        </span>
                        <span className="flex items-center gap-1.5" title={t('plataformaUI.vehiculos')}>
                          <Car className="w-3.5 h-3.5 text-muted-foreground" />{x.vehiculos}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {t('plataformaUI.alta', {
                          fecha: format(new Date(x.alta_en), 'd MMM yyyy', { locale: es }),
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
