"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { PALETTE } from '@/lib/palette';
import { CATEGORIES, categoryOf, type Category } from '@/lib/categories';
import AssembleGrid from './web3d/AssembleGrid';

export interface DirectoryMember {
  _id: string;
  name: string;
  initials: string;
  role: string;
  jobTitle?: string | null;
  company?: string | null;
  companyUrl?: string | null;
  websiteUrl?: string | null;
  tags?: string[];
  colorIndex: number;
  tier: 1 | 2 | 3;
}

const FIRST_PAGE = 12;
const PAGE_SIZE = 24;

/**
 * Directorio de toda la comunidad activa (una sola grilla, con filtros por
 * categoría y búsqueda), escalonado: T1 (sitio propio) con tarjeta destacada,
 * T2 (web de empresa) con chip "web ↗", T3 básica. Arranca con 12 tarjetas.
 */
export default function CommunityDirectory() {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [visible, setVisible] = useState(FIRST_PAGE);
  const pick = (c: Category | null) => { setCategory(c); setVisible(FIRST_PAGE); };

  const [failed, setFailed] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // A demanda (crítica v2 §3.3 paso 3): el fetch sale cuando el directorio está a
  // 800 px de entrar en pantalla, no en el mount (saca la request del arranque).
  useEffect(() => {
    const el = root.current;
    let started = false;
    const load = () => {
      if (started) return;
      started = true;
      fetch('/api/members/all')
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then((d) => { setMembers(d.members ?? []); setLoaded(true); })
        .catch(() => { setFailed(true); setLoaded(true); });
    };
    if (!el || !('IntersectionObserver' in window)) { load(); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '800px 0px' });
    io.observe(el);
    // Los chips del hero en mobile filtran el directorio (N1-4): también lo cargan.
    const onFilter = (e: Event) => { const c = (e as CustomEvent<Category>).detail; if (c) pick(c); load(); };
    window.addEventListener('nt:filter', onFilter);
    return () => { io.disconnect(); window.removeEventListener('nt:filter', onFilter); };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inCat = category ? members.filter((m) => categoryOf(m.role, m.tags) === category) : members;
    if (!q) return inCat;
    return inCat.filter((m) =>
      [m.name, m.company, m.role, m.jobTitle, ...(m.tags ?? [])]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q)));
  }, [members, query, category]);

  const shown = filtered.slice(0, visible);

  const filters = (
    <ul className="chips dir-filter" aria-label="Filtrar la comunidad por categoría">
      <li><button type="button" className="chip" aria-pressed={category === null} onClick={() => pick(null)}>Todos</button></li>
      {CATEGORIES.map((c) => (
        <li key={c}><button type="button" className="chip" aria-pressed={category === c} onClick={() => pick(category === c ? null : c)}>{c}</button></li>
      ))}
    </ul>
  );

  if (!loaded) return <div className="dir" ref={root}>{filters}<p className="dir-empty" role="status">Cargando la comunidad…</p></div>;
  if (failed) return <div className="dir" ref={root}><p className="dir-empty" role="status">No pudimos cargar la comunidad. Probá de nuevo en un rato.</p></div>;

  return (
    <div className="dir" ref={root}>
      {filters}
      <div className="dir-head">
        <input
          className="dir-search"
          type="search"
          aria-label="Buscar en la comunidad"
          placeholder="Buscar por nombre, empresa, rol o tag…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setVisible(FIRST_PAGE); }}
        />
        <span className="dir-count" aria-live="polite">{filtered.length} de {members.length} miembros</span>
      </div>

      {!filtered.length ? (
        <p className="dir-empty">No encontramos a nadie con eso.</p>
      ) : (
        <>
          <AssembleGrid className="dir-grid" key={category ?? 'all'}>
            {shown.map((m, i) => {
              const order = { ['--i' as string]: Math.min(i % PAGE_SIZE, 11) };
              const c = PALETTE[m.colorIndex % PALETTE.length];
              const sub = m.jobTitle && m.company ? `${m.jobTitle} @ ${m.company}` : (m.jobTitle || m.role);

              if (m.tier === 1 && m.websiteUrl) {
                return (
                  <div className="dir-card dir-card-t1" key={m._id} style={order}>
                    <div className="dir-av" style={{ background: c.bg, color: c.color }}>{m.initials}</div>
                    <div className="dir-info">
                      <div className="dir-name">{m.name}</div>
                      <div className="dir-sub">{sub}</div>
                    </div>
                    <a className="dir-cta" href={m.websiteUrl} target="_blank" rel="noopener noreferrer">
                      Ver sitio →
                    </a>
                  </div>
                );
              }

              const web = m.tier === 2 ? m.companyUrl : null;
              return (
                <div className="dir-card" key={m._id} style={order}>
                  <div className="dir-av" style={{ background: c.bg, color: c.color }}>{m.initials}</div>
                  <div className="dir-info">
                    <div className="dir-name">{m.name}</div>
                    <div className="dir-sub">{sub}</div>
                  </div>
                  {web && <a className="dir-cta dir-cta-web" href={web} target="_blank" rel="noopener noreferrer">web ↗</a>}
                </div>
              );
            })}
          </AssembleGrid>

          {filtered.length > visible && (
            <button type="button" className="btn btn-ghost btn-md dir-more" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              {visible === FIRST_PAGE ? 'Ver toda la comunidad' : `Ver más (${filtered.length - visible})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
