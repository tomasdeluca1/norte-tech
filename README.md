# Norte Tech

Sitio de Norte Tech, la comunidad tech de zona norte (Buenos Aires): Founders, Builders, Inversores, Growth, Marketing y Creators.
Next.js 14 (App Router) · Neon Postgres + Drizzle · Iron Session + bcrypt · Resend · `@vercel/og`.

## Stack

- **Framework**: Next.js 14 (App Router, TypeScript, server actions/routes)
- **DB**: Neon Postgres via `@neondatabase/serverless` + Drizzle ORM
- **Auth**: `iron-session` + `bcryptjs` (email + password, default password emailed on signup)
- **Email**: Resend with a branded HTML template
- **OG image**: `@vercel/og` (1200×630, safe-zone respected)

## Setup

```bash
cp .env.example .env.local
# fill in DATABASE_URL, SESSION_PASSWORD (32+ chars), RESEND_API_KEY, EMAIL_FROM, APP_URL
npm install
```

### 1. Create the schema in Neon

```bash
npm run db:push          # applies lib/db/schema.ts to your Neon DB
# or manually:  psql "$DATABASE_URL" -f drizzle/0000_init.sql
```

### 2. Seed (optional)

```bash
npm run seed
```

### 3. Migrate from legacy MongoDB (optional)

If you have the legacy MongoDB `members` collection (database name in `MONGODB_DB`):

```bash
MONGODB_URI="..." MONGODB_DB="..." DATABASE_URL="..." npm run migrate:mongo -- --dry   # preview
MONGODB_URI="..." MONGODB_DB="..." DATABASE_URL="..." npm run migrate:mongo            # write
```

The script generates a temporary password per migrated user (bcrypt-hashed in DB) and writes a `migrated-credentials.csv` with `email,temp_password` so you can email those out manually (or feed them into Resend with a small script).

### 4. Run

```bash
npm run dev      # http://localhost:3000
npm run build && npm run start
```

## Auth flow

- **Signup** (`POST /api/join`): registers a new member, generates a random default password, hashes it, persists with `must_change_password=true`, and sends a Resend email with the credentials and login link.
- **Login** (`/login` → `POST /api/auth/login`): sets an `iron-session` cookie.
- **Dashboard** (`/dashboard`): shows profile + “Change password” form. Banner nags users with `must_change_password=true` until they update.
- **Change password** (`POST /api/auth/change-password`): validates current password, sets new hash, clears the flag.
- **Logout** (`POST /api/auth/logout`).

Session cookie: `nt_session`, HttpOnly, SameSite=Lax, 30-day max-age. A valid session cookie from the previous name (any `*_session` cookie sealed with the same `SESSION_PASSWORD`) is migrated to `nt_session` on the first request, so nobody gets logged out.

## Project layout

```
app/
├── api/
│   ├── auth/{login,logout,me,change-password}/route.ts
│   ├── join/route.ts          # signup + welcome email
│   ├── members/route.ts       # public list
│   └── og/route.tsx           # OG image (safe-zone aware)
├── dashboard/page.tsx
├── login/page.tsx
├── layout.tsx
├── page.tsx                   # landing
├── globals.css
└── auth.css                   # login + dashboard styles

lib/
├── auth.ts                    # iron-session
├── db/{index.ts, schema.ts}   # Neon + Drizzle
├── email.ts                   # Resend wrapper
├── email-templates/welcome.ts # branded HTML email
└── password.ts                # bcrypt + default password generator

drizzle/0000_init.sql
scripts/{seed.js, migrate-from-mongo.js}
```

## Domain

Production: **https://bsasnortetech.vercel.app**. All metadata, OG, and emails use this host (override via `APP_URL`).
