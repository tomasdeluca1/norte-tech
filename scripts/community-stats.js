/* eslint-disable */
// Conteos agregados de la comunidad (solo lectura) para refrescar la data del
// pitch deck (app/pitch-deck/pitch-data.ts) y la landing. NO escribe ni envía.
//   node scripts/community-stats.js          # legible
//   node scripts/community-stats.js --json    # JSON para pegar
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

// Tags de identidad (los agrega /api/join según el rol) — no son verticales.
const IDENTITY_TAGS = new Set(['Founder', 'Dev', 'Product', 'Growth', 'Builder', 'Inversor']);

const ROLE_LABEL = {
  'Negocio / Fundación': 'Founder / CEO',
  'Tecnología': 'Dev / Engineer',
  'Marketing / Growth': 'Marketing / Growth',
  'Producto / Diseño': 'Product / Design',
  'Inversión': 'Inversor',
  'Otro': 'Otro',
};

// Zona de un barrio guardado. Formato actual "Barrio · Tigre"; los valores
// viejos "Prefijo · Barrio" (barrios de Tigre) también cuentan como Tigre.
function areaOf(neighborhood) {
  if (!neighborhood) return null;
  if (neighborhood.includes('·')) return 'Tigre';
  return neighborhood.trim() || null;
}

async function main() {
  loadDotEnv();
  const sql = neon(process.env.DATABASE_URL);
  const json = process.argv.includes('--json');

  const A = sql`status = 'active'`;
  const [{ total }] = await sql`SELECT count(*)::int AS total FROM members WHERE status='active'`;
  const [{ totalna }] = await sql`SELECT count(*)::int AS totalna FROM members WHERE status='active' AND is_admin=false`;

  const growthRows = await sql`
    SELECT to_char(created_at, 'YYYY-MM') AS ym, count(*)::int AS n
    FROM members WHERE status='active'
    GROUP BY ym ORDER BY ym`;

  const roleRows = await sql`
    SELECT role, count(*)::int AS n FROM members WHERE status='active'
    GROUP BY role ORDER BY n DESC`;

  const tagRows = await sql`
    SELECT tag, count(*)::int AS n
    FROM members, unnest(tags) AS tag
    WHERE status='active'
    GROUP BY tag ORDER BY n DESC`;

  const lookingRows = await sql`
    SELECT lf, count(*)::int AS n
    FROM members, unnest(looking_for) AS lf
    WHERE status='active'
    GROUP BY lf ORDER BY n DESC`;

  const hoodRows = await sql`
    SELECT neighborhood, count(*)::int AS n FROM members
    WHERE status='active' AND neighborhood IS NOT NULL
    GROUP BY neighborhood`;

  const [plat] = await sql`
    SELECT
      count(*) FILTER (WHERE linkedin_url IS NOT NULL)::int AS linkedin,
      count(*) FILTER (WHERE website_url IS NOT NULL)::int AS websites
    FROM members WHERE status='active'`;

  // Agregaciones derivadas
  const MONTHS = { '01': 'ene', '02': 'feb', '03': 'mar', '04': 'abr', '05': 'may', '06': 'jun', '07': 'jul', '08': 'ago', '09': 'sep', '10': 'oct', '11': 'nov', '12': 'dic' };
  const growth = growthRows.map((r) => ({ label: MONTHS[r.ym.slice(5)] || r.ym, n: r.n }));

  const roles = roleRows.map((r) => ({ label: ROLE_LABEL[r.role] || r.role, n: r.n }));

  const verticals = tagRows.filter((r) => !IDENTITY_TAGS.has(r.tag)).map((r) => ({ label: r.tag, n: r.n }));

  const lookingFor = lookingRows.map((r) => ({ label: r.lf, n: r.n }));

  const areaMap = new Map();
  for (const r of hoodRows) {
    const a = areaOf(r.neighborhood);
    if (!a) continue;
    areaMap.set(a, (areaMap.get(a) || 0) + r.n);
  }
  const geography = [...areaMap.entries()].sort((x, y) => y[1] - x[1]);

  const out = {
    total, totalNonAdmin: totalna,
    growth, roles, verticals, lookingFor,
    geography: geography.map(([label, n]) => ({ label, n })),
    platform: { linkedin: plat.linkedin, websites: plat.websites },
  };

  if (json) { console.log(JSON.stringify(out, null, 2)); return; }

  console.log(`\nTotal activos: ${total} (no-admin: ${totalna})`);
  console.log('\nCrecimiento:', growth.map((g) => `${g.label}=${g.n}`).join(' '));
  console.log('\nRoles:'); roles.forEach((r) => console.log(`  ${String(r.n).padStart(3)}  ${r.label}`));
  console.log('\nVerticales (sin tags de identidad):'); verticals.slice(0, 12).forEach((r) => console.log(`  ${String(r.n).padStart(3)}  ${r.label}`));
  console.log('\nQué buscan:'); lookingFor.forEach((r) => console.log(`  ${String(r.n).padStart(3)}  ${r.label}`));
  console.log('\nGeografía (por área):'); out.geography.forEach((r) => console.log(`  ${String(r.n).padStart(3)}  ${r.label}`));
  console.log(`\nPlataforma: linkedin=${plat.linkedin} · websites=${plat.websites}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
