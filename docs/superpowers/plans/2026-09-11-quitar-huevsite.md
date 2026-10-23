# Quitar huevsite.io — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar la dependencia de `huevsite.io`, reemplazando el destaque "huevsite conectado" por "sitio propio" (`website_url`), sin que ningún builder pierda su lugar en el directorio.

**Architecture:** Se trabaja de afuera hacia adentro: primero se preservan los datos, después se limpian los consumidores (APIs → UI), y recién al final se borran `lib/huevsite.ts` y las columnas del schema. Ese orden importa: sacar las columnas de `lib/db/schema.ts` rompe el typecheck en cada consumidor que quede colgado, así que ese borrado es simultáneamente el último paso y **la verificación de que no quedó nada**.

**Tech Stack:** Next.js 14 (App Router, client components), Drizzle ORM, Neon (Postgres serverless), Resend.

**Spec:** `docs/superpowers/specs/2026-09-11-quitar-huevsite-design.md`

## Global Constraints

- **Idioma del código y del copy: español rioplatense.** Comentarios, mensajes de UI y de error siguen el tono existente (voseo: "Conectá", "Sumate", "Pegá").
- **Sin tests en el repo.** No hay jest, vitest ni archivos `.test.*` / `.spec.*`. La verificación de cada tarea es `npm run build` (typecheck de TS) + un grep dirigido + smoke manual donde aplique. **No agregar un framework de tests**: está fuera del alcance de esta tarea.
- **Migraciones idempotentes**, con `IF EXISTS` / `IF NOT EXISTS` / guards de `information_schema`, siguiendo el patrón de `drizzle/0000`–`0003`.
- **No tocar** `drizzle/0001_admin_huevsite_settings.sql` ni nada bajo `docs/superpowers/specs/` y `docs/superpowers/plans/` que no sea este archivo: son historia.
- **No tocar** `marketing/launch-social.md`: los `@_huevsite` de ahí son la cuenta personal de Twitter del usuario, no el producto.
- `admin_notification_email` **queda** en `huevsite.studio@gmail.com`. Solo cambia el remitente (`EMAIL_FROM`).
- Commits en español, formato convencional (`feat:`, `fix:`, `refactor:`, `chore:`), como el historial existente.

## Desvío respecto del spec (deliberado)

El spec describe **una** migración `0004` que preserva y dropea. Este plan la parte en **dos**, por seguridad de deploy:

| | Qué hace | Cuándo corre |
|---|---|---|
| `0004_migrate_huevsite_to_website.sql` | Solo el `UPDATE` que preserva | **Antes** de deployar el código (Tarea 1) |
| `0005_drop_huevsite.sql` | Solo los `DROP COLUMN` + `DELETE` del setting | **Después** de deployar (Tarea 10) |

Razón: si se dropean las columnas mientras el código viejo sigue corriendo en producción, ese código revienta al hacer `SELECT huevsite_username`. Y si se preserva *después* de que el código nuevo lee `website_url` para el tier 1, esos builders aparecen en tier 3 durante la ventana intermedia. Partirla en dos elimina las dos ventanas.

---

### Task 1: Runner de migraciones genérico + preservar los handles

`scripts/migrate-admin-huevsite.js` tiene el SQL de la migración `0001` hardcodeado en el archivo. Lo convertimos en un runner que toma un `.sql` por argumento — lo necesitamos para correr `0004` y `0005`, y deja de estar atado a huevsite.

**Files:**
- Create: `drizzle/0004_migrate_huevsite_to_website.sql`
- Create: `scripts/migrate.js`
- Delete: `scripts/migrate-admin-huevsite.js`
- Modify: `package.json` (sección `scripts`)

**Interfaces:**
- Consumes: nada (primera tarea)
- Produces: `node scripts/migrate.js <archivo.sql> [--dry]` — ejecuta un `.sql` contra `DATABASE_URL`. Con `--dry` corre dentro de una transacción que hace `ROLLBACK` al final e imprime las filas afectadas. Lo usa la Tarea 10.

- [ ] **Step 1: Escribir la migración de preservación**

`drizzle/0004_migrate_huevsite_to_website.sql`:

```sql
-- Quitar huevsite.io (1/2): preservar los handles como URL en website_url.
-- Aditiva e idempotente: no borra nada. Corre ANTES de deployar el código nuevo.
-- El guard permite re-ejecutarla después de que 0005 borre la columna.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'members' AND column_name = 'huevsite_username'
  ) THEN
    UPDATE members
       SET website_url = 'https://huevsite.io/' || huevsite_username
     WHERE huevsite_username IS NOT NULL
       AND COALESCE(website_url, '') = '';
  END IF;
END $$;
```

- [ ] **Step 2: Escribir el runner genérico**

`scripts/migrate.js` — reusa `loadDotEnv()` tal cual está en `scripts/migrate-admin-huevsite.js`:

```js
/* eslint-disable */
// Aplica un archivo .sql de drizzle/ contra la DB de Neon.
// Uso:  node scripts/migrate.js drizzle/0004_migrate_huevsite_to_website.sql [--dry]
// Con --dry corre todo y hace ROLLBACK, mostrando qué habría cambiado.
// Requiere DATABASE_URL en .env.local (o en el env).

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

async function main() {
  loadDotEnv();

  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) throw new Error('Pasá el archivo .sql: node scripts/migrate.js drizzle/0004_….sql [--dry]');

  const abs = path.isAbsolute(file) ? file : path.join(__dirname, '..', file);
  if (!fs.existsSync(abs)) throw new Error(`No existe el archivo: ${abs}`);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error('Falta DATABASE_URL en .env.local');

  const body = fs.readFileSync(abs, 'utf8');
  const sql = neon(dbUrl);

  console.log(`→ ${dry ? '[DRY RUN] ' : ''}Aplicando ${path.basename(abs)}…`);

  // Contexto previo: cuántas filas tocaría la preservación.
  const [{ pendientes }] = await sql`
    SELECT count(*)::int AS pendientes
      FROM information_schema.columns c
     WHERE c.table_name = 'members' AND c.column_name = 'huevsite_username'`;
  if (pendientes) {
    const [stats] = await sql`
      SELECT count(*) FILTER (WHERE huevsite_username IS NOT NULL)::int AS con_huevsite,
             count(*) FILTER (WHERE huevsite_username IS NOT NULL
                              AND COALESCE(website_url, '') = '')::int AS a_migrar,
             count(*) FILTER (WHERE huevsite_username IS NOT NULL
                              AND COALESCE(website_url, '') <> '')::int AS ya_tienen_web
        FROM members`;
    console.log(`  · con huevsite: ${stats.con_huevsite}`);
    console.log(`  · se migran:    ${stats.a_migrar}`);
    console.log(`  · se saltean:   ${stats.ya_tienen_web} (ya tienen website_url)`);
  }

  if (dry) {
    console.log('  [DRY RUN] no se aplicó nada.');
  } else {
    await sql.query(body);
    console.log('  ✓ aplicada.');
  }

  const [after] = await sql`
    SELECT count(*) FILTER (WHERE COALESCE(website_url, '') <> '')::int AS con_web
      FROM members`;
  console.log(`→ Miembros con website_url: ${after.con_web}`);
}

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
```

- [ ] **Step 3: Borrar el runner viejo y registrar el nuevo en package.json**

```bash
git rm scripts/migrate-admin-huevsite.js
```

En `package.json`, dentro de `"scripts"`, reemplazar la línea de `migrate:mongo` **agregando** (no borrando `migrate:mongo`):

```json
    "migrate": "node scripts/migrate.js",
```

- [ ] **Step 4: Verificar en seco**

Requiere `DATABASE_URL` en `.env.local`. **Este worktree no lo tiene** — si falta, pedírselo al usuario antes de seguir; no inventar una connection string.

Run: `npm run migrate -- drizzle/0004_migrate_huevsite_to_website.sql --dry`

**Ojo con el `--`:** sin él, npm se come `--dry` y la migración corre de verdad creyendo que es un ensayo. `node scripts/migrate.js drizzle/0004_migrate_huevsite_to_website.sql --dry` (sin pasar por npm) es la otra forma segura.

Expected: imprime los tres contadores (`con huevsite`, `se migran`, `se saltean`) sin aplicar nada. **Anotar el número de `se migran`** — se usa en la Tarea 10 para el pitch deck.

- [ ] **Step 5: Aplicar de verdad**

Run: `npm run migrate -- drizzle/0004_migrate_huevsite_to_website.sql`

Expected: `✓ aplicada.` y `Miembros con website_url: N`, donde N ≥ el valor previo. Correrla una segunda vez debe ser un no-op (los mismos números).

- [ ] **Step 6: Commit**

```bash
git add drizzle/0004_migrate_huevsite_to_website.sql scripts/migrate.js package.json
git add -u scripts/
git commit -m "feat(db): preserva los handles de huevsite como website_url

Migración 0004: cada huevsite_username pasa a https://huevsite.io/<user>
en website_url, sin pisar a quien ya tiene web cargada. Aditiva: no borra
nada, así que puede correr antes de deployar el código nuevo.

scripts/migrate-admin-huevsite.js (que tenía el SQL de 0001 hardcodeado)
se generaliza a scripts/migrate.js, que toma el .sql por argumento y
soporta --dry."
```

---

### Task 2: APIs de listado — tier por sitio propio, sin fetch externo

**Files:**
- Modify: `app/api/members/all/route.ts`
- Modify: `app/api/members/route.ts`

**Interfaces:**
- Consumes: nada de tareas previas
- Produces:
  - `GET /api/members/all` → `{ members: DirectoryMember[], total: number }`, donde `DirectoryMember` ya **no** trae `huevsiteUsername` y `tier` significa: `1` = tiene `websiteUrl`, `2` = tiene `companyUrl`, `3` = resto. Lo consume la Tarea 4.
  - `GET /api/members` → `{ members: Member[], total: number }`. **Ya no devuelve `huevsiteUrl` ni el objeto `huevsite`**, y **sí devuelve `websiteUrl: string | null`**. Lo consume la Tarea 3.

- [ ] **Step 1: Reescribir el tier en `/api/members/all`**

En `app/api/members/all/route.ts`, reemplazar la función `tierOf` y su comentario:

```ts
// T1: sitio propio · T2: web de empresa · T3: resto.
function tierOf(r: { websiteUrl: string | null; companyUrl: string | null }): 1 | 2 | 3 {
  if (r.websiteUrl) return 1;
  if (r.companyUrl) return 2;
  return 3;
}
```

Del `.select({...})` sacar las tres líneas `huevsiteUsername`, `huevsiteApproved`, `huevsiteFeatured`.

Reemplazar el bloque de `.map(...).sort(...).map(...)` entero por:

```ts
    // Escalonado: sitio propio → web de empresa → resto. La query ya viene
    // alfabética, así que dentro de cada tier se respeta ese orden.
    const members = rows
      .map((r) => ({ ...r, _id: String(r.id), tier: tierOf(r) }))
      .sort((a, b) => a.tier - b.tier)
      .map(({ createdAt, ...pub }) => pub);
```

- [ ] **Step 2: Sacar el N+1 de `/api/members`**

En `app/api/members/route.ts`:

Borrar la línea de import `import { fetchHuevsiteProfile, getHuevsiteBaseUrl } from '@/lib/huevsite';`.

En el `.select({...})`, sacar las tres líneas `huevsite*` y **agregar** `websiteUrl: schema.members.websiteUrl,`.

Reemplazar el `.orderBy(...)` y su comentario por:

```ts
        // Primero los que tienen sitio propio, después por antigüedad.
        .orderBy(
          desc(sql`${schema.members.websiteUrl} IS NOT NULL`),
          asc(schema.members.createdAt),
        )
```

Reemplazar el `Promise.all` de tres elementos por uno de dos (se va `getHuevsiteBaseUrl()`):

```ts
    const [rows, totalResult] = await Promise.all([
```

Borrar el bloque `const enriched = await Promise.all(rows.map(async (r) => {...}))` completo y reemplazarlo por un map sincrónico:

```ts
    const members = rows.map((r) => ({ ...r, _id: String(r.id) }));
    const total = totalResult[0]?.count ?? members.length;
    return NextResponse.json({ members, total });
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`

Expected: PASS. Si falla en `app/page.tsx` o `CommunityDirectory.tsx` por `huevsite`/`huevsiteUrl`, **es esperado solo si el error es de propiedad faltante en el tipo de la respuesta** — pero como esos archivos definen sus propios `interface`, no deberían romper todavía. Cualquier otro error, arreglarlo antes de seguir.

- [ ] **Step 4: Verificar las respuestas**

Run: `npm run dev` en otra terminal, después:

```bash
curl -s localhost:3000/api/members | head -c 400
curl -s localhost:3000/api/members/all | head -c 400
```

Expected: ninguna de las dos respuestas contiene la cadena `huevsite`. `/api/members` trae `websiteUrl` en cada miembro. En `/api/members/all`, los miembros con `websiteUrl` tienen `tier: 1`.

- [ ] **Step 5: Commit**

```bash
git add app/api/members/route.ts app/api/members/all/route.ts
git commit -m "refactor(api): el tier 1 pasa a ser sitio propio, no huevsite

tierOf ahora mira website_url (T1) y company_url (T2). El sort del
directorio se simplifica a tier, porque la query ya viene alfabética.

/api/members deja de hacer fetchHuevsiteProfile por miembro: era un N+1
contra un host externo en el camino crítico de la landing."
```

---

### Task 3: Landing — grilla de sitios en lugar del carousel de iframes

El cambio más grande. Se va el carousel con su ventana de precarga de iframes, el auto-avance, el modal, y cuatro piezas de estado.

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css:1001-1310` (aprox.)

**Interfaces:**
- Consumes: `GET /api/members` de la Tarea 2 (`websiteUrl: string | null`, sin `huevsite`)
- Produces: `CommunityDirectory` deja de recibir el prop `onOpenHuevsite` — lo consume la Tarea 4

- [ ] **Step 1: Limpiar tipos y estado en `app/page.tsx`**

Borrar el `interface HuevsiteData {...}` completo (líneas 9-16).

En `interface Member`, borrar las cuatro líneas `huevsiteUsername`, `huevsiteApproved`, `huevsiteFeatured`, `huevsite`, y agregar:

```ts
  websiteUrl?: string | null;
```

Borrar estas cinco líneas de estado:

```ts
  const [huevSlide, setHuevSlide] = useState(0);
  const [huevPaused, setHuevPaused] = useState(false);
  const [huevLoaded, setHuevLoaded] = useState<Set<string>>(new Set());
  const [huevsiteUrl, setHuevsiteUrl] = useState('https://huevsite.io');
  const [huevView, setHuevView] = useState<{ username: string; name: string } | null>(null);
```

En `me`, el tipo pasa de `{ name: string; initials: string; colorIndex: number; huevsiteUsername?: string | null }` a `{ name: string; initials: string; colorIndex: number }`.

En `fetchMembers`, borrar la línea `if (typeof data.huevsiteUrl === 'string') setHuevsiteUrl(data.huevsiteUrl);`.

- [ ] **Step 2: Borrar la lógica del carousel**

Borrar la línea `const goHuev = (delta: number) => setHuevSlide(s => s + delta);`.

Borrar el `useEffect` del auto-avance completo (el que empieza con el comentario `// Auto-avance del carousel de huevsites…`).

Borrar el bloque que va desde el comentario `// Todos los huevsites conectados…` hasta el cierre del IIFE de `huevWindow` (`})();`) — son `huevsites`, `huevCount`, `activeHuev` y `huevWindow`.

En su lugar, poner:

```tsx
  // Builders con sitio propio, para la grilla de la sección comunidad.
  const sites = members.filter(m => m.websiteUrl);
```

- [ ] **Step 3: Reemplazar el JSX de la sección comunidad**

En la `<section id="comunidad">`, cambiar el `<p className="sec-sub">` por:

```tsx
            <p className="sec-sub">Los primeros builders armando esto desde el día cero. Cada uno con lo que está construyendo. Si todavía no estás, estás a un clic.</p>
```

Borrar el `<aside className="huev-badge">…</aside>` entero (el "powered by huevsite.io").

Reemplazar todo el bloque ternario `{membersLoading || !activeHuev ? (…) : (…)}` — desde `{membersLoading` hasta el `)}` que lo cierra, justo antes de `<CommunityDirectory>` — por lo siguiente. **Reusa las clases `.dir-*` del directorio**: las dos superficies muestran lo mismo, así que la tarjeta es estructuralmente idéntica a la T1 de la Tarea 4 y no hace falta un set de CSS paralelo. El `<a>` va adentro de la tarjeta, no envolviéndola (un `<a>` dentro de otro `<a>` es HTML inválido).

```tsx
        {membersLoading ? (
          <div className="sites"><div className="dir-grid">
            {Array.from({ length: 6 }).map((_, i) => <div className="dir-card site-skel" key={i} />)}
          </div></div>
        ) : sites.length > 0 && (
          <div className="sites"><div className="dir-grid">
            {sites.map(m => {
              const c = PALETTE[m.colorIndex % PALETTE.length];
              const sub = m.jobTitle && m.company ? `${m.jobTitle} @ ${m.company}` : (m.jobTitle || m.role);
              return (
                <div className="dir-card dir-card-t1" key={m._id}>
                  <div className="dir-av" style={{ background: c.bg, color: c.color }}>{m.initials}</div>
                  <div className="dir-info">
                    <div className="dir-name">{m.name}</div>
                    <div className="dir-sub">{sub}</div>
                  </div>
                  <a className="dir-cta" href={m.websiteUrl as string} target="_blank" rel="noopener">
                    Abrir ↗
                  </a>
                </div>
              );
            })}
          </div></div>
        )}
```

Cambiar `<CommunityDirectory onOpenHuevsite={setHuevView} />` por `<CommunityDirectory />`.

En `members-join`, cambiar el CTA de logueado:

```tsx
            ? <a href="/dashboard" className="btn btn-outline">Sumá tu sitio →</a>
```

- [ ] **Step 4: Borrar el modal**

Borrar el bloque completo que arranca en el comentario `{/* HUEVSITE IFRAME MODAL */}` y termina en el `)}` de cierre de `{huevView && (…)}`, justo antes del `</>` final.

- [ ] **Step 5: Cambiar el placeholder de ejemplo**

En `app/page.tsx`, el input de empresa usa huevsite como ejemplo:

```tsx
                      <input placeholder="Ej. huevsite.io" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
```

Cambiarlo a `placeholder="Ej. Norte Tech"`.

- [ ] **Step 6: Reemplazar el CSS**

En `app/globals.css`, borrar **todas** las reglas `.huev-*` y `.member-huev*` (badge, pill, wm, badge-cta, modal, iframe, carousel, arrows, foot, count, hint, skel y el `@keyframes huevShimmer`), incluidos sus bloques dentro de media queries. Son ~49 ocurrencias entre las líneas 1001 y 1310.

Agregar, junto a las reglas `.dir-*` (misma familia visual):

Como la tarjeta reusa `.dir-card` / `.dir-av` / `.dir-info` / `.dir-name` / `.dir-sub` / `.dir-cta`, que ya existen, lo único nuevo es el contenedor de la grilla en la landing y el skeleton de carga. Agregarlo junto a las reglas `.dir-*`:

```css
/* ── Comunidad: grilla de sitios propios en la landing ───────────── */
.sites { max-width: 940px; margin: 0 auto clamp(28px, 4vw, 44px); }
.site-skel {
  min-height: 70px;
  background: linear-gradient(90deg, rgba(255,255,255,.02) 25%, rgba(255,255,255,.05) 50%, rgba(255,255,255,.02) 75%);
  background-size: 200% 100%;
  animation: siteShimmer 1.4s infinite;
}
@keyframes siteShimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
```

Verificar en el navegador que `.dir-grid` dentro de `.sites` se ve bien; si el directorio de más abajo le aplica algún margen que acá sobra, ajustarlo con `.sites .dir-grid { … }` en vez de tocar `.dir-grid`, que es compartida.

- [ ] **Step 7: Verificar**

Run: `npm run build`

Expected: PASS. Un error en `CommunityDirectory.tsx` por el prop `onOpenHuevsite` faltante **es esperado** — lo arregla la Tarea 4. Si aparece, comentar temporalmente el `<CommunityDirectory />` NO es aceptable: hacer la Tarea 4 y commitear las dos juntas.

Run: `grep -c "huev" app/page.tsx app/globals.css`

Expected: `0` en ambos.

- [ ] **Step 8: Smoke manual**

Con `npm run dev`, abrir `localhost:3000`:
- La sección `#comunidad` muestra la grilla de tarjetas, no un iframe
- Cada tarjeta abre el sitio del builder en pestaña nueva
- No hay badge "powered by huevsite.io"
- Ancho de teléfono (~400px): la grilla baja a una columna y no hay scroll horizontal

- [ ] **Step 9: Commit** (junto con la Tarea 4 si el build lo exige)

```bash
git add app/page.tsx app/globals.css
git commit -m "feat(landing): grilla de sitios propios en lugar del carousel

Los iframes solo funcionaban porque huevsite se auto-permite embeber; con
URLs arbitrarias, X-Frame-Options y frame-ancestors dejan el iframe en
blanco. La grilla de tarjetas con link no tiene esa dependencia.

Se van el carousel (auto-avance, ventana de precarga, flechas), el modal
de iframe, el badge powered-by y ~49 reglas .huev-* del CSS."
```

---

### Task 4: Directorio — tarjeta T1 con datos propios

**Files:**
- Modify: `app/components/CommunityDirectory.tsx`

**Interfaces:**
- Consumes: `GET /api/members/all` de la Tarea 2 (sin `huevsiteUsername`, `tier` por `websiteUrl`)
- Produces: `<CommunityDirectory />` sin props. La Tarea 3 ya lo llama así.

- [ ] **Step 1: Sacar el prop, el tipo externo y el fetch diferido**

En `app/components/CommunityDirectory.tsx`:

- Borrar `huevsiteUsername?: string | null;` de `DirectoryMember`
- Borrar el `interface HuevProfile {...}` completo
- Cambiar la firma del componente a `export default function CommunityDirectory() {`, sin el parámetro de props
- Borrar los dos estados/refs del enriquecimiento: `const [profiles, …]` y `const inflight = useRef…`
- Borrar el `useEffect` completo del comentario `// Enriquecimiento diferido de T1…`
- Sacar `useRef` del import de React si queda sin uso

Actualizar el docblock del componente:

```tsx
/**
 * Directorio de toda la comunidad activa, escalonado: T1 (sitio propio) con
 * tarjeta destacada, T2 (web de empresa) con chip "web ↗", T3 básica.
 */
```

- [ ] **Step 2: Reescribir la tarjeta T1**

Reemplazar el bloque `if (m.tier === 1 && m.huevsiteUsername) {…}` entero por:

```tsx
              if (m.tier === 1 && m.websiteUrl) {
                return (
                  <div className="dir-card dir-card-t1" key={m._id}>
                    <div className="dir-av" style={{ background: c.bg, color: c.color }}>{m.initials}</div>
                    <div className="dir-info">
                      <div className="dir-name">{m.name}</div>
                      <div className="dir-sub">{sub}</div>
                    </div>
                    <a className="dir-cta" href={m.websiteUrl} target="_blank" rel="noopener">
                      Ver sitio →
                    </a>
                  </div>
                );
              }
```

- [ ] **Step 3: Ajustar el fallback de T2**

La línea `const web = m.tier === 2 ? (m.websiteUrl || m.companyUrl) : null;` ahora tiene un `||` muerto: con el tier nuevo, un miembro T2 **nunca** tiene `websiteUrl` (si lo tuviera sería T1). Simplificar:

```tsx
              const web = m.tier === 2 ? m.companyUrl : null;
```

- [ ] **Step 4: Verificar**

Run: `npm run build`

Expected: PASS, ahora sin el error del prop.

Run: `grep -ci "huev" app/components/CommunityDirectory.tsx`

Expected: `0`

- [ ] **Step 5: Smoke manual**

En `localhost:3000`, bajar al directorio:
- Las tarjetas grandes (T1) son las de gente con sitio propio, con botón "Ver sitio →" que abre en pestaña nueva
- Ya no se abre ningún modal al clickear
- El buscador sigue filtrando
- La pestaña Network **no** muestra requests a `/api/huevsite/profile/…`

- [ ] **Step 6: Commit**

```bash
git add app/components/CommunityDirectory.tsx
git commit -m "feat(directorio): tarjeta T1 con datos propios, sin perfil externo

Se va el fetch diferido a /api/huevsite/profile (avatar, accent color y
builder score venían de huevsite). La tarjeta usa iniciales en color de
marca, igual que T2 y T3, y linkea directo al sitio del builder."
```

---

### Task 5: Dashboard — "Tu sitio" en lugar de "Conectá tu huevsite"

`/api/auth/profile` hoy acepta `name`, `role`, `jobTitle`, `company`, `companyUrl` y `tags`, pero **no** `websiteUrl`. Hay que agregarlo: es lo que va a guardar la card nueva.

**Files:**
- Modify: `app/api/auth/profile/route.ts`
- Modify: `app/api/auth/me/route.ts`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: nada de tareas previas
- Produces: `PATCH /api/auth/profile` acepta `websiteUrl?: string` y lo devuelve en `user.websiteUrl`; `GET /api/auth/me` también lo devuelve

- [ ] **Step 1: Aceptar websiteUrl en la API de perfil**

En `app/api/auth/profile/route.ts`, después de la línea de `companyUrl`:

```ts
    const websiteUrl = normalizeUrl(typeof body.websiteUrl === 'string' ? body.websiteUrl : '');
```

En el `.set({...})`, después de `companyUrl,`:

```ts
        websiteUrl,
```

En el `.returning({...})`, después de `companyUrl: schema.members.companyUrl,`:

```ts
        websiteUrl: schema.members.websiteUrl,
```

`normalizeUrl` ya está importado en el archivo (lo usa `companyUrl`) y devuelve `null` para string vacío, así que borrar el campo lo limpia.

- [ ] **Step 2: Devolver websiteUrl desde /api/auth/me**

El dashboard hidrata su form desde `GET /api/auth/me`, que hoy **no** devuelve `websiteUrl` — sin esto el campo aparece vacío en cada recarga aunque esté guardado.

En `app/api/auth/me/route.ts`, en el `.select({...})`, después de `companyUrl: schema.members.companyUrl,`:

```ts
      websiteUrl: schema.members.websiteUrl,
```

(Las dos líneas `huevsite*` de ese mismo select las saca la Tarea 9.)

- [ ] **Step 3: Limpiar el estado de huevsite en el dashboard**

En `app/dashboard/page.tsx`:

- En `interface User`, borrar `huevsiteUsername?: string | null;` y `huevsiteApproved?: boolean;`, y agregar `websiteUrl?: string | null;`
- Borrar `const HUEVSITE_URL = 'https://huevsite.io';`
- Borrar los tres estados `huevInput`, `huevStatus`, `huevMessage`
- Borrar la función `handleConnectHuevsite` completa
- Borrar la línea `setHuevInput(d.user.huevsiteUsername ?? '');` del efecto de carga

- [ ] **Step 4: Sumar websiteUrl al form de perfil**

En el `useState` de `profile`, agregar el campo:

```ts
  const [profile, setProfile] = useState({
    name: '', role: '', jobTitle: '', company: '', companyUrl: '', websiteUrl: '',
  });
```

En `hydrateFormFromUser`, después de `companyUrl: u.companyUrl ?? '',`:

```ts
      websiteUrl: u.websiteUrl ?? '',
```

`handleProfileSubmit` manda `{ ...profile, tags: profileTags }`, así que `websiteUrl` viaja solo — no hay que tocarlo.

- [ ] **Step 5: Reemplazar la card**

Reemplazar la `<div className="dash-card">` de "Conectá tu huevsite.io" — desde `<div className="eyebrow">Tu portfolio</div>` hasta el cierre de esa card — por:

```tsx
          <div className="eyebrow">Tu sitio</div>
          <h3 className="dash-card-title">Mostrá lo que estás construyendo</h3>
          <p className="dash-meta" style={{ marginBottom: 16 }}>
            Pegá la URL de tu sitio, portfolio o proyecto. Aparece en la landing y te destaca en el directorio de la comunidad.
          </p>
          <label className="auth-label">
            <span>URL de tu sitio</span>
            <input
              type="url"
              placeholder="https://tusitio.com"
              value={profile.websiteUrl}
              onChange={e => setProfile({ ...profile, websiteUrl: e.target.value })}
            />
          </label>
          {user.websiteUrl && (
            <div className="dash-meta" style={{ marginTop: 8 }}>
              Actual: <a href={user.websiteUrl} target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>{user.websiteUrl}</a>
            </div>
          )}
          <p className="dash-meta" style={{ marginTop: 12, color: 'var(--muted)' }}>
            Se guarda con el botón de <strong>Guardar cambios</strong> de arriba.
          </p>
```

**Nota para quien implemente:** el input queda fuera del `<form>` del perfil pero escribe en el mismo estado `profile`, así que se guarda con el submit de arriba — de ahí la aclaración en el copy. Si al mirar el archivo resulta más limpio mover el input **dentro** del `<form onSubmit={handleProfileSubmit}>` junto a `companyUrl`, hacelo y borrá esa última línea de copy. Es preferible.

- [ ] **Step 6: Cambiar el placeholder de ejemplo**

La línea `<input placeholder="huevsite.io" value={profile.company} …` usa huevsite como ejemplo de empresa. Cambiar a `placeholder="Ej. Norte Tech"`.

- [ ] **Step 7: Verificar**

Run: `npm run build`

Expected: PASS

Run: `grep -ci "huev" app/dashboard/page.tsx app/api/auth/profile/route.ts`

Expected: `0` en ambos

- [ ] **Step 8: Smoke manual**

Loguearse en `localhost:3000/dashboard`:
- La card dice "Tu sitio", no "Conectá tu huevsite"
- Cargar `https://ejemplo.com`, guardar, recargar → el valor persiste
- Vaciar el campo y guardar → se limpia (queda `null`)
- La landing ahora muestra a ese usuario en la grilla de sitios

- [ ] **Step 9: Commit**

```bash
git add app/dashboard/page.tsx app/api/auth/profile/route.ts
git commit -m "feat(dashboard): card 'Tu sitio' con URL libre

Reemplaza 'Conectá tu huevsite.io'. Guarda en website_url vía
/api/auth/profile, que hasta ahora no aceptaba ese campo. Se va el flujo
de conexión contra la API de huevsite y el estado de aprobación."
```

---

### Task 6: Formularios de alta y presentación

**Files:**
- Modify: `app/components/PresentationFields.tsx`
- Modify: `app/completar/CompletarForm.tsx`
- Modify: `app/completar/page.tsx`
- Modify: `app/api/presentation/route.ts`
- Modify: `app/api/join/route.ts`

**Interfaces:**
- Consumes: nada de tareas previas
- Produces: `PresentationState` sin la clave `huevsiteUsername`; `PresentationFields` sin el prop `huevsiteBaseUrl`

- [ ] **Step 1: Limpiar PresentationFields**

En `app/components/PresentationFields.tsx`:
- Borrar `huevsiteUsername: string;` del tipo `PresentationState`
- Borrar `huevsiteUsername: '',` de `EMPTY_PRESENTATION`
- Borrar `huevsiteUsername: (m.huevsiteUsername as string) ?? '',` del hidratador
- Borrar `huevsiteUsername: v.huevsiteUsername,` de `presentationPayload`
- Borrar `huevsiteBaseUrl?: string;` del tipo `Props`
- Cambiar la firma a `export default function PresentationFields({ value, onChange }: Props) {`
- Borrar el bloque `<label>Tu huevsite …</label>` con su `<input>` y el texto de ayuda que linkea a huevsite.io

- [ ] **Step 2: Limpiar CompletarForm y su página**

En `app/completar/CompletarForm.tsx`:
- Borrar `huevsiteUsername: string;` del tipo de `initial`
- Borrar `huevsiteBaseUrl,` del destructuring de props y `huevsiteBaseUrl: string;` de su tipo
- Cambiar `<PresentationFields value={presentation} onChange={patch} huevsiteBaseUrl={huevsiteBaseUrl} />` por `<PresentationFields value={presentation} onChange={patch} />`

En `app/completar/page.tsx`:
- Borrar `const huevsiteBaseUrl = await getSetting('huevsite_url');`
- Borrar `huevsiteUsername: member.huevsiteUsername ?? '',` del objeto `initial`
- Cambiar `<CompletarForm token={token as string} initial={initial} huevsiteBaseUrl={huevsiteBaseUrl} />` por `<CompletarForm token={token as string} initial={initial} />`
- Si `getSetting` queda sin uso en el archivo, borrar su import

- [ ] **Step 3: Limpiar las APIs de alta**

En `app/api/presentation/route.ts`:
- Borrar el import `import { parseHuevsiteUsername } from '@/lib/huevsite';`
- Borrar `const huevsiteUsername = parseHuevsiteUsername(body.huevsiteUsername);`
- Borrar `huevsiteUsername,` del objeto que se escribe

En `app/api/join/route.ts`: las mismas tres cosas.

- [ ] **Step 4: Verificar**

Run: `npm run build`

Expected: PASS

Run: `grep -ci "huev" app/components/PresentationFields.tsx app/completar/CompletarForm.tsx app/completar/page.tsx app/api/presentation/route.ts app/api/join/route.ts`

Expected: `0` en los cinco

- [ ] **Step 5: Smoke manual**

- En `localhost:3000`, abrir el modal de "Sumate": el form no pide huevsite
- Mandar un alta de prueba: responde OK
- Abrir un `/completar?token=…` válido: no aparece el campo de huevsite

- [ ] **Step 6: Commit**

```bash
git add app/components/PresentationFields.tsx app/completar/ app/api/presentation/route.ts app/api/join/route.ts
git commit -m "refactor(alta): saca el campo huevsite de los formularios

PresentationFields pierde huevsiteUsername y el prop huevsiteBaseUrl; el
campo de website que ya existía cubre el caso. /api/join y
/api/presentation dejan de parsear el handle."
```

---

### Task 7: Admin — columna y setting

**Files:**
- Modify: `app/admin/page.tsx`
- Modify: `app/admin/admin.css`
- Modify: `app/api/admin/members/route.ts`
- Modify: `app/api/admin/members/[id]/route.ts`

**Interfaces:**
- Consumes: nada de tareas previas
- Produces: `PATCH /api/admin/members/[id]` deja de aceptar los tres campos `huevsite*`; sigue aceptando `websiteUrl` (ya está en `presKeys`)

- [ ] **Step 1: Limpiar la tabla del admin**

En `app/admin/page.tsx`:
- Borrar las tres líneas `huevsiteUsername`, `huevsiteApproved`, `huevsiteFeatured` del tipo de miembro
- Borrar `const HUEVSITE_URL = 'https://huevsite.io';`
- En el `<thead>`, sacar `<th>huevsite</th>` de la fila de headers
- Borrar la `<td>` entera que renderiza `{m.huevsiteUsername ? (…) : <span className="admin-muted">—</span>}`
- Borrar `huevsiteUsername: member.huevsiteUsername ?? '',` del form de edición
- Si el form de edición tiene un input/checkbox de huevsite, borrarlo también

- [ ] **Step 2: Limpiar el setting**

En `app/admin/page.tsx`:
- En el `useState` de `form`, sacar `huevsite_url: ''` del objeto inicial
- Borrar el `<label className="auth-label">` de "URL de huevsite.io" con su input

- [ ] **Step 3: Limpiar las APIs de admin**

En `app/api/admin/members/route.ts`: sacar las tres líneas `huevsite*` del `.select({...})` y agregar `websiteUrl: schema.members.websiteUrl,` si no está ya (sí está, línea 31 — verificar).

En `app/api/admin/members/[id]/route.ts`:
- Borrar el import `import { parseHuevsiteUsername } from '@/lib/huevsite';`
- Borrar las tres líneas `if ('huevsiteUsername' in body) …`, `if (typeof body.huevsiteApproved …)`, `if (typeof body.huevsiteFeatured …)`

- [ ] **Step 4: Limpiar el CSS del admin**

En `app/admin/admin.css`, borrar la regla `.admin-huev` (1 ocurrencia). Si `.badge-feat` queda sin uso después de sacar la `<td>`, borrarla también — verificar con `grep -n "badge-feat" app/admin/page.tsx`.

- [ ] **Step 5: Verificar**

Run: `npm run build`

Expected: PASS

Run: `grep -ci "huev" app/admin/page.tsx app/admin/admin.css app/api/admin/members/route.ts "app/api/admin/members/[id]/route.ts"`

Expected: `0` en los cuatro

- [ ] **Step 6: Smoke manual**

En `localhost:3000/admin` con un usuario admin:
- La tabla tiene 4 columnas (Builder, Rol, Estado, Acciones), sin huevsite
- El panel de settings no tiene el campo "URL de huevsite.io"
- Guardar settings funciona y los otros tres campos persisten
- Editar un miembro y guardar funciona

- [ ] **Step 7: Commit**

```bash
git add app/admin/ app/api/admin/
git commit -m "refactor(admin): saca la columna huevsite y su setting

La moderación approved/featured nunca condicionó visibilidad (los dos
endpoints públicos devolvían todos los huevsites conectados), solo
ordenaba. Se va entera junto con el setting de URL base."
```

---

### Task 8: Emails y settings

**Files:**
- Modify: `lib/email.ts:21`
- Modify: `lib/email-templates/accepted.ts:43`
- Modify: `lib/settings.ts`
- Modify: `.env.example:12`

**Interfaces:**
- Consumes: nada de tareas previas
- Produces: `SettingKey` sin `'huevsite_url'` — lo consume la Tarea 9 (que borra la fila del setting)

- [ ] **Step 1: Cambiar el remitente**

En `lib/email.ts`, línea 21:

```ts
  return process.env.EMAIL_FROM?.trim() || 'Norte Tech <onboarding@nortetech.ar>';
```

En `.env.example`, línea 12:

```
EMAIL_FROM="Norte Tech <onboarding@nortetech.ar>"
```

- [ ] **Step 2: Cambiar el copy del email de aceptación**

En `lib/email-templates/accepted.ts`, línea 43:

```html
        <li>Completá tu perfil y sumá tu sitio</li>
```

- [ ] **Step 3: Sacar el setting de huevsite**

En `lib/settings.ts`:
- En `SettingKey`, sacar `| 'huevsite_url'`
- En el objeto de defaults, borrar la línea `huevsite_url: 'https://huevsite.io',`
- **Dejar** `admin_notification_email: 'huevsite.studio@gmail.com'` intacto (decisión explícita del usuario: es el destinatario, no el remitente)

- [ ] **Step 4: Verificar**

Run: `npm run build`

Expected: PASS

Run: `grep -n "huev" lib/email.ts lib/settings.ts lib/email-templates/accepted.ts .env.example`

Expected: **exactamente una línea** — `admin_notification_email: 'huevsite.studio@gmail.com'` en `lib/settings.ts`. Cualquier otra, limpiarla.

- [ ] **Step 5: Commit**

```bash
git add lib/email.ts lib/email-templates/accepted.ts lib/settings.ts .env.example
git commit -m "chore(email): remitente por defecto pasa a nortetech.ar

El destinatario de avisos (admin_notification_email) queda como está: es
una casilla de Gmail que ya recibe, y huevsite.studio es el estudio, no
el producto .io que estamos sacando.

REQUIERE antes de deployar: verificar nortetech.ar en Resend (SPF/DKIM)
y setear EMAIL_FROM en Vercel, o los mails rebotan."
```

---

### Task 9: Borrado final — lib, rutas, schema y scripts

Acá es donde el typecheck cobra: sacar las columnas de `lib/db/schema.ts` hace fallar cualquier consumidor que se haya escapado de las tareas 2-8.

**Files:**
- Delete: `lib/huevsite.ts`
- Delete: `app/api/huevsite/` (directorio completo, 2 rutas)
- Delete: `scripts/connect-huevsites.js`
- Delete: `scripts/send-update-email.js`
- Modify: `lib/db/schema.ts:21-23`
- Modify: `app/api/auth/me/route.ts:30-31`
- Modify: `scripts/seed.js`, `scripts/reengage.js`, `scripts/community-stats.js`, `scripts/verify-presentation-flow.js`, `scripts/send-access-emails.js`

**Interfaces:**
- Consumes: todas las tareas 2-8 completas
- Produces: el schema sin las tres columnas — es la precondición de la migración `0005` (Tarea 10)

- [ ] **Step 1: Limpiar `/api/auth/me`**

En `app/api/auth/me/route.ts`, borrar del select las líneas `huevsiteUsername: schema.members.huevsiteUsername,` y `huevsiteApproved: schema.members.huevsiteApproved,`. (El `websiteUrl` de ese mismo select ya lo agregó la Tarea 5, que es quien lo consume — no volver a agregarlo.)

- [ ] **Step 2: Borrar los archivos**

```bash
git rm lib/huevsite.ts
git rm -r app/api/huevsite
git rm scripts/connect-huevsites.js
```

- [ ] **Step 3: Sacar las columnas del schema**

En `lib/db/schema.ts`, borrar las líneas 21-23:

```ts
    huevsiteUsername: varchar('huevsite_username', { length: 80 }),
    huevsiteApproved: boolean('huevsite_approved').notNull().default(false),
    huevsiteFeatured: boolean('huevsite_featured').notNull().default(false),
```

Y actualizar el comentario de la línea 50 (`// email, huevsite base URL, …`) sacando la mención.

Si `boolean` queda sin uso en el archivo, sacarlo del import de `drizzle-orm/pg-core`. Verificar con `grep -n "boolean(" lib/db/schema.ts` — probablemente `isAdmin` y `mustChangePassword` lo siguen usando.

- [ ] **Step 4: Correr el typecheck — este es el paso clave**

Run: `npm run build`

Expected: PASS. **Si falla, cada error es un consumidor que se escapó de las tareas anteriores.** Arreglarlos todos acá antes de seguir; no suprimir con `any` ni con `@ts-ignore`.

- [ ] **Step 5: Limpiar los scripts**

Los scripts son JS sin tipos, así que el build **no** los cubre — hay que ir archivo por archivo. Esto es lo que hay:

**`scripts/send-update-email.js` → borrar el archivo.**

```bash
git rm scripts/send-update-email.js
```

Es una campaña puntual ya enviada cuyo asunto literal es *"Norte Tech está on 🟢 — conectá tu huevsite"*: el mail entero existe para pedir que conecten su huevsite (`huevLine`, el botón "Armá / editá tu huevsite", el link a huevsite.io). No hay nada que rescatar reescribiéndolo; si más adelante hace falta una campaña de "sumá tu sitio", se escribe de cero.

**`scripts/community-stats.js`** — sacar las dos líneas del FILTER y ajustar la salida:

```js
      count(*) FILTER (WHERE huevsite_username IS NOT NULL)::int AS huevsites,
      count(*) FILTER (WHERE huevsite_approved)::int AS huevsites_approved,
```

La línea 102 pasa a:

```js
    platform: { linkedin: plat.linkedin, websites: plat.websites },
```

Y la 113 a:

```js
  console.log(`\nPlataforma: linkedin=${plat.linkedin} · websites=${plat.websites}\n`);
```

**`scripts/verify-presentation-flow.js`** — sacar `huevsiteUsername: 'verifytester',` del fixture (línea ~51) y el `check(...)` que lo valida (línea ~102):

```js
  check(m1.huevsite_username === 'verifytester', 'conectó el huevsite');
```

**`scripts/seed.js`** — las líneas 42-43 usan huevsite como empresa de ejemplo:

```js
    company: 'huevsite.io',
    companyUrl: 'https://huevsite.io',
```

Cambiar a un ejemplo neutro (`company: 'Norte Tech'`, `companyUrl: 'https://nortetech.ar'`).

**`scripts/reengage.js:95` y `scripts/send-access-emails.js:87`** — el mismo fallback de remitente que la Tarea 8:

```js
  const from = process.env.EMAIL_FROM || 'Norte Tech <onboarding@huevsite.studio>';
```

Cambiar el default a `'Norte Tech <onboarding@nortetech.ar>'` en los dos.

- [ ] **Step 6: Verificar que no quedó nada en código**

```bash
grep -rniI "huevsite" . \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
  --exclude-dir=docs --exclude-dir=marketing \
  --exclude=0001_admin_huevsite_settings.sql
```

Expected: solo dos clases de resultado, ambas correctas:
1. `lib/settings.ts` → `admin_notification_email: 'huevsite.studio@gmail.com'`
2. `drizzle/0004_migrate_huevsite_to_website.sql` → el SQL de preservación

Cualquier otra cosa, limpiarla.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: borra lib/huevsite.ts, las rutas y las columnas

Saca las tres columnas huevsite_* de lib/db/schema.ts, la integración
(lib/huevsite.ts), las dos rutas de /api/huevsite y el script de conexión.
El typecheck de TS confirma que no quedaron consumidores.

La migración que dropea las columnas de la DB va aparte (0005), para
correr después de deployar esto."
```

---

### Task 10: Migración de drop, pitch deck, docs y verificación final

**Files:**
- Create: `drizzle/0005_drop_huevsite.sql`
- Modify: `app/pitch-deck/pitch-data.ts:48` y sus consumidores
- Modify: `docs/research/README.md:17`

**Interfaces:**
- Consumes: Tarea 9 (schema limpio y **deployado**), Tarea 1 (`scripts/migrate.js`)
- Produces: nada — es la última

- [ ] **Step 1: Escribir la migración de drop**

`drizzle/0005_drop_huevsite.sql`:

```sql
-- Quitar huevsite.io (2/2): borra las columnas y el setting.
-- Corre DESPUÉS de deployar el código que ya no las lee. Idempotente.
--
-- Va todo en un solo bloque DO porque scripts/migrate.js usa sql.query(), que
-- pasa por el protocolo parametrizado de Postgres: una sentencia top-level por
-- llamada. Cuatro sentencias sueltas acá fallarían.
DO $$
BEGIN
  ALTER TABLE members DROP COLUMN IF EXISTS huevsite_username;
  ALTER TABLE members DROP COLUMN IF EXISTS huevsite_approved;
  ALTER TABLE members DROP COLUMN IF EXISTS huevsite_featured;

  DELETE FROM app_settings WHERE key = 'huevsite_url';
END $$;
```

- [ ] **Step 2: Deployar antes de dropear**

**Gate de orden.** Antes de correr esta migración, el código de las tareas 2-9 tiene que estar en producción. Si no lo está, el código viejo sigue haciendo `SELECT huevsite_username` y revienta.

Confirmar con el usuario que el deploy está hecho. **No correr el drop sin esa confirmación.**

- [ ] **Step 3: Aplicar**

Run: `npm run migrate -- drizzle/0005_drop_huevsite.sql --dry`

**Ojo con el `--`:** sin él, npm se come `--dry` y esto dropea las columnas de verdad. `node scripts/migrate.js drizzle/0005_drop_huevsite.sql --dry` (sin pasar por npm) es la otra forma segura.

Expected: no imprime los contadores de preservación (`scripts/migrate.js` los reserva al archivo `0004_migrate_huevsite_to_website.sql` por nombre, así que un archivo de drop nunca los muestra) y no falla.

Run: `npm run migrate -- drizzle/0005_drop_huevsite.sql`

Expected: `✓ aplicada.` Correrla de nuevo debe ser un no-op.

- [ ] **Step 4: Contar para el pitch deck**

El número de `websites` **no es `28 + 23`**: no se sabe cuántos builders tenían huevsite *y* web propia, y se contarían dos veces. Sale de la DB:

```bash
node -e "
const {neon}=require('@neondatabase/serverless');
require('fs').readFileSync('.env.local','utf8').split(/\r?\n/).forEach(l=>{
  const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+)\s*\$/i);
  if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^['\"]|['\"]\$/g,'');
});
neon(process.env.DATABASE_URL)\`SELECT count(*) FILTER (WHERE COALESCE(website_url,'') <> '')::int AS websites FROM members WHERE status='active'\`
  .then(r=>console.log(r[0]));
"
```

- [ ] **Step 5: Actualizar el pitch deck**

En `app/pitch-deck/pitch-data.ts:48`, reemplazar:

```ts
export const PLATFORM = { huevsites: 28, linkedin: 81, websites: 23 };
```

por (usando el número del Step 4):

```ts
export const PLATFORM = { linkedin: 81, websites: N };
```

donde `N` es el número que imprimió el Step 4. No sumar 28 + 23.

Después buscar los consumidores y ajustarlos:

```bash
grep -rn "PLATFORM" app/ lib/ --include=*.ts --include=*.tsx
```

Cualquier lugar que lea `PLATFORM.huevsites` (labels tipo "28 huevsites") pasa a hablar de sitios. Si un slide mostraba huevsites y websites como dos métricas separadas, ahora es una sola.

- [ ] **Step 6: Actualizar docs**

En `docs/research/README.md:17`, cambiar `nombre/rol/empresa/huevsite` por `nombre/rol/empresa/sitio`.

**No tocar** `docs/superpowers/specs/`, `docs/superpowers/plans/` (salvo este archivo) ni `marketing/launch-social.md`.

- [ ] **Step 7: Verificación final completa**

```bash
npm run build
```
Expected: PASS

```bash
grep -rniI "huevsite" . \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
  --exclude-dir=docs --exclude-dir=marketing \
  --exclude=0001_admin_huevsite_settings.sql
```
Expected: exactamente dos resultados — `admin_notification_email` en `lib/settings.ts` y el SQL de `drizzle/0004`.

Smoke manual completo en `localhost:3000`:
- Landing: grilla de sitios, sin badge powered-by, sin iframes
- Directorio: T1 con "Ver sitio →", buscador funcionando, sin requests a `/api/huevsite/*` en Network
- Dashboard: card "Tu sitio", guardar y recargar persiste
- `/admin`: 4 columnas, settings sin el campo de huevsite
- `/pitch-deck`: los números cierran
- A ~400px de ancho: sin scroll horizontal en ninguna vista

- [ ] **Step 8: Commit**

```bash
git add drizzle/0005_drop_huevsite.sql app/pitch-deck/pitch-data.ts docs/research/README.md
git commit -m "chore: dropea las columnas huevsite y actualiza el pitch deck

Migración 0005, para correr después del deploy. PLATFORM fusiona
huevsites y websites en una sola métrica, contada de la DB en vez de
sumar los dos números viejos (se superponían)."
```

---

## Checklist de deploy

El orden entre migraciones y deploy no es opcional:

1. **Tarea 1** → correr `0004` en prod (aditiva, segura con el código viejo corriendo)
2. **Tareas 2-9** → merge y deploy
3. **Verificar** que la landing y el dashboard andan en prod
4. **Tarea 10** → correr `0005` en prod

**Bloqueante aparte, previo al paso 2:** `nortetech.ar` tiene que estar verificado en Resend (SPF/DKIM en DNS) y `EMAIL_FROM` seteado en Vercel. Si no, los mails de alta rebotan apenas se deploye la Tarea 8. Es trabajo de infraestructura, no de código — confirmarlo con el usuario antes de deployar.
