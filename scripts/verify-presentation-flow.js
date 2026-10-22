/* eslint-disable */
// Verificación end-to-end de la Sección 2 contra un dev server + la DB real.
// Prueba: round-trip del token, /completar precargado, POST /api/presentation,
// POST /api/join con presentación rica, y el GET de admin (cookie minteada).
// Crea members de prueba con email +verify-* y los BORRA al final.
//
// Uso: levantá el server (npm run dev) y corré:  node scripts/verify-presentation-flow.js
//      base distinta:                            BASE=http://localhost:3000 node scripts/verify-presentation-flow.js
//
// Nota: /api/presentation y /api/join envían emails reales a la dirección de
// prueba (tu +verify) y al admin. Es la corroboración de que el envío funciona.

const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { sealData, unsealData } = require('iron-session');

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

let pass = 0, fail = 0;
function check(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
}

async function main() {
  loadDotEnv();
  const BASE = process.env.BASE || 'http://localhost:3000';
  const sql = neon(process.env.DATABASE_URL);
  const pwd = process.env.SESSION_PASSWORD;
  const stamp = Date.now();
  const magicEmail = `tomasdelucaa+verify-magic-${stamp}@gmail.com`;
  const joinEmail = `tomasdelucaa+verify-join-${stamp}@gmail.com`;

  const richPayload = {
    neighborhood: 'Los Castores · Tigre',
    bio: 'Bio de prueba de verificación end-to-end.',
    building: 'Un verificador de flujos',
    lookingFor: ['Cofounder', 'Clientes'],
    canHelpWith: 'Testing y QA',
    linkedinUrl: 'linkedin.com/in/verify',
    twitterUrl: 'x.com/verify',
    instagramUrl: 'instagram.com/verify',
    websiteUrl: 'misitio.com',
  };

  console.log(`\n== Verificación contra ${BASE} ==\n`);

  // 1) Round-trip del token (mismo mecanismo que reengage.js y el server).
  console.log('1) Token mágico (seal → unseal)');
  const t = await sealData({ memberId: 999999, purpose: 'complete-profile' }, { password: pwd, ttl: 3600 });
  const back = await unsealData(t, { password: pwd });
  check(back.memberId === 999999 && back.purpose === 'complete-profile', 'el token round-trip preserva memberId + purpose');

  // 2) Insertar un pendiente "thin" (simula uno de los 90) y completar vía /api/presentation.
  console.log('\n2) Link mágico → /completar → POST /api/presentation');
  const ins = await sql`
    INSERT INTO members (name, email, password_hash, initials, role, status, profile_submitted_at, building)
    VALUES ('Verify Tester', ${magicEmail}, 'x', 'VT', 'Tecnología', 'pending', NULL, 'PREFILL-CHECK-XYZ')
    RETURNING id`;
  const magicId = ins[0].id;
  const token = await sealData({ memberId: magicId, purpose: 'complete-profile' }, { password: pwd, ttl: 3600 });

  const pageRes = await fetch(`${BASE}/completar?token=${encodeURIComponent(token)}`);
  const pageHtml = await pageRes.text();
  check(pageRes.status === 200, '/completar responde 200');
  check(pageHtml.includes('Verify') && /Enviar mi presentaci/i.test(pageHtml), '/completar muestra el form (no completado)');
  check(pageHtml.includes('PREFILL-CHECK-XYZ'), '/completar pre-carga la data ya cargada (building)');

  // LinkedIn requerido: sin linkedin → 400.
  const noLi = { ...richPayload };
  delete noLi.linkedinUrl;
  const reqRes = await fetch(`${BASE}/api/presentation`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, name: 'Verify Tester', role: 'Tecnología', ...noLi }),
  });
  check(reqRes.status === 400, 'POST /api/presentation sin LinkedIn → 400 (requerido)');

  const presRes = await fetch(`${BASE}/api/presentation`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, name: 'Verify Tester', role: 'Tecnología', company: 'QA Inc', companyUrl: 'qa.test', ...richPayload }),
  });
  const presData = await presRes.json().catch(() => ({}));
  check(presRes.status === 200 && presData.success, 'POST /api/presentation devuelve success');

  const [m1] = await sql`SELECT * FROM members WHERE id = ${magicId}`;
  check(m1.profile_submitted_at != null, 'profile_submitted_at quedó seteado');
  check(m1.status === 'pending', 'sigue pending (entra a la cola de revisión)');
  check(m1.neighborhood === richPayload.neighborhood, 'guardó neighborhood');
  check(m1.bio === richPayload.bio, 'guardó bio');
  check(Array.isArray(m1.looking_for) && m1.looking_for.length === 2, 'guardó looking_for (chips)');
  check(m1.linkedin_url === 'https://linkedin.com/in/verify', 'normalizó la URL de LinkedIn (https://)');
  check(m1.website_url === 'https://misitio.com', 'guardó la URL de tu sitio (website_url)');

  // Ya completó → al reabrir el link se muestra el estado "completado", no el form.
  const reloadHtml = await (await fetch(`${BASE}/completar?token=${encodeURIComponent(token)}`)).text();
  check(/Ya completaste/i.test(reloadHtml) && !/Enviar mi presentaci/i.test(reloadHtml), '/completar muestra "completado" si ya envió (no el form)');

  // 3) Alta nueva rica vía /api/join.
  console.log('\n3) Alta nueva → POST /api/join (form rico)');
  const joinRes = await fetch(`${BASE}/api/join`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Join Tester', email: joinEmail, role: 'Negocio / Fundación', company: 'NewCo', companyUrl: 'newco.test', tags: ['SaaS'], ...richPayload }),
  });
  const joinData = await joinRes.json().catch(() => ({}));
  check(joinRes.status === 201 && joinData.pending, 'POST /api/join crea pendiente (201)');
  const [m2] = await sql`SELECT * FROM members WHERE email = ${joinEmail}`;
  check(m2 && m2.profile_submitted_at != null, 'el alta nueva entra ya con presentación (profile_submitted_at)');
  check(m2 && m2.neighborhood === richPayload.neighborhood, 'el alta guardó la presentación rica');

  // 4) Admin: el detalle trae los campos nuevos (cookie de sesión minteada).
  console.log('\n4) Admin GET /api/admin/members (cookie de admin minteada)');
  const [admin] = await sql`SELECT id, email, name FROM members WHERE is_admin = true AND status = 'active' ORDER BY id LIMIT 1`;
  if (!admin) {
    check(false, 'hay un admin activo para mintear la cookie');
  } else {
    const cookie = await sealData(
      { userId: admin.id, email: admin.email, name: admin.name, mustChangePassword: false },
      { password: pwd, ttl: 60 * 60 * 24 * 30 },
    );
    const admRes = await fetch(`${BASE}/api/admin/members`, { headers: { Cookie: `nt_session=${cookie}` } });
    const admData = await admRes.json().catch(() => ({}));
    check(admRes.status === 200 && Array.isArray(admData.members), 'admin autenticado, lista 200');
    const row = (admData.members || []).find((x) => x.id === magicId);
    check(!!row, 'el member de prueba aparece en la lista de admin');
    check(row && row.neighborhood === richPayload.neighborhood && Array.isArray(row.lookingFor), 'el detalle de admin incluye los campos de presentación');
    check(admData.counts && typeof admData.counts.pending === 'number', 'devuelve counts por estado');
  }

  // 5) Cleanup.
  console.log('\n5) Cleanup');
  await sql`DELETE FROM members WHERE email IN (${magicEmail}, ${joinEmail})`;
  const [{ left }] = await sql`SELECT count(*)::int AS left FROM members WHERE email IN (${magicEmail}, ${joinEmail})`;
  check(left === 0, 'borrados los members de prueba');

  console.log(`\n== ${pass} OK · ${fail} fallos ==\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
