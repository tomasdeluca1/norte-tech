"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NEIGHBORHOODS, LOOKING_FOR_OPTIONS, ROLES, neighborhoodLabel, normalizeNeighborhood } from '@/lib/profile-fields';
import '../auth.css';
import './admin.css';
import BrandLogo from '../components/BrandLogo';
import ThemeToggle from '../components/ThemeToggle';

interface AdminMember {
  id: number;
  name: string;
  email: string;
  initials: string;
  role: string;
  jobTitle?: string | null;
  company?: string | null;
  companyUrl?: string | null;
  tags: string[];
  colorIndex: number;
  status: string;
  isAdmin: boolean;
  neighborhood?: string | null;
  bio?: string | null;
  building?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  lookingFor?: string[];
  canHelpWith?: string | null;
  profileSubmittedAt?: string | null;
  reengagedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const AVAILABLE_TAGS = ['AI', 'SaaS', 'Fintech', 'Web3', 'Proptech', 'Dev', 'Design', 'Marketing', 'Founder', 'Builder', 'Inversor'];

const TABS: { key: string; label: string }[] = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'active', label: 'Activos' },
  { key: 'rejected', label: 'Rechazados' },
  { key: 'lapsed', label: 'Vencidos' },
  { key: 'inactive', label: 'Inactivos' },
  { key: 'all', label: 'Todos' },
];

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', active: 'Activo', rejected: 'Rechazado', inactive: 'Inactivo', lapsed: 'Vencido',
};

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState('pending');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState<AdminMember | null>(null);
  const [viewing, setViewing] = useState<AdminMember | null>(null);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const loadMembers = useCallback(async () => {
    const res = await fetch('/api/admin/members', { cache: 'no-store' });
    if (res.status === 403) { router.replace('/dashboard'); return; }
    const data = await res.json();
    setMembers(data.members ?? []);
    setCounts(data.counts ?? {});
  }, [router]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.user) { router.replace('/login'); return; }
        if (!d.user.isAdmin) { router.replace('/dashboard'); return; }
        setIsOwner(!!d.user.isOwner);
        setAuthorized(true);
        loadMembers();
      });
  }, [router, loadMembers]);

  async function doAction(id: number, action: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/members/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { flash(data.error || 'Error'); return; }
      const emailNote = data.emailSent ? ' · email enviado' : (action === 'accept' || action === 'reject' || action === 'resend' ? ' · ⚠ email falló' : '');
      flash(`Listo: ${action}${emailNote}`);
      await loadMembers();
    } finally {
      setBusyId(null);
    }
  }

  const list = tab === 'all' ? members : members.filter(m => m.status === tab);

  if (authorized === null) {
    return <main className="dash-shell"><div className="dash-loading">Cargando…</div></main>;
  }

  return (
    <main className="dash-shell">
      <nav className="dash-nav">
        <a href="/" className="nav-logo">
          <BrandLogo variant="logo-horizontal" />
        </a>
        <div className="dash-nav-right">
          <ThemeToggle />
          <span className="dash-domain">admin</span>
          <a href="/dashboard" className="btn btn-ghost dash-logout">Mi perfil</a>
        </div>
      </nav>

      <div className="dash-bg"><div className="dash-grid" /></div>

      <section className="dash-container">
        <header className="dash-hero" style={{ marginBottom: 24 }}>
          <div>
            <div className="eyebrow">Administración</div>
            <h1 className="display dash-title">GESTIÓN DE BUILDERS</h1>
            <div className="dash-meta">Aceptá, rechazá y gestioná a la comunidad.</div>
          </div>
        </header>

        {toast && <div className="admin-toast">{toast}</div>}

        <div className="admin-tabs">
          {TABS.map(t => {
            const n = t.key === 'all' ? members.length : (counts[t.key] ?? 0);
            return (
              <button key={t.key} className={`admin-tab${tab === t.key ? ' is-active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label} <span className="admin-tab-count">{n}</span>
              </button>
            );
          })}
        </div>

        <div className="dash-card admin-card">
          {list.length === 0 ? (
            <div className="admin-empty">No hay builders en este estado.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Builder</th><th>Rol</th><th>Estado</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div className="admin-builder">
                          <span className="admin-name">
                            {m.name}
                            {m.isAdmin && <span className="admin-badge badge-admin">admin</span>}
                            {m.status === 'pending' && (m.profileSubmittedAt
                              ? <span className="admin-badge badge-ok">✓ presentó</span>
                              : <span className="admin-badge badge-pend">sin presentar</span>)}
                          </span>
                          <span className="admin-email">{m.email}</span>
                        </div>
                      </td>
                      <td>{m.jobTitle || m.role}</td>
                      <td><span className={`admin-status status-${m.status}`}>{STATUS_LABEL[m.status] ?? m.status}</span></td>
                      <td>
                        <div className="admin-actions">
                          {m.status === 'pending' && <>
                            <button disabled={busyId === m.id} className="btn-mini btn-accept" onClick={() => doAction(m.id, 'accept')}>Aceptar</button>
                            <button disabled={busyId === m.id} className="btn-mini btn-reject" onClick={() => doAction(m.id, 'reject', `¿Rechazar a ${m.name}? Se le envía un email.`)}>Rechazar</button>
                          </>}
                          {m.status === 'active' && <>
                            <button disabled={busyId === m.id} className="btn-mini" onClick={() => doAction(m.id, 'resend', `¿Reenviar credenciales a ${m.name}? Se resetea su contraseña temporal.`)}>Reenviar</button>
                            <button disabled={busyId === m.id} className="btn-mini btn-warn" onClick={() => doAction(m.id, 'deactivate', `¿Dar de baja a ${m.name}?`)}>Baja</button>
                          </>}
                          {(m.status === 'rejected' || m.status === 'lapsed') && <button disabled={busyId === m.id} className="btn-mini btn-accept" onClick={() => doAction(m.id, 'accept', `¿Aceptar a ${m.name}?`)}>Aceptar</button>}
                          {(m.status === 'inactive') && <button disabled={busyId === m.id} className="btn-mini btn-accept" onClick={() => doAction(m.id, 'reactivate')}>Reactivar</button>}
                          <button className="btn-mini btn-view" onClick={() => setViewing(m)}>Ver</button>
                          <button className="btn-mini" onClick={() => setEditing(m)}>Editar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <SettingsCard onSaved={() => flash('Configuración guardada ✓')} />
      </section>

      {viewing && (
        <DetailModal
          member={viewing}
          busy={busyId === viewing.id}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
          onAction={async (action, confirmMsg) => { await doAction(viewing.id, action, confirmMsg); setViewing(null); }}
        />
      )}

      {editing && (
        <EditModal
          member={editing}
          canManageAdmin={isOwner}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); flash('Builder actualizado ✓'); await loadMembers(); }}
        />
      )}
    </main>
  );
}

function SettingsCard({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, string>>({ whatsapp_group_url: '', admin_notification_email: '', reengagement_deadline: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' }).then(r => r.json()).then(d => { if (d.settings) setForm(d.settings); });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="dash-card admin-card" style={{ marginTop: 24 }}>
      <div className="eyebrow">Configuración</div>
      <h3 className="dash-card-title">Settings de la comunidad</h3>
      <form onSubmit={save} className="auth-form">
        <label className="auth-label"><span>Link grupo de WhatsApp</span>
          <input value={form.whatsapp_group_url} onChange={e => setForm({ ...form, whatsapp_group_url: e.target.value })} placeholder="https://chat.whatsapp.com/…" />
        </label>
        <label className="auth-label"><span>Email de notificación al admin</span>
          <input value={form.admin_notification_email} onChange={e => setForm({ ...form, admin_notification_email: e.target.value })} placeholder="vos@gmail.com" />
        </label>
        <label className="auth-label"><span>Deadline de la campaña (presentaciones)</span>
          <input type="date" value={form.reengagement_deadline} onChange={e => setForm({ ...form, reengagement_deadline: e.target.value })} />
        </label>
        <button type="submit" disabled={saving} className="btn btn-green auth-submit">{saving ? 'Guardando…' : 'Guardar settings'}</button>
      </form>
      <p className="dash-meta" style={{ marginTop: 14, lineHeight: 1.6 }}>
        Campaña de presentación a los pendientes (link mágico) se corre por consola:
        {' '}<code>node scripts/reengage.js --send</code>. Probá primero sin <code>--send</code> (dry-run)
        y con <code>--only=tu@email</code>. Para cerrar: <code>node scripts/reengage.js --prune --send</code>.
      </p>
    </div>
  );
}

function EditModal({ member, canManageAdmin, onClose, onSaved }: { member: AdminMember; canManageAdmin: boolean; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: member.name,
    role: member.role,
    jobTitle: member.jobTitle ?? '',
    company: member.company ?? '',
    companyUrl: member.companyUrl ?? '',
    isAdmin: member.isAdmin,
    neighborhood: normalizeNeighborhood(member.neighborhood),
    bio: member.bio ?? '',
    building: member.building ?? '',
    canHelpWith: member.canHelpWith ?? '',
    linkedinUrl: member.linkedinUrl ?? '',
    twitterUrl: member.twitterUrl ?? '',
    instagramUrl: member.instagramUrl ?? '',
    websiteUrl: member.websiteUrl ?? '',
  });
  const [tags, setTags] = useState<string[]>(member.tags ?? []);
  const [lookingFor, setLookingFor] = useState<string[]>(member.lookingFor ?? []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const toggleTag = (t: string) => setTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleLooking = (t: string) => setLookingFor(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const { isAdmin, ...rest } = f;
      const payload = canManageAdmin ? { ...rest, isAdmin, tags, lookingFor } : { ...rest, tags, lookingFor };
      const res = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Error'); return; }
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card admin-modal">
        <button onClick={onClose} className="modal-close" aria-label="Cerrar">&times;</button>
        <div className="modal-eyebrow">$ edit --member {member.id}</div>
        <h3 className="modal-title">Editar a {member.name.split(' ')[0]}</h3>
        <form onSubmit={save} className="auth-form">
          <label className="auth-label"><span>Nombre</span>
            <input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          </label>
          <label className="auth-label"><span>Rol</span>
            <select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
          </label>
          <label className="auth-label"><span>Job title</span>
            <input value={f.jobTitle} onChange={e => setF({ ...f, jobTitle: e.target.value })} />
          </label>
          <div className="auth-row">
            <label className="auth-label"><span>Empresa</span>
              <input value={f.company} onChange={e => setF({ ...f, company: e.target.value })} />
            </label>
            <label className="auth-label"><span>URL</span>
              <input value={f.companyUrl} onChange={e => setF({ ...f, companyUrl: e.target.value })} />
            </label>
          </div>
          <label className="auth-label"><span>Barrio / zona</span>
            <select value={f.neighborhood} onChange={e => setF({ ...f, neighborhood: e.target.value })}>
              <option value="">—</option>
              {NEIGHBORHOODS.map(n => <option key={n} value={n}>{neighborhoodLabel(n)}</option>)}
            </select>
          </label>
          <label className="auth-label"><span>Bio</span>
            <textarea rows={2} value={f.bio} onChange={e => setF({ ...f, bio: e.target.value })} />
          </label>
          <label className="auth-label"><span>Qué construye</span>
            <input value={f.building} onChange={e => setF({ ...f, building: e.target.value })} />
          </label>
          <label className="auth-label"><span>En qué ayuda</span>
            <input value={f.canHelpWith} onChange={e => setF({ ...f, canHelpWith: e.target.value })} />
          </label>
          <div className="auth-row">
            <label className="auth-label"><span>LinkedIn</span>
              <input value={f.linkedinUrl} onChange={e => setF({ ...f, linkedinUrl: e.target.value })} />
            </label>
            <label className="auth-label"><span>X / Twitter</span>
              <input value={f.twitterUrl} onChange={e => setF({ ...f, twitterUrl: e.target.value })} />
            </label>
          </div>
          <label className="auth-label"><span>Instagram</span>
            <input value={f.instagramUrl} onChange={e => setF({ ...f, instagramUrl: e.target.value })} />
          </label>
          <label className="auth-label"><span>URL de tu sitio</span>
            <input value={f.websiteUrl} onChange={e => setF({ ...f, websiteUrl: e.target.value })} placeholder="https://…" />
          </label>
          <div className="auth-label"><span>Qué busca</span>
            <div className="dash-tag-picker">
              {LOOKING_FOR_OPTIONS.map(t => (
                <button type="button" key={t} onClick={() => toggleLooking(t)} className={`dash-tag-chip${lookingFor.includes(t) ? ' is-active' : ''}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="auth-label"><span>Tags</span>
            <div className="dash-tag-picker">
              {AVAILABLE_TAGS.map(t => (
                <button type="button" key={t} onClick={() => toggleTag(t)} className={`dash-tag-chip${tags.includes(t) ? ' is-active' : ''}`}>{t}</button>
              ))}
            </div>
          </div>
          {canManageAdmin && (
            <div className="admin-checks">
              <label><input type="checkbox" checked={f.isAdmin} onChange={e => setF({ ...f, isAdmin: e.target.checked })} /> es admin <span className="admin-badge badge-admin">solo dueño</span></label>
            </div>
          )}
          {err && <div className="auth-error">{err}</div>}
          <button type="submit" disabled={saving} className="btn btn-green auth-submit">{saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </form>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (children == null || children === '' || (Array.isArray(children) && children.length === 0)) return null;
  return (
    <div className="admin-detail-row">
      <div className="admin-detail-label">{label}</div>
      <div className="admin-detail-val">{children}</div>
    </div>
  );
}

function fmtDate(s?: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DetailModal({
  member: m, busy, onClose, onEdit, onAction,
}: {
  member: AdminMember;
  busy: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAction: (action: string, confirmMsg?: string) => void;
}) {
  const links: { label: string; href: string }[] = [];
  if (m.linkedinUrl) links.push({ label: 'LinkedIn', href: m.linkedinUrl });
  if (m.twitterUrl) links.push({ label: 'X', href: m.twitterUrl });
  if (m.instagramUrl) links.push({ label: 'Instagram', href: m.instagramUrl });
  if (m.websiteUrl) links.push({ label: 'Website', href: m.websiteUrl });

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card admin-modal">
        <button onClick={onClose} className="modal-close" aria-label="Cerrar">&times;</button>
        <div className="modal-eyebrow">$ ver --member {m.id}</div>
        <h3 className="modal-title" style={{ marginBottom: 4 }}>{m.name}</h3>
        <div className="admin-detail-sub">
          {(m.jobTitle || m.role)}{m.company ? <> · {m.company}</> : null}
          {' · '}<span className={`admin-status status-${m.status}`}>{STATUS_LABEL[m.status] ?? m.status}</span>
          {m.status === 'pending' && (m.profileSubmittedAt
            ? <span className="admin-badge badge-ok">✓ presentó</span>
            : <span className="admin-badge badge-pend">sin presentar</span>)}
        </div>
        <a href={`mailto:${m.email}`} className="admin-detail-email">{m.email}</a>

        <div className="admin-detail">
          <DetailRow label="Barrio / zona">{neighborhoodLabel(m.neighborhood)}</DetailRow>
          <DetailRow label="Bio">{m.bio}</DetailRow>
          <DetailRow label="Qué construye">{m.building}</DetailRow>
          <DetailRow label="Qué busca">
            {m.lookingFor && m.lookingFor.length > 0 ? (
              <div className="admin-detail-chips">
                {m.lookingFor.map(t => <span key={t} className="dash-tag-chip is-active">{t}</span>)}
              </div>
            ) : null}
          </DetailRow>
          <DetailRow label="En qué ayuda">{m.canHelpWith}</DetailRow>
          <DetailRow label="Empresa">
            {m.company ? (m.companyUrl
              ? <a href={m.companyUrl} target="_blank" rel="noopener">{m.company} ↗</a>
              : m.company) : null}
          </DetailRow>
          <DetailRow label="Links">
            {links.length > 0 ? (
              <div className="admin-detail-chips">
                {links.map(l => <a key={l.label} href={l.href} target="_blank" rel="noopener" className="admin-detail-link">{l.label} ↗</a>)}
              </div>
            ) : null}
          </DetailRow>
          <DetailRow label="Tags">
            {m.tags && m.tags.length > 0 ? (
              <div className="admin-detail-chips">{m.tags.map(t => <span key={t} className="dash-tag-chip">{t}</span>)}</div>
            ) : null}
          </DetailRow>
          <DetailRow label="Registro">{fmtDate(m.createdAt)}</DetailRow>
          <DetailRow label="Presentación">{fmtDate(m.profileSubmittedAt)}</DetailRow>
          <DetailRow label="Re-enganche">{fmtDate(m.reengagedAt)}</DetailRow>
        </div>

        <div className="admin-detail-actions">
          {m.status === 'pending' && <>
            <button disabled={busy} className="btn btn-green" onClick={() => onAction('accept', `¿Aceptar a ${m.name}? Se le envían credenciales + WhatsApp.`)}>Aceptar</button>
            <button disabled={busy} className="btn btn-outline" onClick={() => onAction('reject', `¿Rechazar a ${m.name}? Se le envía un email.`)}>Rechazar</button>
          </>}
          {(m.status === 'rejected' || m.status === 'lapsed') &&
            <button disabled={busy} className="btn btn-green" onClick={() => onAction('accept', `¿Aceptar a ${m.name}?`)}>Aceptar</button>}
          {m.status === 'active' &&
            <button disabled={busy} className="btn btn-outline" onClick={() => onAction('resend', `¿Reenviar credenciales a ${m.name}?`)}>Reenviar acceso</button>}
          <button className="btn btn-ghost" onClick={onEdit}>Editar</button>
        </div>
      </div>
    </div>
  );
}
