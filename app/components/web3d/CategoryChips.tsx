"use client";

// Chips de categoría del hero. Hover o foco: las partículas/estrellas de esa
// categoría se encienden y se acercan. En touch, tocar alterna el resaltado.
import { useState } from 'react';
import { CATEGORIES, type Category, type CommunityStats } from '@/lib/categories';
import { bus } from './bus';

export default function CategoryChips({ stats }: { stats: CommunityStats | null }) {
  const [pinned, setPinned] = useState<Category | null>(null);
  const live = !!stats?.live && stats.total > 0;
  const set = (c: Category | null) => { bus.category = c ?? pinned; };
  return (
    <ul className="nt-chips nt-chips--live" aria-label="Quiénes forman la comunidad">
      {CATEGORIES.map((c) => (
        <li key={c}>
          <button
            type="button"
            className={`nt-chip${pinned === c ? ' is-on' : ''}`}
            aria-pressed={pinned === c}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') set(c); }}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') set(null); }}
            onFocus={() => set(c)}
            onBlur={() => set(null)}
            onClick={() => {
              const next = pinned === c ? null : c;
              setPinned(next);
              bus.category = next;
            }}
          >
            {c}
            {live && stats!.categories[c] > 0 ? <span className="nt-chip-n">{stats!.categories[c]}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
