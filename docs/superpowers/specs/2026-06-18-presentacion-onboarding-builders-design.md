# Presentación + onboarding de builders — diseño

**Fecha:** 2026-06-18
**Estado:** aprobado para implementar
**Contexto:** Hay ~90 builders en estado `pending` que quieren entrar a la comunidad / grupo de WhatsApp. Hoy el alta capta datos finos (nombre, email, rol, empresa) y el admin acepta casi a ciegas. Queremos subir la vara: que entrar requiera una **presentación real** (quién sos, dónde vivís, qué construís), empujar a que conecten su website (huevsite.io), y meter a los 90 de forma ordenada.

## Objetivo

1. Cada builder tiene una **presentación** rica antes de ser aprobado.
2. La aprobación pasa por **revisión de admin** (gate + revisión), con el admin viendo el detalle completo.
3. El form invita (sin bloquear) a conectar su **huevsite.io**.
4. Los **90 pendientes** completan su presentación vía **campaña con link mágico**, con **deadline + prune**.

## Enfoque elegido

**A — Form rico unificado + re-enganche con link mágico.** Reutiliza lo existente (iron-session, settings, acciones de admin, integración huevsite). El alta pública se convierte en la presentación completa; los 90 reciben un link mágico que los lleva al mismo form precargado.

---

## Sección 1 — Modelo de datos

### Columnas nuevas en `members`

| Campo (SQL) | Tipo | Notas |
|---|---|---|
| `neighborhood` | varchar(100) | Barrio de Tigre o localidad de zona norte (select) |
| `bio` | text | Bio corta (quién sos) |
| `building` | varchar(280) | Qué estás construyendo hoy |
| `linkedin_url` | varchar(500) | Opcional |
| `twitter_url` | varchar(500) | Opcional |
| `instagram_url` | varchar(500) | Opcional |
| `looking_for` | text[] NOT NULL DEFAULT '{}' | Chips: qué busca |
| `can_help_with` | varchar(280) | En qué puede ayudar |
| `profile_submitted_at` | timestamptz NULL | Cuándo completó la presentación |
| `reengaged_at` | timestamptz NULL | Cuándo se le mandó el link mágico (reminders + prune) |

El website (huevsite.io) ya está cubierto por `huevsite_username` / `huevsite_approved` / `huevsite_featured`. No se agrega columna ni se renombra: se reutiliza la integración existente (`lib/huevsite.ts`).

### Estados (sin tocar el tipo, es varchar)

- `pending` + `profile_submitted_at IS NULL` → registró, **presentación incompleta** (acá caen los 90 → reciben link mágico).
- `pending` + `profile_submitted_at IS NOT NULL` → **listo para revisión** (cola real del admin).
- `active` → aprobado, recibió WhatsApp (igual que hoy).
- `rejected` → rechazado por admin (igual que hoy).
- `lapsed` *(nuevo)* → no respondió la campaña tras el deadline (prune). Distinto de `inactive` (ex-miembro dado de baja).

### Migración `0002_presentation.sql` (idempotente)

`ALTER TABLE … ADD COLUMN IF NOT EXISTS` para cada campo. Backfill: `UPDATE members SET profile_submitted_at = created_at WHERE status = 'active' AND profile_submitted_at IS NULL` (los ya activos no aparecen como "incompletos"). Seed de setting `reengagement_deadline` opcional.

---

## Sección 2 — Los dos flujos de presentación

### 2a · Builder nuevo (form rico, un submit)

Modal de alta en `app/page.tsx` + `POST /api/join`, en 3 bloques:
- **Identidad:** nombre, email, rol, empresa (como hoy).
- **Presentación:** barrio/localidad (select), bio, qué construís hoy, "qué busco" (chips), "en qué ayudo".
- **Conexión:** links sociales (LinkedIn/X/IG, opcionales) + conectar huevsite.io (recomendado, no bloquea).

Al enviar → crea member `pending` con `profile_submitted_at = now()` → entra directo a la cola de revisión. Emails de confirmación + aviso al admin (como hoy). El handle de huevsite se parsea y se guarda sin forzar validación remota (la validación dura ocurre en dashboard/admin).

### 2b · Los 90 (link mágico)

- **Token stateless** firmado con `iron-session` `sealData` (`{ memberId, purpose: 'complete-profile' }`), TTL = ventana de la campaña. Reusa `SESSION_PASSWORD`. Sin contraseña, sin login. (`lib/magic-link.ts`)
- Email de campaña → link a `app/completar?token=…`. La página valida el token (server), precarga nombre/email/rol/empresa y muestra el form rico.
- Al enviar → `POST /api/presentation` (auth por token) actualiza el member, setea `profile_submitted_at = now()`, mantiene `status = pending` → entra a la cola. Email "recibimos tu presentación, la estamos revisando" + aviso al admin.
- Token inválido/expirado → pantalla cordial con CTA a re-registrarse.

### Campaña (deadline + prune) — `scripts/reengage.js`

Espejo de `scripts/send-update-email.js`. **Por seguridad, dry-run por defecto**; envía solo con `--send`.
- Targets: `status = 'pending' AND profile_submitted_at IS NULL`.
- Modos: `--send` (envía + setea `reengaged_at`), `--only=email`, `--first` (solo `reengaged_at IS NULL`), `--reminder` (solo `reengaged_at IS NOT NULL`), `--prune` (marca `lapsed` a los vencidos), `--deadline=YYYY-MM-DD`.
- Deadline: lee `reengagement_deadline` de `app_settings`, fallback a `--deadline` o +14 días.
- Token generado con `sealData` vía `await import('iron-session')` (mismo `SESSION_PASSWORD` que el server).

Piezas nuevas: page `/completar`, route `POST /api/presentation`, `lib/magic-link.ts`, `lib/profile-fields.ts`, `scripts/reengage.js`, templates `reengagement.ts` + `presentation-received.ts`. `/api/join` y el flujo de aprobación quedan igual, solo se expanden campos.

---

## Sección 3 — Admin: revisión con detalle + verificación

### Detalle expandible (requisito explícito)

- `GET /api/admin/members` agrega los campos nuevos al SELECT.
- Nuevo **DetailModal** (botón "Ver" por fila) que muestra la **presentación completa**: ubicación, bio, qué construye, qué busca (chips), en qué ayuda, links sociales, huevsite (con link al perfil), empresa/URL, tags, fecha de presentación, estado. Desde ahí: **Aceptar / Rechazar** directo.
- Indicador por fila: **✓ presentó** vs **○ sin presentar** (según `profile_submitted_at`), para distinguir dentro de `pending` quién está listo para revisar.
- Nuevo tab **Lapsed**. El `EditModal` existente suma los campos nuevos (edición manual).

### Verificación (requisito "corroborar que funcione")

1. **`next build`** verde (gate de tipos/compilación — cubre rutas, página y componentes).
2. **Script de verificación** contra la DB real con un member de prueba (`+verify` en el email), que:
   - hace round-trip del token (`seal` → `unseal` devuelve el `memberId`),
   - inserta un pending "thin", aplica el submit de `/api/presentation`, y asserta que quedó con campos ricos + `profile_submitted_at` + `status='pending'`,
   - hace **cleanup** (borra la fila).
3. **Render de cada email** a archivos HTML para inspección (sin enviar). Envío real solo a la dirección propia, gateado por flag.
4. **Curl a endpoints reales** con el dev server: `/api/join` (alta rica), `/api/presentation` (con token minteado), y `/api/admin/members` con una **cookie de sesión minteada** para el admin (verifica que el detalle trae los campos nuevos). Asserts vía SQL.

---

## No-objetivos (YAGNI)

- No se rediseña el directorio público en esta iteración (el perfil rico lo habilita, pero la mejora visual del directorio es aparte).
- No se cambia el mecanismo de WhatsApp (sigue en el email de aceptación, setting `whatsapp_group_url`).
- No se renombra "huevsite" → website.io: se usa huevsite.io tal cual.
- No GitHub en links sociales (solo LinkedIn/X/IG).
