import { pgTable, serial, bigserial, text, varchar, char, integer, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const members = pgTable(
  'members',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    email: varchar('email', { length: 320 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    mustChangePassword: boolean('must_change_password').notNull().default(true),
    initials: varchar('initials', { length: 8 }).notNull(),
    role: varchar('role', { length: 60 }).notNull(),
    jobTitle: varchar('job_title', { length: 80 }),
    company: varchar('company', { length: 200 }),
    companyUrl: varchar('company_url', { length: 500 }),
    tags: text('tags').array().notNull().default([] as string[]),
    colorIndex: integer('color_index').notNull().default(0),
    // 'pending' (awaiting review) → 'active' | 'rejected' | 'inactive' | 'lapsed'
    status: varchar('status', { length: 20 }).notNull().default('active'),
    isAdmin: boolean('is_admin').notNull().default(false),
    // Presentación rica (completada antes de la revisión del admin).
    neighborhood: varchar('neighborhood', { length: 100 }),
    bio: text('bio'),
    building: varchar('building', { length: 280 }),
    linkedinUrl: varchar('linkedin_url', { length: 500 }),
    twitterUrl: varchar('twitter_url', { length: 500 }),
    instagramUrl: varchar('instagram_url', { length: 500 }),
    websiteUrl: varchar('website_url', { length: 500 }),
    lookingFor: text('looking_for').array().notNull().default([] as string[]),
    canHelpWith: varchar('can_help_with', { length: 280 }),
    // null hasta que el builder envía su presentación; separa "incompleta" de "lista para revisar".
    profileSubmittedAt: timestamp('profile_submitted_at', { withTimezone: true }),
    // cuándo se le mandó el link mágico de la campaña (para reminders y prune).
    reengagedAt: timestamp('reengaged_at', { withTimezone: true }),
    // Versión de sesión (drizzle/0006): las cookies guardan la versión con la que
    // se abrieron; al cambiar o restablecer la contraseña se incrementa y las
    // sesiones viejas dejan de valer.
    sessionVersion: integer('session_version').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusCreatedIdx: index('members_status_created_idx').on(t.status, t.createdAt),
  }),
);

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;

// Key/value config editable from the admin panel (WhatsApp invite, notification
// email, …). Read with a fallback in lib/settings.ts.
export const appSettings = pgTable('app_settings', {
  key: varchar('key', { length: 80 }).primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AppSetting = typeof appSettings.$inferSelect;

// Reset de contraseña (drizzle/0006). Sólo se guarda el SHA-256 del token.
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: serial('id').primaryKey(),
    memberId: integer('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
    tokenHash: char('token_hash', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    memberIdx: index('password_reset_tokens_member_idx').on(t.memberId),
  }),
);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Rate limit de endpoints de auth (drizzle/0006). bucket = "<scope>:<sha256 corto>".
export const authRateLimits = pgTable(
  'auth_rate_limits',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    bucket: varchar('bucket', { length: 80 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    bucketCreatedIdx: index('auth_rate_limits_bucket_created_idx').on(t.bucket, t.createdAt),
  }),
);
