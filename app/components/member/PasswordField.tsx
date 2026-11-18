"use client";

// Campo de contraseña con botón Mostrar/Ocultar (44 px de alto útil, con nombre
// accesible) y, opcionalmente, un medidor simple de fortaleza.
import { useId, useState } from 'react';

export function passwordScore(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length < 8) s = Math.min(s, 1);
  return Math.max(1, Math.min(4, s)) as 1 | 2 | 3 | 4;
}
const SCORE_LABEL = ['', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];

export default function PasswordField({
  label, value, onChange, autoComplete, hint, meter = false, invalid = false, name, autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
  meter?: boolean;
  invalid?: boolean;
  name?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  const score = passwordScore(value);
  const describedBy = [hint ? `${id}-hint` : '', meter && value ? `${id}-meter` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className="mb-field">
      <label className="mb-label" htmlFor={id}>{label}</label>
      <div className="mb-pass">
        <input
          id={id}
          name={name}
          className="mb-input"
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="mb-pass-toggle"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
        >
          {show ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {meter && value && (
        <div id={`${id}-meter`}>
          <div className="mb-meter" data-score={score} aria-hidden="true"><span /><span /><span /><span /></div>
          <p className="mb-hint" style={{ marginTop: 6 }}>Fortaleza: {SCORE_LABEL[score]}</p>
        </div>
      )}
      {hint && <p className="mb-hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  );
}
