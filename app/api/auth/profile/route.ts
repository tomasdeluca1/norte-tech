import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { getActiveMember } from '@/lib/member-session';
import { ROLES, ROLE_TITLE } from '@/lib/profile-fields';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = new Set<string>(ROLES);

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join('') || '?';
}

function normalizeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

export async function PATCH(request: Request) {
  const auth = await getActiveMember();
  if (!auth) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const { session } = auth;

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const role = typeof body.role === 'string' ? body.role.trim() : '';
    const jobTitleRaw = typeof body.jobTitle === 'string' ? body.jobTitle.trim().slice(0, 80) : '';
    const company = typeof body.company === 'string' ? body.company.trim() : '';
    const companyUrl = normalizeUrl(typeof body.companyUrl === 'string' ? body.companyUrl : '');
    const websiteUrl = normalizeUrl(typeof body.websiteUrl === 'string' ? body.websiteUrl : '');
    const tags: string[] | null = Array.isArray(body.tags)
      ? (Array.from(new Set((body.tags as unknown[]).map(t => String(t).trim()).filter(Boolean))).slice(0, 12) as string[])
      : null;

    if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    if (name.length > 200) return NextResponse.json({ error: 'Nombre demasiado largo' }, { status: 400 });
    if (!role) return NextResponse.json({ error: 'Rol requerido' }, { status: 400 });
    if (!ALLOWED_ROLES.has(role)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });

    const jobTitle = jobTitleRaw || ROLE_TITLE[role] || null;

    const db = getDb();
    const [updated] = await db
      .update(schema.members)
      .set({
        name,
        initials: getInitials(name),
        role,
        jobTitle,
        company: company || null,
        companyUrl,
        websiteUrl,
        ...(tags ? { tags } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.members.id, auth.member.id))
      .returning({
        id: schema.members.id,
        name: schema.members.name,
        email: schema.members.email,
        initials: schema.members.initials,
        role: schema.members.role,
        jobTitle: schema.members.jobTitle,
        company: schema.members.company,
        companyUrl: schema.members.companyUrl,
        websiteUrl: schema.members.websiteUrl,
        tags: schema.members.tags,
        colorIndex: schema.members.colorIndex,
        mustChangePassword: schema.members.mustChangePassword,
        createdAt: schema.members.createdAt,
      });

    if (!updated) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    session.name = updated.name;
    await session.save();

    return NextResponse.json({ success: true, user: updated });
  } catch (err) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
