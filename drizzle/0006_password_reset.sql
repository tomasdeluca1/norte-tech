-- Reset de contraseña por link + invalidación de sesiones.
--
-- 1) members.session_version: cada sesión guarda la versión con la que se
--    abrió. Un reset de contraseña, un cambio de contraseña o "cerrar sesión
--    en todos lados" la incrementan y las cookies viejas dejan de valer.
-- 2) password_reset_tokens: sólo se guarda el SHA-256 del token (nunca el
--    token). Vence a los 45 minutos y se marca usado (used_at) al consumirlo.
-- 3) auth_rate_limits: un registro por intento de "olvidé mi contraseña",
--    con el bucket hasheado (ni el email ni la IP en claro).
--
-- Aditiva e idempotente: no toca datos existentes. Hay que aplicarla ANTES
-- de desplegar el código de esta rama (el código lee members.session_version).
-- Un solo bloque DO porque scripts/migrate.js manda una sentencia top-level.
DO $$
BEGIN
  ALTER TABLE members ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id serial PRIMARY KEY,
    member_id integer NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    token_hash char(64) NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS password_reset_tokens_member_idx ON password_reset_tokens (member_id);

  CREATE TABLE IF NOT EXISTS auth_rate_limits (
    id bigserial PRIMARY KEY,
    bucket varchar(80) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS auth_rate_limits_bucket_created_idx ON auth_rate_limits (bucket, created_at);
END $$;
