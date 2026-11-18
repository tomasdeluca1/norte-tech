import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getActiveMember } from '@/lib/member-session';
import MemberBar from '../components/member/MemberBar';
import LoginForm from './LoginForm';
import '../member.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Iniciar sesión · Norte Tech',
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: { modo?: string; listo?: string } }) {
  if (await getActiveMember()) redirect('/dashboard');
  const initialMode = searchParams.modo === 'recuperar' ? 'forgot' : 'login';
  return (
    <div className="mb mb-auth">
      <div className="mb-dots" aria-hidden="true" />
      <MemberBar />
      <main className="mb-auth-main" id="contenido">
        <LoginForm initialMode={initialMode} justReset={searchParams.listo === '1'} />
      </main>
    </div>
  );
}
