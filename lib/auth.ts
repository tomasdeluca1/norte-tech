import { getIronSession, unsealData, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export type SessionData = {
  userId?: number;
  email?: string;
  name?: string;
  mustChangePassword?: boolean;
};

function getSessionPassword(): string {
  const pwd = process.env.SESSION_PASSWORD?.trim();
  if (!pwd || pwd.length < 32) {
    throw new Error('SESSION_PASSWORD must be set and at least 32 characters');
  }
  return pwd;
}

export const SESSION_COOKIE = 'nt_session';

export function sessionOptions(): SessionOptions {
  return {
    password: getSessionPassword(),
    cookieName: SESSION_COOKIE,
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export async function getSession() {
  const opts = sessionOptions();
  const session = await getIronSession<SessionData>(cookies(), opts);
  if (session.userId) return session;

  // Migración de la cookie de sesión anterior (otro nombre terminado en
  // "_session", sellada con el mismo SESSION_PASSWORD): si existe y es válida,
  // se copia a nt_session y se borra la vieja, así nadie queda deslogueado.
  // Se hace una sola vez por navegador; en server components (donde no se
  // pueden escribir cookies) se usa sólo para este request.
  const jar = cookies();
  for (const c of jar.getAll()) {
    if (c.name === SESSION_COOKIE || !c.name.endsWith('_session')) continue;
    try {
      const data = await unsealData<SessionData>(c.value, { password: opts.password, ttl: opts.ttl });
      if (!data?.userId) continue;
      Object.assign(session, data);
      try {
        await session.save();
        jar.delete(c.name);
      } catch {
        // Contexto de sólo lectura: la migración se completa en el próximo route handler.
      }
      break;
    } catch {
      // No es una cookie nuestra o no se pudo abrir: se ignora.
    }
  }
  return session;
}
