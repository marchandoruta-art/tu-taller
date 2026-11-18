import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Wrench, Check, Minus, ArrowRight, Sparkles, Notebook, Hourglass, FileSignature,
  LayoutGrid, Timer, Clock, CalendarCheck, Search, BellRing, UserPlus, Building2, Car, Menu, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/settings/LanguageSelector';
import { capturas, type ClaveCaptura } from '@/assets/landing/capturas';
import '@/styles/landing.css';

/**
 * Página pública de ControlBox. Vive en "/" cuando no hay sesión; con sesión,
 * "/" sigue siendo el dashboard. Entrar y registrarse están en /entrar.
 *
 * Todo lo que se afirma existe en la app y en la tabla `planes`. Las capturas
 * son de un taller DEMO con datos ficticios; mientras falte alguna se enseña
 * un bloque gris marcado como pendiente. Sin cifras de clientes ni testimonios.
 */

interface Dolor { titulo: string; texto: string }
interface Funcion { titulo: string; texto: string }
interface Pantalla { titulo: string; texto: string; alt: string }
interface Paso { titulo: string; texto: string }
interface FilaComparativa { texto: string; cuaderno: boolean | string; hoja: boolean | string; controlbox: boolean | string }
interface Plan { codigo: string; nombre: string; precio: string; para: string; incluye: string[] }
interface Pregunta { p: string; r: string }

const REGISTRO = '/entrar?registro';

export default function Landing() {
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
        <SaltoAlContenido />
      </a>

      <Cabecera />

      <main id="contenido">
        <Hero />
        <Dolores />
        <Funciones />
        <Pantallas />
        <Pasos />
        <Comparativa />
        <Planes />
        <Preguntas />
        <Cierre />
      </main>

      <Pie anio={anio} />
    </div>
  );
}

function SaltoAlContenido() {
  const { t } = useTranslation();
  return <>{t('landingUI.nav.irAlContenido')}</>;
}

/* ----------------------------------------------------------------------------
   Cabecera: marca, enlaces de sección, idioma, entrar y botón redondo.
---------------------------------------------------------------------------- */
function Cabecera() {
  const { t } = useTranslation();
  const [conSombra, setConSombra] = useState(false);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    let pedido = 0;
    const onScroll = () => {
      if (pedido) return;
      pedido = window.requestAnimationFrame(() => {
        setConSombra(window.scrollY > 16);
        pedido = 0;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const enlaces: [string, string][] = [
    ['#funciones', t('landingUI.nav.funciones')],
    ['#como-funciona', t('landingUI.nav.comoFunciona')],
    ['#planes', t('landingUI.nav.precios')],
    ['#preguntas', t('landingUI.nav.preguntas')],
  ];

  return (
    <header className={`cabecera ${conSombra ? 'con-sombra' : ''}`}>
      <div className="landing-wrap flex h-16 items-center justify-between gap-4">
        <Link to="/" className="landing-link flex items-center gap-2.5" aria-label="ControlBox">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Wrench className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
          </span>
          <span className="font-condensed text-2xl font-semibold leading-none tracking-tight">ControlBox</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="secciones">
          {enlaces.map(([href, label]) => (
            <a key={href} href={href} className="landing-link rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSelector compact className="w-auto" />
          <Link to="/entrar" className="landing-link px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            {t('landingUI.nav.entrar')}
          </Link>
          <Button asChild className="landing-cta px-5">
            <Link to={REGISTRO}>{t('landingUI.nav.empezar')}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Button asChild size="sm" className="landing-cta px-4">
            <Link to={REGISTRO}>{t('landingUI.nav.empezar')}</Link>
          </Button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground"
            aria-expanded={abierto}
            aria-controls="menu-movil"
            aria-label={t('landingUI.nav.menu')}
            onClick={() => setAbierto((v) => !v)}
          >
            {abierto ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {abierto && (
        <div id="menu-movil" className="landing-wrap border-t border-border pb-4 pt-2 lg:hidden">
          <nav className="flex flex-col" aria-label="secciones">
            {enlaces.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setAbierto(false)} className="py-3 text-base font-medium">
                {label}
              </a>
            ))}
            <Link to="/entrar" className="py-3 text-base font-medium">{t('landingUI.nav.entrar')}</Link>
          </nav>
          <div className="pt-2"><LanguageSelector compact className="w-auto" /></div>
        </div>
      )}
    </header>
  );
}

/* ----------------------------------------------------------------------------
   Hero centrado: etiqueta, titular a dos líneas, botón y la captura del tablón.
---------------------------------------------------------------------------- */
function Hero() {
  const { t } = useTranslation();
  return (
    <section className="landing-wrap pb-16 pt-14 text-center lg:pb-24 lg:pt-24">
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
        {t('landingUI.hero.badge')}
      </span>
      <h1 className="landing-display mx-auto mt-6 max-w-[22ch]">
        {t('landingUI.hero.titulo1')}
        <br />
        <span className="text-primary">{t('landingUI.hero.titulo2')}</span>
      </h1>
      <p className="mx-auto mt-6 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
        {t('landingUI.hero.lede')}
      </p>
      <div className="mt-8">
        <Button asChild size="lg" className="landing-cta h-12 px-7 text-base">
          <Link to={REGISTRO}>
            {t('landingUI.hero.cta')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{t('landingUI.hero.confianza')}</p>

      <div className="mx-auto mt-14 max-w-5xl">
        <Captura clave="tablon" alt={t('landingUI.hero.capturaAlt')} prioritaria />
      </div>
    </section>
  );
}

/** Captura real o bloque gris de pendiente. Nunca una imagen inventada. */
function Captura({ clave, alt, movil = false, prioritaria = false }: { clave: ClaveCaptura; alt: string; movil?: boolean; prioritaria?: boolean }) {
  const { t } = useTranslation();
  const src = capturas[clave];
  return (
    <figure className={movil ? 'marco-movil' : 'marco'}>
      {src ? (
        <img src={src} alt={alt} loading={prioritaria ? 'eager' : 'lazy'} fetchPriority={prioritaria ? 'high' : 'auto'} decoding="async" />
      ) : (
        <div className="captura-pendiente" role="img" aria-label={alt}>
          {t('landingUI.pantallas.pendiente')}
        </div>
      )}
    </figure>
  );
}

/* ----------------------------------------------------------------------------
   ¿Te suena esto? Tres tarjetas y una pregunta.
---------------------------------------------------------------------------- */
function Dolores() {
  const { t } = useTranslation();
  const lista = t('landingUI.dolores.lista', { returnObjects: true }) as Dolor[];
  const iconos = [Notebook, Hourglass, FileSignature];
  return (
    <section className="bg-card py-16 lg:py-24">
      <div className="landing-wrap">
        <h2 className="landing-h2 text-center">{t('landingUI.dolores.titulo')}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {lista.map((d, i) => {
            const Icono = iconos[i] ?? Notebook;
            return (
              <div key={d.titulo} className="tarjeta p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icono className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="landing-h3 mt-4">{d.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d.texto}</p>
              </div>
            );
          })}
        </div>
        <p className="font-condensed mx-auto mt-12 max-w-[34ch] text-center text-2xl font-medium text-primary sm:text-3xl">
          {t('landingUI.dolores.cita')}
        </p>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Funciones: seis tarjetas con icono.
---------------------------------------------------------------------------- */
function Funciones() {
  const { t } = useTranslation();
  const lista = t('landingUI.funciones.lista', { returnObjects: true }) as Funcion[];
  const iconos = [LayoutGrid, Timer, Clock, CalendarCheck, Search, BellRing];
  return (
    <section id="funciones" className="landing-wrap scroll-mt-20 py-16 lg:py-24">
      <div className="text-center">
        <h2 className="landing-h2">
          {t('landingUI.funciones.titulo')} <span className="text-primary">{t('landingUI.funciones.titulo2')}</span>
        </h2>
        <p className="mx-auto mt-3 max-w-[48ch] text-muted-foreground">{t('landingUI.funciones.subtitulo')}</p>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((f, i) => {
          const Icono = iconos[i] ?? LayoutGrid;
          return (
            <div key={f.titulo} className="tarjeta flex gap-4 p-5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icono className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-base font-semibold">{f.titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.texto}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mx-auto mt-8 max-w-[70ch] text-center text-sm text-muted-foreground">{t('landingUI.funciones.mas')}</p>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Así se ve por dentro: texto y captura alternando lado.
---------------------------------------------------------------------------- */
function Pantallas() {
  const { t } = useTranslation();
  const lista = t('landingUI.pantallas.lista', { returnObjects: true }) as Pantalla[];
  const claves: ClaveCaptura[] = ['vehiculo', 'jornada', 'cita'];
  return (
    <section className="bg-card py-16 lg:py-24">
      <div className="landing-wrap">
        <h2 className="landing-h2 text-center">{t('landingUI.pantallas.titulo')}</h2>
        <div className="mt-12 space-y-16 lg:space-y-24">
          {lista.map((p, i) => {
            const movil = claves[i] === 'cita';
            const invertido = i % 2 === 1;
            return (
              <div key={p.titulo} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
                <div className={`lg:col-span-5 ${invertido ? 'lg:order-2' : ''}`}>
                  <h3 className="landing-h3 text-2xl sm:text-3xl">{p.titulo}</h3>
                  <p className="mt-4 leading-relaxed text-muted-foreground">{p.texto}</p>
                </div>
                <div className={`min-w-0 lg:col-span-7 ${invertido ? 'lg:order-1' : ''}`}>
                  <Captura clave={claves[i]} alt={p.alt} movil={movil} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Empieza en 2 minutos: tres pasos.
---------------------------------------------------------------------------- */
function Pasos() {
  const { t } = useTranslation();
  const lista = t('landingUI.pasos.lista', { returnObjects: true }) as Paso[];
  const iconos = [UserPlus, Building2, Car];
  return (
    <section id="como-funciona" className="landing-wrap scroll-mt-20 py-16 text-center lg:py-24">
      <h2 className="landing-h2">{t('landingUI.pasos.titulo')}</h2>
      <ol className="mt-10 grid gap-8 md:grid-cols-3">
        {lista.map((p, i) => {
          const Icono = iconos[i] ?? Car;
          return (
            <li key={p.titulo} className="flex flex-col items-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Icono className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="landing-h3 mt-4">{p.titulo}</h3>
              <p className="mt-2 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">{p.texto}</p>
            </li>
          );
        })}
      </ol>
      <Button asChild size="lg" className="landing-cta mt-10 h-12 px-7 text-base">
        <Link to={REGISTRO}>
          {t('landingUI.pasos.cta')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Comparativa honesta: cuaderno, hoja de cálculo, ControlBox.
---------------------------------------------------------------------------- */
function Comparativa() {
  const { t } = useTranslation();
  const filas = t('landingUI.comparativa.filas', { returnObjects: true }) as FilaComparativa[];
  const celda = (v: boolean | string) => {
    if (v === true) return <Check className="mx-auto h-5 w-5 text-primary" aria-label="sí" />;
    if (v === false) return <Minus className="mx-auto h-5 w-5 text-muted-foreground/60" aria-label="no" />;
    return <span className="text-xs text-muted-foreground">{v}</span>;
  };
  return (
    <section className="bg-card py-16 lg:py-24">
      <div className="landing-wrap">
        <div className="text-center">
          <h2 className="landing-h2">{t('landingUI.comparativa.titulo')}</h2>
          <p className="mt-3 text-muted-foreground">{t('landingUI.comparativa.subtitulo')}</p>
        </div>
        <div className="tarjeta mx-auto mt-10 max-w-3xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="p-4 text-left font-medium text-muted-foreground" />
                <th scope="col" className="p-4 text-center font-medium text-muted-foreground">{t('landingUI.comparativa.columnas.cuaderno')}</th>
                <th scope="col" className="p-4 text-center font-medium text-muted-foreground">{t('landingUI.comparativa.columnas.hoja')}</th>
                <th scope="col" className="bg-primary/10 p-4 text-center font-semibold">{t('landingUI.comparativa.columnas.controlbox')}</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.texto} className="border-b border-border last:border-b-0">
                  <th scope="row" className="p-4 text-left font-normal">{f.texto}</th>
                  <td className="p-4 text-center">{celda(f.cuaderno)}</td>
                  <td className="p-4 text-center">{celda(f.hoja)}</td>
                  <td className="bg-primary/10 p-4 text-center">{celda(f.controlbox)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Planes: tres tarjetas con los valores reales de la tabla `planes`.
---------------------------------------------------------------------------- */
function Planes() {
  const { t } = useTranslation();
  const lista = t('landingUI.planes.lista', { returnObjects: true }) as Plan[];
  return (
    <section id="planes" className="landing-wrap scroll-mt-20 py-16 lg:py-24">
      <div className="text-center">
        <h2 className="landing-h2">{t('landingUI.planes.titulo')}</h2>
        <p className="mx-auto mt-3 max-w-[56ch] text-muted-foreground">{t('landingUI.planes.subtitulo')}</p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {lista.map((plan) => {
          const destacado = plan.codigo === 'completo';
          return (
            <div key={plan.codigo} className={`tarjeta flex flex-col p-6 ${destacado ? 'border-primary ring-1 ring-primary' : ''}`}>
              <h3 className="landing-h3 text-2xl">{plan.nombre}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.para}</p>
              <p className="mt-5">
                <span className="font-condensed text-4xl font-semibold">{plan.precio}</span>
                <span className="text-muted-foreground">{t('landingUI.planes.alMes')}</span>
              </p>
              <p className="text-xs text-muted-foreground">{t('landingUI.planes.iva')}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {plan.incluye.map((linea) => (
                  <li key={linea} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{linea}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <Button asChild variant={destacado ? 'default' : 'outline'} className="landing-cta w-full">
                  <Link to={REGISTRO}>{destacado ? t('landingUI.planes.ctaCompleto') : t('landingUI.planes.cta')}</Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t('landingUI.planes.anual')} {t('landingUI.planes.aviso')}
      </p>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Preguntas frecuentes: desplegables nativos.
---------------------------------------------------------------------------- */
function Preguntas() {
  const { t } = useTranslation();
  const lista = t('landingUI.faq.lista', { returnObjects: true }) as Pregunta[];
  return (
    <section id="preguntas" className="scroll-mt-20 bg-card py-16 lg:py-24">
      <div className="landing-wrap">
        <h2 className="landing-h2 text-center">{t('landingUI.faq.titulo')}</h2>
        <div className="tarjeta mx-auto mt-10 max-w-3xl divide-y divide-border px-6">
          {lista.map((item) => (
            <details key={item.p} className="py-4">
              <summary className="flex items-center text-base font-medium">
                {item.p}
                <span className="signo text-xl leading-none" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 max-w-[64ch] leading-relaxed text-muted-foreground">{item.r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Cierre en banda oscura.
---------------------------------------------------------------------------- */
function Cierre() {
  const { t } = useTranslation();
  return (
    <section className="bg-foreground py-16 text-background lg:py-20">
      <div className="landing-wrap text-center">
        <h2 className="landing-h2">{t('landingUI.cierre.titulo')}</h2>
        <p className="mx-auto mt-3 max-w-[40ch] text-background/70">{t('landingUI.cierre.texto')}</p>
        <Button asChild size="lg" className="landing-cta mt-8 h-12 px-7 text-base">
          <Link to={REGISTRO}>
            {t('landingUI.cierre.cta')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <p className="mt-8 text-sm text-background/60">{t('landingUI.cierre.nota')}</p>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------------------
   Pie en columnas.
---------------------------------------------------------------------------- */
function Pie({ anio }: { anio: number }) {
  const { t } = useTranslation();
  const columnas: { titulo: string; enlaces: [string, string, boolean?][] }[] = [
    {
      titulo: t('landingUI.pie.producto'),
      enlaces: [
        ['#funciones', t('landingUI.nav.funciones'), true],
        ['#como-funciona', t('landingUI.nav.comoFunciona'), true],
        ['#planes', t('landingUI.nav.precios'), true],
        ['#preguntas', t('landingUI.nav.preguntas'), true],
      ],
    },
    {
      titulo: t('landingUI.pie.cuenta'),
      enlaces: [
        ['/entrar', t('landingUI.nav.entrar')],
        [REGISTRO, t('landingUI.pie.crearCuenta')],
        [`mailto:${t('landingUI.pie.contacto')}`, t('landingUI.pie.contacto'), true],
      ],
    },
    {
      titulo: t('landingUI.pie.legal'),
      enlaces: [
        ['/aviso-legal', t('landingUI.pie.avisoLegal')],
        ['/politica-privacidad', t('landingUI.pie.privacidad')],
        ['/politica-cookies', t('landingUI.pie.cookies')],
        ['/terminos-condiciones', t('landingUI.pie.terminos')],
      ],
    },
  ];

  return (
    <footer className="bg-foreground pb-8 pt-14 text-background/80">
      <div className="landing-wrap grid gap-10 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <div>
          <div className="flex items-center gap-2.5 text-background">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Wrench className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
            </span>
            <span className="font-condensed text-2xl font-semibold leading-none">ControlBox</span>
          </div>
          <p className="mt-4 max-w-[32ch] text-sm leading-relaxed">{t('landingUI.pie.descripcion')}</p>
        </div>
        {columnas.map((col) => (
          <div key={col.titulo}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-background">{col.titulo}</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {col.enlaces.map(([href, label, externo]) => (
                <li key={href}>
                  {externo ? (
                    <a href={href} className="landing-link hover:text-background">{label}</a>
                  ) : (
                    <Link to={href} className="landing-link hover:text-background">{label}</Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="landing-wrap mt-10 flex flex-col gap-3 border-t border-background/15 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span>{t('landingUI.pie.copy', { anio })}</span>
        <LanguageSelector compact className="w-auto text-foreground" />
      </div>
    </footer>
  );
}
