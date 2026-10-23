// Categorías públicas de la comunidad (las de los chips del hero) y cómo se
// derivan de los datos que ya guarda el alta: `role` (lista cerrada) + `tags`.
// Sólo se usan para contar; nunca se expone un miembro individual.

export const CATEGORIES = ['Founders', 'Builders', 'Inversores', 'Growth', 'Marketing', 'Creators'] as const;
export type Category = (typeof CATEGORIES)[number];
export type CategoryCounts = Record<Category, number>;

// Colores de partícula por categoría, todos dentro de la paleta de brand-v1.
export const CATEGORY_COLORS: Record<Category, string> = {
  Founders: '#1774FD',
  Builders: '#6EA6FF',
  Inversores: '#A9CAFF',
  Growth: '#0F58DE',
  Marketing: '#C9CAD1',
  Creators: '#8A8A8E',
};

const has = (tags: string[], ...names: string[]) =>
  tags.some((t) => names.includes(t.trim().toLowerCase()));

/**
 * Categoría de un miembro. Los tags explícitos de creación de contenido o
 * marketing ganan; si no, manda el área (`role`) que eligió en el alta.
 */
export function categoryOf(role: string | null | undefined, tags: string[] | null | undefined): Category {
  const t = tags ?? [];
  if (has(t, 'creator', 'creators', 'contenido', 'content', 'creador', 'creadora')) return 'Creators';
  switch (role) {
    case 'Negocio / Fundación': return 'Founders';
    case 'Inversión': return 'Inversores';
    case 'Marketing / Growth': return has(t, 'marketing') ? 'Marketing' : 'Growth';
    case 'Tecnología':
    case 'Producto / Diseño':
      return 'Builders';
    default:
      if (has(t, 'founder')) return 'Founders';
      if (has(t, 'inversor')) return 'Inversores';
      if (has(t, 'marketing')) return 'Marketing';
      if (has(t, 'growth')) return 'Growth';
      return 'Builders';
  }
}

export function emptyCounts(): CategoryCounts {
  return { Founders: 0, Builders: 0, Inversores: 0, Growth: 0, Marketing: 0, Creators: 0 };
}

export interface CommunityStats {
  total: number;
  categories: CategoryCounts;
  /** true cuando los números salen de la base; false = fallback sin datos. */
  live: boolean;
}
