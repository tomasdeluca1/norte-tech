"use client";

// Chips de categoría del hero (y filtros del directorio). Hover o foco: las
// partículas de esa categoría se encienden en la brújula. Tocar/click fija el
// resaltado (aria-pressed). Los números son los reales de Neon (vía props del
// Server Component); si no hay datos, los chips van sin número.
import { useState } from 'react';
import { CATEGORIES, type Category, type CommunityStats } from '@/lib/categories';
import { setBusCategory } from './bus';

export default function CategoryChips({ stats }: { stats: CommunityStats | null }) {
  const [pinned, setPinned] = useState<Category | null>(null);
  const live = !!stats?.live && stats.total > 0;
  const preview = (c: Category | null) => setBusCategory(c ?? pinned);
  return (
    <ul className="chips" aria-label="Quiénes forman la comunidad">
      {CATEGORIES.map((c) => (
        <li key={c}>
          <button
            type="button"
            className="chip"
            aria-pressed={pinned === c}
            onPointerEnter={(e) => { if (e.pointerType === 'mouse') preview(c); }}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') preview(null); }}
            onFocus={() => preview(c)}
            onBlur={() => preview(null)}
            onClick={() => {
              const next = pinned === c ? null : c;
              setPinned(next);
              setBusCategory(next);
            }}
          >
            {c}
            {live && stats!.categories[c] > 0 ? <span>{stats!.categories[c]}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
