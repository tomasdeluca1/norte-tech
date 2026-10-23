// Opciones compartidas por el form de alta, la página /completar, el dashboard,
// el admin y la validación del backend. Editá estas listas para ajustar barrios
// o intenciones de matchmaking.

// `role` es la FUNCIÓN/ÁREA del builder (lista cerrada, para filtros y
// validación). El título real va en `jobTitle` (texto libre, ej. "Partner &
// CTO"); si queda vacío se deriva con ROLE_TITLE.
export const ROLES = [
  'Negocio / Fundación',
  'Tecnología',
  'Producto / Diseño',
  'Marketing / Growth',
  'Inversión',
  'Otro',
] as const;

// Cargo corto derivado de la función (fallback cuando no escriben el suyo).
export const ROLE_TITLE: Record<string, string> = {
  'Negocio / Fundación': 'Founder',
  'Tecnología':          'Dev',
  'Producto / Diseño':   'Product',
  'Marketing / Growth':  'Growth',
  'Inversión':           'Inversor',
  'Otro':                'Builder',
};

// Tags default del alta cuando el usuario no elige ninguno (espejo por función).
export const ROLE_TAGS: Record<string, string[]> = {
  'Negocio / Fundación': ['Founder'],
  'Tecnología':          ['Dev'],
  'Producto / Diseño':   ['Product'],
  'Marketing / Growth':  ['Growth'],
  'Inversión':           ['Inversor'],
  'Otro':                ['Builder'],
};

// Barrios de Tigre + localidades de zona norte. Formato "Barrio · Localidad".
const TIGRE_BARRIOS = [
  'Los Castores', 'El Yacht', 'La Isla', 'Los Lagos', 'El Golf', 'Las Caletas',
  'Vistas', 'Portezuelo', 'El Portón', 'Cabos del Lago', 'Bahía Grande',
  'La Alameda', 'Santa Catalina', 'El Rincón', 'Los Sauces', 'El Naudir',
];

export const NEIGHBORHOODS: string[] = [
  ...TIGRE_BARRIOS.map((b) => `${b} · Tigre`),
  'Tigre · otro barrio',
  'Tigre',
  'Benavídez',
  'General Pacheco',
  'San Isidro',
  'San Fernando',
  'Vicente López',
  'Pilar',
  'Escobar',
  'Otra zona',
];

const KNOWN = new Set(NEIGHBORHOODS);
const BARRIO_BY_KEY = new Map(TIGRE_BARRIOS.map((b) => [b.toLowerCase(), b]));

/**
 * Normaliza un barrio guardado al formato actual. Migración en lectura (sin
 * tocar la base): los valores viejos con formato "Prefijo · Barrio" de uno de
 * los barrios de Tigre pasan a "Barrio · Tigre", y "Prefijo · otro barrio" a
 * "Tigre · otro barrio". Se reescriben solos cuando el miembro vuelve a guardar.
 */
export function normalizeNeighborhood(value: string | null | undefined): string {
  if (!value) return '';
  const v = value.trim();
  if (KNOWN.has(v)) return v;
  const m = /^([^·]+)·\s*(.+)$/.exec(v);
  if (m) {
    const tail = m[2].trim().toLowerCase();
    if (tail === 'otro barrio') return 'Tigre · otro barrio';
    const barrio = BARRIO_BY_KEY.get(tail);
    if (barrio) return `${barrio} · Tigre`;
  }
  return v;
}

/** Etiqueta visible de un barrio/zona (siempre en el formato actual). */
export function neighborhoodLabel(value: string | null | undefined): string {
  return normalizeNeighborhood(value);
}

// Qué busca cada builder en la comunidad (chips).
export const LOOKING_FOR_OPTIONS: string[] = [
  'Cofounder',
  'Clientes',
  'Inversión',
  'Mentoría',
  'Talento / equipo',
  'Feedback',
  'Networking',
];
