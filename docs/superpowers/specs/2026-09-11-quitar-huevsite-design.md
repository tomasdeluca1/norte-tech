# Quitar huevsite.io: de "huevsite conectado" a "sitio propio"

**Fecha:** 2026-09-11
**Estado:** Diseño (aprobado por el usuario; pasa directo a plan de implementación)
**Alcance:** 45 archivos, ~493 referencias. Schema + APIs + UI + emails + scripts.

El proyecto depende hoy de `huevsite.io` como producto externo: los builders
"conectan" su huevsite, la landing embebe sus perfiles en iframes vivos, y el
directorio usa esa conexión como criterio de destaque (tier 1). Se saca esa
dependencia y se reemplaza la mecánica por una genérica: **el sitio propio del
builder**, una URL libre que ya existe en el schema (`website_url`).

Decisiones tomadas con el usuario:

- **Reemplazar, no borrar.** El tier 1 sobrevive, pero pasa a ser "tiene sitio
  propio" en vez de "tiene huevsite".
- **El carousel de iframes muere.** Se reemplaza por una grilla de tarjetas con
  link. Los iframes funcionaban solo porque huevsite se auto-permite embeber;
  con URLs arbitrarias, `X-Frame-Options: DENY` y `frame-ancestors 'self'`
  dejan el iframe en blanco en la mayoría de los sitios.
- **Los datos se preservan.** Cada `huevsite_username` se convierte en
  `https://huevsite.io/<user>` y se guarda en `website_url`, sin pisar a quien
  ya cargó una web. Nadie pierde su lugar en el directorio.
- **La moderación se va entera** (YAGNI). Ver "Estado actual" — nunca moderó.
- **El remitente de mails pasa a `nortetech.ar`.** El destinatario de avisos
  (`huevsite.studio@gmail.com`) queda como está: es una casilla que ya recibe,
  y `huevsite.studio` es el estudio, no el producto `.io` que se saca.

---

## Estado actual (contexto)

### La integración

`lib/huevsite.ts` concentra el acoplamiento: parsea handles (`@ada`,
`ada.huevsite.io`, `https://huevsite.io/ada`), lee la URL base de
`app_settings.huevsite_url`, y hace `fetch` al **API público de huevsite**
(`/api/public/profile/<user>`) para traer avatar, accent color y builder score.

Tres columnas en `members` (migración `0001`): `huevsite_username`,
`huevsite_approved`, `huevsite_featured`.

Dos rutas propias: `/api/huevsite/connect` (valida contra el API externo antes
de guardar) y `/api/huevsite/profile/[username]` (proxy para evitar CORS).

### La moderación no modera

Hallazgo que motiva sacarla entera: **`huevsite_approved` nunca condicionó la
visibilidad**. Los dos endpoints devuelven todos los huevsites conectados, con
comentarios explícitos en el código:

- `app/api/members/route.ts:49` — *"Mostramos todos los huevsites conectados,
  sin requerir aprobación."*
- `app/page.tsx:136` — *"la API ya los devuelve sin requerir aprobación"*

`approved` y `featured` solo afectan el **orden**. No hay acción de aprobar en
el admin: `/api/admin/members/[id]/action` maneja `accept`/`reject`/
`deactivate`/`reactivate`/`resend`, ninguna toca huevsite. La única escritura
es un `PATCH` genérico y dos badges de lectura (✓ / ★) en la tabla. Un
comentario en `lib/builder-ranking.ts:8` confirma que en la práctica *"ninguno
tiene huevsite aprobado hoy"*.

Los miembros además ya pasan por `accept` del admin antes de quedar activos: la
**persona** está curada aunque la URL no lo esté.

### El costo de performance

`/api/members` hace `fetchHuevsiteProfile` **por cada miembro con huevsite**
dentro de un `map` — un N+1 contra un host externo en el camino crítico de la
landing. Cada request de la home espera esa cascada (mitigada por
`next: { revalidate: 300 }`, pero presente en cada revalidación).

---

## Decisiones de diseño

### Modelo de datos

Migración nueva `drizzle/0004_remove_huevsite.sql`. **El orden importa**:
preservar antes de dropear.

El `UPDATE` referencia columnas que el `ALTER` de abajo elimina, así que un
script plano fallaría en la segunda corrida. Para mantener la idempotencia del
resto de la cadena, el `UPDATE` va dentro de un guard que chequea
`information_schema.columns` — el equivalente al `IF EXISTS` que usan las otras
migraciones:

```sql
-- Quitar huevsite.io: el handle se preserva como URL en website_url.
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

ALTER TABLE members DROP COLUMN IF EXISTS huevsite_username;
ALTER TABLE members DROP COLUMN IF EXISTS huevsite_approved;
ALTER TABLE members DROP COLUMN IF EXISTS huevsite_featured;

DELETE FROM app_settings WHERE key = 'huevsite_url';
```

Corrida dos veces seguidas, la segunda es un no-op.

`drizzle/0001_admin_huevsite_settings.sql` **no se toca**: es historia. Si la
cadena se corre desde cero, 0001 crea las columnas y 0004 las saca.

`lib/db/schema.ts` pierde las tres columnas. Esto es deliberado como red de
seguridad: **el typecheck de TypeScript pasa a marcar cada uso que se escape**.

### Tiers

| Tier | Antes | Después |
|------|-------|---------|
| T1 | `huevsiteUsername` | `websiteUrl` |
| T2 | `websiteUrl \|\| companyUrl` | `companyUrl` |
| T3 | resto | resto |

El sort de `/api/members/all` se reduce a `a.tier - b.tier`: la query ya viene
ordenada alfabéticamente, y desaparece el bloque de desempate por
`featured` → `approved` → antigüedad.

### Superficie que se elimina

- `lib/huevsite.ts` completo
- `app/api/huevsite/` completo (2 rutas)
- `scripts/connect-huevsites.js`
- Columna, badges y setting "URL de huevsite.io" del admin
- 49 reglas `.huev-*` en `app/globals.css` (~1001–1310: badge, modal, iframe,
  carousel, shimmer) + 1 en `app/admin/admin.css`
- Setting `huevsite_url` (type `SettingKey`, default, fila en `app_settings`)

### Superficie que cambia

- **`app/page.tsx`** — el cambio más grande. Se va el carousel (estado
  `huevSlide`, `huevLoaded`, `huevView`, `huevsiteUrl`, la ventana de precarga
  de iframes `[0, 1, 2, -1]`, el auto-avance con pausa en hover) y el modal.
  Entra una grilla de tarjetas: iniciales en color de marca + nombre +
  rol/empresa + `Abrir ↗` a `website_url` en pestaña nueva. **Los estilos
  reusan las clases `.dir-*` del directorio** en vez de inventar un set nuevo:
  las dos superficies muestran lo mismo y ya comparten lenguaje visual. Copy:
  *"Cada perfil es un huevsite vivo"* → texto sobre sitios propios.
- **`app/dashboard/page.tsx`** — la card "Conectá tu huevsite.io" pasa a "Tu
  sitio": input de URL libre.
- **`app/api/auth/profile/route.ts`** — *se agrega* `websiteUrl`. Hoy acepta
  `name`, `role`, `jobTitle`, `company`, `companyUrl`, `tags` pero **no**
  `websiteUrl`; la card nueva del dashboard lo necesita. Se normaliza con el
  `normalizeUrl` que ya usa `companyUrl`.
- **`app/components/CommunityDirectory.tsx`** — se van el fetch al proxy, el
  `Map` de perfiles y el tipo `HuevProfile`. La card T1 se arma con datos
  propios (sin avatar ni accent color externos).
- **`PresentationFields` / `CompletarForm`** — se va el campo huevsite y el
  prop `huevsiteBaseUrl`; queda el de website, que ya existe.
- **`/api/members`** — se va el enrichment N+1 y el campo `huevsiteUrl` de la
  respuesta. El orden pasa a `website_url IS NOT NULL` desc + antigüedad.
- **Limpieza de campos** — `/api/auth/me`, `/api/join`, `/api/presentation`,
  `/api/admin/members`, `/api/admin/members/[id]`.
- **Placeholders** — `placeholder="huevsite.io"` aparece como *ejemplo de
  nombre de empresa* en `app/dashboard/page.tsx:246` y `app/page.tsx:630`. Van
  a otro ejemplo; no son parte de la integración pero son marca visible.

### Emails

- `lib/email.ts:21` — default `Norte Tech <onboarding@huevsite.studio>` →
  `Norte Tech <onboarding@nortetech.ar>`
- `lib/email-templates/accepted.ts:43` — *"Completá tu perfil y conectá tu
  huevsite.io"* → *"Completá tu perfil y sumá tu sitio"*
- `.env.example` — mismo cambio en `EMAIL_FROM`
- `lib/settings.ts` — `admin_notification_email` **queda en
  `huevsite.studio@gmail.com`** (decisión explícita del usuario: es el
  destinatario, no el remitente)

> **Bloqueante operativo, fuera del código:** el remitente real lo define
> Resend. Hasta que `nortetech.ar` esté verificado ahí (SPF/DKIM en DNS) y
> `EMAIL_FROM` seteado en Vercel, los mails **rebotan**. El cambio de default
> es seguro de mergear, pero no se despliega a producción sin eso resuelto.

### Pitch deck

`app/pitch-deck/pitch-data.ts:48` — `PLATFORM = { huevsites: 28, linkedin: 81,
websites: 23 }` colapsa a un solo `websites`. **El número no es `28 + 23`**: se
desconoce cuántos builders tenían huevsite *y* web propia, y esos se contarían
dos veces. Sale de contar `website_url IS NOT NULL` en la DB después de correr
la migración.

### Scripts

- `scripts/connect-huevsites.js` → borrar (conecta y aprueba huevsites)
- `scripts/migrate-admin-huevsite.js` → es un runner de migraciones con nombre
  atado a `0001`. Se generaliza a runner que toma el archivo por argumento; lo
  necesitamos para correr `0004`
- Limpieza de referencias: `seed.js`, `reengage.js`, `community-stats.js`,
  `verify-presentation-flow.js`, `send-access-emails.js`, `send-update-email.js`

### Docs

`docs/superpowers/specs/` y `docs/superpowers/plans/` **no se tocan**: son el
registro de lo que se decidió cuando se decidió. Sí se actualiza
`docs/research/README.md:17`.

`marketing/launch-social.md` menciona `@_huevsite` / `_huevsite`: es la cuenta
personal de Twitter del usuario, no el producto. **Queda como está.**

---

## Fuera de alcance

- Screenshots o previews de los sitios propios (se evaluó y se descartó: suma
  un servicio de captura externo justo cuando estamos sacando una dependencia
  externa)
- Reintroducir moderación bajo otro nombre
- Verificar que las URLs cargadas por los builders resuelvan
- Cambiar `admin_notification_email`
- Verificación de `nortetech.ar` en Resend (operativo, no código)

---

## Verificación

**El repo no tiene tests**: no hay jest ni vitest en `package.json`, no existe
ningún archivo `.test.*` ni `.spec.*`. La verificación es por otras vías:

1. **`npm run build`** — la red principal. Sacar las columnas de
   `lib/db/schema.ts` hace que TypeScript falle en cada uso que quede colgado.
2. **`grep -ri huevsite`** sobre código = 0, excluyendo `docs/superpowers/`,
   `drizzle/0001`, `marketing/`, y la cadena `huevsite.io/` dentro de la
   migración `0004` y de los `website_url` migrados.
3. **Migración con `--dry`** antes de aplicar, reportando cuántas filas se van
   a actualizar y cuántas se saltean por tener `website_url` cargado.
4. **Smoke manual**: landing (grilla + directorio), dashboard (guardar sitio),
   `/completar`, admin.

El punto 2 tiene una trampa deliberada: después de la migración, la DB
**contiene URLs `huevsite.io`** como sitio de esos builders. Eso es correcto y
buscado — el proyecto deja de *depender* de huevsite.io, pero no reescribe a
dónde apunta el sitio de cada persona.
