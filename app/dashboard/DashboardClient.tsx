"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, TAGS } from '@/lib/profile-fields';
import { CATEGORIES, type CommunityStats } from '@/lib/categories';
import MemberBar from '../components/member/MemberBar';
import PasswordField from '../components/member/PasswordField';

export interface DashboardUser {
  name: string;
  email: string;
  initials: string;
  role: string;
  jobTitle: string;
  company: string;
  companyUrl: string;
  websiteUrl: string;
  tags: string[];
  mustChangePassword: boolean;
  isAdmin: boolean;
  createdAt: string;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

function memberSince(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });
}

export default function DashboardClient({ initialUser, stats }: { initialUser: DashboardUser; stats: CommunityStats | null }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState({
    name: initialUser.name, role: initialUser.role, jobTitle: initialUser.jobTitle,
    company: initialUser.company, companyUrl: initialUser.companyUrl, websiteUrl: initialUser.websiteUrl,
  });
  const [tags, setTags] = useState<string[]>(initialUser.tags);
  const [profileStatus, setProfileStatus] = useState<Status>('idle');
  const [profileMsg, setProfileMsg] = useState('');

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdStatus, setPwdStatus] = useState<Status>('idle');
  const [pwdMsg, setPwdMsg] = useState('');
  const [allStatus, setAllStatus] = useState<Status>('idle');

  // Llegar con #tu-sitio o #seguridad lleva directo a esa parte.
  const hashHandled = useRef(false);
  useEffect(() => {
    if (hashHandled.current) return;
    hashHandled.current = true;
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  async function logoutAll() {
    setAllStatus('loading');
    const res = await fetch('/api/auth/logout-all', { method: 'POST' }).catch(() => null);
    if (!res || !res.ok) { setAllStatus('error'); return; }
    router.push('/login');
    router.refresh();
  }

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg('');
    setProfileStatus('loading');
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profile, tags }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      if (res?.status === 401) { router.replace('/login'); return; }
      setProfileStatus('error');
      setProfileMsg(data.error || 'No pudimos guardar los cambios. Probá de nuevo.');
      return;
    }
    const u = data.user ?? {};
    setUser((prev) => ({
      ...prev,
      name: u.name ?? profile.name, initials: u.initials ?? prev.initials, role: u.role ?? profile.role,
      jobTitle: u.jobTitle ?? '', company: u.company ?? '', companyUrl: u.companyUrl ?? '', websiteUrl: u.websiteUrl ?? '',
      tags: u.tags ?? tags,
    }));
    setProfileStatus('success');
    setProfileMsg('Guardamos tus cambios.');
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg('');
    if (newPwd.length < 8) { setPwdStatus('error'); setPwdMsg('La contraseña nueva necesita al menos 8 caracteres.'); return; }
    if (newPwd !== confirmPwd) { setPwdStatus('error'); setPwdMsg('Las dos contraseñas nuevas no coinciden.'); return; }
    setPwdStatus('loading');
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setPwdStatus('error');
      setPwdMsg(data.error || 'No pudimos cambiar la contraseña. Probá de nuevo.');
      return;
    }
    setPwdStatus('success');
    setPwdMsg('Listo. Cambiamos tu contraseña y cerramos tus otras sesiones.');
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setUser((u) => ({ ...u, mustChangePassword: false }));
  }

  const firstName = user.name.split(' ')[0];
  const sub = user.jobTitle && user.company ? `${user.jobTitle} @ ${user.company}` : (user.jobTitle || user.role);

  return (
    <div className="mb">
      <div className="mb-dots" aria-hidden="true" />
      <MemberBar>
        <a href="/#comunidad" className="mb-bar-link is-wide">La comunidad</a>
        {user.isAdmin && <a href="/admin" className="mb-btn mb-btn-ghost mb-btn-sm">Admin</a>}
        <button type="button" onClick={logout} className="mb-btn mb-btn-ghost mb-btn-sm">Salir</button>
      </MemberBar>

      <main className="mb-wrap" id="contenido">
        {user.mustChangePassword && (
          <div className="mb-notice" role="status" style={{ marginBottom: 32 }}>
            <span className="mb-badge">Importante</span>
            <p style={{ margin: 0 }}><strong>Estás con una contraseña temporal.</strong> Elegí una propia en <a href="#seguridad" className="mb-link">Seguridad</a>.</p>
          </div>
        )}

        <header className="mb-hero">
          <div className="mb-avatar" aria-hidden="true">{user.initials}</div>
          <div style={{ minWidth: 0 }}>
            <p className="mb-eyebrow">Tu cuenta</p>
            <h1 className="mb-display">Hola, <span className="mb-u-amber">{firstName}</span>.</h1>
            <div className="mb-hero-meta">
              <span>{sub}</span>
              <span><span className="mb-mono">Miembro desde</span> {memberSince(user.createdAt)}</span>
            </div>
          </div>
        </header>

        <div className="mb-grid">
          <div className="mb-col">
            <section className="mb-panel" aria-labelledby="perfil-title">
              <p className="mb-eyebrow">Perfil</p>
              <h2 className="mb-h2" id="perfil-title">Tus datos en la comunidad</h2>
              <p className="mb-small" style={{ marginTop: 8 }}>Lo que pongas acá es lo que ve el resto en el directorio.</p>
              <form onSubmit={saveProfile} className="mb-form">
                <div className="mb-row">
                  <div className="mb-field">
                    <label className="mb-label" htmlFor="p-name">Nombre</label>
                    <input id="p-name" className="mb-input" required autoComplete="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                  </div>
                  <div className="mb-field">
                    <label className="mb-label" htmlFor="p-email">Email</label>
                    <input id="p-email" className="mb-input" value={user.email} readOnly aria-describedby="p-email-hint" />
                    <p className="mb-hint" id="p-email-hint">No se muestra en el directorio.</p>
                  </div>
                </div>
                <div className="mb-row">
                  <div className="mb-field">
                    <label className="mb-label" htmlFor="p-role">Área</label>
                    <select id="p-role" className="mb-input" required value={profile.role} onChange={(e) => setProfile({ ...profile, role: e.target.value })}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="mb-field">
                    <label className="mb-label" htmlFor="p-job">Cargo</label>
                    <input id="p-job" className="mb-input" placeholder="Ej. Founder & CEO" maxLength={80} autoComplete="organization-title" value={profile.jobTitle} onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })} />
                  </div>
                </div>
                <div className="mb-row">
                  <div className="mb-field">
                    <label className="mb-label" htmlFor="p-company">Empresa</label>
                    <input id="p-company" className="mb-input" autoComplete="organization" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
                  </div>
                  <div className="mb-field">
                    <label className="mb-label" htmlFor="p-company-url">Web de la empresa</label>
                    <input id="p-company-url" className="mb-input" type="url" inputMode="url" placeholder="https://" value={profile.companyUrl} onChange={(e) => setProfile({ ...profile, companyUrl: e.target.value })} />
                  </div>
                </div>
                <div className="mb-field" id="tu-sitio">
                  <label className="mb-label" htmlFor="p-site">Tu sitio o proyecto</label>
                  <input id="p-site" className="mb-input" type="url" inputMode="url" placeholder="https://tusitio.com" value={profile.websiteUrl} onChange={(e) => setProfile({ ...profile, websiteUrl: e.target.value })} aria-describedby="p-site-hint" />
                  <p className="mb-hint" id="p-site-hint">Con un sitio cargado aparecés en la vitrina de la comunidad en la home.</p>
                </div>
                <fieldset className="mb-fieldset">
                  <legend>Tags</legend>
                  <p className="mb-hint" style={{ marginTop: -4 }}>Elegí los que te describen. Sirven para que te encuentren.</p>
                  <div className="mb-chips">
                    {TAGS.map((tag) => (
                      <button key={tag} type="button" className="mb-chip" aria-pressed={tags.includes(tag)} onClick={() => toggleTag(tag)}>{tag}</button>
                    ))}
                  </div>
                </fieldset>
                {profileMsg && <p className={`mb-msg ${profileStatus === 'success' ? 'mb-msg-ok' : 'mb-msg-error'}`} role={profileStatus === 'success' ? 'status' : 'alert'}>{profileMsg}</p>}
                <div className="mb-panel-actions">
                  <button type="submit" disabled={profileStatus === 'loading'} className="mb-btn mb-btn-primary">{profileStatus === 'loading' ? 'Guardando…' : 'Guardar cambios'}</button>
                </div>
              </form>
            </section>
          </div>

          <div className="mb-col">
            <section className="mb-panel" aria-labelledby="ficha-title">
              <p className="mb-eyebrow">Vista previa</p>
              <h2 className="mb-h3" id="ficha-title">Así aparecés en el directorio</h2>
              <div className="mb-member">
                <div className="mb-avatar mb-avatar-sm" aria-hidden="true">{user.initials}</div>
                <div style={{ minWidth: 0 }}>
                  <p className="mb-member-name">{user.name}</p>
                  <p className="mb-member-role">{sub}</p>
                </div>
              </div>
              {user.tags.length > 0 && (
                <ul className="mb-chips" aria-label="Tus tags">
                  {user.tags.map((t) => <li key={t} className="mb-chip">{t}</li>)}
                </ul>
              )}
              {user.websiteUrl ? (
                <a className="mb-site mb-link" href={user.websiteUrl} target="_blank" rel="noopener noreferrer">{user.websiteUrl.replace(/^https?:\/\//, '')}<span className="sr-only"> (se abre en otra pestaña)</span></a>
              ) : (
                <p className="mb-hint" style={{ marginTop: 12 }}>Todavía no cargaste tu sitio. <a href="#tu-sitio" className="mb-link">Sumalo</a></p>
              )}
            </section>

            {stats && (
              <section className="mb-panel" aria-labelledby="comunidad-title">
                <p className="mb-eyebrow">La comunidad hoy</p>
                <h2 className="mb-h3" id="comunidad-title">Quiénes están</h2>
                <p className="mb-stat-total"><b>{stats.total}</b><span className="mb-small">{stats.total === 1 ? 'miembro activo' : 'miembros activos'}</span></p>
                <ul className="mb-stats">
                  {CATEGORIES.map((c) => <li key={c}><span>{c}</span><b>{stats.categories[c]}</b></li>)}
                </ul>
              </section>
            )}

            <section className="mb-panel" id="seguridad" aria-labelledby="seguridad-title">
              <p className="mb-eyebrow">Seguridad</p>
              <h2 className="mb-h3" id="seguridad-title">Cambiar contraseña</h2>
              <form onSubmit={changePassword} className="mb-form">
                <PasswordField label="Contraseña actual" value={currentPwd} onChange={setCurrentPwd} autoComplete="current-password" />
                <PasswordField label="Contraseña nueva" value={newPwd} onChange={setNewPwd} autoComplete="new-password" meter hint="Al menos 8 caracteres." />
                <PasswordField label="Repetí la nueva" value={confirmPwd} onChange={setConfirmPwd} autoComplete="new-password" invalid={confirmPwd.length > 0 && confirmPwd !== newPwd} />
                {pwdMsg && <p className={`mb-msg ${pwdStatus === 'success' ? 'mb-msg-ok' : 'mb-msg-error'}`} role={pwdStatus === 'success' ? 'status' : 'alert'}>{pwdMsg}</p>}
                <button type="submit" disabled={pwdStatus === 'loading'} className="mb-btn mb-btn-primary mb-btn-block">{pwdStatus === 'loading' ? 'Guardando…' : 'Actualizar contraseña'}</button>
              </form>
              <hr className="mb-divider" />
              <h3 className="mb-h3" style={{ fontSize: 17 }}>Sesiones</h3>
              <p className="mb-small" style={{ marginTop: 6 }}>Si entraste desde una compu que no es tuya, cerrá todo y volvé a entrar.</p>
              {allStatus === 'error' && <p className="mb-msg mb-msg-error" role="alert" style={{ marginTop: 12 }}>No pudimos cerrar las sesiones. Probá de nuevo.</p>}
              <button type="button" onClick={logoutAll} disabled={allStatus === 'loading'} className="mb-btn mb-btn-ghost mb-btn-block" style={{ marginTop: 16 }}>
                {allStatus === 'loading' ? 'Cerrando…' : 'Cerrar sesión en todos los dispositivos'}
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
