"use client";

// Sección comunidad con el look de la versión A (4b96efd): chips de filtro arriba,
// showcase de builders con sitio propio (AssembleGrid) y el directorio completo.
// Del PR #9 se mantiene: el directorio pide datos recién cerca del viewport, y el
// showcase hace lo mismo (no suma requests al arranque).
import { useEffect, useRef, useState } from 'react';
import { PALETTE } from '@/lib/palette';
import { CATEGORIES, categoryOf, type Category } from '@/lib/categories';
import CommunityDirectory from '../CommunityDirectory';
import AssembleGrid from '../web3d/AssembleGrid';

interface Member {
  _id: string; name: string; initials: string; role: string; jobTitle?: string; company?: string;
  tags?: string[]; colorIndex: number; websiteUrl?: string | null;
}

// counts: conteo real por categoría (getCommunityStats, Neon, miembros activos).
// Llega null si la base no respondió: en ese caso no se muestra ningún número.
export default function CommunityA({ counts = null }: { counts?: Record<Category, number> | null }) {
  const [cat, setCat] = useState<Category | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    let started = false;
    const load = () => {
      if (started) return;
      started = true;
      fetch('/api/members')
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then((d) => setMembers(d.members ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    if (!el || !('IntersectionObserver' in window)) { load(); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '800px 0px' });
    io.observe(el);
    // Los chips del hero en mobile filtran la comunidad: el chip activo acá también cambia.
    const onFilter = (e: Event) => { const c = (e as CustomEvent<Category>).detail; if (c) setCat(c); load(); };
    window.addEventListener('nt:filter', onFilter);
    return () => { io.disconnect(); window.removeEventListener('nt:filter', onFilter); };
  }, []);

  const sites = members
    .filter((m) => m.websiteUrl)
    .filter((m) => !cat || categoryOf(m.role, m.tags) === cat)
    .slice(0, 8);

  return (
    <div ref={root}>
      <ul className="nt-chips dir-filter dir-filter--a" aria-label="Filtrar la comunidad por categoría">
        <li><button type="button" className={`nt-chip${cat === null ? ' is-on' : ''}`} aria-pressed={cat === null} onClick={() => setCat(null)}>Todos</button></li>
        {CATEGORIES.map((c) => (
          <li key={c}>
            <button type="button" className={`nt-chip${cat === c ? ' is-on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(cat === c ? null : c)}>{c}{counts && counts[c] > 0 ? <span className="nt-chip-n">{counts[c]}</span> : null}</button>
          </li>
        ))}
      </ul>

      {loading ? (
        <div className="sites"><div className="dir-grid">
          {Array.from({ length: 4 }).map((_, i) => <div className="dir-card site-skel" key={i} />)}
        </div></div>
      ) : sites.length > 0 && (
        <div className="sites"><AssembleGrid className="dir-grid" key={cat ?? 'all'}>
          {sites.map((m, i) => {
            const c = PALETTE[m.colorIndex % PALETTE.length];
            const sub = m.jobTitle && m.company ? `${m.jobTitle} @ ${m.company}` : (m.jobTitle || m.role);
            return (
              <div className="dir-card dir-card-t1" key={m._id} style={{ ['--i' as string]: i }}>
                <div className="dir-av" style={{ background: c.bg, color: c.color }} aria-hidden="true">{m.initials}</div>
                <div className="dir-info">
                  <div className="dir-name">{m.name}</div>
                  <div className="dir-sub">{sub}</div>
                </div>
                <a className="dir-cta" href={m.websiteUrl as string} target="_blank" rel="noopener noreferrer">Ver sitio →</a>
              </div>
            );
          })}
        </AssembleGrid></div>
      )}

      <CommunityDirectory category={cat} hideFilters />
    </div>
  );
}
