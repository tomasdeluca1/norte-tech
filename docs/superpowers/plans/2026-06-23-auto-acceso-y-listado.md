# Auto-acceso al registro + listado completo — Plan de implementación

> **For agentic workers:** este plan se ejecuta tarea por tarea. No hay test
> runner en el repo; la verificación de cada tarea es `npm run build`
> (typecheck+lint) más prueba manual/curl. Cada tarea termina en un deliverable
> verificable.

**Goal:** Que los builders entren solos al registrarse (un mail con acceso +
WhatsApp + pedido de website condicional) y que la landing tenga un modal "Ver
todos" con buscador sobre toda la base activa.

**Architecture:** Cambios acotados sobre la app Next.js actual. A toca el
backend de registro + un template de email + el copy del modal. C agrega un
endpoint liviano y un modal client-side. Sin librerías nuevas.

**Tech Stack:** Next.js 14 (app router), Drizzle + Neon, Resend, React 18, TS.

## Global Constraints
- Voz: castellano rioplatense, directo, números antes que adjetivos. Lista negra
  de clichés AI (no "desbloqueá", "potenciá", "al siguiente nivel", etc.).
- No romper el flujo de aceptación manual del admin (sigue para reactivar/
  rechazar/resend).
- `sendAcceptedEmail` y su template **no se tocan** (los usa el admin).
- Sin emails ni datos privados en el listado público.

---

## File Structure
- Create: `lib/email-templates/welcome.ts` — template del mail de bienvenida.
- Modify: `lib/email.ts` — nueva `sendWelcomeEmail`; ajuste de subject del aviso admin.
- Modify: `app/api/join/route.ts` — alta `active` + `sendWelcomeEmail`.
- Modify: `app/page.tsx` — copy del modal de registro; estado + modal "Ver todos".
- Create: `app/api/members/all/route.ts` — listado liviano de activos.
- Modify: `app/globals.css` — estilos del modal de listado (si hace falta).

---

## Task A1: Template + función del mail de bienvenida

**Files:**
- Create: `lib/email-templates/welcome.ts`
- Modify: `lib/email.ts`

**Interfaces:**
- Produces: `welcomeEmailHtml(params: { name: string; email: string; password: string; loginUrl: string; whatsappUrl: string; appUrl: string; needsWebsite: boolean }): string`
- Produces: `sendWelcomeEmail(params: { to: string; name: string; defaultPassword: string; needsWebsite: boolean }): Promise<void>`

- [ ] **Step 1: Crear `lib/email-templates/welcome.ts`**

```ts
import { emailShell, escapeHtml, escapeAttr, headingRow, paragraphRow, buttonRow } from './layout';

export function welcomeEmailHtml(params: {
  name: string;
  email: string;
  password: string;
  loginUrl: string;
  whatsappUrl: string;
  appUrl: string;
  needsWebsite: boolean;
}): string {
  const { name, email, password, loginUrl, whatsappUrl, appUrl, needsWebsite } = params;
  const firstName = name.split(/\s+/)[0] || name;

  const whatsappBlock = whatsappUrl
    ? `<tr><td style="padding:28px 40px 0 40px;">
        <div style="background:rgba(37,211,102,0.08);border:1px solid rgba(37,211,102,0.35);border-radius:12px;padding:20px 24px;">
          <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#25d366;margin-bottom:8px;">Grupo de WhatsApp</div>
          <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#a9b6c0;">Entrá al grupo de la comunidad. Ahí se arma todo: presentaciones, eventos y la previa de los co-works.</p>
          <a href="${escapeAttr(whatsappUrl)}" style="display:inline-block;background:#25d366;color:#000000;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.04em;padding:12px 26px;border-radius:6px;">Entrar al grupo de WhatsApp &rarr;</a>
        </div>
      </td></tr>`
    : '';

  const websiteBlock = needsWebsite
    ? `<tr><td style="padding:28px 40px 0 40px;">
        <div style="background:#131920;border:1px solid #252e35;border-radius:12px;padding:18px 22px;">
          <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#7a8f9e;margin-bottom:8px;">Una cosa más</div>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#a9b6c0;">No nos dejaste tu web. Cuando entres al dashboard, sumá el link de tu proyecto así el resto de la comunidad sabe qué estás construyendo.</p>
        </div>
      </td></tr>`
    : '';

  const body = `
    ${headingRow(`BIENVENIDO, ${escapeHtml(firstName.toUpperCase())} 🚀`)}
    ${paragraphRow(
      `Ya estás adentro de <strong style="color:#00e5a0;">Norte Tech</strong>, la comunidad de founders, devs y makers de la zona norte. Sin esperas: tu acceso está listo.`,
    )}
    <tr><td style="padding:24px 40px 0 40px;">
      <div style="background:#131920;border:1px solid #252e35;border-radius:12px;padding:20px 24px;">
        <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#7a8f9e;margin-bottom:12px;">Tu acceso</div>
        <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:14px;color:#dde4ea;margin-bottom:8px;">Email: <span style="color:#00e5a0;">${escapeHtml(email)}</span></div>
        <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:14px;color:#dde4ea;">Contraseña: <span style="color:#00e5a0;background:rgba(0,229,160,0.08);padding:2px 8px;border-radius:4px;">${escapeHtml(password)}</span></div>
        <p style="margin:14px 0 0 0;font-size:13px;color:#7a8f9e;line-height:1.5;">Es temporal. Te la pedimos cambiar la primera vez que entres.</p>
      </div>
    </td></tr>
    ${buttonRow(loginUrl, 'Iniciar sesión')}
    ${whatsappBlock}
    ${websiteBlock}
  `;

  return emailShell({ appUrl, bodyHtml: body });
}
```

- [ ] **Step 2: Agregar `sendWelcomeEmail` en `lib/email.ts`**

Importar el template arriba (junto a los otros imports):
```ts
import { welcomeEmailHtml } from './email-templates/welcome';
```
Y agregar la función (cerca de `sendAcceptedEmail`):
```ts
/** Builder se registró con auto-acceso → acceso + WhatsApp + (opcional) pedido de web. */
export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  defaultPassword: string;
  needsWebsite: boolean;
}): Promise<void> {
  const appUrl = getAppUrl();
  const whatsappUrl = await getSetting('whatsapp_group_url');
  await getResend().emails.send({
    from: getFromAddress(),
    to: params.to,
    subject: '¡Entraste a Norte Tech! 🚀',
    html: welcomeEmailHtml({
      name: params.name,
      email: params.to,
      password: params.defaultPassword,
      loginUrl: `${appUrl}/login`,
      whatsappUrl: whatsappUrl ?? '',
      appUrl,
      needsWebsite: params.needsWebsite,
    }),
  });
}
```
Nota: `getSetting('whatsapp_group_url')` puede devolver `null`; el template ya
maneja `''` ocultando el bloque. Pasar `whatsappUrl ?? ''`.

- [ ] **Step 3: Cambiar el subject del aviso al admin**

En `sendAdminNewRegistrationEmail`, cambiar el subject de
`` `🛎️ Nuevo registro pendiente: ${params.name}` `` a
`` `🛎️ Nuevo builder en Norte Tech: ${params.name}` `` (ya no es una cola).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: compila sin errores de tipos/lint.

- [ ] **Step 5: Commit**

```bash
git add lib/email-templates/welcome.ts lib/email.ts
git commit -m "feat(email): mail de bienvenida con auto-acceso (credenciales + WhatsApp + web opcional)"
```

---

## Task A2: Auto-acceso en el registro

**Files:**
- Modify: `app/api/join/route.ts`

**Interfaces:**
- Consumes: `sendWelcomeEmail` (Task A1), `parsePresentationFields` (`presentation.websiteUrl`).

- [ ] **Step 1: Cambiar el insert a `active` y mandar el welcome**

En `app/api/join/route.ts`:
- Import: reemplazar `sendRegistrationReceivedEmail` por `sendWelcomeEmail` en la
  línea de import de `@/lib/email` (dejar `sendAdminNewRegistrationEmail`):
  ```ts
  import { sendWelcomeEmail, sendAdminNewRegistrationEmail } from '@/lib/email';
  ```
- En `.values({ ... })` cambiar `status: 'pending'` por `status: 'active'`.
- Reemplazar el bloque de `sendRegistrationReceivedEmail`:
  ```ts
  try {
    await sendWelcomeEmail({
      to: email,
      name,
      defaultPassword: defaultPwd,
      needsWebsite: !presentation.websiteUrl,
    });
  } catch (mailErr) {
    console.error('Welcome email failed:', mailErr);
  }
  ```
- Cambiar el return final de
  `{ success: true, id: inserted.id, pending: true }` a
  `{ success: true, id: inserted.id, active: true }`.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/api/join/route.ts
git commit -m "feat(join): alta con auto-acceso (status active + mail de bienvenida)"
```

---

## Task A3: Copy del modal de registro

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Actualizar el estado de éxito y la bajada**

En `app/page.tsx`:
- `modal-sub` (≈línea 553): cambiar
  `"Contanos quién sos, dónde vivís y qué construís. Un admin revisa tu presentación y, si te acepta, te llega el acceso y la invitación al grupo de WhatsApp por email."`
  por
  `"Contanos quién sos, dónde vivís y qué construís. Entrás al toque: te llega un mail con tu acceso y la invitación al grupo de WhatsApp."`
- `success-text` (≈línea 540):
  `"Tu solicitud para sumarte a nortetech.ar quedó registrada."`
  →
  `"Ya sos parte de nortetech.ar."`
- `success-title` (≈línea 539): `"¡Recibimos tu registro!"` →
  `"¡Estás <span style={{ color: 'var(--accent)' }}>adentro</span>!"`
  (mantener el wrapper del span verde).
- `success-note` (≈líneas 541-544): cambiar `"$ status --pending"` y el texto de
  revisión por:
  ```tsx
  <strong>$ status --ok</strong><br />
  Te mandamos un mail con tu <strong>acceso al dashboard</strong> y la <strong>invitación al grupo de WhatsApp</strong>. Revisá el inbox (y el spam, por las dudas).
  ```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(landing): copy del registro a auto-acceso (sin revisión)"
```

---

## Task C1: Endpoint de listado completo

**Files:**
- Create: `app/api/members/all/route.ts`

**Interfaces:**
- Produces: `GET /api/members/all` → `{ members: Array<{ id, name, initials, role, jobTitle, company, companyUrl, tags, colorIndex, huevsiteUsername, huevsiteApproved }>, total: number }`

- [ ] **Step 1: Crear `app/api/members/all/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: schema.members.id,
        name: schema.members.name,
        initials: schema.members.initials,
        role: schema.members.role,
        jobTitle: schema.members.jobTitle,
        company: schema.members.company,
        companyUrl: schema.members.companyUrl,
        tags: schema.members.tags,
        colorIndex: schema.members.colorIndex,
        huevsiteUsername: schema.members.huevsiteUsername,
        huevsiteApproved: schema.members.huevsiteApproved,
      })
      .from(schema.members)
      .where(eq(schema.members.status, 'active'))
      .orderBy(asc(schema.members.name));

    const members = rows.map((r) => ({ ...r, _id: String(r.id) }));
    return NextResponse.json({ members, total: members.length });
  } catch (error) {
    console.error('Error fetching all members:', error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/api/members/all/route.ts
git commit -m "feat(api): endpoint liviano de todos los miembros activos"
```

---

## Task C2: Modal "Ver todos" con buscador

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `GET /api/members/all` (Task C1), `Member` interface existente,
  `setHuevView`, `renderMemberCard` (referencia visual).

- [ ] **Step 1: Estado y fetch lazy en `app/page.tsx`**

Cerca de los otros `useState`:
```tsx
const [showAllModal, setShowAllModal] = useState(false);
const [allMembers, setAllMembers] = useState<Member[]>([]);
const [allLoaded, setAllLoaded] = useState(false);
const [allQuery, setAllQuery] = useState('');
```
Función para abrir el modal (carga perezosa la primera vez):
```tsx
const openAllModal = () => {
  setShowAllModal(true);
  if (!allLoaded) {
    fetch('/api/members/all')
      .then((r) => r.json())
      .then((data) => { setAllMembers(data.members ?? []); setAllLoaded(true); })
      .catch(() => setAllLoaded(true));
  }
};
```
Agregar `showAllModal` a la condición del `useEffect` que hace
`document.body.style.overflow = 'hidden'` (línea ≈180), junto a
`isMobOpen || showJoinModal || huevView`.

- [ ] **Step 2: Botón "Ver todos" en la sección comunidad**

Reemplazar el bloque `members-join` (≈líneas 479-481) para sumar el botón
(manteniendo el de "Sumate"):
```tsx
<div className="members-join">
  <button onClick={openAllModal} className="btn btn-outline">
    Ver todos {memberTotal ? `los ${memberTotal} ` : ''}builders →
  </button>
  <button onClick={() => setShowJoinModal(true)} className="btn btn-green">Sumate a la comunidad →</button>
</div>
```

- [ ] **Step 3: Modal con buscador**

Cerca del `{showJoinModal && (...)}` (≈línea 531) agregar:
```tsx
{showAllModal && (
  <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAllModal(false); }}>
    <div className="modal-card modal-card-wide">
      <button onClick={() => setShowAllModal(false)} className="modal-close" aria-label="Cerrar">&times;</button>
      <div className="modal-eyebrow">$ ls --community</div>
      <h3 className="modal-title">Toda la <span className="green">comunidad</span></h3>
      <input
        className="all-search"
        placeholder="Buscar por nombre, empresa, rol o tag…"
        value={allQuery}
        onChange={(e) => setAllQuery(e.target.value)}
        autoFocus
      />
      {!allLoaded ? (
        <p className="all-empty">Cargando builders…</p>
      ) : (
        (() => {
          const q = allQuery.trim().toLowerCase();
          const filtered = q
            ? allMembers.filter((m) =>
                [m.name, m.company, m.role, m.jobTitle, ...(m.tags ?? [])]
                  .filter(Boolean)
                  .some((f) => String(f).toLowerCase().includes(q)))
            : allMembers;
          if (!filtered.length) return <p className="all-empty">No encontramos a nadie con eso.</p>;
          return (
            <>
              <div className="all-count">{filtered.length} de {allMembers.length}</div>
              <div className="all-grid">
                {filtered.map((m) => {
                  const c = PALETTE[m.colorIndex % PALETTE.length];
                  const showHuev = Boolean(m.huevsiteApproved && m.huevsiteUsername);
                  return (
                    <div className="all-row" key={m._id}>
                      <div className="all-av" style={{ background: c.bg, color: c.color }}>{m.initials}</div>
                      <div className="all-info">
                        <div className="all-name">{m.name}</div>
                        <div className="all-role">
                          {m.jobTitle && m.company ? `${m.jobTitle} @ ${m.company}` : m.role}
                        </div>
                      </div>
                      {showHuev && (
                        <button
                          className="all-huev"
                          onClick={() => setHuevView({ username: m.huevsiteUsername as string, name: m.name })}
                        >huevsite →</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()
      )}
    </div>
  </div>
)}
```

- [ ] **Step 4: Estilos en `app/globals.css`**

Agregar al final:
```css
.modal-card-wide { max-width: 760px; width: 92vw; }
.all-search {
  width: 100%; box-sizing: border-box; margin: 18px 0 8px;
  background: var(--surf); border: 1px solid var(--border); border-radius: 10px;
  padding: 12px 14px; color: var(--text); font-size: 15px; font-family: inherit;
}
.all-search:focus { outline: none; border-color: var(--accent); }
.all-count { font-family: 'Space Mono', monospace; font-size: 12px; color: var(--muted); margin: 6px 0 14px; }
.all-empty { color: var(--muted); font-size: 14px; padding: 24px 0; text-align: center; }
.all-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-height: 56vh; overflow-y: auto; }
.all-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 12px; background: var(--surf); }
.all-av { width: 40px; height: 40px; flex: 0 0 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
.all-info { min-width: 0; flex: 1; }
.all-name { color: var(--text); font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.all-role { color: var(--muted); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.all-huev { background: none; border: 1px solid var(--border); color: var(--accent); border-radius: 999px; padding: 6px 12px; font-size: 12px; cursor: pointer; font-family: inherit; white-space: nowrap; }
.all-huev:hover { border-color: var(--accent); }
@media (max-width: 720px) { .all-grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: compila sin errores.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat(landing): modal 'Ver todos' con buscador sobre toda la base"
```

---

## Self-review (post-plan)
- Cobertura del spec: A (auto-acceso) → A1+A2+A3; C (ver todos) → C1+C2. ✓
- Sin placeholders: todo el código está escrito. ✓
- Consistencia de tipos: `sendWelcomeEmail`/`welcomeEmailHtml` calzan; el modal usa
  el `Member` existente + campos del nuevo endpoint (`huevsiteApproved`,
  `huevsiteUsername`, `initials`, `colorIndex`) que el endpoint devuelve. ✓
- `whatsappUrl` puede ser null → se pasa `?? ''` y el template lo oculta. ✓
