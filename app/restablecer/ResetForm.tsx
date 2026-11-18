"use client";

import { useEffect, useRef, useState } from 'react';
import PasswordField from '../components/member/PasswordField';

export default function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done' | 'dead'>('idle');
  const [message, setMessage] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Saca el token de la barra de direcciones y del historial apenas carga.
  useEffect(() => {
    window.history.replaceState(null, '', '/restablecer');
  }, []);

  useEffect(() => {
    if (status === 'done' || status === 'dead') headingRef.current?.focus();
  }, [status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    if (password.length < 8) { setStatus('error'); setMessage('Usá al menos 8 caracteres.'); return; }
    if (password !== confirm) { setStatus('error'); setMessage('Las dos contraseñas no coinciden.'); return; }
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus(data.code === 'invalid_token' ? 'dead' : 'error');
        setMessage(data.error || 'No pudimos cambiar la contraseña. Probá de nuevo.');
        return;
      }
      setStatus('done');
    } catch {
      setStatus('error');
      setMessage('No hay conexión. Revisá tu internet y probá de nuevo.');
    }
  }

  if (status === 'done') {
    return (
      <section className="mb-card" aria-labelledby="reset-title">
        <div className="mb-state-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        </div>
        <p className="mb-eyebrow">Contraseña nueva</p>
        <h1 className="mb-display" id="reset-title" ref={headingRef} tabIndex={-1}>Listo, ya está</h1>
        <p className="mb-lead" role="status">Cambiamos tu contraseña y cerramos las sesiones que tenías abiertas en otros dispositivos.</p>
        <div className="mb-form">
          <a href="/login?listo=1" className="mb-btn mb-btn-primary mb-btn-lg mb-btn-block">Iniciar sesión</a>
        </div>
      </section>
    );
  }

  if (status === 'dead') {
    return (
      <section className="mb-card" aria-labelledby="reset-title">
        <p className="mb-eyebrow">Link vencido</p>
        <h1 className="mb-display" id="reset-title" ref={headingRef} tabIndex={-1}>Este link ya no sirve</h1>
        <p className="mb-lead" role="alert">{message}</p>
        <div className="mb-form">
          <a href="/login?modo=recuperar" className="mb-btn mb-btn-primary mb-btn-lg mb-btn-block">Pedir un link nuevo</a>
        </div>
      </section>
    );
  }

  const mismatch = confirm.length > 0 && confirm !== password;
  return (
    <section className="mb-card" aria-labelledby="reset-title">
      <ol className="mb-steps" aria-label="Pasos para recuperar el acceso">
        <li data-state="done"><span className="sr-only">Tu email</span></li>
        <li data-state="done"><span className="sr-only">Revisá el mail</span></li>
        <li aria-current="step"><span className="sr-only">Contraseña nueva</span></li>
      </ol>
      <p className="mb-step-label" aria-hidden="true">Paso 3 de 3 · Contraseña nueva</p>
      <h1 className="mb-display" id="reset-title" ref={headingRef} tabIndex={-1}>Elegí tu contraseña nueva</h1>
      <p className="mb-lead">Cuando la guardes, se cierran las sesiones abiertas en todos tus dispositivos.</p>
      <form className="mb-form" onSubmit={handleSubmit}>
        <PasswordField label="Contraseña nueva" value={password} onChange={setPassword} autoComplete="new-password" meter hint="Al menos 8 caracteres. Mejor si es una frase larga." autoFocus invalid={status === 'error' && password.length < 8} />
        <PasswordField label="Repetila" value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={mismatch} hint={mismatch ? 'Todavía no coincide con la de arriba.' : undefined} />
        {status === 'error' && <p className="mb-msg mb-msg-error" role="alert">{message}</p>}
        <button type="submit" disabled={status === 'loading'} className="mb-btn mb-btn-primary mb-btn-lg mb-btn-block">
          {status === 'loading' ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </section>
  );
}
