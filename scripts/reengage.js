/* eslint-disable */
// Campaña de re-enganche: invita a los builders PENDIENTES que todavía no
// completaron su presentación a hacerlo, con un link mágico (sin contraseña).
// Setea reengaged_at en el primer envío y permite marcar "lapsed" tras el deadline.
//
// SEGURIDAD: por defecto es DRY-RUN (no envía nada). Agregá --send para enviar.
//
// Uso:
//   node scripts/reengage.js                         # preview de a quién le llegaría
//   node scripts/reengage.js --send                  # envía a TODOS los pendientes sin presentación
//   node scripts/reengage.js --first --send          # solo a los que nunca recibimos (reengaged_at IS NULL)
//   node scripts/reengage.js --reminder --send       # recordatorio: solo a los ya contactados sin completar
//   node scripts/reengage.js --only=x@y.com --send   # a una sola persona (para probar)
//   node scripts/reengage.js --deadline=2026-07-05   # fija/usa una fecha límite en el email
//   node scripts/reengage.js --prune                 # preview de quiénes pasarían a "lapsed"
//   node scripts/reengage.js --prune --send          # marca lapsed a los contactados que no completaron
//
// Requiere RESEND_API_KEY, EMAIL_FROM, APP_URL, DATABASE_URL, SESSION_PASSWORD en .env.local.

const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');
const { neon } = require('@neondatabase/serverless');
const { sealData } = require('iron-session');

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 21; // 21 días

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDeadline(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildHtml({ firstName, magicLink, deadlineLabel, appUrl }) {
  const year = new Date().getFullYear();
  const deadlineBlock = deadlineLabel
    ? `<tr><td style="padding:20px 40px 0 40px;"><div style="background:rgba(255,176,32,0.08);border:1px solid rgba(255,176,32,0.35);border-radius:12px;padding:16px 22px;font-size:14px;color:#a9b6c0;line-height:1.6;">⏳ Tenés tiempo hasta <strong style="color:#ffb020;">${esc(deadlineLabel)}</strong>. Después liberamos los lugares que queden sin completar.</div></td></tr>`
    : '';
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="dark"/><title>Completá tu presentación</title></head>
<body style="margin:0;padding:0;background:#0a0f24;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#dde4ea;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0f24;padding:40px 16px;"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#111935;border:1px solid #1f2a52;border-radius:16px;overflow:hidden;">
<tr><td style="padding:32px 40px 0 40px;">
<table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
<td style="vertical-align:middle;">
                    <img src="${appUrl}/brand/norte-tech-horizontal.png" width="180" alt="Norte Tech" style="display:block;border:0;outline:0;text-decoration:none;width:180px;height:auto;"/>
<div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#95a0c2;margin-top:4px;">bsasnortetech.vercel.app</div>
</td></tr></table></td></tr>
<tr><td style="padding:32px 40px 8px 40px;">
<h1 style="margin:0;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:34px;font-weight:700;line-height:1.08;letter-spacing:-0.02em;color:#ffffff;">${esc(firstName.toUpperCase())}, FALTA TU PRESENTACIÓN 🙌</h1>
<p style="margin:16px 0 0 0;font-size:16px;line-height:1.6;color:#a9b6c0;">Estás en la lista de <strong style="color:#a9b7f3;">Norte Tech</strong>. Estamos integrando a la comunidad de a poco y, para sumarte al grupo de WhatsApp, queremos conocerte un poco más.</p>
<p style="margin:14px 0 0 0;font-size:16px;line-height:1.6;color:#a9b6c0;">Completá tu <strong style="color:#dde4ea;">presentación</strong> —dónde vivís, qué construís, qué buscás— y, si querés, conectá tu website. Un admin la revisa y te damos el acceso.</p>
</td></tr>
<tr><td align="center" style="padding:28px 40px 0 40px;"><a href="${esc(magicLink)}" style="display:inline-block;background:#a9b7f3;color:#000000;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;">Completar mi presentación &rarr;</a></td></tr>
${deadlineBlock}
<tr><td style="padding:24px 40px 0 40px;"><p style="margin:0;font-size:13px;color:#95a0c2;line-height:1.6;">Este link es personal y te deja entrar sin contraseña. Si no fuiste vos quien se registró, ignorá este email.</p></td></tr>
<tr><td style="padding:32px 40px 32px 40px;"><div style="border-top:1px solid #1f2a52;padding-top:20px;font-size:12px;color:#52626e;line-height:1.6;">Recibís este email porque te registraste en Norte Tech. Cualquier duda, respondé a este mismo mail.</div></td></tr>
</table>
<div style="margin-top:16px;font-size:11px;color:#52626e;letter-spacing:0.12em;text-transform:uppercase;">© ${year} Norte Tech · bsasnortetech.vercel.app</div>
</td></tr></table></body></html>`;
}

async function main() {
  loadDotEnv();
  const args = process.argv.slice(2);
  const has = (f) => args.includes(f);
  const send = has('--send');
  const prune = has('--prune');
  const onlyArg = args.find((a) => a.startsWith('--only='));
  const onlyEmail = onlyArg ? onlyArg.split('=')[1].toLowerCase() : null;
  const testArg = args.find((a) => a.startsWith('--test='));
  const testEmail = testArg ? testArg.split('=')[1] : null;
  const deadlineArg = args.find((a) => a.startsWith('--deadline='));
  const wantFirst = has('--first');
  const wantReminder = has('--reminder');

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Norte Tech <onboarding@resend.dev>';
  const appUrl = (process.env.APP_URL || 'https://nortetech.com.ar').replace(/\/$/, '');
  const dbUrl = process.env.DATABASE_URL;
  const sessionPwd = process.env.SESSION_PASSWORD;
  if (!dbUrl) throw new Error('Falta DATABASE_URL en .env.local');
  if (!sessionPwd || sessionPwd.length < 32) throw new Error('Falta SESSION_PASSWORD (≥32 chars) en .env.local');

  const sql = neon(dbUrl);

  // Deadline: --deadline=YYYY-MM-DD gana; si no, lee app_settings.reengagement_deadline.
  let deadlineIso = deadlineArg ? deadlineArg.split('=')[1] : null;
  if (!deadlineIso) {
    const rows = await sql`SELECT value FROM app_settings WHERE key = 'reengagement_deadline'`;
    deadlineIso = rows[0]?.value || null;
  }
  const deadlineLabel = formatDeadline(deadlineIso);

  // --- Modo test: envía UNA prueba a la dirección dada con un link real y clickeable ---
  if (testEmail) {
    if (!apiKey) throw new Error('Falta RESEND_API_KEY en .env.local');
    const resend = new Resend(apiKey);
    // Member demo pendiente (plus-address) para que el link funcione de verdad.
    const demoEmail = testEmail.includes('@') ? testEmail.replace('@', '+presentacion-demo@') : `demo+${testEmail}`;
    let rows = await sql`SELECT id, name FROM members WHERE email = ${demoEmail}`;
    let demoId, demoName;
    if (rows.length) {
      demoId = rows[0].id; demoName = rows[0].name;
    } else {
      demoName = 'Demo (prueba)';
      const r = await sql`
        INSERT INTO members (name, email, password_hash, initials, role, status, profile_submitted_at)
        VALUES (${demoName}, ${demoEmail}, 'x', 'D', 'Founder/CEO', 'pending', NULL)
        RETURNING id`;
      demoId = r[0].id;
    }
    const token = await sealData({ memberId: demoId, purpose: 'complete-profile' }, { password: sessionPwd, ttl: TOKEN_TTL_SECONDS });
    const magicLink = `${appUrl}/completar?token=${encodeURIComponent(token)}`;
    const firstName = demoName.split(/\s+/)[0];
    const html = buildHtml({ firstName, magicLink, deadlineLabel, appUrl });
    const res = await resend.emails.send({
      from,
      to: testEmail,
      subject: `[PRUEBA] Completá tu presentación — Norte Tech`,
      html,
    });
    if (res.error) console.log(`✗ ${testEmail}: ${JSON.stringify(res.error)}`);
    else console.log(`✓ Prueba enviada a ${testEmail}  id=${res.data?.id}\n  link real (member demo #${demoId}): ${magicLink}`);
    return;
  }

  // --- Modo prune: marcar lapsed a los contactados que no completaron ---
  if (prune) {
    const candidates = await sql`
      SELECT id, name, email FROM members
      WHERE status = 'pending' AND profile_submitted_at IS NULL AND reengaged_at IS NOT NULL
      ORDER BY reengaged_at ASC`;
    console.log(`→ ${candidates.length} pendiente(s) contactados sin completar${send ? '' : ' (DRY RUN — agregá --send para marcarlos lapsed)'}`);
    for (const c of candidates) console.log(`  • ${c.email}  (${c.name})`);
    if (send && candidates.length) {
      await sql`
        UPDATE members SET status = 'lapsed', updated_at = now()
        WHERE status = 'pending' AND profile_submitted_at IS NULL AND reengaged_at IS NOT NULL`;
      console.log(`✓ ${candidates.length} marcados como 'lapsed'.`);
    }
    return;
  }

  // --- Modo campaña: enviar link mágico ---
  if (!apiKey) throw new Error('Falta RESEND_API_KEY en .env.local');
  const resend = new Resend(apiKey);

  let rows = await sql`
    SELECT id, name, email, reengaged_at FROM members
    WHERE status = 'pending' AND profile_submitted_at IS NULL
    ORDER BY created_at ASC`;

  if (wantFirst) rows = rows.filter((r) => r.reengaged_at == null);
  if (wantReminder) rows = rows.filter((r) => r.reengaged_at != null);
  if (onlyEmail) rows = rows.filter((r) => r.email.toLowerCase() === onlyEmail);

  console.log(
    `→ ${rows.length} destinatario(s)${send ? '' : ' (DRY RUN — agregá --send para enviar)'}` +
    `${onlyEmail ? ` · filtro=${onlyEmail}` : ''}${wantFirst ? ' · solo nuevos' : ''}${wantReminder ? ' · recordatorio' : ''}` +
    `${deadlineLabel ? ` · deadline=${deadlineLabel}` : ''}`,
  );

  let sent = 0;
  for (const r of rows) {
    const firstName = (r.name || '').split(/\s+/)[0] || r.name || 'Builder';
    const token = await sealData({ memberId: r.id, purpose: 'complete-profile' }, { password: sessionPwd, ttl: TOKEN_TTL_SECONDS });
    const magicLink = `${appUrl}/completar?token=${encodeURIComponent(token)}`;

    if (!send) {
      console.log(`  • ${r.email}  (${r.name})${r.reengaged_at ? '  [ya contactado]' : ''}`);
      continue;
    }
    try {
      const html = buildHtml({ firstName, magicLink, deadlineLabel, appUrl });
      const res = await resend.emails.send({
        from,
        to: r.email,
        subject: `${firstName}, completá tu presentación para entrar a Norte Tech`,
        html,
      });
      if (res.error) {
        console.log(`  ✗ ${r.email}: ${JSON.stringify(res.error)}`);
        continue;
      }
      await sql`UPDATE members SET reengaged_at = COALESCE(reengaged_at, now()), updated_at = now() WHERE id = ${r.id}`;
      sent++;
      console.log(`  ✓ ${r.email}  id=${res.data?.id}`);
    } catch (e) {
      console.log(`  ✗ ${r.email}: ${e.message || e}`);
    }
  }
  if (send) console.log(`\n✓ Enviados ${sent}/${rows.length}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
