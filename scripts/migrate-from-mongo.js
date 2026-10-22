/* eslint-disable */
// Migrate members from MongoDB (legacy) to Neon Postgres.
// Usage:
//   MONGODB_URI=... MONGODB_DB=... LEGACY_PASSWORD_SUFFIX=... DATABASE_URL=... node scripts/migrate-from-mongo.js [--dry]
//
// Behavior:
// - Connects to legacy MongoDB and reads all members from `<MONGODB_DB>.members`.
// - Inserts into Postgres `members` with a per-user random temporary password (bcrypt-hashed).
// - Skips rows whose email already exists in Postgres.
// - Prints a CSV-style report (email,tempPassword) so you can send credentials manually if needed.

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
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
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
// Patrón legacy `{slug}.<sufijo>`: tiene que coincidir con
// scripts/send-access-emails.js, que le manda esta misma contraseña a los
// miembros migrados desde Mongo. El sufijo viejo NO está en el repo (repo
// público): va en la env LEGACY_PASSWORD_SUFFIX. Las altas nuevas usan lib/password.ts.
function defaultPasswordFor(name) {
  const suffix = process.env.LEGACY_PASSWORD_SUFFIX?.trim();
  if (!suffix) throw new Error('Missing LEGACY_PASSWORD_SUFFIX');
  const slug = slugifyName(name) || 'builder';
  return `${slug}.${suffix}`;
}

function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map(n => (n[0] || '').toUpperCase()).join('') || '?';
}

async function main() {
  loadDotEnv();
  const dryRun = process.argv.includes('--dry');
  const mongoUri = process.env.MONGODB_URI;
  const pgUrl = process.env.DATABASE_URL;
  if (!mongoUri) throw new Error('Missing MONGODB_URI');
  if (!pgUrl) throw new Error('Missing DATABASE_URL');

  const sql = neon(pgUrl);
  const mongo = new MongoClient(mongoUri);

  console.log('→ Connecting to MongoDB and Postgres…');
  await mongo.connect();
  const mongoDb = process.env.MONGODB_DB?.trim();
  if (!mongoDb) throw new Error('Missing MONGODB_DB');
  const col = mongo.db(mongoDb).collection('members');
  const rows = await col.find({}).sort({ createdAt: 1 }).toArray();
  console.log(`→ Found ${rows.length} members in MongoDB.`);

  const existing = await sql`SELECT email FROM members`;
  const existingEmails = new Set(existing.map(r => r.email));
  console.log(`→ ${existingEmails.size} members already in Postgres (will skip).`);

  const credentials = [];
  let inserted = 0;
  let skipped = 0;

  for (const r of rows) {
    if (!r.email) { skipped++; continue; }
    if (existingEmails.has(r.email)) { skipped++; continue; }
    const tempPwd = defaultPasswordFor(r.name);
    const hash = await bcrypt.hash(tempPwd, 10);
    const tags = Array.isArray(r.tags) && r.tags.length ? r.tags : ['Builder'];
    const initials = r.initials || getInitials(r.name);
    const created = r.createdAt instanceof Date ? r.createdAt : new Date();

    if (!dryRun) {
      await sql`
        INSERT INTO members
          (name, email, password_hash, must_change_password, initials, role, job_title, company, company_url, tags, color_index, status, created_at, updated_at)
        VALUES
          (${r.name || 'Builder'}, ${r.email}, ${hash}, true, ${initials}, ${r.role || 'Otro'},
           ${r.jobTitle || null}, ${r.company || null}, ${r.companyUrl || null},
           ${tags}, ${typeof r.colorIndex === 'number' ? r.colorIndex : 0},
           ${r.status || 'active'}, ${created}, ${created})
        ON CONFLICT (email) DO NOTHING
      `;
    }
    credentials.push({ email: r.email, password: tempPwd });
    inserted++;
  }

  await mongo.close();

  console.log(`\n✓ Inserted: ${inserted}`);
  console.log(`✓ Skipped:  ${skipped}`);
  if (dryRun) console.log('(dry-run: no rows were actually written)');

  if (credentials.length) {
    const outPath = path.join(__dirname, '..', 'migrated-credentials.csv');
    const csv = 'email,temp_password\n' + credentials.map(c => `${c.email},${c.password}`).join('\n') + '\n';
    fs.writeFileSync(outPath, csv);
    console.log(`\n→ Wrote temp credentials to ${outPath}`);
    console.log('  Send these to the migrated members so they can log in and change their password.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
