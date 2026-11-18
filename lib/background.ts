// Trabajo en segundo plano después de responder.
//
// Next 14.2 no trae `after` (aparece en Next 15). En Vercel, cada invocación
// expone un contexto con `waitUntil` en globalThis[Symbol.for('@vercel/request-context')]:
// es el mismo mecanismo que usa `waitUntil` de @vercel/functions, sin sumar esa
// dependencia. Ahí la función queda viva hasta que la promesa termine. Fuera de
// Vercel (local, `next start`) la promesa corre igual en el proceso.
//
// La promesa nunca rechaza hacia afuera: los errores se loguean sin datos sensibles.

type RequestContext = { waitUntil?: (p: Promise<unknown>) => void };

function vercelContext(): RequestContext {
  const holder = (globalThis as Record<symbol, { get?: () => RequestContext } | undefined>)[
    Symbol.for('@vercel/request-context')
  ];
  return holder?.get?.() ?? {};
}

export function runInBackground(label: string, task: () => Promise<void>): void {
  const p = Promise.resolve()
    .then(task)
    .catch((err) => {
      console.error(`${label}:`, err instanceof Error ? err.message : 'unknown');
    });
  vercelContext().waitUntil?.(p);
}

/** Espera hasta que hayan pasado `minMs` desde `startedAt`. */
export async function holdUntil(startedAt: number, minMs: number): Promise<void> {
  const left = startedAt + minMs - Date.now();
  if (left > 0) await new Promise((r) => setTimeout(r, left));
}
