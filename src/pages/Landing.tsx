import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Wrench, Check, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import '@/styles/landing.css';

/**
 * Página pública de ControlBox. Vive en "/" cuando no hay sesión; con sesión,
 * "/" sigue siendo el dashboard. Entrar y registrarse están en /entrar.
 *
 * Todo lo que se afirma aquí existe en la app y en la tabla `planes`. No hay
 * cifras de clientes, testimonios ni capturas falsas: los "fragmentos" son
 * trozos de interfaz construidos con los mismos estilos que usa la app.
 */

interface Fase { titulo: string; texto: string; visual: string }
interface Ademas { titulo: string; texto: string }
interface Pregunta { p: string; r: string }

const REGISTRO = '/entrar?registro';

function formatearSegundos(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Cronómetro de ejemplo. Solo cambia el texto; con reduced-motion se queda quieto. */
function useCronometroEjemplo(inicio: number): string {
  const [segundos, setSegundos] = useState(inicio);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  return formatearSegundos(segundos);
}

export default function Landing() {
  const { t } = useTranslation();
  const fases = t('landingUI.fases.lista', { returnObjects: true }) as Fase[];
  const ademas = t('landingUI.ademas.lista', { returnObjects: true }) as Ademas[];
  const preguntas = t('landingUI.faq.lista', { returnObjects: true }) as Pregunta[];
  const anio = new Date().getFullYear();

  useEffect(() => {
    document.title = 'ControlBox · Gestión de taller';
  }, []);

  return (
    <div className="landing min-h-screen bg-background text-foreground">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-card focus:px-3 focus:py-2"
      >
        {t('landingUI.nav.irAlContenido')}
      </a>

      <Cabecera />

      <main id="contenido">
        <Hero />
        <Fases fases={fases} />
        <Alrededor items={ademas} />
        <Planes />
        <Preguntas items={preguntas} />
        <Cierre />
      </main>

      <Pie anio={anio} />
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Cabecera: marca a la izquierda, entrar y empezar a la derecha. Sin más enlaces.
---------------------------------------------------------------------------- */
function Cabecera() {
  const { t } = useTranslation();
  return (
    <header className="landing-wrap flex items-center justify-between gap-4 py-5">
      <Link to="/" className="flex items-center gap-3 landing-link" aria-label="ControlBox">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
          <Wrench className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
        </span>
        <span className="text-display text-2xl leading-none">ControlBox</span>
      </Link>
      <nav className="flex items-center gap-2 sm:gap-4" aria-label="principal">
        <Link
          to="/entrar"
          className="landing-link px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {t('landingUI.nav.entrar')}
        </Link>
        <Button asChild variant="outline" className="landing-cta">
          <Link to={REGISTRO}>{t('landingUI.nav.empezar')}</Link>
        </Button>
      </nav>
    </header>
  );
}

/* ----------------------------------------------------------------------------
   Hero: titular y acción a la izquierda, tablón de ejemplo a la derecha (7/5).
---------------------------------------------------------------------------- */
function Hero() {
  const { t } = useTranslation();
  return (
    <section className="landing-wrap grid items-center gap-10 pb-16 pt-10 lg:grid-cols-[7fr_5fr] lg:gap-16 lg:pb-24 lg:pt-16">
      <div className="min-w-0">
        <h1 className="landing-display text-display max-w-[18ch]">{t('landingUI.hero.titulo')}</h1>
        <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
          {t('landingUI.hero.lede')}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="landing-cta">
            <Link to={REGISTRO}>{t('landingUI.hero.cta')}</Link>
          </Button>
          <a href="#planes" className="landing-link px-2 py-2 text-sm font-medium underline-offset-4 hover:underline">
            {t('landingUI.hero.ctaSecundaria')}
          </a>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{t('landingUI.hero.sinTarjeta')}</p>
        <p className="mt-10 border-l-2 border-primary pl-4 text-sm text-muted-foreground">
          {t('landingUI.hero.origen')}
        </p>
      </div>
      <TablonEjemplo />
    </section>
  );
}

function TablonEjemplo() {
  const { t } = useTranslation();
  const tiempo = useCronometroEjemplo(1 * 3600 + 42 * 60 + 17);

  const columnas: { clave: string; badge: string; coches: { matricula: string; modelo: string; quien?: string; cronometro?: boolean }[] }[] = [
    { clave: 'recibido', badge: 'status-received', coches: [{ matricula: '4521 KLM', modelo: 'Clio' }] },
    {
      clave: 'en_reparacion',
      badge: 'status-in-progress',
      coches: [
        { matricula: '8830 JTR', modelo: 'Transit', quien: 'EF', cronometro: true },
        { matricula: '1207 HNB', modelo: 'Golf', quien: 'AM' },
      ],
    },
    { clave: 'pendiente_piezas', badge: 'status-pending-parts', coches: [{ matricula: '6644 GPX', modelo: 'Ibiza', quien: 'AM' }] },
    { clave: 'terminado', badge: 'status-completed', coches: [{ matricula: '2399 LSD', modelo: 'Vito', quien: 'EF' }] },
  ];

  return (
    <figure className="fragmento p-4" role="img" aria-label={t('landingUI.tablon.descripcion')}>
      <figcaption className="mb-3 flex items-baseline justify-between">
        <span className="text-display text-lg">{t('landingUI.tablon.titulo')}</span>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{t('landingUI.tablon.ejemplo')}</span>
      </figcaption>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden="true">
        {columnas.map((col) => (
          <div key={col.clave} className="min-w-0">
            <span className={`status-badge ${col.badge} mb-2 w-full justify-center truncate`}>
              {t(`landingUI.tablon.columnas.${col.clave}`)}
            </span>
            <div className="space-y-2">
              {col.coches.map((c) => (
                <div key={c.matricula} className="rounded-sm border border-border bg-background/60 px-2.5 py-2">
                  <div className="whitespace-nowrap font-mono text-sm font-medium">{c.matricula}</div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{c.modelo}</span>
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                      {c.quien ?? '—'}
                    </span>
                  </div>
                  {c.cronometro && (
                    <div className="mt-1.5 flex items-center gap-1.5 font-mono text-xs text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {tiempo}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

/* ----------------------------------------------------------------------------
   Fases: el día del taller en cuatro pasos, cada uno con su fragmento.
---------------------------------------------------------------------------- */
function Fases({ fases }: { fases: Fase[] }) {
  const { t } = useTranslation();
  const fragmentos = [<FragmentoEntrada key="1" />, <FragmentoTrabajo key="2" />, <FragmentoEntrega key="3" />, <FragmentoJornada key="4" />];

  return (
    <section className="landing-wrap pb-8 pt-4" aria-labelledby="fases-titulo">
      <h2 id="fases-titulo" className="landing-h2 text-display mb-10 max-w-[24ch]">
        {t('landingUI.fases.titulo')}
      </h2>
      <ol className="list-none p-0">
        {fases.map((fase, i) => (
          <li key={fase.titulo} className="fase grid gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] md:gap-14">
            <div>
              <span className="fase-num block">0{i + 1}</span>
              <h3 className="text-display mt-2 text-3xl sm:text-4xl">{fase.titulo}</h3>
              <p className="mt-4 max-w-[60ch] leading-relaxed text-muted-foreground">{fase.texto}</p>
            </div>
            <figure className="fragmento self-center p-4" role="img" aria-label={fase.visual}>
              <div aria-hidden="true">{fragmentos[i]}</div>
            </figure>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FragmentoEntrada() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-mono text-base font-medium">4521 KLM</span>
        <span className="status-badge status-received">{t('landingUI.tablon.columnas.recibido')}</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-muted-foreground">
        <dt>{t('landingUI.fases.mock.cliente')}</dt>
        <dd className="text-foreground">M. R.</dd>
        <dt>{t('landingUI.fases.mock.motivo')}</dt>
        <dd className="text-foreground">{t('landingUI.fases.mock.motivoEjemplo')}</dd>
      </dl>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span>{t('landingUI.fases.mock.resguardo')}</span>
        <span className="fragmento-boton rounded-md border border-input px-2.5 py-1 text-xs font-medium">
          {t('landingUI.fases.mock.pdf')}
        </span>
      </div>
    </div>
  );
}

function FragmentoTrabajo() {
  const { t } = useTranslation();
  const tiempo = useCronometroEjemplo(1 * 3600 + 42 * 60 + 17);
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-mono text-base font-medium">8830 JTR</span>
        <span className="status-badge status-in-progress">{t('landingUI.tablon.columnas.en_reparacion')}</span>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{t('landingUI.fases.mock.tiempoHoy')}</div>
        <div className="timer-display text-primary">{tiempo}</div>
      </div>
      <div className="flex gap-2">
        <span className="fragmento-boton rounded-md border border-input px-3 py-1.5 text-xs font-medium">
          {t('landingUI.fases.mock.pausar')}
        </span>
        <span className="fragmento-boton rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          {t('landingUI.fases.mock.finalizar')}
        </span>
      </div>
    </div>
  );
}

function FragmentoEntrega() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="status-badge status-completed">{t('landingUI.tablon.columnas.terminado')}</span>
        <span className="text-muted-foreground" aria-hidden="true">→</span>
        <span className="status-badge status-delivered">{t('status.entregado')}</span>
      </div>
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <span>{t('landingUI.fases.mock.avisoItv')}</span>
          <span className="text-xs text-muted-foreground">{t('landingUI.fases.mock.avisoItvCuando')}</span>
        </div>
      </div>
      <div className="border-t border-border pt-3">
        <div>{t('landingUI.fases.mock.historial')}</div>
        <div className="text-xs text-muted-foreground">{t('landingUI.fases.mock.historialNota')}</div>
      </div>
    </div>
  );
}

function FragmentoJornada() {
  const { t } = useTranslation();
  const filas: [string, string][] = [
    [t('landingUI.fases.mock.entrada'), '08:02'],
    [t('landingUI.fases.mock.pausa'), '13:30 – 15:00'],
    [t('landingUI.fases.mock.salida'), '18:04'],
  ];
  return (
    <div className="space-y-2 text-sm">
      {filas.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between">
          <span className="text-muted-foreground">{k}</span>
          <span className="font-mono">{v}</span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="font-medium">{t('landingUI.fases.mock.total')}</span>
        <span className="font-mono font-medium">8 h 32 min</span>
      </div>
      <div className="flex justify-end">
        <span className="fragmento-boton rounded-md border border-input px-2.5 py-1 text-xs font-medium">
          {t('landingUI.fases.mock.pdf')}
        </span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Lo de alrededor: lista de definición en dos columnas, sin iconos ni tarjetas.
---------------------------------------------------------------------------- */
function Alrededor({ items }: { items: Ademas[] }) {
  const { t } = useTranslation();
  return (
    <section className="landing-wrap border-t-[3px] border-foreground py-16 lg:py-20" aria-labelledby="ademas-titulo">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <h2 id="ademas-titulo" className="landing-h2 text-display max-w-[14ch]">
          {t('landingUI.ademas.titulo')}
        </h2>
        <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.titulo}>
              <dt className="text-lg font-semibold">{item.titulo}</dt>
              <dd className="mt-1.5 leading-relaxed text-muted-foreground">{item.texto}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Planes: tabla comparativa con los valores reales de la tabla `planes`.
---------------------------------------------------------------------------- */
function Planes() {
  const { t } = useTranslation();
  const planes = ['gratis', 'profesional', 'completo'] as const;
  const si = <Check className="mx-auto h-4 w-4 text-foreground" aria-hidden="true" />;
  const no = <Minus className="mx-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />;
  const v = (clave: string) => t(`landingUI.planes.valores.${clave}`);

  const filas: { clave: string; valores: [React.ReactNode, React.ReactNode, React.ReactNode] }[] = [
    { clave: 'usuarios', valores: ['1', '5', v('sinLimite')] },
    { clave: 'vehiculos', valores: ['5', v('sinLimite'), v('sinLimite')] },
    { clave: 'historial', valores: [v('tresMeses'), v('completo'), v('completo')] },
    { clave: 'jornada', valores: [no, si, si] },
    { clave: 'documentos', valores: [no, si, si] },
    { clave: 'portal', valores: [no, si, si] },
    { clave: 'itv', valores: [no, si, si] },
    { clave: 'citas', valores: [no, no, si] },
    { clave: 'productividad', valores: [no, no, si] },
    { clave: 'estadisticas', valores: [no, no, si] },
  ];

  return (
    <section id="planes" className="landing-wrap scroll-mt-6 border-t-[3px] border-foreground py-16 lg:py-20" aria-labelledby="planes-titulo">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <div>
          <h2 id="planes-titulo" className="landing-h2 text-display">{t('landingUI.planes.titulo')}</h2>
          <p className="mt-4 max-w-[36ch] leading-relaxed text-muted-foreground">{t('landingUI.planes.intro')}</p>
          <p className="mt-3 max-w-[36ch] text-sm text-muted-foreground">{t('landingUI.planes.anual')}</p>
        </div>

        <div className="space-y-8 md:hidden">
          {planes.map((p, pi) => (
            <div key={p} className="border-t-[3px] border-foreground pt-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-display text-3xl">{t(`landingUI.planes.${p}.nombre`)}</span>
                <span className="text-xl font-semibold tabular-nums">{t(`landingUI.planes.${p}.precio`)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('landingUI.planes.alMes')} · {t(`landingUI.planes.${p}.nota`)}</p>
              <dl className="mt-4 divide-y divide-border text-sm">
                {filas.map((fila) => {
                  const valor = fila.valores[pi];
                  const texto = typeof valor === 'string' ? valor : valor === si ? v('incluido') : v('noIncluido');
                  const apagado = valor === no;
                  return (
                    <div key={fila.clave} className={`flex items-center justify-between gap-4 py-2 ${apagado ? 'text-muted-foreground' : ''}`}>
                      <dt>{t(`landingUI.planes.filas.${fila.clave}`)}</dt>
                      <dd className="shrink-0 font-medium">{texto}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <table className="planes-tabla w-full border-collapse text-sm">
            <caption className="sr-only">{t('landingUI.planes.titulo')}</caption>
            <thead>
              <tr>
                <th scope="col" className="!border-t-0" />
                {planes.map((p) => (
                  <th key={p} scope="col" className="!border-t-0 align-bottom">
                    <div className="text-display text-2xl">{t(`landingUI.planes.${p}.nombre`)}</div>
                    <div className="mt-1 text-xl font-semibold tabular-nums">{t(`landingUI.planes.${p}.precio`)}</div>
                    <div className="text-xs font-normal text-muted-foreground">{t('landingUI.planes.alMes')}</div>
                    <div className="mt-2 text-xs font-normal text-muted-foreground">{t(`landingUI.planes.${p}.nota`)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.clave}>
                  <th scope="row" className="text-left font-normal">{t(`landingUI.planes.filas.${fila.clave}`)}</th>
                  {fila.valores.map((valor, i) => (
                    <td key={i}>
                      {typeof valor === 'string' ? valor : (
                        <>
                          {valor}
                          <span className="sr-only">{valor === si ? v('incluido') : v('noIncluido')}</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
        <Button asChild size="lg" className="landing-cta">
          <Link to={REGISTRO}>{t('landingUI.planes.cta')}</Link>
        </Button>
        <p className="text-sm text-muted-foreground">{t('landingUI.planes.aviso')}</p>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Preguntas: desplegables nativos, sin JavaScript.
---------------------------------------------------------------------------- */
function Preguntas({ items }: { items: Pregunta[] }) {
  const { t } = useTranslation();
  return (
    <section className="landing-wrap border-t-[3px] border-foreground py-16 lg:py-20" aria-labelledby="faq-titulo">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <h2 id="faq-titulo" className="landing-h2 text-display max-w-[14ch]">{t('landingUI.faq.titulo')}</h2>
        <div>
          {items.map((item) => (
            <details key={item.p} className="group border-b border-border py-4 first:border-t">
              <summary className="flex items-center text-base font-semibold">{item.p}</summary>
              <p className="mt-3 max-w-[64ch] leading-relaxed text-muted-foreground">{item.r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Cierre: una frase y un botón.
---------------------------------------------------------------------------- */
function Cierre() {
  const { t } = useTranslation();
  return (
    <section className="landing-wrap border-t-[3px] border-foreground py-16 lg:py-24">
      <h2 className="landing-display text-display max-w-[16ch]">{t('landingUI.cierre.titulo')}</h2>
      <p className="mt-4 max-w-[40ch] text-lg text-muted-foreground">{t('landingUI.cierre.texto')}</p>
      <Button asChild size="lg" className="landing-cta mt-8">
        <Link to={REGISTRO}>{t('landingUI.cierre.cta')}</Link>
      </Button>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Pie: frase de cierre, marca, legales y contacto.
---------------------------------------------------------------------------- */
function Pie({ anio }: { anio: number }) {
  const { t } = useTranslation();
  const legales = [
    ['/aviso-legal', t('landingUI.pie.avisoLegal')],
    ['/politica-privacidad', t('landingUI.pie.privacidad')],
    ['/politica-cookies', t('landingUI.pie.cookies')],
    ['/terminos-condiciones', t('landingUI.pie.terminos')],
  ];
  return (
    <footer className="landing-wrap border-t border-border pb-10 pt-12">
      <p className="text-display max-w-[28ch] text-2xl sm:text-3xl">{t('landingUI.pie.frase')}</p>
      <div className="mt-8 flex flex-col gap-4 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-display text-base text-foreground">ControlBox</span>
          {legales.map(([href, label]) => (
            <Link key={href} to={href} className="landing-link hover:text-foreground">
              {label}
            </Link>
          ))}
          <a href={`mailto:${t('landingUI.pie.contacto')}`} className="landing-link hover:text-foreground">
            {t('landingUI.pie.contacto')}
          </a>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector compact className="w-auto" />
          <span>{t('landingUI.pie.copy', { anio })}</span>
        </div>
      </div>
    </footer>
  );
}
