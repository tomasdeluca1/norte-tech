"use client";

import { useEffect, useState } from 'react';
import PresentationFields, { EMPTY_PRESENTATION, presentationPayload, type PresentationState } from './components/PresentationFields';
import { ROLES } from '@/lib/profile-fields';
import CommunityDirectory from './components/CommunityDirectory';
import { PALETTE } from '@/lib/palette';
import BrandLogo from './components/BrandLogo';
import ThemeToggle from './components/ThemeToggle';
import CompassMotif from './components/CompassMotif';
import { MEETUP_URL } from '@/lib/site';

interface Member {
  _id: string;
  name: string;
  initials: string;
  role: string;
  jobTitle?: string;
  company?: string;
  companyUrl?: string;
  tags?: string[];
  colorIndex: number;
  websiteUrl?: string | null;
}

export default function Home() {
  const [isMobOpen, setIsMobOpen] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [me, setMe] = useState<{ name: string; initials: string; colorIndex: number } | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [memberTotal, setMemberTotal] = useState<number | null>(null);

  const [navScrolled, setNavScrolled] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', role: '', jobTitle: '', company: '', companyUrl: '' });
  const [formTags, setFormTags] = useState<string[]>([]);
  const [presentation, setPresentation] = useState<PresentationState>(EMPTY_PRESENTATION);
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const patchPresentation = (patch: Partial<PresentationState>) => setPresentation(prev => ({ ...prev, ...patch }));

  const CATEGORIES = ['Founders', 'Builders', 'Inversores', 'Growth', 'Marketing', 'Creators'];
  const AVAILABLE_TAGS = ['AI', 'SaaS', 'Fintech', 'Web3', 'Proptech', 'Dev', 'Design', 'Marketing', 'Founder', 'Builder', 'Inversor'];
  const toggleTag = (tag: string) => setFormTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const closeMob = () => setIsMobOpen(false);

  // CTA principal: la página de Luma del próximo meetup (MEETUP_URL en lib/site.ts).
  // Sin URL configurada, el CTA abre el formulario de alta.
  const meetupLinkProps = MEETUP_URL
    ? { href: MEETUP_URL, target: '_blank', rel: 'noopener noreferrer' }
    : { href: '#join', onClick: (e: React.MouseEvent) => { e.preventDefault(); setIsMobOpen(false); setShowJoinModal(true); } };

  const fetchMembers = () => {
    fetch('/api/members')
      .then(r => r.json())
      .then(data => {
        setMembers(data.members ?? []);
        if (typeof data.total === 'number') setMemberTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setMembersLoading(false));
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Estado de sesión para el chip del nav (top-right).
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setMe(d.user ?? null))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/';
  };

  // Nav condenses on scroll + scroll-reveal for sections (progressive
  // enhancement: hidden state only applies once JS marks the doc ready).
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const root = document.documentElement;
    root.classList.add('reveal-ready');
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-reveal], .about-grid > div, .feat, .terminal, .events-hd, .ev-card:not(.ev-dim), .comunidad-head, .cta-inner',
      ),
    );
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    targets.forEach((t, i) => {
      t.style.setProperty('--reveal-i', String(i % 6));
      io.observe(t);
    });

    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, []);

  // Builders con sitio propio, para la grilla de la sección comunidad.
  // Cortamos en 8: esto es un showcase,
  // el listado completo y buscable es el CommunityDirectory de más abajo.
  const sites = members.filter(m => m.websiteUrl).slice(0, 8);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth > 960) closeMob(); };
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobOpen || showJoinModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
  }, [isMobOpen, showJoinModal]);

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('loading');
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tags: formTags, ...presentationPayload(presentation) }),
      });
      if (!res.ok) throw new Error('Error al registrar');
      setFormStatus('success');
      fetchMembers();
    } catch (err) {
      setFormStatus('error');
    }
  };

  const handleAddAnother = () => {
    setFormData({ name: '', email: '', role: '', jobTitle: '', company: '', companyUrl: '' });
    setFormTags([]);
    setPresentation(EMPTY_PRESENTATION);
    setFormStatus('idle');
  };

  return (
    <>
      <nav className={navScrolled ? 'scrolled' : ''}>
        <a href="#" className="nav-logo" aria-label="Norte Tech, inicio">
          <BrandLogo variant="logo-horizontal" className="nav-logo-full" />
          <BrandLogo variant="cursor" className="nav-logo-mark" />
        </a>
        <ul className="nav-center">
          <li><a href="#sobre">Qué es</a></li>
          <li><a href="#eventos">Agenda</a></li>
          <li><a href="#comunidad">Comunidad</a></li>
        </ul>
        <div className="nav-right">
          <ThemeToggle />
          {me ? (
            <>
              <a href="/dashboard" className="nav-user" title="Ir a mi dashboard">
                <span
                  className="nav-user-av"
                  style={{ background: PALETTE[me.colorIndex % PALETTE.length].bg, color: PALETTE[me.colorIndex % PALETTE.length].color }}
                >{me.initials}</span>
                <span className="nav-user-name">{me.name.split(' ')[0]}</span>
              </a>
              <button onClick={handleLogout} className="btn btn-outline nav-logout">Salir</button>
            </>
          ) : (
            <a href="/login" className="btn btn-outline">Iniciar sesión</a>
          )}
          <a {...meetupLinkProps} className="btn btn-green nav-cta">Próximo meetup</a>
          <button className={`hamburger ${isMobOpen ? 'open' : ''}`} onClick={() => setIsMobOpen(!isMobOpen)} aria-label="Menú">
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      <div className={`mobile-menu ${isMobOpen ? 'open' : ''}`} id="mob">
        <a href="#sobre" onClick={closeMob}>Qué es</a>
        <a href="#eventos" onClick={closeMob}>Agenda</a>
        <a href="#comunidad" onClick={closeMob}>Comunidad</a>
        {me ? (
          <>
            <a href="/dashboard" onClick={closeMob}>Mi dashboard</a>
            <button className="btn btn-outline" onClick={() => { closeMob(); handleLogout(); }}>Salir</button>
          </>
        ) : (
          <a href="/login" onClick={closeMob}>Iniciar sesión</a>
        )}
        <a {...meetupLinkProps} className="btn btn-green">Sumate al próximo meetup</a>
        {!me && (
          <button className="btn btn-outline" onClick={() => { closeMob(); setShowJoinModal(true); }}>
            Unirme a la comunidad
          </button>
        )}
      </div>

      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-grid"></div>

        <div className="hero-left container" style={{ maxWidth: 'none' }}>
          <div className="pill">
            <span className="pill-dot"></span>
            Comunidad tech
            <span className="pill-sep">·</span>
            Zona norte
          </div>
          <h1 className="hero-h1 display">Encontrá tu norte.</h1>
          <p className="hero-sub">
            La comunidad tech de zona norte.<br />
            Founders, builders e inversores en la misma mesa.
          </p>
          <div className="hero-actions">
            <a {...meetupLinkProps} className="btn btn-green">Sumate al próximo meetup</a>
            <button onClick={() => setShowJoinModal(true)} className="btn btn-ghost">Unirme a la comunidad</button>
          </div>
          <ul className="nt-chips" aria-label="Quiénes forman la comunidad">
            {CATEGORIES.map(c => <li key={c} className="nt-chip">{c}</li>)}
          </ul>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="val">{memberTotal ?? '·'}</div>
              <div className="lbl">Miembros</div>
            </div>
            <div className="hero-stat">
              <div className="val">2025</div>
              <div className="lbl">Desde</div>
            </div>
            <div className="hero-stat">
              <div className="val">6</div>
              <div className="lbl">Perfiles en la mesa</div>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-emblem">
            <CompassMotif />
            <BrandLogo variant="isologo" className="hero-isologo" />
          </div>
        </div>

        <a href="#sobre" className="hero-scroll" aria-label="Bajar">
          <span className="hero-scroll-dot" />
          scroll
        </a>
      </section>

      <div className="marquee-wrap">
        <div className="marquee-track">
          {Array(20).fill([
            'Inteligencia Artificial', 'Fintech', 'SaaS', 'Web3', 'Proptech',
            'Healthtech', 'EdTech', 'Developer Tools', 'E-commerce', 'Networking'
          ]).flat().map((item, i) => (
            <div key={i} className="m-item"><span></span>{item}</div>
          ))}
        </div>
      </div>

      <section id="sobre" className="section">
        <div className="about-grid">
          <div>
            <div className="eyebrow">Qué es Norte Tech</div>
            <h2 className="sec-title display">Hay gente construyendo al lado tuyo.</h2>
            <p className="sec-sub">
              Norte Tech junta a founders, builders e inversores que viven y trabajan en zona norte.
              Nos vemos en meetups, coworks y charlas para mostrar lo que estamos haciendo, pedir feedback
              y armar equipo sin tener que ir hasta Capital.
            </p>
            <div className="feat-grid">
              <div className="feat"><div className="feat-icon">01</div><h4>Meetups</h4><p>Encuentros cortos y sin slides. Contás en qué andás y conocés a los que están en lo mismo.</p></div>
              <div className="feat"><div className="feat-icon">02</div><h4>Coworks</h4><p>Tardes de laburo compartido en cafés y clubes de la zona. Traés la compu, el resto sale solo.</p></div>
              <div className="feat"><div className="feat-icon">03</div><h4>Red</h4><p>Founders con ronda, builders que despliegan todos los días e inversores que quieren ver proyectos de cerca.</p></div>
              <div className="feat"><div className="feat-icon">04</div><h4>Feedback</h4><p>Mostrás tu producto y te devuelven algo útil. Sin filtro y sin pitch armado.</p></div>
            </div>
          </div>
          <div>
            <div className="terminal">
              <div className="t-bar">
                <div className="td"></div><div className="td"></div><div className="td"></div>
                <span>~/norte-tech</span>
              </div>
              <div className="t-body mono">
                <div><span className="pr">$</span> <span className="cm">whoami</span></div>
                <div><span className="ou">→ founders, builders, inversores, growth, marketing, creators</span></div>
                <div>&nbsp;</div>
                <div><span className="pr">$</span> <span className="cm">cat ./comunidad.json</span></div>
                <div><span className="ou">{`{ "nombre": "Norte Tech",`}</span></div>
                <div><span className="ou">&nbsp;&nbsp;{`"miembros": ${memberTotal ?? 163},`}</span></div>
                <div><span className="ou">&nbsp;&nbsp;{`"desde": 2025,`}</span></div>
                <div><span className="ou">&nbsp;&nbsp;{`"estado": "shipping" }`}</span></div>
                <div>&nbsp;</div>
                <div><span className="pr">$</span> <span className="cm">next --meetup</span></div>
                <div><span className="ou">→ zona norte, Buenos Aires</span></div>
                <div>&nbsp;</div>
                <div><span className="pr">$</span> <span className="cm">join<span className="cursor"></span></span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="events-bg">
        <section id="eventos" className="section">
          <div className="events-hd">
            <div>
              <div className="eyebrow">Agenda</div>
              <h2 className="sec-title display">Cómo nos juntamos</h2>
            </div>
            <a {...meetupLinkProps} className="btn btn-ghost">Sumate al próximo meetup →</a>
          </div>
          <div className="events-grid">
            <div className="ev-card ev-featured">
              <div className="ev-badge badge-star">Próximo meetup</div>
              <h3>Meet &amp; Talk</h3>
              <p>Charlamos de tecnología y conocemos a los que están construyendo en la zona. En el Random Pick &amp; Talk salen nombres al azar y cada uno tiene 60 segundos para contar quién es y qué está haciendo. Sin slides, sin pitch.</p>
              <div className="ev-meta">
                <span className="ev-date">Zona norte · Fecha y lugar en Luma</span>
                <a {...meetupLinkProps} className="ev-link">Reservá tu lugar →</a>
              </div>
            </div>
            <div className="ev-card">
              <div className="ev-badge badge-ws">Cowork</div>
              <h3>Cowork de la comunidad</h3>
              <p>Una tarde de laburo en cafés y clubes de la zona. Ya pasamos por Café García, Santa Bárbara e Islas del Golf.</p>
              <div className="ev-meta"><span className="ev-date">Recurrente</span><span>Zona norte</span></div>
            </div>
            <div className="ev-card">
              <div className="ev-badge badge-hack">Founders</div>
              <h3>Founders Edition</h3>
              <p>Una noche para founders que ya construyeron algo real: con ronda, facturando o con años encima. Con dinámicas para que termines hablando con gente que no habrías cruzado.</p>
              <div className="ev-meta"><span className="ev-date">Con cupo</span><span>Zona norte</span></div>
            </div>
          </div>
        </section>
      </div>

      <section id="comunidad" className="section">
        <div className="comunidad-head">
          <div className="comunidad-head-main">
            <div className="eyebrow">Miembros</div>
            <h2 className="sec-title display">La comunidad</h2>
            <p className="sec-sub">Founders, builders, inversores, growth, marketing y creators de zona norte, cada uno con lo que está construyendo. Si todavía no estás, te sumás en un minuto.</p>
          </div>
        </div>

        {membersLoading ? (
          <div className="sites"><div className="dir-grid">
            {Array.from({ length: 6 }).map((_, i) => <div className="dir-card site-skel" key={i} />)}
          </div></div>
        ) : sites.length > 0 && (
          <div className="sites"><div className="dir-grid">
            {sites.map(m => {
              const c = PALETTE[m.colorIndex % PALETTE.length];
              const sub = m.jobTitle && m.company ? `${m.jobTitle} @ ${m.company}` : (m.jobTitle || m.role);
              return (
                <div className="dir-card dir-card-t1" key={m._id}>
                  <div className="dir-av" style={{ background: c.bg, color: c.color }}>{m.initials}</div>
                  <div className="dir-info">
                    <div className="dir-name">{m.name}</div>
                    <div className="dir-sub">{sub}</div>
                  </div>
                  <a className="dir-cta" href={m.websiteUrl as string} target="_blank" rel="noopener">
                    Ver sitio →
                  </a>
                </div>
              );
            })}
          </div></div>
        )}

        <CommunityDirectory />

        <div className="members-join">
          {me
            ? <a href="/dashboard#tu-sitio" className="btn btn-outline">Sumá tu sitio →</a>
            : <button onClick={() => setShowJoinModal(true)} className="btn btn-green">Unirme a la comunidad →</button>}
        </div>
      </section>

      <div id="join" className="cta-band">
        <div className="cta-inner">
          <div>
            <h2 className="display">¿Te vemos en el próximo?</h2>
            <p>Los meetups son en zona norte y puede venir cualquiera que esté construyendo algo. Reservá tu lugar y vení.</p>
          </div>
          <a {...meetupLinkProps} className="btn btn-green" style={{ fontSize: '.9rem', padding: '16px 36px' }}>
            Sumate al próximo meetup
          </a>
        </div>
      </div>

      <footer id="contacto">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="f-brand">
              <div className="logo">
                <BrandLogo variant="logo-horizontal" />
              </div>
              <p>La comunidad tech de zona norte. Founders, builders e inversores en la misma mesa.</p>
            </div>
            <div className="f-col">
              <h5>Comunidad</h5>
              <a href="#sobre">Qué es</a>
              <a href="#comunidad">Miembros</a>
              <a href="#eventos">Agenda</a>
              <a href="/login">Iniciar sesión</a>
            </div>
            <div className="f-col">
              <h5>Sumate</h5>
              <a {...meetupLinkProps}>Próximo meetup</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setShowJoinModal(true); }}>Unirme a la comunidad</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} Norte Tech · Zona norte, Buenos Aires</p>
            <a {...meetupLinkProps} className="f-wa">Sumate al próximo meetup</a>
          </div>
        </div>
      </footer>

      {showJoinModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowJoinModal(false); }}>
          <div className="modal-card">
            <button onClick={() => setShowJoinModal(false)} className="modal-close" aria-label="Cerrar">&times;</button>

            {formStatus === 'success' ? (
              <div className="modal-success">
                <div className="success-badge">✓</div>
                <h3 className="success-title">¡Estás <span style={{ color: 'var(--accent)' }}>adentro</span>!</h3>
                <p className="success-text">Ya sos parte de Norte Tech.</p>
                <div className="success-note">
                  <strong>$ status --ok</strong><br />
                  Te mandamos un mail con tu <strong>acceso al dashboard</strong> y la <strong>invitación al grupo de WhatsApp</strong>. Revisá el inbox (y el spam, por las dudas).
                </div>
                <div className="success-actions">
                  <button onClick={handleAddAnother} className="btn btn-outline">+ Registrar a otro builder</button>
                </div>
              </div>
            ) : (
              <>
                <div className="modal-eyebrow">$ join --community</div>
                <h3 className="modal-title">Sumate a <span className="serif-hl">Norte Tech</span></h3>
                <p className="modal-sub">Contanos quién sos, dónde vivís y qué construís. Entrás al toque: te llega un mail con tu acceso y la invitación al grupo de WhatsApp.</p>

                <form onSubmit={handleJoinSubmit} className="modal-form">
                  <div className="field">
                    <label>Nombre completo</label>
                    <input required placeholder="Ej. Ada Lovelace" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="field">
                    <label>E-mail</label>
                    <input required type="email" placeholder="ada@ejemplo.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label>¿Cuál es tu área?</label>
                      <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                        <option value="" disabled>Seleccioná tu área...</option>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Cargo <span className="opt">(opcional)</span></label>
                      <input placeholder="Ej. Partner & CTO" maxLength={80} value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label>Empresa / Proyecto</label>
                      <input placeholder="Ej. Norte Tech" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                    </div>
                    <div className="field">
                      <label>URL</label>
                      <input type="text" placeholder="tu-empresa.com" value={formData.companyUrl} onChange={e => setFormData({...formData, companyUrl: e.target.value})} />
                    </div>
                  </div>
                  <div className="field">
                    <label>Tags <span className="opt">(opcional)</span></label>
                    <div className="tag-picker">
                      {AVAILABLE_TAGS.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`tag-btn${formTags.includes(tag) ? ' active' : ''}`}
                        >{tag}</button>
                      ))}
                    </div>
                  </div>
                  <div className="modal-eyebrow" style={{ marginTop: 4 }}>$ tu --presentación</div>
                  <PresentationFields value={presentation} onChange={patchPresentation} />
                  <button type="submit" disabled={formStatus === 'loading'} className="btn btn-green">
                    {formStatus === 'loading' ? 'Guardando...' : 'Unirme a Norte Tech →'}
                  </button>
                  {formStatus === 'error' && <p className="form-error">Hubo un error al guardar. Intentá de nuevo.</p>}
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
