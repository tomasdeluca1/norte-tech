"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLES, TAGS } from '@/lib/profile-fields';
import '../auth.css';
import BrandLogo from '../components/BrandLogo';
import ThemeToggle from '../components/ThemeToggle';

interface User {
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
  mustChangePassword: boolean;
  isAdmin?: boolean;
  websiteUrl?: string | null;
  createdAt: string;
}

const PALETTE = [
  { bg: 'rgba(169,183,243,.12)', color: '#a9b7f3' },
  { bg: 'rgba(33,150,243,.12)', color: '#2196f3' },
  { bg: 'rgba(255,152,0,.12)',  color: '#ff9800' },
  { bg: 'rgba(156,39,176,.12)', color: '#9c27b0' },
  { bg: 'rgba(244,67,54,.12)',  color: '#ef5350' },
  { bg: 'rgba(0,188,212,.12)',  color: '#00bcd4' },
  { bg: 'rgba(255,193,7,.12)',  color: '#ffc107' },
  { bg: 'rgba(76,175,80,.12)',  color: '#4caf50' },
];


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({
    name: '', role: '', jobTitle: '', company: '', companyUrl: '', websiteUrl: '',
  });
  const [profileTags, setProfileTags] = useState<string[]>([]);
  const [profileStatus, setProfileStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [profileMessage, setProfileMessage] = useState('');

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdStatus, setPwdStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pwdMessage, setPwdMessage] = useState('');

  function hydrateFormFromUser(u: User) {
    setProfile({
      name: u.name,
      role: u.role,
      jobTitle: u.jobTitle ?? '',
      company: u.company ?? '',
      companyUrl: u.companyUrl ?? '',
      websiteUrl: u.websiteUrl ?? '',
    });
    setProfileTags(u.tags ?? []);
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (!d.user) { router.replace('/login'); return; }
        setUser(d.user);
        hydrateFormFromUser(d.user);
      })
      .finally(() => setLoading(false));
  }, [router]);

  // El dashboard es client component: hasta que /api/auth/me resuelve, el
  // #tu-sitio del hash no existe todavía en el DOM (se muestra "Cargando…").
  // Una vez que el usuario cargó, si llegamos con ese hash, scrolleamos a mano.
  const hashHandled = useRef(false);
  useEffect(() => {
    if (!user || hashHandled.current) return;
    hashHandled.current = true;
    if (window.location.hash === '#tu-sitio') {
      document.getElementById('tu-sitio')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [user]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  function toggleTag(tag: string) {
    setProfileTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileMessage('');
    setProfileStatus('loading');
    const res = await fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profile, tags: profileTags }),
    });
    const data = await res.json();
    if (!res.ok) {
      setProfileStatus('error');
      setProfileMessage(data.error || 'Error al actualizar perfil');
      return;
    }
    setProfileStatus('success');
    setProfileMessage('Perfil actualizado ✓');
    setUser(data.user);
    hydrateFormFromUser(data.user);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMessage('');
    if (newPwd.length < 8) {
      setPwdStatus('error');
      setPwdMessage('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdStatus('error');
      setPwdMessage('Las contraseñas no coinciden');
      return;
    }
    setPwdStatus('loading');
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    });
    const data = await res.json();
    if (!res.ok) {
      setPwdStatus('error');
      setPwdMessage(data.error || 'Error');
      return;
    }
    setPwdStatus('success');
    setPwdMessage('Contraseña actualizada ✓');
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setUser(u => u ? { ...u, mustChangePassword: false } : u);
  }

  if (loading || !user) {
    return (
      <main className="dash-shell">
        <div className="dash-loading">Cargando…</div>
      </main>
    );
  }

  const c = PALETTE[user.colorIndex % PALETTE.length];

  return (
    <main className="dash-shell">
      <nav className="dash-nav">
        <a href="/" className="nav-logo">
          <BrandLogo variant="logo-horizontal" />
        </a>
        <div className="dash-nav-right">
          <ThemeToggle />
          {user.isAdmin && <a href="/admin" className="btn btn-ghost dash-logout">Admin</a>}
          <span className="dash-domain">Dashboard</span>
          <button onClick={handleLogout} className="btn btn-ghost dash-logout">Salir</button>
        </div>
      </nav>

      <div className="dash-bg">
        <div className="dash-grid" />
      </div>

      <section className="dash-container">
        {user.mustChangePassword && (
          <div className="dash-alert">
            <strong>⚠ Cambiá tu contraseña.</strong> Estás usando la contraseña temporal que te enviamos por email.
          </div>
        )}

        <header className="dash-hero">
          <div className="dash-avatar" style={{ background: c.bg, color: c.color }}>{user.initials}</div>
          <div>
            <div className="eyebrow">Tu perfil</div>
            <h1 className="display dash-title">HOLA, {user.name.split(' ')[0].toUpperCase()}</h1>
            <div className="dash-meta">
              {user.jobTitle && user.company
                ? <>{user.jobTitle} @ <a href={user.companyUrl ?? '#'} target="_blank" rel="noopener" style={{ color: c.color }}>{user.company}</a></>
                : user.role}
            </div>
          </div>
        </header>

        <div className="dash-grid-cols">
          <div className="dash-card">
            <div className="eyebrow">Cuenta</div>
            <h3 className="dash-card-title">Editar perfil</h3>
            <form onSubmit={handleProfileSubmit} className="auth-form">
              <label className="auth-label">
                <span>Nombre</span>
                <input required value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
              </label>
              <label className="auth-label">
                <span>Email</span>
                <input value={user.email} disabled readOnly className="auth-input-readonly" />
              </label>
              <label className="auth-label">
                <span>Área</span>
                <select required value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="auth-label">
                <span>Cargo</span>
                <input placeholder="Ej. Partner & CTO" maxLength={80} value={profile.jobTitle} onChange={e => setProfile({ ...profile, jobTitle: e.target.value })} />
              </label>
              <div className="auth-row">
                <label className="auth-label">
                  <span>Empresa</span>
                  <input placeholder="Ej. Norte Tech" value={profile.company} onChange={e => setProfile({ ...profile, company: e.target.value })} />
                </label>
                <label className="auth-label">
                  <span>URL</span>
                  <input type="url" placeholder="https://…" value={profile.companyUrl} onChange={e => setProfile({ ...profile, companyUrl: e.target.value })} />
                </label>
              </div>
              <label className="auth-label" id="tu-sitio">
                <span>URL de tu sitio</span>
                <input
                  type="url"
                  placeholder="https://tusitio.com"
                  value={profile.websiteUrl}
                  onChange={e => setProfile({ ...profile, websiteUrl: e.target.value })}
                />
              </label>
              <p className="dash-meta" style={{ marginTop: -6 }}>
                Pegá la URL de tu sitio, portfolio o proyecto: aparece en la landing y te destaca en el directorio de la comunidad.
                {user.websiteUrl && (
                  <>
                    {' '}Actual:{' '}
                    <a href={user.websiteUrl} target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>{user.websiteUrl}</a>
                  </>
                )}
              </p>
              <div className="auth-label">
                <span>Tags</span>
                <div className="dash-tag-picker">
                  {TAGS.map(tag => {
                    const active = profileTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`dash-tag-chip${active ? ' is-active' : ''}`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
              {profileMessage && (
                <div className={profileStatus === 'success' ? 'auth-success' : 'auth-error'}>{profileMessage}</div>
              )}
              <button type="submit" disabled={profileStatus === 'loading'} className="btn btn-green auth-submit">
                {profileStatus === 'loading' ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </form>
          </div>

          <div className="dash-card">
            <div className="eyebrow">Seguridad</div>
            <h3 className="dash-card-title">Cambiar contraseña</h3>
            <form onSubmit={handleChangePassword} className="auth-form">
              <label className="auth-label">
                <span>Contraseña actual</span>
                <input required type="password" autoComplete="current-password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
              </label>
              <label className="auth-label">
                <span>Nueva contraseña</span>
                <input required type="password" autoComplete="new-password" minLength={8} value={newPwd} onChange={e => setNewPwd(e.target.value)} />
              </label>
              <label className="auth-label">
                <span>Repetir nueva</span>
                <input required type="password" autoComplete="new-password" minLength={8} value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
              </label>
              {pwdMessage && (
                <div className={pwdStatus === 'success' ? 'auth-success' : 'auth-error'}>{pwdMessage}</div>
              )}
              <button type="submit" disabled={pwdStatus === 'loading'} className="btn btn-green auth-submit">
                {pwdStatus === 'loading' ? 'Guardando…' : 'Actualizar contraseña'}
              </button>
            </form>

            <div className="dash-meta-block">
              <div><strong>Miembro desde:</strong> {new Date(user.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
