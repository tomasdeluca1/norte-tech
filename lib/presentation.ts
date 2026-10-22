import { LOOKING_FOR_OPTIONS, normalizeNeighborhood } from './profile-fields';

const LOOKING_SET = new Set(LOOKING_FOR_OPTIONS);

/** Normaliza una URL agregando https:// si falta. Devuelve null si está vacía. */
export function normalizeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function str(raw: unknown, max: number): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  if (!v) return null;
  return v.slice(0, max);
}

export interface PresentationFields {
  neighborhood: string | null;
  bio: string | null;
  building: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;
  websiteUrl: string | null;
  lookingFor: string[];
  canHelpWith: string | null;
}

/**
 * Normaliza y valida los campos de la presentación desde el body de una request.
 * Compartido por /api/join (alta nueva) y /api/presentation (los 90 vía link mágico)
 * para que ambos caminos guarden exactamente lo mismo.
 */
export function parsePresentationFields(body: unknown): PresentationFields {
  const b = (body ?? {}) as Record<string, unknown>;
  const lookingForRaw = Array.isArray(b.lookingFor) ? b.lookingFor.map((x) => String(x).trim()) : [];
  const lookingFor = Array.from(new Set(lookingForRaw)).filter((x) => LOOKING_SET.has(x));
  return {
    neighborhood: str(normalizeNeighborhood(typeof b.neighborhood === 'string' ? b.neighborhood : ''), 100),
    bio: str(b.bio, 1000),
    building: str(b.building, 280),
    linkedinUrl: normalizeUrl(b.linkedinUrl),
    twitterUrl: normalizeUrl(b.twitterUrl),
    instagramUrl: normalizeUrl(b.instagramUrl),
    websiteUrl: normalizeUrl(b.websiteUrl),
    lookingFor,
    canHelpWith: str(b.canHelpWith, 280),
  };
}
