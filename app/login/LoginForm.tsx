"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PasswordField from '../components/member/PasswordField';

type Mode = 'login' | 'forgot';
type Status = 'idle' | 'loading' | 'error' | 'sent';

export default function LoginForm({ initialMode, justReset }: { initialMode: Mode; justReset: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Al cambiar de modo, el foco va al título nuevo (lectores de pantalla y teclado).
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus();
  }, [mode, status]);

  function switchMode(next: Mode) {
    setMode(next);
    setStatus('idle');
    setMessage('');
    setPassword('');
    const url = next === 'forgot' ? '/login?modo=recuperar' : '/login';
    window.history.replaceState(null, '', url);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setMessage(res.status === 401 ? 'El email o la contraseña no coinciden.' : data.error || 'No pudimos iniciar sesión. Probá de nuevo.');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setStatus('error');
      setMessage('No hay conexión. Revisá tu internet y probá de nuevo.');
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'No pudimos procesar el pedido. Probá de nuevo en un rato.');
        return;
      }
      setStatus('sent');
      setMessage(data.message || '');
    } catch {
      setStatus('error');
      setMessage('No hay conexión. Revisá tu internet y probá de nuevo.');
    }
  }

  if (mode === 'forgot') {
    const sent = status === 'sent';
    return (
      <section className="mb-card" aria-labelledby="auth-title">
        <ol className="mb-steps" aria-label="Pasos para recuperar el acceso">
          <li aria-current={sent ? undefined : 'step'} data-state={sent ? 'done' : undefined}><span className="sr-only">Tu email</span></li>
          <li aria-current={sent ? 'step' : undefined}><span className="sr-only">Revisá el mail</span></li>
          <li><span className="sr-only">Contraseña nueva</span></li>
        </ol>
        <p className="mb-step-label" aria-hidden="true">{sent ? 'Paso 2 de 3 · Revisá el mail' : 'Paso 1 de 3 · Tu email'}</p>
        {sent ? (
          <>
            <div className="mb-state-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6 8.5-6" /></svg>
            </div>
            <h1 className="mb-display" ref={headingRef} tabIndex={-1} id="auth-title">Revisá tu mail</h1>
            <p className="mb-lead" role="status">{message}</p>
            <p className="mb-small" style={{ marginTop: 12 }}>El link sirve una sola vez y vence en 45 minutos. Si no lo ves, buscá en spam o promociones.</p>
            <div className="mb-form">
              <button type="button" className="mb-btn mb-btn-ghost mb-btn-block" onClick={() => switchMode('login')}>Volver a iniciar sesión</button>
            </div>
            <p className="mb-card-foot">
              ¿No llegó?{' '}
              <button type="button" className="mb-linkbtn" onClick={() => { setStatus('idle'); setMessage(''); }}>Pedir otro link</button>
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-display" ref={headingRef} tabIndex={-1} id="auth-title">Recuperá el acceso</h1>
            <p className="mb-lead">Escribí el email con el que te sumaste. Te mandamos un link para elegir una contraseña nueva.</p>
            <form onSubmit={handleForgot} className="mb-form" noValidate={false}>
              <div className="mb-field">
                <label className="mb-label" htmlFor="forgot-email">Email</label>
                <input id="forgot-email" className="mb-input" required type="email" autoComplete="email" inputMode="email" placeholder="vos@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={status === 'error' || undefined} aria-describedby={status === 'error' ? 'forgot-error' : undefined} />
              </div>
              {status === 'error' && <p className="mb-msg mb-msg-error" id="forgot-error" role="alert">{message}</p>}
              <button type="submit" disabled={status === 'loading'} className="mb-btn mb-btn-primary mb-btn-lg mb-btn-block">
                {status === 'loading' ? 'Enviando…' : 'Mandame el link'}
              </button>
            </form>
            <p className="mb-card-foot">
              ¿Te acordaste?{' '}
              <button type="button" className="mb-linkbtn" onClick={() => switchMode('login')}>Iniciar sesión</button>
            </p>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="mb-card" aria-labelledby="auth-title">
      <p className="mb-eyebrow">Miembros</p>
      <h1 className="mb-display" ref={headingRef} tabIndex={-1} id="auth-title">Iniciá <span className="mb-u-amber">sesión</span></h1>
      <p className="mb-lead">Entrá a tu cuenta para editar tu ficha en la comunidad.</p>
      {justReset && status === 'idle' && (
        <p className="mb-msg mb-msg-ok" role="status" style={{ marginTop: 20 }}>Listo, tu contraseña nueva ya funciona. Entrá con ella.</p>
      )}
      <form onSubmit={handleLogin} className="mb-form">
        <div className="mb-field">
          <label className="mb-label" htmlFor="login-email">Email</label>
          <input id="login-email" className="mb-input" required type="email" autoComplete="email" inputMode="email" placeholder="vos@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={status === 'error' || undefined} />
        </div>
        <PasswordField label="Contraseña" value={password} onChange={setPassword} autoComplete="current-password" invalid={status === 'error'} />
        {status === 'error' && <p className="mb-msg mb-msg-error" role="alert">{message}</p>}
        <button type="submit" disabled={status === 'loading'} className="mb-btn mb-btn-primary mb-btn-lg mb-btn-block">
          {status === 'loading' ? 'Entrando…' : 'Entrar'}
        </button>
        <div style={{ textAlign: 'center' }}>
          <button type="button" className="mb-linkbtn" onClick={() => switchMode('forgot')}>¿Olvidaste tu contraseña?</button>
        </div>
      </form>
      <p className="mb-card-foot">
        ¿Todavía no estás en la comunidad? <a href="/#comunidad" className="mb-link">Sumate</a>
      </p>
    </section>
  );
}
