import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle, ArrowRight, Printer, CheckCircle2, Wrench } from 'lucide-react';

interface Config {
  nombre: string;
  logo_url: string | null;
  servicios: string[];
  avisos: string[];
  duracion_min: number;
}
interface Hueco { dia: string; hora: string; libres: number; }
interface Resguardo { id: string; token: string; taller: string; dia: string; hora: string; }

const DOCUMENTOS = ['DNI', 'NIE', 'Pasaporte', 'CIF'];

/**
 * Pedir cita sin tener cuenta. El taller pasa el enlace con su slug y el
 * cliente rellena desde el movil.
 *
 * Vive fuera de MainLayout a proposito: aqui no hay sesion, ni menu, ni nada
 * de la aplicacion interna. Las tres llamadas van contra funciones publicas
 * que resuelven el taller por el slug.
 */
export default function CitaPublica() {
  const { slug = '' } = useParams();
  const { t } = useTranslation();

  const [config, setConfig] = useState<Config | null>(null);
  const [cargando, setCargando] = useState(true);
  const [paso, setPaso] = useState<'avisos' | 'formulario' | 'hecho'>('avisos');
  const [huecos, setHuecos] = useState<Hueco[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resguardo, setResguardo] = useState<Resguardo | null>(null);

  const [f, setF] = useState({
    nombre: '', apellidos: '', telefono: '', email: '',
    docTipo: 'DNI', docNumero: '',
    marca: '', modelo: '', anio: '', matricula: '',
    servicios: [] as string[], detalle: '',
    dia: '', hora: '', acepta: false, firma: '',
    // Trampa para robots: un humano nunca la rellena porque no la ve.
    web: '',
  });
  const set = (k: keyof typeof f, v: unknown) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('cita_publica_config' as never, { _slug: slug } as never);
      setConfig(((data as unknown as Config[]) ?? [])[0] ?? null);
      setCargando(false);
    })();
  }, [slug]);

  const cargarHuecos = useCallback(async () => {
    const { data } = await supabase.rpc('cita_publica_huecos' as never,
      { _slug: slug, _dias: 21 } as never);
    setHuecos((data as unknown as Hueco[]) ?? []);
  }, [slug]);

  useEffect(() => { if (paso === 'formulario') cargarHuecos(); }, [paso, cargarHuecos]);

  const porDia = useMemo(() => {
    const m = new Map<string, Hueco[]>();
    for (const h of huecos) {
      if (!m.has(h.dia)) m.set(h.dia, []);
      m.get(h.dia)!.push(h);
    }
    return [...m.entries()];
  }, [huecos]);

  const nombreCompleto = `${f.nombre.trim()} ${f.apellidos.trim()}`.trim();
  const firmaOk = f.firma.trim().toLowerCase() === nombreCompleto.toLowerCase() && nombreCompleto.length > 3;
  const completo = f.nombre.trim().length >= 2 && f.apellidos.trim().length >= 2
    && f.telefono.trim().length >= 6 && f.matricula.trim().length >= 4
    && f.servicios.length > 0 && f.dia && f.hora && f.acepta && firmaOk;

  const enviar = async () => {
    if (f.web) return;                       // robot
    setEnviando(true); setError(null);
    const { data, error: err } = await supabase.rpc('cita_publica_solicitar' as never, {
      _slug: slug, _nombre: f.nombre, _apellidos: f.apellidos, _telefono: f.telefono,
      _email: f.email, _doc_tipo: f.docTipo, _doc_numero: f.docNumero,
      _marca: f.marca, _modelo: f.modelo, _anio: f.anio ? Number(f.anio) : null,
      _matricula: f.matricula, _servicios: f.servicios, _detalle: f.detalle,
      _dia: f.dia, _hora: f.hora, _firma: f.firma,
    } as never);
    setEnviando(false);

    if (err) {
      setError(err.message);
      cargarHuecos();                        // puede que el hueco se ocupara
      return;
    }
    setResguardo(((data as unknown as Resguardo[]) ?? [])[0] ?? null);
    setPaso('hecho');
  };

  if (cargando) {
    return <Centro><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></Centro>;
  }

  if (!config) {
    return (
      <Centro>
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-500 mb-3" />
          <h1 className="text-lg font-semibold">{t('citaUI.noDisponible')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('citaUI.noDisponibleAyuda')}</p>
        </div>
      </Centro>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {config.logo_url
            ? <img src={config.logo_url} alt="" className="h-9 w-auto" />
            : <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <Wrench className="h-5 w-5 text-primary-foreground" />
              </div>}
          <span className="font-bold">{config.nombre}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 pb-20">
        {paso === 'avisos' && (
          <section className="space-y-6">
            <div className="text-center">
              <AlertTriangle className="w-9 h-9 mx-auto text-amber-500 mb-3" />
              <h1 className="text-xl font-bold">{t('citaUI.antesDeNada')}</h1>
              <p className="text-sm text-muted-foreground">{t('citaUI.leeAvisos')}</p>
            </div>
            <ol className="space-y-3">
              {config.avisos.map((aviso, i) => (
                <li key={i} className="flex gap-3 rounded-lg border p-4">
                  <span className="font-bold text-primary tabular-nums">{i + 1}.</span>
                  <span className="text-sm">{aviso}</span>
                </li>
              ))}
            </ol>
            <Button className="w-full" size="lg" onClick={() => setPaso('formulario')}>
              {t('citaUI.entendido')} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </section>
        )}

        {paso === 'formulario' && (
          <section className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold">{t('citaUI.solicitaCita')}</h1>
              <p className="text-sm text-muted-foreground">{t('citaUI.completaDatos')}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Campo id="nombre" etiqueta={t('citaUI.nombre')} valor={f.nombre} onChange={(v) => set('nombre', v)} />
              <Campo id="apellidos" etiqueta={t('citaUI.apellidos')} valor={f.apellidos} onChange={(v) => set('apellidos', v)} />
              <Campo id="telefono" etiqueta={t('citaUI.telefono')} tipo="tel" valor={f.telefono} onChange={(v) => set('telefono', v)} />
              <Campo id="email" etiqueta={t('citaUI.email')} tipo="email" valor={f.email} onChange={(v) => set('email', v)} />
              <div className="space-y-1.5">
                <Label>{t('citaUI.documento')}</Label>
                <Select value={f.docTipo} onValueChange={(v) => set('docTipo', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENTOS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Campo id="docnum" etiqueta={t('citaUI.numero')} valor={f.docNumero} onChange={(v) => set('docNumero', v)} />
              <Campo id="marca" etiqueta={t('citaUI.marca')} valor={f.marca} onChange={(v) => set('marca', v)} />
              <Campo id="modelo" etiqueta={t('citaUI.modelo')} valor={f.modelo} onChange={(v) => set('modelo', v)} />
              <Campo id="anio" etiqueta={t('citaUI.anio')} tipo="number" valor={f.anio} onChange={(v) => set('anio', v)} />
              <Campo id="matricula" etiqueta={t('citaUI.matricula')} valor={f.matricula}
                     onChange={(v) => set('matricula', v.toUpperCase())} />
            </div>

            {/* Trampa para robots. Oculta y fuera del orden de tabulacion. */}
            <input type="text" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true"
                   className="hidden" value={f.web} onChange={(e) => set('web', e.target.value)} />

            <div className="space-y-2">
              <Label>{t('citaUI.servicios')}</Label>
              <div className="grid sm:grid-cols-2 gap-2">
                {config.servicios.map((s) => {
                  const puesto = f.servicios.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('servicios', puesto
                        ? f.servicios.filter((x) => x !== s)
                        : [...f.servicios, s])}
                      className={`rounded-lg border p-3 text-sm text-left transition-colors ${
                        puesto ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-muted'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="detalle">{t('citaUI.queLePasa')}</Label>
              <Textarea id="detalle" rows={3} value={f.detalle}
                        placeholder={t('citaUI.queLePasaEjemplo')}
                        onChange={(e) => set('detalle', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>{t('citaUI.eligeDia')}</Label>
              {porDia.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('citaUI.sinHuecos')}</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto rounded-lg border p-2">
                  {porDia.map(([dia, hs]) => (
                    <div key={dia}>
                      <p className="text-xs font-medium text-muted-foreground px-1 py-1 capitalize">
                        {format(parseISO(dia), "EEEE d 'de' MMMM", { locale: es })}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {hs.map((h) => {
                          const puesto = f.dia === dia && f.hora === h.hora;
                          return (
                            <button
                              key={h.hora}
                              type="button"
                              onClick={() => { set('dia', dia); set('hora', h.hora); }}
                              className={`px-3 py-1.5 rounded-md border text-sm tabular-nums transition-colors ${
                                puesto ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                              }`}
                            >
                              {h.hora.slice(0, 5)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="flex gap-3 items-start cursor-pointer">
              <Checkbox checked={f.acepta} onCheckedChange={(v) => set('acepta', v === true)} className="mt-0.5" />
              <span className="text-sm">{t('citaUI.aceptoAvisos')}</span>
            </label>

            <div className="space-y-1.5">
              <Label htmlFor="firma">{t('citaUI.firma')}</Label>
              <Input id="firma" value={f.firma} onChange={(e) => set('firma', e.target.value)}
                     placeholder={nombreCompleto || t('citaUI.tuFirma')}
                     className="font-semibold italic" />
              {f.firma && !firmaOk && (
                <p className="text-xs text-destructive">{t('citaUI.firmaNoCoincide')}</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                {error}
              </p>
            )}

            <Button className="w-full" size="lg" disabled={!completo || enviando} onClick={enviar}>
              {enviando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('citaUI.confirmar')}
            </Button>
          </section>
        )}

        {paso === 'hecho' && resguardo && (
          <section className="space-y-6">
            <div className="text-center">
              <CheckCircle2 className="w-11 h-11 mx-auto text-green-600 mb-3" />
              <h1 className="text-xl font-bold">{t('citaUI.solicitadaTitulo')}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t('citaUI.solicitadaAviso')}</p>
            </div>

            <div className="rounded-lg border divide-y">
              <Dato etiqueta={t('citaUI.taller')} valor={resguardo.taller} />
              <Dato etiqueta={t('citaUI.dia')}
                    valor={format(parseISO(resguardo.dia), "EEEE d 'de' MMMM yyyy", { locale: es })} />
              <Dato etiqueta={t('citaUI.hora')} valor={resguardo.hora.slice(0, 5)} />
              <Dato etiqueta={t('citaUI.vehiculo')} valor={`${f.marca} ${f.modelo} · ${f.matricula}`} />
              <Dato etiqueta={t('citaUI.servicios')} valor={f.servicios.join(', ')} />
            </div>

            <Button variant="outline" className="w-full" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />{t('citaUI.descargarResguardo')}
            </Button>

            <TicketImprimible config={config} resguardo={resguardo} datos={f} />
          </section>
        )}
      </main>
    </div>
  );
}

function Centro({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center p-4">{children}</div>;
}

function Campo({ id, etiqueta, valor, onChange, tipo = 'text' }: {
  id: string; etiqueta: string; valor: string; onChange: (v: string) => void; tipo?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input id={id} type={tipo} value={valor} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 p-3 text-sm">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="font-medium text-right">{valor}</span>
    </div>
  );
}

/** El papel que se lleva el cliente. Oculto en pantalla, visible al imprimir. */
function TicketImprimible({ config, resguardo, datos }: {
  config: Config; resguardo: Resguardo; datos: Record<string, unknown>;
}) {
  const { t } = useTranslation();
  const d = datos as { marca: string; modelo: string; anio: string; matricula: string;
    nombre: string; apellidos: string; telefono: string; email: string;
    docTipo: string; docNumero: string; servicios: string[]; detalle: string; firma: string; };

  return (
    <div className="ticket-imprimible">
      <h1 style={{ fontSize: '15pt', margin: '0 0 2pt' }}>{t('citaUI.resguardoTitulo')}</h1>
      <p style={{ margin: '0 0 14pt', fontSize: '10pt' }}>{config.nombre}</p>

      <table style={{ width: '100%', fontSize: '10pt', borderCollapse: 'collapse' }}>
        <tbody>
          {[
            [t('citaUI.dia'), format(parseISO(resguardo.dia), "EEEE d 'de' MMMM yyyy", { locale: es })],
            [t('citaUI.hora'), resguardo.hora.slice(0, 5)],
            [t('citaUI.cliente'), `${d.nombre} ${d.apellidos}`],
            [t('citaUI.telefono'), d.telefono],
            [t('citaUI.email'), d.email || '—'],
            [t('citaUI.documento'), `${d.docTipo} ${d.docNumero}`],
            [t('citaUI.vehiculo'), `${d.marca} ${d.modelo} ${d.anio ? `(${d.anio})` : ''}`],
            [t('citaUI.matricula'), d.matricula],
            [t('citaUI.servicios'), d.servicios.join(', ')],
            [t('citaUI.queLePasa'), d.detalle || '—'],
          ].map(([k, v]) => (
            <tr key={k as string} style={{ borderBottom: '0.5px solid #ccc' }}>
              <td style={{ padding: '4pt 0', width: '32%', color: '#555' }}>{k}</td>
              <td style={{ padding: '4pt 0' }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: '14pt', fontSize: '10pt', color: '#555' }}>{t('citaUI.firmaCliente')}</p>
      <p style={{ margin: '2pt 0 0', fontSize: '13pt', fontStyle: 'italic', fontWeight: 600 }}>{d.firma}</p>

      <ol style={{ marginTop: '16pt', fontSize: '8.5pt', color: '#555', paddingLeft: '14pt' }}>
        {config.avisos.map((a, i) => <li key={i} style={{ marginBottom: '3pt' }}>{a}</li>)}
      </ol>

      <p style={{ marginTop: '12pt', fontSize: '8.5pt', color: '#555' }}>
        {t('citaUI.resguardoPie')}
      </p>
    </div>
  );
}
