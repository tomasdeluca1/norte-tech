import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getActiveMember } from '@/lib/member-session';
import { getCommunityStats } from '@/lib/stats';
import DashboardClient, { type DashboardUser } from './DashboardClient';
import '../member.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tu cuenta · Norte Tech',
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const auth = await getActiveMember();
  if (!auth) redirect('/login');
  const m = auth.member;
  const user: DashboardUser = {
    name: m.name,
    email: m.email,
    initials: m.initials,
    role: m.role,
    jobTitle: m.jobTitle ?? '',
    company: m.company ?? '',
    companyUrl: m.companyUrl ?? '',
    websiteUrl: m.websiteUrl ?? '',
    tags: (m.tags as string[] | null) ?? [],
    mustChangePassword: m.mustChangePassword,
    isAdmin: Boolean(m.isAdmin),
    createdAt: new Date(m.createdAt).toISOString(),
  };
  // Sólo totales agregados (miembros activos por categoría). Si la base no
  // responde, live=false y el panel no se muestra: nunca números inventados.
  const stats = await getCommunityStats();
  return <DashboardClient initialUser={user} stats={stats.live ? stats : null} />;
}
