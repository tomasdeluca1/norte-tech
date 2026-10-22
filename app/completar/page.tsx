import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { readProfileToken } from '@/lib/magic-link';
import CompletarForm from './CompletarForm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '40px 16px', background: 'var(--bg)' }}>
      <div className="modal-card" style={{ maxWidth: 560, width: '100%', position: 'relative' }}>
        <a href="/" className="modal-eyebrow" style={{ textDecoration: 'none', display: 'inline-block' }}>$ norte-tech</a>
        {children}
      </div>
    </main>
  );
}

function Message({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <Shell>
      <h3 className="modal-title" style={{ marginTop: 8 }}>{title}</h3>
      <p className="modal-sub">{body}</p>
      {cta && (
        <a href={cta.href} className="btn btn-green" style={{ display: 'inline-block', marginTop: 8 }}>{cta.label}</a>
      )}
    </Shell>
  );
}

export default async function CompletarPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = typeof searchParams?.token === 'string' ? searchParams.token : null;
  const memberId = await readProfileToken(token);

  if (!memberId) {
    return (
      <Message
        title="Link inválido o vencido"
        body="Este link de presentación no es válido o ya expiró. Si todavía querés sumarte, registrate de nuevo desde la home."
        cta={{ href: '/#join', label: 'Ir a registrarme →' }}
      />
    );
  }

  const db = getDb();
  const [member] = await db.select().from(schema.members).where(eq(schema.members.id, memberId)).limit(1);

  if (!member) {
    return (
      <Message
        title="No encontramos tu registro"
        body="No pudimos encontrar tu solicitud. Probá registrándote de nuevo desde la home."
        cta={{ href: '/#join', label: 'Ir a registrarme →' }}
      />
    );
  }

  if (member.status === 'active') {
    return (
      <Message
        title="¡Ya sos parte! 🎉"
        body="Tu cuenta ya está activa. Entrá con tu email y contraseña para editar tu perfil."
        cta={{ href: '/login', label: 'Iniciar sesión →' }}
      />
    );
  }

  if (member.status === 'rejected') {
    return (
      <Message
        title="Sobre tu registro"
        body="Tu solicitud ya fue revisada. Si creés que es un error, escribinos respondiendo al email que te enviamos."
      />
    );
  }

  // Ya completó la presentación → mostramos el estado "completado", no el form.
  if (member.profileSubmittedAt) {
    return (
      <Shell>
        <div className="modal-success">
          <div className="success-badge">✓</div>
          <h3 className="success-title">Ya completaste tu <span style={{ color: 'var(--accent)' }}>presentación</span></h3>
          <p className="success-text">Hola, {member.name.split(' ')[0]}. Tu presentación ya está enviada y en revisión.</p>
          <div className="success-note">
            <strong>$ status --pending</strong><br />
            Un admin la revisa y, cuando te acepte, te llega el acceso al dashboard y la <strong>invitación al grupo de WhatsApp</strong> por email.
          </div>
        </div>
      </Shell>
    );
  }

  const initial = {
    name: member.name,
    email: member.email,
    role: member.role,
    jobTitle: member.jobTitle ?? '',
    company: member.company ?? '',
    companyUrl: member.companyUrl ?? '',
    neighborhood: member.neighborhood ?? '',
    bio: member.bio ?? '',
    building: member.building ?? '',
    lookingFor: member.lookingFor ?? [],
    canHelpWith: member.canHelpWith ?? '',
    linkedinUrl: member.linkedinUrl ?? '',
    twitterUrl: member.twitterUrl ?? '',
    instagramUrl: member.instagramUrl ?? '',
    websiteUrl: member.websiteUrl ?? '',
  };

  return (
    <Shell>
      <h3 className="modal-title" style={{ marginTop: 8 }}>
        Completá tu <span className="serif-hl">presentación</span>
      </h3>
      <p className="modal-sub">
        Hola, {member.name.split(' ')[0]}. Contanos quién sos, dónde vivís y qué construís. Un admin la revisa y, si te acepta,
        te llega el acceso y la invitación al grupo de WhatsApp.
      </p>
      <CompletarForm token={token as string} initial={initial} />
    </Shell>
  );
}
