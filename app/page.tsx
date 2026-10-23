// Home de Norte Tech, versión MIX (feat/web-mix): hero de B (51e4a5f) con
// elementos de A, y el resto de las secciones con los componentes de A (4b96efd).
// Server Component:
// todo el texto sale en el HTML; quedan como islas cliente sólo la brújula
// (Hero3D), los chips, el contador, la terminal, la aguja de la banda CTA, el
// directorio, la barra y el formulario de alta.
import Image from 'next/image';
import './home.css';
import './mix-a.css';
import './mix.css';
import BrandLogo from './components/BrandLogo';
import SiteNav, { type MeetupLink } from './components/home/SiteNav';
import JoinModal from './components/home/JoinModal';
import Reveal from './components/home/Reveal';
import Hero3D from './components/web3d/Hero3D';
import CategoryChips from './components/web3d/CategoryChips';
import CountUp from './components/web3d/CountUp';
import Terminal from './components/web3d/Terminal';
import CtaNeedleA from './components/mixa/CtaNeedleA';
import FooterCompassA from './components/mixa/FooterCompassA';
import WindRose, { type RoseCard } from './components/mixa/WindRose';
import AgendaRoute from './components/mixa/AgendaRoute';
import CommunityA from './components/mixa/CommunityA';
import RevealA from './components/mixa/RevealA';
import CompassCursor from './components/web3d/CompassCursor';
import { getCommunityStats } from '@/lib/stats';
import { MEETUP_URL, MEETUP_DATE, FOTOS_FACT_REQUESTS } from '@/lib/site';

// Fotos de encuentros elegidas por Marketing (22/10, revisión web-comunidad): todos salen bien,
// sin mascota ni marca vieja, sin caras tapadas. Fuentes y recortes: web-comunidad/fotos/fuentes.json.
import fotoCierre from '@/public/encuentros/mt02-cierre-escalera.webp';
import fotoCharla from '@/public/encuentros/mt02-charla-ronda.webp';
import fotoPizarra from '@/public/encuentros/mt02-pizarra-risa.webp';
import fotoRonda from '@/public/encuentros/mt02-ronda-cenital.webp';

// Contador y chips: totales reales de Neon, regenerados cada 5 minutos (ISR).
// Tiene que ser un literal (Next lo lee estáticamente); igual a STATS_REVALIDATE_SECONDS.
export const revalidate = 300;

/** "2026-11-12T19:00:00-03:00" -> "12.11" (hora de Argentina). Vacío si no hay fecha válida. */
function shortDate(iso: string): string {
  const t = Date.parse(iso);
  if (!iso || Number.isNaN(t)) return '';
  const parts = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }).formatToParts(new Date(t));
  const d = parts.find((p) => p.type === 'day')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  return d && m ? `${d}.${m}` : '';
}

// Tarjetas de la rosa de los vientos (WindRose de A, 4b96efd).
const ABOUT_CARDS: RoseCard[] = [
  { n: '01', title: 'Meetups', text: 'Encuentros cortos y sin slides. Contás en qué andás y conocés a los que están en lo mismo.' },
  { n: '02', title: 'Coworks', text: 'Tardes de laburo compartido en cafés y clubes de la zona. Traés la compu y trabajás al lado de otros.' },
  { n: '03', title: 'Red', text: 'Founders, builders, inversores y gente de growth, marketing y contenido que vive en la zona.' },
  { n: '04', title: 'Feedback', text: 'Mostrás tu producto y te devuelven algo útil. Sin pitch armado.' },
];

// Marquee de A, con menos repeticiones (4 en vez de 20) para aliviar el DOM.
const MARQUEE = ['Inteligencia Artificial', 'Fintech', 'SaaS', 'Web3', 'Proptech', 'Healthtech', 'EdTech', 'Developer Tools', 'E-commerce', 'Networking'];

// "Así son los encuentros", por capítulos: un capítulo por tipo de encuentro.
// Solo originales de cámara (lado largo >= 1600 px reales, nítidas en las caras); los formatos
// sin fotos que pasen ese umbral se muestran como tarjeta de texto. Fuentes: web-comunidad/fotos/fuentes-v2.json.
type Foto = { src: typeof fotoRonda; cap: string; pos: string; alt: string; sizes: string };
const MT_HERO: Foto = { src: fotoCierre, cap: 'Gente nueva', pos: '50% 40%', sizes: '(max-width: 720px) 100vw, (max-width: 1240px) 60vw, 720px', alt: 'Tres personas sonríen abrazadas frente a la escalera roja del salón al cierre del meetup.' };
const MT_FOTOS: Foto[] = [
  { src: fotoCharla, cap: 'Charlas cruzadas', pos: '50% 30%', sizes: '(max-width: 720px) 78vw, (max-width: 1240px) 40vw, 470px', alt: 'Una chica cuenta algo con las manos mientras un grupo de pie charla alrededor en el salón.' },
  { src: fotoPizarra, cap: 'La pizarra', pos: '50% 30%', sizes: '(max-width: 720px) 78vw, (max-width: 1240px) 20vw, 230px', alt: 'Un hombre de remera negra se ríe mientras habla frente a una pizarra escrita a mano.' },
  { src: fotoRonda, cap: 'La ronda', pos: '50% 50%', sizes: '(max-width: 720px) 78vw, (max-width: 1240px) 20vw, 230px', alt: 'Vista desde arriba del salón: un grupo de pie en ronda escucha a uno que se presenta, junto a una pizarra y ventanales.' },
];
const CAPITULOS = [
  { id: 'enc-meet', n: '01', title: 'Meet & Talk' },
  { id: 'enc-cowork', n: '02', title: 'Coworks' },
  { id: 'enc-founders', n: '03', title: 'Founders Edition' },
  { id: 'enc-pronto', n: '04', title: 'Próximamente' },
];

const FOTO_Q = 85;

function Galeria({ hero, fotos, label }: { hero: Foto; fotos: Foto[]; label: string }) {
  return (
    <div className="enc-mosaic">
      <figure className="enc-ph enc-ph--hero" data-reveal>
        <Image src={hero.src} alt={hero.alt} fill sizes={hero.sizes} quality={FOTO_Q} placeholder="blur" style={{ objectFit: 'cover', objectPosition: hero.pos }} />
        <figcaption>{hero.cap}</figcaption>
      </figure>
      {/* En mobile es una tira horizontal con scroll nativo y snap; tabIndex para poder scrollearla con teclado. */}
      <div className="enc-strip" role="group" aria-label={label} tabIndex={0}>
        {fotos.map((f) => (
          <figure key={f.cap} className="enc-ph" data-reveal>
            <Image src={f.src} alt={f.alt} fill sizes={f.sizes} quality={FOTO_Q} placeholder="blur" style={{ objectFit: 'cover', objectPosition: f.pos }} />
            <figcaption>{f.cap}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/* CSS crítico del bloque de texto del hero, inline para no depender del CSS externo.
   Copia exacta de las reglas de home.css (que siguen siendo la fuente de verdad). */
const HERO_CRITICAL_CSS = `.v2 .hero-copy{position:relative;z-index:2}.v2 .pill{display:inline-flex;align-items:center;gap:10px;height:32px;padding:0 14px;border:1px solid var(--n800);border-radius:999px;font:500 var(--t-mono)/1 var(--f-mono);letter-spacing:.12em;text-transform:uppercase;color:var(--n300);margin:0 0 28px}.v2 .pill-dot{width:6px;height:6px;border-radius:50%;background:var(--b400);position:relative}.v2 .h-display{font:700 var(--t-display)/.98 var(--f-display);letter-spacing:-.035em;text-wrap:balance}.v2 .hero h1{margin:0 0 24px}.v2 .hero-sub{font-size:var(--t-lead);line-height:1.55;color:var(--n300);max-width:30em;margin:0 0 36px;text-wrap:balance}.v2 .hero-actions{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:40px}@media (max-width:960px){.v2 .hero h1{padding-right:96px}.v2 .hero-actions .btn{flex:1 1 100%}}@media (max-width:400px){.v2 .hero h1{padding-right:84px}}@media (min-width:600px) and (max-width:960px){.v2 .hero-actions .btn{flex:0 0 auto}}`;

export default async function Home() {
  const stats = await getCommunityStats();
  const total = stats.live && stats.total > 0 ? stats.total : null;
  const nextDate = shortDate(MEETUP_DATE);

  // CTA principal: la página de Luma del próximo meetup (MEETUP_URL en lib/site.ts).
  // Sin URL, el CTA abre el formulario de alta (data-open-join, ver JoinModal).
  const meetup: MeetupLink = MEETUP_URL
    ? { href: MEETUP_URL, target: '_blank', rel: 'noopener noreferrer' }
    : { href: '#join', 'data-open-join': '' };


  return (
    <>
      <div className="v2">
        <a className="skip" href="#contenido">Saltar al contenido</a>
        <SiteNav meetup={meetup} />
      </div>

      <main id="contenido">
        {/* ───────────── HERO · base B (51e4a5f) + elementos de A (4b96efd) ───────────── */}
        <style dangerouslySetInnerHTML={{ __html: HERO_CRITICAL_CSS }} />
        <div className="v2 v2-hero">
          <section className="hero hero--mix" id="top" aria-labelledby="hero-title">
            {/* A: grilla de puntos del motivo brújula detrás del hero */}
            <div className="hero-grid" aria-hidden="true" />
            <div className="hero-copy">
              {nextDate ? (
                <p className="pill pill--live"><span className="pill-dot" aria-hidden="true" />Próximo meetup · {nextDate}</p>
              ) : (
                <p className="pill"><span className="pill-dot" aria-hidden="true" />Comunidad tech · Zona norte</p>
              )}
              <h1 id="hero-title" className="h-display">Encontrá tu <span className="u-amber">norte</span>.</h1>
              {/* A: bajada en dos líneas */}
              <p className="hero-sub">La comunidad tech de zona norte.<br />Founders, builders e inversores en la misma mesa.</p>
              <div className="hero-actions">
                <a {...meetup} className="btn btn-primary btn-lg hero-cta" data-hero-cta="" data-cta="">Sumate al próximo meetup</a>
                <button type="button" className="btn btn-ghost btn-lg" data-open-join="">Unirme a la comunidad</button>
              </div>
              <div className="hero-meta">
                <CategoryChips stats={stats} />
                {/* A: el único número del hero, con el estilo "Miembros". Sólo con dato real (Neon). */}
                {total ? (
                  <div className="hero-stat-a">
                    <span className="sr-only">{total} miembros</span>
                    <span className="val" aria-hidden="true"><CountUp value={total} /></span>
                    <span className="lbl" aria-hidden="true">Miembros</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="hero-visual">
              <Hero3D stats={stats} />
            </div>
            <CompassCursor />
            {/* A: indicador de scroll (sólo desktop) */}
            <a href="#sobre" className="hero-scroll" aria-label="Bajar a Qué es Norte Tech">
              <span className="hero-scroll-dot" aria-hidden="true" />
              <span aria-hidden="true">scroll</span>
            </a>
          </section>
        </div>

        <div className="mixA">
          {/* ───────────── MARQUEE (A) ───────────── */}
          <div className="marquee-wrap" aria-hidden="true">
            <div className="marquee-track">
              {[0, 1, 2, 3].flatMap((r) => MARQUEE.map((item) => (
                <div key={`${r}-${item}`} className="m-item"><span></span>{item}</div>
              )))}
            </div>
          </div>

          {/* ───────────── QUÉ ES (A: terminal + rosa de los vientos) ───────────── */}
          <section id="sobre" className="section sobre" aria-labelledby="sobre-title">
            <div className="sobre-aperture" aria-hidden="true" />
            <div className="about-grid">
              <div>
                <p className="eyebrow">Qué es Norte Tech</p>
                <h2 id="sobre-title" className="sec-title display">Hay gente construyendo al lado tuyo.</h2>
                <p className="sec-sub">
                  Norte Tech junta a founders, builders e inversores que viven y trabajan en zona norte.
                  Nos vemos en meetups, coworks y charlas para mostrar lo que estamos haciendo, pedir feedback
                  y armar equipo sin tener que ir hasta Capital.
                </p>
              </div>
              <div>
                <Terminal total={total} />
              </div>
            </div>
            <WindRose cards={ABOUT_CARDS} />
          </section>

          {/* ───────────── ENCUENTROS: un capítulo por tipo de encuentro ───────────── */}
          <section id="fotos" className="section encuentros enc" aria-labelledby="fotos-title">
            <div className="enc-hd">
              <div>
                <p className="eyebrow">Encuentros</p>
                <h2 id="fotos-title" className="sec-title display">Así son los encuentros.</h2>
                <p className="sec-sub">Meetups, coworks y noches para founders en zona norte. Gente que está construyendo algo, charlando cara a cara.</p>
              </div>
              <nav className="enc-index" aria-label="Tipos de encuentro">
                <ol>
                  {CAPITULOS.map((c) => (
                    <li key={c.id}><a href={`#${c.id}`}><span className="enc-index-n">{c.n}</span>{c.title}</a></li>
                  ))}
                </ol>
              </nav>
            </div>

            <article id="enc-meet" className="enc-ch" aria-labelledby="enc-meet-t">
              <header className="enc-ch-hd">
                <p className="enc-n" aria-hidden="true">01</p>
                <h3 id="enc-meet-t" className="enc-t display">Meet &amp; Talk</h3>
                <p className="enc-meta">Último: Meet &amp; Talk 02 · 14.10</p>
                <p className="enc-d">Charlamos de tecnología y conocemos a los que están construyendo en la zona. En el Random Pick &amp; Talk salen nombres al azar y cada uno tiene 60 segundos para contar quién es y qué está haciendo.</p>
              </header>
              <Galeria hero={MT_HERO} fotos={MT_FOTOS} label="Más fotos del Meet & Talk 02" />
            </article>

            {/* Coworks, Founders Edition y Próximamente: tres tarjetas parejas. Coworks todavía no tiene
                fotos de cámara que pasen el umbral de calidad, así que va sin foto (ver PROPUESTA.md). */}
            <div className="enc-trio">
              <article id="enc-cowork" className="enc-ch enc-ch--text" aria-labelledby="enc-cowork-t">
                <p className="enc-n" aria-hidden="true">02</p>
                <h3 id="enc-cowork-t" className="enc-t display">Coworks</h3>
                <p className="enc-meta">Recurrente · Café García · Santa Bárbara · Islas del Golf</p>
                <p className="enc-d">Una tarde de laburo en cafés, clubes y hubs de zona norte. Traés la compu y trabajás al lado de gente que también está construyendo.</p>
              </article>
              <article id="enc-founders" className="enc-ch enc-ch--text" aria-labelledby="enc-founders-t">
                <p className="enc-n" aria-hidden="true">03</p>
                <h3 id="enc-founders-t" className="enc-t display">Founders Edition</h3>
                <p className="enc-meta">Primera edición · 18.09 · Tigre</p>
                <p className="enc-d">Una noche para founders que ya construyeron algo real: con ronda, facturando o con años encima. Con dinámicas para que termines hablando con gente que no habrías cruzado.</p>
              </article>
              <article id="enc-pronto" className="enc-ch enc-ch--text enc-ch--soon" aria-labelledby="enc-pronto-t">
                <p className="enc-n" aria-hidden="true">04</p>
                <p className="enc-soon">Próximamente</p>
                <h3 id="enc-pronto-t" className="enc-t display">Hackathons y más</h3>
                <p className="enc-d">Estamos armando formatos para construir juntos, no solo para charlar. Todavía no hay fecha: si te sumás a la comunidad, te avisamos primero.</p>
                <button type="button" className="btn btn-ghost enc-soon-btn" data-open-join="">Unirme a la comunidad →</button>
              </article>
            </div>

            <div className="ef-facts" data-reveal>
              {FOTOS_FACT_REQUESTS ? (
                <p className="ef-fact"><strong>{FOTOS_FACT_REQUESTS}</strong><span>pedidos para sumarse a la comunidad</span></p>
              ) : null}
              <p className="ef-fact"><strong>Cupo lleno</strong><span>El primer meetup se llenó. Reservá con tiempo.</span></p>
              <a {...meetup} className="btn btn-green" data-cta="">Reservá tu lugar →</a>
            </div>
          </section>

          {/* ───────────── AGENDA (A: ruta animada + tarjetas) ───────────── */}
          <div className="events-bg">
            <section id="eventos" className="section" aria-labelledby="agenda-title">
              <div className="events-hd">
                <div>
                  <p className="eyebrow">Agenda</p>
                  <h2 id="agenda-title" className="sec-title display">Cómo nos juntamos</h2>
                </div>
                <a {...meetup} className="btn btn-ghost">Sumate al próximo meetup →</a>
              </div>
              <AgendaRoute nextProps={meetup} meetupDate={MEETUP_DATE} />
              <div className="events-grid">
                <article className="ev-card ev-featured">
                  <p className="ev-badge badge-star">Próximo meetup</p>
                  <h3>Meet &amp; Talk</h3>
                  <p>Charlamos de tecnología y conocemos a los que están construyendo en la zona. En el Random Pick &amp; Talk salen nombres al azar y cada uno tiene 60 segundos para contar quién es y qué está haciendo. Sin slides, sin pitch.</p>
                  <div className="ev-meta">
                    <span className="ev-date">{nextDate ? `Zona norte · ${nextDate} · Lugar en Luma` : 'Zona norte · Fecha y lugar en Luma'}</span>
                    <a {...meetup} className="ev-link">Reservá tu lugar →</a>
                  </div>
                </article>
                <article className="ev-card">
                  <div className="ev-badges"><p className="ev-badge badge-ws">Cowork</p></div>
                  <h3>Cowork de la comunidad</h3>
                  <p>Una tarde de laburo en cafés, clubes y hubs de zona norte. Ya pasamos por Café García, Santa Bárbara e Islas del Golf.</p>
                  <div className="ev-meta"><span className="ev-date">Recurrente</span><span>Zona norte</span></div>
                </article>
                <article className="ev-card">
                  <p className="ev-badge badge-hack">Founders</p>
                  <h3>Founders Edition</h3>
                  <p>Una noche para founders que ya construyeron algo real: con ronda, facturando o con años encima. Con dinámicas para que termines hablando con gente que no habrías cruzado.</p>
                  <div className="ev-meta"><span className="ev-date">Con cupo</span><span>Zona norte</span></div>
                </article>
              </div>
            </section>
          </div>

          {/* ───────────── COMUNIDAD (A: chips + showcase + directorio) ───────────── */}
          <section id="comunidad" className="section" aria-labelledby="comunidad-title">
            <div className="comunidad-head">
              <div className="comunidad-head-main">
                <p className="eyebrow">Miembros</p>
                <h2 id="comunidad-title" className="sec-title display">La comunidad</h2>
                <p className="sec-sub">Founders, builders, inversores, growth, marketing y creators de zona norte, cada uno con lo que está construyendo. Si todavía no estás, te sumás en un minuto.</p>
              </div>
            </div>
            <CommunityA counts={stats.live && stats.total > 0 ? stats.categories : null} />
            <div className="members-join">
              <button type="button" className="btn btn-green" data-open-join="">Unirme a la comunidad →</button>
            </div>
          </section>

          {/* ───────────── BANDA CTA (A) ───────────── */}
          <section id="meetup" className="cta-band" aria-labelledby="cta-title">
            <div className="cta-inner">
              <CtaNeedleA targetSelector=".cta-band-btn" />
              <div className="cta-copy">
                <h2 id="cta-title" className="display">¿Te vemos en el próximo?</h2>
                <p>Los meetups son en zona norte y puede venir cualquiera que esté construyendo algo. Reservá tu lugar y vení.</p>
              </div>
              <a {...meetup} className="btn btn-green cta-band-btn" data-cta="">Sumate al próximo meetup</a>
            </div>
          </section>
        </div>
      </main>

      {/* ───────────── FOOTER (A, sin teléfono) ───────────── */}
      <div className="mixA">
        <footer id="contacto">
          <div className="footer-inner">
            <div className="footer-top">
              <div className="f-brand">
                <div className="logo"><BrandLogo variant="logo-horizontal" /></div>
                <p>La comunidad tech de zona norte. Founders, builders e inversores en la misma mesa.</p>
              </div>
              <div className="f-col" role="navigation" aria-labelledby="f-comunidad">
                <h2 className="f-title" id="f-comunidad">Comunidad</h2>
                <a href="#sobre">Qué es</a>
                <a href="#fotos">Encuentros</a>
                <a href="#eventos">Agenda</a>
                <a href="#comunidad">Miembros</a>
                <a href="/login">Iniciar sesión</a>
              </div>
              <div className="f-col" role="navigation" aria-labelledby="f-sumate">
                <h2 className="f-title" id="f-sumate">Sumate</h2>
                <a {...meetup}>Próximo meetup</a>
                <a href="#join" data-open-join="">Unirme a la comunidad</a>
              </div>
            </div>
            <div className="footer-bottom">
              <p>© {new Date().getFullYear()} Norte Tech · Zona norte, Buenos Aires</p>
              <FooterCompassA />
              <a {...meetup} className="f-wa">Sumate al próximo meetup</a>
            </div>
          </div>
        </footer>
      </div>

      <div className="v2">
        <JoinModal />
      </div>
      <Reveal />
      <RevealA />
    </>
  );
}
