"use client";

import { NEIGHBORHOODS, LOOKING_FOR_OPTIONS, neighborhoodLabel, normalizeNeighborhood } from '@/lib/profile-fields';

export interface PresentationState {
  neighborhood: string;
  bio: string;
  building: string;
  lookingFor: string[];
  canHelpWith: string;
  linkedinUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  websiteUrl: string;
}

export const EMPTY_PRESENTATION: PresentationState = {
  neighborhood: '',
  bio: '',
  building: '',
  lookingFor: [],
  canHelpWith: '',
  linkedinUrl: '',
  twitterUrl: '',
  instagramUrl: '',
  websiteUrl: '',
};

export function presentationFromMember(m: Partial<Record<keyof PresentationState, unknown>>): PresentationState {
  return {
    neighborhood: normalizeNeighborhood(m.neighborhood as string | null),
    bio: (m.bio as string) ?? '',
    building: (m.building as string) ?? '',
    lookingFor: Array.isArray(m.lookingFor) ? (m.lookingFor as string[]) : [],
    canHelpWith: (m.canHelpWith as string) ?? '',
    linkedinUrl: (m.linkedinUrl as string) ?? '',
    twitterUrl: (m.twitterUrl as string) ?? '',
    instagramUrl: (m.instagramUrl as string) ?? '',
    websiteUrl: (m.websiteUrl as string) ?? '',
  };
}

/** Serializa el estado del form al payload que esperan /api/join y /api/presentation. */
export function presentationPayload(v: PresentationState) {
  return {
    neighborhood: v.neighborhood,
    bio: v.bio,
    building: v.building,
    lookingFor: v.lookingFor,
    canHelpWith: v.canHelpWith,
    linkedinUrl: v.linkedinUrl,
    twitterUrl: v.twitterUrl,
    instagramUrl: v.instagramUrl,
    websiteUrl: v.websiteUrl,
  };
}

interface Props {
  value: PresentationState;
  onChange: (patch: Partial<PresentationState>) => void;
}

/**
 * Bloques de "Presentación" + "Conexión" del form, compartidos por el modal de
 * alta (app/page.tsx) y la página /completar. La identidad (nombre/email/rol) la
 * maneja cada página por separado.
 */
export default function PresentationFields({ value, onChange }: Props) {
  const toggleLooking = (opt: string) =>
    onChange({
      lookingFor: value.lookingFor.includes(opt)
        ? value.lookingFor.filter((x) => x !== opt)
        : [...value.lookingFor, opt],
    });

  return (
    <>
      <div className="field">
        <label>¿Dónde vivís?</label>
        <select value={value.neighborhood} onChange={(e) => onChange({ neighborhood: e.target.value })}>
          <option value="">Elegí tu barrio / zona…</option>
          {NEIGHBORHOODS.map((n) => (
            <option key={n} value={n}>{neighborhoodLabel(n)}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Bio <span className="opt">— quién sos en una o dos líneas</span></label>
        <textarea
          rows={2}
          maxLength={1000}
          placeholder="Ej. Dev full-stack, ex-Mercado Libre. Me mudé a zona norte en 2023 y armo productos de IA."
          value={value.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
        />
      </div>

      <div className="field">
        <label>¿Qué estás construyendo hoy?</label>
        <input
          maxLength={280}
          placeholder="Ej. Un SaaS de facturación para PyMEs"
          value={value.building}
          onChange={(e) => onChange({ building: e.target.value })}
        />
      </div>

      <div className="field">
        <label>¿Qué buscás en la comunidad? <span className="opt">(elegí los que apliquen)</span></label>
        <div className="tag-picker">
          {LOOKING_FOR_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggleLooking(opt)}
              className={`tag-btn${value.lookingFor.includes(opt) ? ' active' : ''}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>¿En qué podés ayudar? <span className="opt">(opcional)</span></label>
        <input
          maxLength={280}
          placeholder="Ej. Reviews de código, intros a inversores, growth"
          value={value.canHelpWith}
          onChange={(e) => onChange({ canHelpWith: e.target.value })}
        />
      </div>

      <div className="field">
        <label>LinkedIn <span className="opt" style={{ color: 'var(--accent)' }}>* requerido</span></label>
        <input
          type="text"
          required
          placeholder="linkedin.com/in/…"
          value={value.linkedinUrl}
          onChange={(e) => onChange({ linkedinUrl: e.target.value })}
        />
      </div>

      <div className="form-grid">
        <div className="field">
          <label>X / Twitter <span className="opt">(opcional)</span></label>
          <input
            type="text"
            placeholder="x.com/…"
            value={value.twitterUrl}
            onChange={(e) => onChange({ twitterUrl: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Instagram <span className="opt">(opcional)</span></label>
          <input
            type="text"
            placeholder="instagram.com/…"
            value={value.instagramUrl}
            onChange={(e) => onChange({ instagramUrl: e.target.value })}
          />
        </div>
      </div>

      <div className="field">
        <label>Tu sitio <span className="opt">(opcional)</span></label>
        <input
          type="text"
          placeholder="https://tu-sitio.com"
          value={value.websiteUrl}
          onChange={(e) => onChange({ websiteUrl: e.target.value })}
        />
      </div>
    </>
  );
}
