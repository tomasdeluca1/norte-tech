// Sólo para pruebas locales: si NEON_LOCAL_FETCH_ENDPOINT está seteada (ej.
// http://127.0.0.1:4444/sql con un local-neon-http-proxy delante de un Postgres
// local), el driver HTTP de Neon le pega ahí en vez de a Neon. En Vercel se
// ignora siempre, así nunca puede desviar la base de un deploy.
import { neonConfig } from '@neondatabase/serverless';

const endpoint = process.env.NEON_LOCAL_FETCH_ENDPOINT?.trim();
if (endpoint && !process.env.VERCEL) {
  neonConfig.fetchEndpoint = () => endpoint;
}

export {};
