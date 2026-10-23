import React from 'react';
import {
  SNAPSHOT_LABEL, GROWTH, ROLES, VERTICALS, LOOKING_FOR, GEOGRAPHY,
  TEAM, TIERS, CONTACT, type Sponsor,
} from './pitch-data';
import { SHOWCASE_BUILDERS } from '@/lib/builder-ranking';
import { AreaChart, Donut, Bars, Legend } from './charts';

const PILLARS = [
  { t: 'Gente construyendo', d: 'Founders, co-founders, primeros hires y primeros usuarios. Todos con algo entre manos, no espectadores.' },
  { t: 'Se comparte lo que funciona', d: 'Workshops y charlas de founders que ya lo hicieron, y sesiones para destrabar problemas reales.' },
  { t: 'La red de la zona', d: 'Mentores, inversores y empresas de Zona Norte, a mano y en persona.' },
  { t: 'Se construye, no se chatea', d: 'No es otro grupo de WhatsApp. Nos juntamos a hacer cosas, con las manos en el teclado.' },
];

const ACTIVITY = [
  { t: 'Co-works', d: 'Ya van varios, en distintos puntos de la zona.', done: true },
  { t: 'Kick-off', d: 'El encuentro fundacional de la comunidad.', done: false },
  { t: 'Build with AI', d: 'Sesión práctica: de idea a MVP en pocas horas.', done: false },
  { t: 'Hackathon #1', d: 'El primer hackathon de la zona.', done: false },
];

// Co-works ya realizados. `img` se completa cuando lleguen las fotos reales
// (dropear en /public/coworks/); mientras tanto la card muestra un placeholder.
const COWORKS: { venue: string; img?: string }[] = [
  { venue: 'Club Santa Bárbara', img: '/coworks/santa-barbara.jpg' },
  { venue: 'Café García', img: '/coworks/cafe-garcia.jpg' },
  { venue: 'SUM · Islas del Golf', img: '/coworks/islas-del-golf.jpg' },
];

const SPONSOR_WINS = [
  { t: 'Una audiencia que construye', d: 'Founders y builders AI-first de Zona Norte, en un solo lugar.' },
  { t: 'Tu marca donde pasa', d: 'Presencia en los eventos y en el sitio de la comunidad.' },
  { t: 'Acceso a talento', d: 'Gente que ya está buscando equipo y proyectos.' },
  { t: 'Las startups de la zona, de cerca', d: 'Ves qué se está construyendo antes que nadie.' },
];

function Snapshot() {
  return <div className="s-snapshot">{SNAPSHOT_LABEL}</div>;
}

export function buildSlides(memberTotal: number, sponsor?: Sponsor): React.ReactNode[] {
  // El último punto del crecimiento usa el total en vivo (coherente con el bignum).
  const growthData = GROWTH.map((g, i) => (
    i === GROWTH.length - 1 ? { label: g.label, n: memberTotal } : g
  ));

  const slides: React.ReactNode[] = [
    // 1 — Cover
    <React.Fragment key="cover">
      <div className="s-eyebrow">{sponsor ? sponsor.coverEyebrow : 'Pitch para sponsors · 2026'}</div>
      <h1 className="s-title">BUILD<br />THE FUTURE</h1>
      <p className="s-lead">La comunidad tech de zona norte. Founders, builders e inversores en la misma mesa.</p>
      {sponsor && (
        <div className="sponsor-lockup">
          <span className="sl-label">Sponsor principal</span>
          <img className="sl-logo" src={sponsor.logoSrc} alt={sponsor.name} />
        </div>
      )}
      <div className="deck-foot"><span className="big">{memberTotal}+ builders</span>Norte Tech · zona norte</div>
    </React.Fragment>,

    // 2 — La oportunidad
    <React.Fragment key="oportunidad">
      <div className="s-eyebrow">La oportunidad</div>
      <h1 className="s-title">ACÁ HAY MUCHA<br />GENTE QUE<br />CONSTRUYE</h1>
      <p className="s-lead">
        Zona Norte está lleno de founders, builders e inversores. Hasta ahora cada uno remaba solo:
        no había un lugar tech que los junte. Eso es lo que estamos armando.
      </p>
    </React.Fragment>,

    // 3 — Qué es
    <React.Fragment key="quees">
      <div className="s-eyebrow">Qué es Norte Tech</div>
      <h1 className="s-title">TECH NACE<br />EN ZONA NORTE</h1>
      <p className="s-lead">
        Una comunidad de builders que vive y trabaja en la zona. Nos juntamos a construir,
        no a hacer networking de tarjetita.
      </p>
      <div className="s-grid cols-2">
        {PILLARS.map((p) => (
          <div className="feat-box" key={p.t}><h4>{p.t}</h4><p>{p.d}</p></div>
        ))}
      </div>
    </React.Fragment>,

    // 4 — Tracción
    <React.Fragment key="traccion">
      <div className="s-eyebrow">Tracción</div>
      <div className="s-bignum">{memberTotal}+</div>
      <p className="s-lead">builders en cuestión de semanas. Sin pauta, todo boca a boca.</p>
      <AreaChart data={growthData} width={900} height={210} />
      <Snapshot />
    </React.Fragment>,

    // 5 — Quiénes son
    <React.Fragment key="quienes">
      <div className="s-eyebrow">Quiénes son</div>
      <h1 className="s-title">NO ES UNA LISTA<br />DE EMAILS</h1>
      <div className="roles">
        <Donut data={ROLES} />
        <Legend data={ROLES} />
      </div>
      <p className="s-lead" style={{ marginTop: 14 }}>8 de cada 10 son founders o builders.</p>
      <Snapshot />
    </React.Fragment>,

    // 6 — Los builders
    <React.Fragment key="builders">
      <div className="s-eyebrow">La comunidad</div>
      <h1 className="s-title">ESTA ES LA<br />COMUNIDAD</h1>
      <p className="s-lead">
        Estos son algunos: founders, builders e inversores que viven acá y ya construyeron
        cosas serias, de exits a productos en producción.
      </p>
      <div className="builder-grid">
        {SHOWCASE_BUILDERS.map((b) => (
          <div className="builder-card" key={b.name}>
            {b.photo
              ? <img className="builder-av builder-ph" src={b.photo} alt={b.name} />
              : <div className="builder-av">{b.initials}</div>}
            <div className="builder-info">
              <div className="builder-nm">{b.name}</div>
              <div className="builder-ro">{b.role} · <span className="builder-co">{b.company}</span></div>
            </div>
          </div>
        ))}
      </div>
    </React.Fragment>,

    // 7 — Qué construyen
    <React.Fragment key="construyen">
      <div className="s-eyebrow">Qué construyen</div>
      <h1 className="s-title">UNA COMUNIDAD<br />AI-FIRST</h1>
      <Bars data={VERTICALS} max={VERTICALS[0].n} />
      <Snapshot />
    </React.Fragment>,

    // 7 — De dónde son
    <React.Fragment key="geo">
      <div className="s-eyebrow">De dónde son</div>
      <h1 className="s-title">TODO A 20 MINUTOS</h1>
      <p className="s-lead">Por eso pasa en persona, no sólo en un chat.</p>
      <div className="chips" style={{ marginTop: 24 }}>
        {GEOGRAPHY.map((g) => (<span className="chip" key={g}>{g}</span>))}
      </div>
    </React.Fragment>,

    // 8 — Qué buscan
    <React.Fragment key="buscan">
      <div className="s-eyebrow">Qué buscan</div>
      <h1 className="s-title">VIENEN A BUSCAR<br />COSAS CONCRETAS</h1>
      <Bars data={LOOKING_FOR} max={LOOKING_FOR[0].n} />
      <Snapshot />
    </React.Fragment>,

    // 9 — Qué hacemos
    <React.Fragment key="hacemos">
      <div className="s-eyebrow">Qué hacemos</div>
      <h1 className="s-title">ESTO RECIÉN ARRANCA</h1>
      <div className="s-grid cols-4">
        {ACTIVITY.map((a) => (
          <div className="feat-box" key={a.t}>
            <h4>{a.t} {a.done ? '✓' : ''}</h4>
            <p>{a.d}</p>
          </div>
        ))}
      </div>
    </React.Fragment>,

    // 10 — Co-works (ya pasa, con fotos reales de los encuentros)
    <React.Fragment key="coworks">
      <div className="s-eyebrow">Los co-works</div>
      <h1 className="s-title">YA NOS JUNTAMOS<br />A CONSTRUIR</h1>
      <p className="s-lead">No es un plan a futuro: ya hicimos co-works en distintos puntos de Zona Norte.</p>
      <div className="cowork-grid">
        {COWORKS.map((c) => (
          <div className="cowork-card" key={c.venue}>
            {c.img ? (
              <img className="cowork-img" src={c.img} alt={`Co-work en ${c.venue}`} />
            ) : (
              <div className="cowork-ph">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="8.5" cy="9.5" r="1.5" />
                  <path d="M21 15l-5-5L5 20" />
                </svg>
                <span className="ph-tx">Foto próximamente</span>
              </div>
            )}
            <div className="cowork-venue">{c.venue}</div>
          </div>
        ))}
      </div>
    </React.Fragment>,

    // 11 — Equipo
    <React.Fragment key="equipo">
      <div className="s-eyebrow">Quiénes lo organizan</div>
      <h1 className="s-title">GENTE QUE VIVE Y<br />CONSTRUYE ACÁ</h1>
      <div className="s-grid cols-3">
        {TEAM.map((m) => (
          <div className="team-card" key={m.name}>
            {m.photo
              ? <img className="team-av team-ph" src={m.photo} alt={m.name} />
              : <div className="team-av">{m.initials}</div>}
            <div className="nm">{m.name}</div>
            <div className="ro">{m.role}</div>
          </div>
        ))}
      </div>
    </React.Fragment>,

    // 12 — Por qué un sponsor (genérico o a medida del sponsor)
    <React.Fragment key="porque">
      <div className="s-eyebrow">{sponsor ? `Por qué ${sponsor.name}` : 'Por qué sumarte'}</div>
      <h1 className="s-title">{sponsor ? sponsor.whyTitle : 'QUÉ GANÁS'}</h1>
      <div className="s-grid cols-2">
        {(sponsor ? sponsor.why : SPONSOR_WINS).map((w) => (
          <div className="feat-box" key={w.t}><h4>{w.t}</h4><p>{w.d}</p></div>
        ))}
      </div>
    </React.Fragment>,

    // 13 — Lo que proponemos (sólo con sponsor)
    sponsor ? (
      <React.Fragment key="propuesta">
        <div className="s-eyebrow">Lo que proponemos</div>
        <h1 className="s-title">{sponsor.proposalTitle}</h1>
        <div className="proposal">
          <img className="proposal-logo" src={sponsor.logoSrc} alt={sponsor.name} />
          <p className="s-lead">{sponsor.proposalLead}</p>
          <ul className="proposal-list">
            {sponsor.proposal.map((p) => (
              <li key={p.t}><strong>{p.t}.</strong> {p.d}</li>
            ))}
          </ul>
          <p className="s-snapshot">{sponsor.proposalNote}</p>
        </div>
      </React.Fragment>
    ) : null,

    // 14 — Formas de sumarte
    <React.Fragment key="formas">
      <div className="s-eyebrow">Formas de sumarte</div>
      <h1 className="s-title">ELEGÍ CÓMO ENTRAR</h1>
      <div className="s-grid cols-3">
        {TIERS.map((t) => {
          const top = t.name === 'Lead';
          return (
            <div className={`tier-card${top ? ' lead' : ''}`} key={t.name}>
              {sponsor && sponsor.proposalTier === t.name && (
                <div className="tier-flag">Para {sponsor.name}</div>
              )}
              {top && <div className="tier-rank">◆ El nivel más alto</div>}
              <div className="tn">{t.name}</div>
              <div className="tt">{t.tagline}</div>
              <ul>{t.perks.map((p) => (<li key={p}>{p}</li>))}</ul>
            </div>
          );
        })}
      </div>
      <p className="s-snapshot">Sin precio de lista: armamos el formato juntos.</p>
    </React.Fragment>,

    // 15 — Hablemos
    <React.Fragment key="hablemos">
      <div className="s-eyebrow">Hablemos</div>
      <h1 className="s-title">SUMATE A LA QUE<br />CONSTRUYE LA ZONA</h1>
      <p className="s-lead">
        Si querés acompañar esto desde el lado que construye Zona Norte, escribinos y
        armamos el formato.
      </p>
      <div className="deck-foot">
        {CONTACT.emails.map((e) => (
          <span className="big" key={e}><a href={`mailto:${e}`}>{e}</a></span>
        ))}
        {CONTACT.site ? <span>{CONTACT.site}</span> : null}
      </div>
    </React.Fragment>,
  ];

  // Quita los slots nulos (p. ej. "Lo que proponemos" cuando no hay sponsor).
  return slides.filter(Boolean) as React.ReactNode[];
}
