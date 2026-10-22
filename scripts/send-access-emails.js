/* eslint-disable */
// Sends an "Acceso a Norte Tech" email to existing members with their default-pattern
// password. Pattern is `{slug(name)}.<LEGACY_PASSWORD_SUFFIX>`.
//
// OJO: los hashes de los miembros existentes se generaron con el sufijo viejo; si
// cambia, el mail manda una contraseña que no valida. El sufijo NO está en el repo
// (repo público): pasalo por la env LEGACY_PASSWORD_SUFFIX. Los usuarios nuevos usan
// el patrón nuevo (ver lib/password.ts); estos siguen con el viejo hasta que la roten.
//
// Usage:
//   node scripts/send-access-emails.js [--dry] [--only=email@x.com]
//
// Requires RESEND_API_KEY, EMAIL_FROM, APP_URL, DATABASE_URL, LEGACY_PASSWORD_SUFFIX in .env.local.

const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');
const { neon } = require('@neondatabase/serverless');

function loadDotEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

function slugifyName(name) {
  return (name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function defaultPasswordFor(name) {
  const suffix = process.env.LEGACY_PASSWORD_SUFFIX?.trim();
  if (!suffix) throw new Error('Missing LEGACY_PASSWORD_SUFFIX');
  const slug = slugifyName(name) || 'builder';
  return `${slug}.${suffix}`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function buildHtml({ name, email, password, loginUrl, appUrl }) {
  const firstName = (name || '').split(/\s+/)[0] || name || 'Builder';
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="color-scheme" content="dark"/><title>Tu acceso a Norte Tech</title></head>
<body style="margin:0;padding:0;background:#0a0f24;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#dde4ea;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0f24;padding:40px 16px;"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#111935;border:1px solid #1f2a52;border-radius:16px;overflow:hidden;">
<tr><td style="padding:32px 40px 0 40px;">
<table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
<td style="vertical-align:middle;">
                    <img src="${appUrl}/brand/norte-tech-horizontal.png" width="180" alt="Norte Tech" style="display:block;border:0;outline:0;text-decoration:none;width:180px;height:auto;"/>
<div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#95a0c2;margin-top:4px;">${escapeHtml(appUrl.replace(/^https?:\/\//, ''))}</div>
</td></tr></table>
</td></tr>
<tr><td style="padding:32px 40px 8px 40px;">
<h1 style="margin:0;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:36px;font-weight:700;line-height:1.08;letter-spacing:-0.02em;color:#ffffff;">HOLA, ${escapeHtml(firstName.toUpperCase())} 👋</h1>
<p style="margin:16px 0 0 0;font-size:16px;line-height:1.6;color:#a9b6c0;">Ya tenés acceso a <strong style="color:#a9b7f3;">Norte Tech</strong>, la comunidad tech de zona norte: founders, builders e inversores en la misma mesa. Tu cuenta ya está activa, podés iniciar sesión cuando quieras.</p>
</td></tr>
<tr><td style="padding:24px 40px 0 40px;">
<div style="background:#131920;border:1px solid #252e35;border-radius:12px;padding:20px 24px;">
<div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#95a0c2;margin-bottom:12px;">Tus credenciales</div>
<div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:14px;color:#dde4ea;margin-bottom:8px;">Email: <span style="color:#a9b7f3;">${escapeHtml(email)}</span></div>
<div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:14px;color:#dde4ea;">Contraseña: <span style="color:#a9b7f3;background:rgba(142,160,240,0.08);padding:2px 8px;border-radius:4px;">${escapeHtml(password)}</span></div>
<p style="margin:14px 0 0 0;font-size:13px;color:#95a0c2;line-height:1.5;">Es una contraseña temporal. Al iniciar sesión por primera vez te vamos a pedir que la cambies desde el dashboard.</p>
</td></tr>
<tr><td align="center" style="padding:28px 40px 0 40px;"><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#a9b7f3;color:#000000;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;">Iniciar sesión &rarr;</a></td></tr>
<tr><td style="padding:32px 40px 0 40px;">
<div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#95a0c2;margin-bottom:12px;">¿Qué sigue?</div>
<ul style="margin:0;padding-left:20px;color:#a9b6c0;font-size:14px;line-height:1.7;">
<li>Iniciá sesión y cambiá tu contraseña</li><li>Completá o actualizá tu perfil en el dashboard</li><li>Te avisamos cuando confirmemos el próximo encuentro de la comunidad</li>
</ul></td></tr>
<tr><td style="padding:32px 40px 32px 40px;">
<div style="border-top:1px solid #1f2a52;padding-top:20px;font-size:12px;color:#52626e;line-height:1.6;">Recibís este email porque ya estabas en la base de Norte Tech. Si tenés alguna duda respondé a este mismo email.</div>
</td></tr>
</table>
<div style="margin-top:16px;font-size:11px;color:#52626e;letter-spacing:0.12em;text-transform:uppercase;">© ${new Date().getFullYear()} Norte Tech · bsasnortetech.vercel.app</div>
</td></tr></table></body></html>`;
}

async function main() {
  loadDotEnv();
  const dry = process.argv.includes('--dry');
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const onlyEmail = onlyArg ? onlyArg.split('=')[1].toLowerCase() : null;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Norte Tech <onboarding@resend.dev>';
  const appUrl = process.env.APP_URL || 'https://bsasnortetech.vercel.app';
  const dbUrl = process.env.DATABASE_URL;
  if (!apiKey || apiKey.startsWith('re_placeholder')) throw new Error('Set RESEND_API_KEY in .env.local');
  if (!dbUrl) throw new Error('Set DATABASE_URL in .env.local');

  const sql = neon(dbUrl);
  const resend = new Resend(apiKey);

  const rows = await sql`SELECT id, name, email FROM members WHERE status = 'active' ORDER BY id`;
  const targets = onlyEmail ? rows.filter(r => r.email.toLowerCase() === onlyEmail) : rows;

  console.log(`→ ${targets.length} target(s)${dry ? ' (DRY RUN)' : ''}${onlyEmail ? ` filter=${onlyEmail}` : ''}`);

  for (const r of targets) {
    const password = defaultPasswordFor(r.name);
    const html = buildHtml({ name: r.name, email: r.email, password, loginUrl: `${appUrl}/login`, appUrl });
    if (dry) {
      console.log(`  • would send → ${r.email}  pwd=${password}`);
      continue;
    }
    try {
      const res = await resend.emails.send({
        from,
        to: r.email,
        subject: 'Tu acceso a Norte Tech 🚀',
        html,
      });
      if (res.error) {
        console.error(`  ✗ ${r.email}:`, res.error);
      } else {
        console.log(`  ✓ ${r.email}  id=${res.data?.id}`);
      }
    } catch (e) {
      console.error(`  ✗ ${r.email}:`, e.message || e);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
