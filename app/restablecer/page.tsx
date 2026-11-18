import type { Metadata } from 'next';
import { peekPasswordResetToken } from '@/lib/password-reset';
import { isWellFormedToken, RESET_TOKEN_TTL_MINUTES } from '@/lib/reset-token';
import MemberBar from '../components/member/MemberBar';
import ResetForm from './ResetForm';
import '../member.css';

export const dynamic = 'force-dynamic';

// El token viaja en la URL: sin referrer hacia terceros y fuera de buscadores.
export const metadata: Metadata = {
  title: 'Elegí tu contraseña nueva · Norte Tech',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function RestablecerPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';
  // Mirar el token no lo consume (los antivirus de mail abren los links solos).
  const state = isWellFormedToken(token) ? await peekPasswordResetToken(token) : 'missing';

  return (
    <div className="mb mb-auth">
      <div className="mb-dots" aria-hidden="true" />
      <MemberBar />
      <main className="mb-auth-main" id="contenido">
        {state === 'valid' ? (
          <ResetForm token={token} />
        ) : (
          <section className="mb-card" aria-labelledby="reset-title">
            <div className="mb-state-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            </div>
            <p className="mb-eyebrow">Link vencido</p>
            <h1 className="mb-display" id="reset-title">Este link ya no sirve</h1>
            <p className="mb-lead">
              {state === 'used'
                ? 'Ya se usó para cambiar la contraseña. Cada link sirve una sola vez.'
                : state === 'expired'
                  ? `Venció. Los links duran ${RESET_TOKEN_TTL_MINUTES} minutos.`
                  : 'No es válido o venció. Puede que esté incompleto si lo copiaste a mano.'}
            </p>
            <div className="mb-form">
              <a href="/login?modo=recuperar" className="mb-btn mb-btn-primary mb-btn-lg mb-btn-block">Pedir un link nuevo</a>
              <a href="/login" className="mb-btn mb-btn-ghost mb-btn-block">Iniciar sesión</a>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
