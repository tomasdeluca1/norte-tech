# Admin de builders + integración huevsite.io — Diseño

Fecha: 2026-06-17 · Repos: `norte-tech`, `huevsite.io`

## Objetivo

1. Panel de admin para gestionar builders: aceptar/rechazar el ingreso a la comunidad, dar de baja/reactivar, reenviar emails, editar datos.
2. Emails transaccionales (Resend) en cada paso del ciclo de vida.
3. Integración con huevsite.io: el builder conecta su huevsite, se muestra en la landing con card custom + iframe, "Powered by huevsite.io" + CTA, y el admin modera huevsites.
4. Nota de blog en huevsite.io documentando la API pública de perfiles.

Config (WhatsApp, email de notificación, URL de huevsite) se maneja en la DB (tabla `app_settings`), editable desde el panel admin.

## Modelo de datos (Norte Tech, Neon Postgres)

`members` suma columnas (migración aditiva, no destructiva):
- `is_admin boolean not null default false`
- `huevsite_username varchar(80)` (nullable)
- `huevsite_approved boolean not null default false`
- `huevsite_featured boolean not null default false`

Nueva tabla `app_settings`: `key varchar(80) pk`, `value text`, `updated_at timestamptz`.
Seeds: `whatsapp_group_url`, `admin_notification_email`, `huevsite_url`.

Ciclo de `status` (la columna ya existe): `pending` → `active` | `rejected` | `inactive`.
Miembros actuales quedan `active`. `tomasdelucaa@gmail.com` (id=1) se marca `is_admin=true`.

## Fase 1 — Admin + aprobación + emails (norte-tech)

**Registro** (`POST /api/join`): crea `pending`, NO manda credenciales. Dispara:
- Email al builder: "recibimos tu registro".
- Email al admin (`admin_notification_email`): "nuevo registro pendiente" + link a `/admin`.

**Emails** (`lib/email.ts` + `lib/email-templates/*`, estilo dark existente):
- `registro recibido`, `nuevo registro (admin)`, `aceptado` (credenciales + invite WhatsApp), `rechazado`.

**Panel `/admin`** (server-guarded: sesión + `is_admin`):
- Filtro por estado + tabla. Acciones: aceptar, rechazar, baja/reactivar, reenviar email, editar.
- API `/api/admin/members/*` + `/api/admin/settings` con guard `requireAdmin()`.
- `isAdmin` expuesto en `/api/auth/me` → link "Admin" en dashboard.

**Landing**: se quita el WhatsApp inmediato del modal de éxito (ahora va en el email de aceptación); el copy de éxito pasa a "te avisamos cuando te aceptemos".

## Fase 2 — Integración huevsite

**huevsite.io**: `GET /api/public/profile/[username]` (JSON + CORS) con `{ username, name, headline, avatar, accentColor, builderScore, url }`. Modo embed `?embed=1` (perfil sin nav/footer).

**norte-tech**: el builder conecta su huevsite (username/URL) desde el dashboard (se valida contra la API). Card custom en la landing con datos condensados + botón "Ver huevsite" → modal con iframe `?embed=1`. Solo se muestran `huevsite_approved`; `huevsite_featured` primero. "Powered by huevsite.io" + CTA "Armá tu huevsite →". Admin: editar/borrar URL, aprobar, destacar.

## Fase 3 — Blog huevsite.io

Post explicando la API pública de perfiles (endpoint, formato, CORS, embed) con el ejemplo real de nortetech.ar.

## Orden de deploy

1. norte-tech Fase 1.
2. huevsite (API + embed + blog).
3. norte-tech Fase 2 (consume la API live; degrada con gracia si falla).

## Variables / config

DB `app_settings`: `whatsapp_group_url`, `admin_notification_email`, `huevsite_url`.
Fallbacks en código si la fila no existe.
