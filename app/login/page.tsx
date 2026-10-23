"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '../auth.css';
import BrandLogo from '../components/BrandLogo';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'sent'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) router.replace('/dashboard');
    });
  }, [router]);

  function switchMode(next: 'login' | 'forgot') {
    setMode(next);
    setStatus('idle');
    setErrorMsg('');
    setPassword('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Error al iniciar sesión');
        return;
      }
      router.push('/dashboard');
    } catch (err) {
      setStatus('error');
      setErrorMsg('Error de conexión');
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Error');
        return;
      }
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setErrorMsg('Error de conexión');
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-bg">
        <div className="auth-grid" />
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <ThemeToggle className="auth-theme-toggle" />
      <div className="auth-card">
        <a href="/" className="auth-logo">
          <BrandLogo variant="logo-horizontal" />
        </a>
        <div className="auth-eyebrow">Comunidad tech de zona norte</div>

        {mode === 'login' ? (
          <>
            <h1 className="auth-title display">INICIÁ<br />SESIÓN</h1>
            <p className="auth-sub">Accedé al dashboard de la comunidad.</p>
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-label">
                <span>Email</span>
                <input required type="email" autoComplete="email" placeholder="vos@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
              </label>
              <label className="auth-label">
                <span>Contraseña</span>
                <input required type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              </label>
              {status === 'error' && <div className="auth-error">{errorMsg}</div>}
              <button type="submit" disabled={status === 'loading'} className="btn btn-green auth-submit">
                {status === 'loading' ? 'Ingresando…' : 'Entrar →'}
              </button>
            </form>
            <div className="auth-footer">
              <a href="#" onClick={e => { e.preventDefault(); switchMode('forgot'); }}>¿Olvidaste tu contraseña?</a>
            </div>
            <div className="auth-footer">
              ¿Todavía no estás en la comunidad?
              <a href="/#comunidad"> Sumate ←</a>
            </div>
          </>
        ) : (
          <>
            <h1 className="auth-title display">RECUPERAR<br />ACCESO</h1>
            <p className="auth-sub">Te mandamos una contraseña temporal a tu email.</p>
            {status === 'sent' ? (
              <>
                <div className="auth-success">
                  Si tu email está en la comunidad, te llega un mail con una contraseña temporal en los próximos minutos. Revisá el inbox (y el spam).
                </div>
                <button onClick={() => switchMode('login')} className="btn btn-green auth-submit" style={{ marginTop: 16 }}>
                  ← Volver al login
                </button>
              </>
            ) : (
              <form onSubmit={handleForgot} className="auth-form">
                <label className="auth-label">
                  <span>Email</span>
                  <input required type="email" autoComplete="email" placeholder="vos@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
                </label>
                {status === 'error' && <div className="auth-error">{errorMsg}</div>}
                <button type="submit" disabled={status === 'loading'} className="btn btn-green auth-submit">
                  {status === 'loading' ? 'Enviando…' : 'Recuperar contraseña →'}
                </button>
                <div className="auth-footer">
                  <a href="#" onClick={e => { e.preventDefault(); switchMode('login'); }}>← Volver al login</a>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
