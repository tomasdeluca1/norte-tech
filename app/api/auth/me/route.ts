import { NextResponse } from 'next/server';
import { isOwner } from '@/lib/admin';
import { getActiveMember } from '@/lib/member-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await getActiveMember();
  if (!auth) return NextResponse.json({ user: null }, { status: 200 });
  const m = auth.member;
  const user = {
    id: m.id,
    name: m.name,
    email: m.email,
    initials: m.initials,
    role: m.role,
    jobTitle: m.jobTitle,
    company: m.company,
    companyUrl: m.companyUrl,
    websiteUrl: m.websiteUrl,
    tags: m.tags,
    colorIndex: m.colorIndex,
    mustChangePassword: m.mustChangePassword,
    isAdmin: m.isAdmin,
    createdAt: m.createdAt,
  };
  return NextResponse.json({ user: { ...user, isOwner: isOwner(user) } });
}
