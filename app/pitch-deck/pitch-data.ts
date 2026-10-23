// Snapshot de la comunidad a junio 2026 (datos reales de la DB de producción).
// El TOTAL de miembros se hidrata en vivo desde /api/members; este número es el fallback.
// Refrescado el 2026-06-23 con scripts/community-stats.js.
export const SNAPSHOT_LABEL = 'Datos a junio 2026';
export const MEMBERS_FALLBACK = 163; // miembros activos al 2026-06-23

// Acumulado por mes (de un grupo de 6 a 163 en semanas).
export const GROWTH = [
  { label: 'mar', n: 4 },
  { label: 'may', n: 6 },
  { label: 'jun', n: 163 },
];

export const ROLES = [
  { label: 'Founder / CEO', n: 84 },
  { label: 'Dev / Engineer', n: 46 },
  { label: 'Marketing / Growth', n: 12 },
  { label: 'Otro', n: 10 },
  { label: 'Product / Design', n: 9 },
  { label: 'Inversor', n: 2 },
];

export const VERTICALS = [
  { label: 'AI', n: 95 },
  { label: 'SaaS', n: 59 },
  { label: 'Fintech', n: 30 },
  { label: 'Marketing', n: 26 },
  { label: 'Design', n: 21 },
  { label: 'Web3', n: 20 },
  { label: 'Proptech', n: 3 },
];

export const LOOKING_FOR = [
  { label: 'Networking', n: 71 },
  { label: 'Feedback', n: 32 },
  { label: 'Talento / equipo', n: 28 },
  { label: 'Clientes', n: 26 },
  { label: 'Mentoría', n: 24 },
  { label: 'Cofounder', n: 22 },
  { label: 'Inversión', n: 14 },
];

export const GEOGRAPHY = [
  'Tigre', 'Vicente López', 'Pilar', 'San Isidro', 'Escobar', 'General Pacheco', 'San Fernando',
];

// `websites` es el conteo previo a la migración: no incluye a los builders cuyo huevsite se
// convirtió en website_url. Recontar después de correr drizzle/0004 con:
//   SELECT count(*) FILTER (WHERE COALESCE(website_url,'') <> '')::int FROM members WHERE status='active';
export const PLATFORM = { linkedin: 81, websites: 23 };

export type TeamMember = { name: string; initials: string; role: string; photo?: string };
export const TEAM: TeamMember[] = [
  { name: 'Tomás Deluca', initials: 'TD', role: 'Organizador', photo: '/organizers/tomas-deluca.jpg' },
  { name: 'Patricio Iturraspe', initials: 'PI', role: 'Organizador', photo: '/organizers/patricio-iturraspe.jpg' },
  { name: 'Lucas Argento', initials: 'LA', role: 'Organizador', photo: '/organizers/lucas-argento.jpg' },
];

// Orden ascendente: de menor a mayor. Lead va al final = el nivel más alto.
export const TIERS = [
  {
    name: 'Friend',
    tagline: 'Bancás que esto crezca.',
    perks: [
      'Mención como sponsor',
      'Invitaciones a los encuentros',
      'Acceso al directorio de builders',
    ],
  },
  {
    name: 'Partner',
    tagline: 'Acompañás de cerca.',
    perks: [
      'Marca en eventos y en la plataforma',
      'Acceso a la comunidad para contratar o testear',
      'Participación en una actividad por ciclo',
    ],
  },
  {
    name: 'Lead',
    tagline: 'El sponsor principal del ciclo.',
    perks: [
      'Tu marca al frente de los eventos',
      'Espacio para hablar en los encuentros',
      'Presencia en el sitio de la comunidad',
      'Línea directa con la comunidad',
    ],
  },
];

export const CONTACT = { emails: ['tomasdelucaa@gmail.com', 'nortetech.ar@gmail.com'], site: 'Norte Tech · zona norte' };

// ── Perfil de sponsor (opcional) ─────────────────────────────────────────────
// Cuando se pasa a buildSlides(), el deck se personaliza para ese sponsor: cover
// co-brandeada con su logo, slide "Por qué <sponsor>", slide "Lo que proponemos"
// y el tier propuesto destacado. Sin sponsor, el deck queda genérico (/pitch-deck).
export type Sponsor = {
  name: string;
  logoSrc: string;        // archivo en /public — swappable por el logo oficial
  coverEyebrow: string;
  whyTitle: string;
  why: { t: string; d: string }[];
  proposalTier: string;   // debe coincidir con un TIERS[].name
  proposalTitle: string;
  proposalLead: string;
  proposal: { t: string; d: string }[];
  proposalNote: string;
};

export const BALANZ: Sponsor = {
  name: 'Balanz',
  logoSrc: '/sponsors/balanz.png',
  coverEyebrow: 'Propuesta para Balanz · 2026',
  whyTitle: 'ACÁ ESTÁ TU CLIENTE',
  why: [
    {
      t: 'Ya son vecinos',
      d: 'Balanz se mudó a zona norte para estar cerca de sus clientes de Zona Norte. La comunidad construye a minutos de esa oficina. Falta que se conozcan.',
    },
    {
      t: 'Tu segmento, sin vueltas',
      d: 'Founders con liquidez y builders bien pagos, varios con exits reales. No es awareness difuso: es tu cliente, reunido en un solo lugar.',
    },
    {
      t: 'La marca de los que construyen',
      d: 'La inversión tradicional le habla a la generación anterior. Balanz se planta con la próxima ola de founders y patrimonio.',
    },
    {
      t: 'Talento y deal-flow',
      d: '46 miembros para tus equipos y las startups fintech/AI de la zona, de cerca, antes que nadie.',
    },
  ],
  proposalTier: 'Lead',
  proposalTitle: 'ABRÍ LA PUERTA',
  proposalLead:
    'Balanz como sponsor principal (Lead) y sede del primer ciclo: kick-off, Build with AI y Hackathon #1.',
  proposal: [
    {
      t: 'La sede',
      d: 'El co-work y los encuentros del ciclo en las áreas comunes de la sede de Balanz en zona norte. La comunidad entra por tu puerta.',
    },
    {
      t: 'La producción',
      d: 'Balanz banca catering y armado de los encuentros. El espacio ya lo tenés; esto es lo que lo hace pasar.',
    },
    {
      t: 'El premio',
      d: 'Balanz pone el premio del Hackathon #1. Lo más on-brand para una inversora: bancar a los que construyen.',
    },
    {
      t: 'La voz',
      d: 'Una charla de Balanz a la comunidad: qué hacer con la plata después de una ronda o un exit. Referente, no banner.',
    },
  ],
  proposalNote: 'El número fino lo cerramos juntos en la próxima reunión.',
};
