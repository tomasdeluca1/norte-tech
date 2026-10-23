"use client";

// Chips de categoría del hero.
// - Desktop con brújula 3D: hover o foco enciende las partículas de esa categoría;
//   click fija el resaltado (toggle con aria-pressed).
// - Compacto (<= 960 px o touch, sin 3D): el chip es una acción: filtra el
//   directorio por esa categoría y baja a #comunidad (N1-4). Sin aria-pressed.
// Números por categoría: ocultos por defecto (D-A, HERO_CHIP_COUNTS en lib/site.ts);
// el único número del hero es el total.
import { useEffect, useState } from 'react';
import { CATEGORIES, type Category, type CommunityStats } from '@/lib/categories';
import { HERO_CHIP_COUNTS } from '@/lib/site';
import { setBusCategory } from './bus';

export const COMPACT_QUERY = '(max-width: 960px), (pointer: coarse)';
export const FILTER_EVENT = 'nt:filter';

export default function CategoryChips({ stats }: { stats: CommunityStats | null }) {
  const [pinned, setPinned] = useState<Category | null>(null);
  const [compact, setCompact] = useState(false);
  const live = !!stats?.live && stats.total > 0;

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const preview = (c: Category | null) => { if (!compact) setBusCategory(c ?? pinned); };

  const filterDirectory = (c: Category) => {
    document.documentElement.classList.add('cv-off'); // ver showAllSections en home/Reveal.tsx
    window.dispatchEvent(new CustomEvent<Category>(FILTER_EVENT, { detail: c }));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('comunidad')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <ul className="chips" aria-label={compact ? 'Ver la comunidad por categoría' : 'Quiénes forman la comunidad'}>
      {CATEGORIES.map((c) => (
        <li key={c}>
          <button
            type="button"
            className="chip"
            aria-pressed={compact ? undefined : pinned === c}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') preview(c); }}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') preview(null); }}
            onFocus={() => preview(c)}
            onBlur={() => preview(null)}
            onClick={() => {
              if (compact) { filterDirectory(c); return; }
              const next = pinned === c ? null : c;
              setPinned(next);
              setBusCategory(next);
            }}
          >
            {c}
            {HERO_CHIP_COUNTS && live && stats!.categories[c] > 0 ? <span>{stats!.categories[c]}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
