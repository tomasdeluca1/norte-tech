// Home de Norte Tech (v2, DISENO-ITERACION de Marketing). Server Component:
// todo el texto sale en el HTML; quedan como islas cliente sólo la brújula
// (Hero3D), los chips, el contador, la terminal, la aguja de la banda CTA, el
// directorio, la barra y el formulario de alta.
import Image from 'next/image';
import './home.css';
import BrandLogo from './components/BrandLogo';
import SiteNav, { type MeetupLink } from './components/home/SiteNav';
import JoinModal from './components/home/JoinModal';
import Reveal from './components/home/Reveal';
import CommunityDirectory from './components/CommunityDirectory';
import Hero3D from './components/web3d/Hero3D';
import CategoryChips from './components/web3d/CategoryChips';
import CountUp from './components/web3d/CountUp';
import Terminal from './components/web3d/Terminal';
import CtaNeedle from './components/web3d/CtaNeedle';
import FooterCompass from './components/web3d/FooterCompass';
import CompassCursor from './components/web3d/CompassCursor';
import { getCommunityStats } from '@/lib/stats';
import {
  MEETUP_URL, MEETUP_DATE, AREABETA_URL, isAreabetaPromoActive,
  MEET_TALK_01_DATE_PLACEHOLDER, NAV_MEETUPS_LINK, FOTOS_FACT_REQUESTS,
} from '@/lib/site';

import fotoTrio from '@/public/meetups/mt02-trio-risas.webp';
import fotoRonda from '@/public/meetups/mt02-ronda-mic-crop.webp';
import fotoPizarra from '@/public/meetups/mt02-pizarra.webp';
import fotoSonrisa from '@/public/meetups/mt02-sonrisa.webp';
import fotoRecorrida from '@/public/meetups/mt02-recorrida.webp';
import fotoPresenta from '@/public/meetups/mt02-presenta-risa-crop.webp';
import fotoMicVentanal from '@/public/meetups/mt02-mic-ventanal-crop.webp';
import fotoCafeGarcia from '@/public/meetups/cowork-cafe-garcia.webp';
import fotoSantaBarbara from '@/public/meetups/cowork-santa-barbara.webp';
import fotoIslasGolf from '@/public/meetups/cowork-islas-del-golf.webp';

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

const ABOUT_CARDS = [
  { k: '01 · N', title: 'Meetups', text: 'Encuentros cortos y sin slides. Contás en qué andás y conocés a los que están en lo mismo.' },
  { k: '02 · E', title: 'Coworks', text: 'Tardes de laburo compartido en cafés y clubes de la zona. Traés la compu y trabajás al lado de otros.' },
  { k: '03 · S', title: 'Red', text: 'Founders, builders, inversores y gente de growth, marketing y contenido que vive en la zona.' },
  { k: '04 · O', title: 'Feedback', text: 'Mostrás tu producto y te devuelven algo útil. Sin pitch armado.' },
];

export default async function Home() {
  const stats = await getCommunityStats();
  const total = stats.live && stats.total > 0 ? stats.total : null;
  const nextDate = shortDate(MEETUP_DATE);
  const promo = isAreabetaPromoActive();

  // CTA principal: la página de Luma del próximo meetup (MEETUP_URL en lib/site.ts).
  // Sin URL, el CTA abre el formulario de alta (data-open-join, ver JoinModal).
  const meetup: MeetupLink = MEETUP_URL
    ? { href: MEETUP_URL, target: '_blank', rel: 'noopener noreferrer' }
    : { href: '#join', 'data-open-join': '' };

  const route = [
    { name: 'Meet & Talk 01', meta: MEET_TALK_01_DATE_PLACEHOLDER },
    { name: 'Founders Edition', meta: '18.09 · Tigre' },
    { name: 'Meet & Talk 02', meta: '14.10 · Areabeta' },
  ];

  return (
    <div className="v2">
      <a className="skip" href="#contenido">Saltar al contenido</a>
      <SiteNav meetup={meetup} />

      <main id="contenido">
        {/* ───────────── HERO A' · brújula viva ───────────── */}
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero-copy">
            {nextDate ? (
              <p className="pill pill--live"><span className="pill-dot" aria-hidden="true" />Próximo meetup · {nextDate}</p>
            ) : (
              <p className="pill"><span className="pill-dot" aria-hidden="true" />Comunidad tech · Zona norte</p>
            )}
            <h1 id="hero-title" className="h-display">Encontrá tu <span className="u-amber">norte</span>.</h1>
            <p className="hero-sub">La comunidad tech de zona norte. Founders, builders e inversores en la misma mesa.</p>
            <div className="hero-actions">
              <a {...meetup} className="btn btn-primary btn-lg hero-cta" data-hero-cta="" data-cta="">Sumate al próximo meetup</a>
              <button type="button" className="btn btn-ghost btn-lg" data-open-join="">Unirme a la comunidad</button>
            </div>
            <div className="hero-meta">
              <CategoryChips stats={stats} />
              {/* Único número del hero: miembros activos reales (Neon). Sin dato real no se muestra. */}
              {total ? (
                <p className="hero-count">
                  <span className="sr-only">{total} miembros, desde 2025</span>
                  <span aria-hidden="true"><strong><CountUp value={total} /></strong> miembros <span className="sep">·</span> desde 2025</span>
                </p>
              ) : null}
            </div>
          </div>
          <div className="hero-visual">
            <Hero3D stats={stats} />
          </div>
          <CompassCursor />
        </section>

        {/* ───────────── FOTOS · Así fue el segundo (reemplaza al marquee) ───────────── */}
        <section className="section fotos" id="fotos" aria-labelledby="fotos-title">
          <div className="sec-head" data-reveal>
            <p className="eyebrow">Meet &amp; Talk 02 · 14.10 · Areabeta</p>
            <h2 id="fotos-title" className="h2">Así fue el segundo.</h2>
            <p className="lead">Arrancamos con una pizarra en blanco y dos preguntas: qué venís a buscar y qué podés ofrecer. Se llenó. Después, ronda de presentaciones con micrófono y recorrida por Areabeta.</p>
          </div>
          <div className="bento">
            <figure className="ph ph-a">
              <Image src={fotoTrio} placeholder="blur" sizes="(max-width: 720px) 100vw, 600px" alt="Tres personas riéndose a cámara en un salón con techo de hormigón y ventanales: un chico de rulos con remera negra, una chica de pelo largo y un chico de camisa blanca." />
              <figcaption>La previa</figcaption>
            </figure>
            <figure className="ph ph-b">
              <Image src={fotoRonda} placeholder="blur" sizes="(max-width: 720px) 50vw, 300px" alt="Un chico de remera blanca habla con micrófono al lado de una pizarra, con ventanales azules del atardecer atrás." />
              <figcaption>La ronda</figcaption>
            </figure>
            <figure className="ph ph-c">
              <Image src={fotoPizarra} placeholder="blur" sizes="(max-width: 720px) 50vw, 300px" alt="Un chico de espaldas mira una pizarra blanca escrita a mano con dos columnas: qué vengo a buscar y qué puedo ofrecer." />
              <figcaption>La pizarra</figcaption>
            </figure>
            <figure className="ph ph-d">
              <Image src={fotoSonrisa} placeholder="blur" sizes="(max-width: 720px) 50vw, 300px" alt="Una chica sonríe a cámara en medio de un salón con gente charlando en grupos." />
              <figcaption>Gente nueva</figcaption>
            </figure>
            <figure className="ph ph-e">
              <Image src={fotoRecorrida} placeholder="blur" sizes="(max-width: 720px) 50vw, 300px" alt="Un grupo grande camina y charla entre escritorios de una oficina con ventanales." />
              <figcaption>Recorrida por Areabeta</figcaption>
            </figure>
          </div>
          <div className="facts" data-reveal>
            {FOTOS_FACT_REQUESTS ? (
              <p className="fact"><strong className="amber-num">{FOTOS_FACT_REQUESTS}</strong><span>pedidos para sumarse a la comunidad</span></p>
            ) : null}
            <p className="fact"><strong>Cupo lleno</strong><span>En el primer meetup quedó gente afuera. Reservá con tiempo.</span></p>
            <a {...meetup} className="btn btn-primary btn-lg" data-cta="">Reservá tu lugar</a>
          </div>
        </section>

        {/* ───────────── QUÉ ES (sin scroll pinneado; la rosa es la grilla) ───────────── */}
        <section className="section about" id="sobre" aria-labelledby="sobre-title">
          <div className="about-head">
            <div className="about-copy" data-reveal>
              <svg className="about-rose" viewBox="-280 -280 560 560" aria-hidden="true" focusable="false">
                <circle r="250" className="ar-ring" />
                <path className="ar-mark" d="M-255 0L-179 -15L-179 15ZM255 0L179 -15L179 15ZM0 131L14 176L0 230L-14 176Z" />
                <path className="ar-mark" d="M0 -255L-15 -179L15 -179Z" />
                <g className="ar-needle">
                  <path fill="#1774FD" d="M0 -230L-104 9L0 -59Z" />
                  <path fill="#0F58DE" d="M0 -230L104 9L0 -59Z" />
                </g>
              </svg>
              <p className="eyebrow">Qué es Norte Tech</p>
              <h2 id="sobre-title" className="h2">Hay gente construyendo al lado tuyo.</h2>
              <p className="lead">Norte Tech junta a founders, builders e inversores que viven y trabajan en zona norte. Nos vemos en meetups, coworks y charlas para mostrar lo que estamos haciendo, pedir feedback y armar equipo sin tener que ir hasta Capital.</p>
            </div>
            <div data-reveal>
              <Terminal total={total} />
            </div>
          </div>
          <ol className="cards4">
            {ABOUT_CARDS.map((c, i) => (
              <li key={c.title} className="card" data-dir={i} data-reveal>
                <span className="card-k">{c.k}</span>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ───────────── AGENDA (ruta de meetups) ───────────── */}
        <section className="section agenda" id="eventos" aria-labelledby="agenda-title">
          <div className="sec-head sec-head--row" data-reveal>
            <div>
              <p className="eyebrow">Agenda</p>
              <h2 id="agenda-title" className="h2">Cómo nos juntamos</h2>
            </div>
          </div>
          <ol className="route" aria-label="Meetups de Norte Tech" data-reveal>
            {route.map((s) => (
              <li key={s.name} className="stop past">
                <span className="dot" aria-hidden="true" />
                <b>{s.name}</b>
                {s.meta ? <small>{s.meta}</small> : null}
              </li>
            ))}
            <li className="stop next">
              <span className="dot" aria-hidden="true" />
              <a {...meetup} className="stop-link"><b>Próximo meetup</b></a>
              <small>{nextDate ? `${nextDate} · Lugar en Luma` : 'Fecha y lugar en Luma'}</small>
            </li>
          </ol>
          <div className="events">
            <article className="ev ev-featured" data-reveal>
              <div className="ev-photo">
                <Image src={fotoPresenta} placeholder="blur" sizes="(max-width: 860px) 100vw, 480px" alt="Una chica con suéter negro se ríe mientras presenta frente a una pizarra, con ventanales al atardecer." />
              </div>
              <div className="ev-body">
                <p className="badge">Próximo meetup</p>
                <h3>Meet &amp; Talk</h3>
                <p>Charlamos de tecnología y conocemos a los que están construyendo en la zona. En el Random Pick &amp; Talk salen nombres al azar y cada uno tiene 60 segundos para contar quién es y qué está haciendo. Sin slides, sin pitch.</p>
                <div className="ev-foot"><span>Zona norte · {nextDate ? `${nextDate} · lugar en Luma` : 'Fecha y lugar en Luma'}</span><a {...meetup} className="link">Reservá tu lugar <span aria-hidden="true">→</span></a></div>
              </div>
            </article>
            <article className="ev" data-reveal>
              <div className="ev-top">
                <p className="badge badge-muted">Cowork</p>
                {promo && <p className="badge badge-amber">Octubre: cowork gratis en Areabeta</p>}
              </div>
              <h3>Cowork de la comunidad</h3>
              <p>Una tarde de laburo en cafés, clubes y hubs de la zona. Ya pasamos por <a className="link-inline" href={AREABETA_URL} target="_blank" rel="noopener noreferrer">Areabeta</a>, Café García, Santa Bárbara e Islas del Golf.</p>
              <ul className="thumbs" aria-label="Lugares donde hicimos coworks">
                <li><Image src={fotoCafeGarcia} placeholder="blur" sizes="(max-width: 860px) 33vw, 180px" alt="" /><span>Café García</span></li>
                <li><Image src={fotoSantaBarbara} placeholder="blur" sizes="(max-width: 860px) 33vw, 180px" alt="" /><span>Santa Bárbara</span></li>
                <li><Image src={fotoIslasGolf} placeholder="blur" sizes="(max-width: 860px) 33vw, 180px" alt="" /><span>Islas del Golf</span></li>
              </ul>
              <div className="ev-foot"><span>Recurrente · Zona norte</span></div>
            </article>
            <article className="ev" data-reveal>
              <div className="ev-top"><p className="badge badge-muted">Founders</p></div>
              <h3>Founders Edition</h3>
              <p>Una noche para founders que ya construyeron algo real: con ronda, facturando o con años encima. Con dinámicas para que termines hablando con gente que no habrías cruzado.</p>
              <div className="ev-foot"><span>Con cupo · Zona norte</span></div>
            </article>
          </div>
        </section>

        {/* ───────────── BASE · Areabeta con foto ───────────── */}
        <section className="section base" id="base" aria-labelledby="base-title">
          <figure className="base-photo" data-reveal>
            <Image src={fotoMicVentanal} placeholder="blur" sizes="(max-width: 860px) 100vw, 460px" alt="Un chico de camisa blanca habla con micrófono en un salón con columnas de hormigón y ventanales al atardecer." />
          </figure>
          <div className="base-copy" data-reveal>
            <p className="eyebrow">Dónde nos juntamos</p>
            <h2 id="base-title" className="h2">Nuestra base: Areabeta</h2>
            <p className="lead">Varios de nuestros encuentros fueron en Areabeta, un hub de comunidad e innovación en zona norte. Ahí hacemos meetups y coworks.</p>
            <a href={AREABETA_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-lg">Conocé Areabeta <span aria-hidden="true">→</span></a>
          </div>
        </section>

        {/* ───────────── COMUNIDAD (una sola grilla con filtros) ───────────── */}
        <section className="section comunidad" id="comunidad" aria-labelledby="comunidad-title">
          <div className="sec-head" data-reveal>
            <p className="eyebrow">Miembros</p>
            <h2 id="comunidad-title" className="h2">La comunidad</h2>
            <p className="lead">Founders, builders, inversores, growth, marketing y creators de zona norte, cada uno con lo que está construyendo. Si todavía no estás, te sumás en un minuto.</p>
          </div>
          <CommunityDirectory />
          <div className="members-join">
            <button type="button" className="btn btn-ghost btn-lg" data-open-join="">Unirme a la comunidad</button>
          </div>
        </section>

        {/* ───────────── BANDA CTA ───────────── */}
        <section className="cta" id="meetup" aria-labelledby="cta-title">
          <div className="cta-inner" data-reveal>
            <CtaNeedle targetSelector=".cta-btn" />
            <div>
              <h2 id="cta-title" className="h2">¿Te vemos en el próximo?</h2>
              <p className="lead">Los meetups son en zona norte y puede venir cualquiera que esté construyendo algo. Reservá tu lugar y vení.</p>
            </div>
            <a {...meetup} className="btn btn-primary btn-xl cta-btn" data-cta="">Sumate al próximo meetup</a>
          </div>
        </section>
      </main>

      <footer className="footer" id="contacto">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="f-brand">
              <BrandLogo variant="logo-horizontal" />
              <p>La comunidad tech de zona norte. Founders, builders e inversores en la misma mesa.</p>
            </div>
            <nav className="f-col" aria-labelledby="f-comunidad">
              <p className="f-title" id="f-comunidad">Comunidad</p>
              <a href="#sobre">Qué es</a>
              {NAV_MEETUPS_LINK && <a href="#fotos">Meetups</a>}
              <a href="#eventos">Agenda</a>
              <a href="#comunidad">Miembros</a>
              <a href="/login">Iniciar sesión</a>
            </nav>
            <nav className="f-col" aria-labelledby="f-sumate">
              <p className="f-title" id="f-sumate">Sumate</p>
              <a {...meetup}>Próximo meetup</a>
              <a href="#join" data-open-join="">Unirme a la comunidad</a>
            </nav>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Norte Tech · Zona norte, Buenos Aires</p>
            <FooterCompass />
          </div>
        </div>
      </footer>

      <JoinModal />
      <Reveal />
    </div>
  );
}
