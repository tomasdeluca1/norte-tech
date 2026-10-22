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

// Barrios de Nordelta + localidades de zona norte.
export const NEIGHBORHOODS: string[] = [
  'Nordelta · Los Castores',
  'Nordelta · El Yacht',
  'Nordelta · La Isla',
  'Nordelta · Los Lagos',
  'Nordelta · El Golf',
  'Nordelta · Las Caletas',
  'Nordelta · Vistas',
  'Nordelta · Portezuelo',
  'Nordelta · El Portón',
  'Nordelta · Cabos del Lago',
  'Nordelta · Bahía Grande',
  'Nordelta · La Alameda',
  'Nordelta · Santa Catalina',
  'Nordelta · El Rincón',
  'Nordelta · Los Sauces',
  'Nordelta · El Naudir',
  'Nordelta · otro barrio',
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

// Etiqueta visible de un barrio/zona. Los valores guardados en la base no cambian
// (compatibilidad con los datos existentes); sólo se reescribe lo que se muestra.
const NEIGHBORHOOD_PREFIX = /^Nordelta\s*·\s*/;
export function neighborhoodLabel(value: string | null | undefined): string {
  if (!value) return '';
  if (!NEIGHBORHOOD_PREFIX.test(value)) return value;
  const rest = value.replace(NEIGHBORHOOD_PREFIX, '');
  const name = rest.charAt(0).toUpperCase() + rest.slice(1);
  return `${name} · Tigre`;
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
