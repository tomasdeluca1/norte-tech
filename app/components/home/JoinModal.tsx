"use client";

// Formulario de alta a la comunidad. Mientras no exista la URL de Luma
// (MEETUP_URL en lib/site.ts) también es el destino del CTA principal.
// Accesible: <dialog> nativo con showModal() (foco atrapado, Escape y fondo
// inerte), foco al primer campo al abrir, el foco vuelve al botón que lo
// abrió al cerrar, cada label asociado a su campo y errores con aria-live.
// Cualquier elemento con [data-open-join] lo abre (así los CTA pueden ser
// HTML del servidor).
import { useCallback, useEffect, useRef, useState } from 'react';
import PresentationFields, { EMPTY_PRESENTATION, presentationPayload, type PresentationState } from '../PresentationFields';
import { ROLES, TAGS } from '@/lib/profile-fields';

const EMPTY = { name: '', email: '', role: '', jobTitle: '', company: '', companyUrl: '' };

export default function JoinModal() {
  const dialog = useRef<HTMLDialogElement>(null);
  const firstField = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY);
  const [formTags, setFormTags] = useState<string[]>([]);
  const [presentation, setPresentation] = useState<PresentationState>(EMPTY_PRESENTATION);
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const patchPresentation = (patch: Partial<PresentationState>) => setPresentation((prev) => ({ ...prev, ...patch }));
  const toggleTag = (tag: string) => setFormTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  const show = useCallback((from: HTMLElement | null) => {
    opener.current = from;
    const d = dialog.current;
    if (!d || d.open) return;
    d.showModal();
    document.body.style.overflow = 'hidden';
    setOpen(true);
    requestAnimationFrame(() => firstField.current?.focus());
  }, []);

  const close = useCallback(() => { dialog.current?.close(); }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-open-join]');
      if (!t) return;
      e.preventDefault();
      show(t);
    };
    document.addEventListener('click', onClick);
    // #join en la URL (links viejos o compartidos) abre el formulario.
    if (window.location.hash === '#join') show(null);
    return () => document.removeEventListener('click', onClick);
  }, [show]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onClose = () => {
      document.body.style.overflow = '';
      setOpen(false);
      opener.current?.focus();
    };
    d.addEventListener('close', onClose);
    return () => d.removeEventListener('close', onClose);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('loading');
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tags: formTags, ...presentationPayload(presentation) }),
      });
      if (!res.ok) throw new Error('Error al registrar');
      setFormStatus('success');
    } catch {
      setFormStatus('error');
    }
  };

  const handleAddAnother = () => {
    setFormData(EMPTY);
    setFormTags([]);
    setPresentation(EMPTY_PRESENTATION);
    setFormStatus('idle');
    requestAnimationFrame(() => firstField.current?.focus());
  };

  return (
    <dialog
      ref={dialog}
      className="join-dialog modal-card"
      aria-labelledby="join-title"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <button type="button" onClick={close} className="modal-close" aria-label="Cerrar">&times;</button>
      {open && (formStatus === 'success' ? (
        <div className="modal-success" role="status">
          <div className="success-badge" aria-hidden="true">✓</div>
          <h2 id="join-title" className="success-title">¡Estás adentro!</h2>
          <p className="success-text">Ya sos parte de Norte Tech.</p>
          <div className="success-note">
            Te mandamos un mail con tu <strong>acceso al dashboard</strong> y la <strong>invitación al grupo de WhatsApp</strong>. Revisá el inbox (y el spam, por las dudas).
          </div>
          <div className="success-actions">
            <button type="button" onClick={handleAddAnother} className="btn btn-outline">Sumar a otra persona</button>
          </div>
        </div>
      ) : (
        <>
          <p className="modal-eyebrow" aria-hidden="true">$ join --community</p>
          <h2 id="join-title" className="modal-title">Sumate a Norte Tech</h2>
          <p className="modal-sub">Contanos quién sos, dónde vivís y qué construís. Entrás al toque: te llega un mail con tu acceso y la invitación al grupo de WhatsApp.</p>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="field">
              <label htmlFor="join-name">Nombre completo</label>
              <input ref={firstField} id="join-name" name="name" autoComplete="name" required placeholder="Ej. Sofía Martínez" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="join-email">E-mail</label>
              <input id="join-email" name="email" autoComplete="email" required type="email" placeholder="sofia@ejemplo.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="join-role">¿Cuál es tu área?</label>
                <select id="join-role" name="role" required value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                  <option value="" disabled>Seleccioná tu área...</option>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="join-job">Cargo <span className="opt">(opcional)</span></label>
                <input id="join-job" name="jobTitle" autoComplete="organization-title" placeholder="Ej. Partner & CTO" maxLength={80} value={formData.jobTitle} onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })} />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="join-company">Empresa o proyecto</label>
                <input id="join-company" name="company" autoComplete="organization" placeholder="Ej. tu startup o proyecto" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="join-url">URL</label>
                <input id="join-url" name="companyUrl" type="text" autoComplete="url" placeholder="tu-empresa.com" value={formData.companyUrl} onChange={(e) => setFormData({ ...formData, companyUrl: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <span className="label" id="join-tags">Tags <span className="opt">(opcional)</span></span>
              <div className="tag-picker" role="group" aria-labelledby="join-tags">
                {TAGS.map((tag) => (
                  <button key={tag} type="button" aria-pressed={formTags.includes(tag)} onClick={() => toggleTag(tag)} className={`tag-btn${formTags.includes(tag) ? ' active' : ''}`}>{tag}</button>
                ))}
              </div>
            </div>
            <p className="modal-eyebrow" aria-hidden="true" style={{ marginTop: 4 }}>$ tu --presentación</p>
            <PresentationFields value={presentation} onChange={patchPresentation} />
            <button type="submit" disabled={formStatus === 'loading'} className="btn btn-green btn-lg">
              {formStatus === 'loading' ? 'Guardando...' : 'Unirme a Norte Tech'}
            </button>
            <p className="form-error" aria-live="polite" role="status">
              {formStatus === 'error' ? 'Hubo un error al guardar. Revisá los datos e intentá de nuevo.' : ''}
            </p>
          </form>
        </>
      ))}
    </dialog>
  );
}
