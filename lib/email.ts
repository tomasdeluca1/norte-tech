import { Resend } from 'resend';
import { getSetting } from './settings';
import { SITE_URL } from './site';
import { registrationReceivedHtml } from './email-templates/registration-received';
import { acceptedEmailHtml } from './email-templates/accepted';
import { rejectedEmailHtml } from './email-templates/rejected';
import { adminNewRegistrationHtml } from './email-templates/admin-notification';
import { welcomeEmailHtml } from './email-templates/welcome';
import { passwordResetLinkHtml, passwordResetLinkText } from './email-templates/password-reset';
import { sendMail, getFromAddress as mailerFrom } from './mailer';
import { RESET_TOKEN_TTL_MINUTES, resetUrl } from './reset-token';
import { presentationReceivedHtml } from './email-templates/presentation-received';

let resendClient: Resend | undefined;

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error('Missing RESEND_API_KEY environment variable');
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

// Mismo remitente que lib/mailer.ts (EMAIL_FROM o el default de Resend).
const getFromAddress = mailerFrom;

function getAppUrl(): string {
  // APP_URL (env) manda; si no está, se usa SITE_URL de lib/site.ts.
  return (process.env.APP_URL?.trim() || SITE_URL).replace(/\/$/, '');
}

/** Builder se registró → "recibimos tu registro" (sin credenciales). */
export async function sendRegistrationReceivedEmail(params: { to: string; name: string }): Promise<void> {
  const appUrl = getAppUrl();
  await getResend().emails.send({
    from: getFromAddress(),
    to: params.to,
    subject: 'Recibimos tu registro en Norte Tech ⏳',
    html: registrationReceivedHtml({ name: params.name, appUrl }),
  });
}

/** Aviso interno al admin de un nuevo registro pendiente. */
export async function sendAdminNewRegistrationEmail(params: {
  name: string;
  email: string;
  role: string;
  company?: string | null;
}): Promise<void> {
  const appUrl = getAppUrl();
  const to = await getSetting('admin_notification_email');
  if (!to) return;
  await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject: `🛎️ Nuevo builder en Norte Tech: ${params.name}`,
    html: adminNewRegistrationHtml({
      name: params.name,
      email: params.email,
      role: params.role,
      company: params.company,
      adminUrl: `${appUrl}/admin`,
      appUrl,
    }),
  });
}

/** Builder completó su presentación vía link mágico → "la estamos revisando". */
export async function sendPresentationReceivedEmail(params: { to: string; name: string }): Promise<void> {
  const appUrl = getAppUrl();
  await getResend().emails.send({
    from: getFromAddress(),
    to: params.to,
    subject: 'Recibimos tu presentación en Norte Tech ✅',
    html: presentationReceivedHtml({ name: params.name, appUrl }),
  });
}

/** Aviso interno al admin de que un pendiente completó su presentación. */
export async function sendAdminPresentationCompletedEmail(params: {
  name: string;
  email: string;
  role: string;
  company?: string | null;
}): Promise<void> {
  const appUrl = getAppUrl();
  const to = await getSetting('admin_notification_email');
  if (!to) return;
  await getResend().emails.send({
    from: getFromAddress(),
    to,
    subject: `✅ Presentación completada: ${params.name}`,
    html: adminNewRegistrationHtml({
      name: params.name,
      email: params.email,
      role: params.role,
      company: params.company,
      adminUrl: `${appUrl}/admin`,
      appUrl,
    }),
  });
}

/** Builder aceptado → credenciales + invitación al grupo de WhatsApp. */
export async function sendAcceptedEmail(params: {
  to: string;
  name: string;
  defaultPassword: string;
}): Promise<void> {
  const appUrl = getAppUrl();
  const whatsappUrl = await getSetting('whatsapp_group_url');
  await getResend().emails.send({
    from: getFromAddress(),
    to: params.to,
    subject: '¡Entraste a Norte Tech! 🚀',
    html: acceptedEmailHtml({
      name: params.name,
      email: params.to,
      password: params.defaultPassword,
      loginUrl: `${appUrl}/login`,
      whatsappUrl,
      appUrl,
    }),
  });
}

/** Builder se registró con auto-acceso → acceso + WhatsApp + (opcional) pedido de web. */
export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
  defaultPassword: string;
  needsWebsite: boolean;
}): Promise<void> {
  const appUrl = getAppUrl();
  const whatsappUrl = await getSetting('whatsapp_group_url');
  await getResend().emails.send({
    from: getFromAddress(),
    to: params.to,
    subject: '¡Entraste a Norte Tech! 🚀',
    html: welcomeEmailHtml({
      name: params.name,
      email: params.to,
      password: params.defaultPassword,
      loginUrl: `${appUrl}/login`,
      whatsappUrl: whatsappUrl ?? '',
      appUrl,
      needsWebsite: params.needsWebsite,
    }),
  });
}

/** Recuperación de contraseña → nueva contraseña temporal. */
/** Link para elegir contraseña nueva (pasa por lib/mailer.ts). */
export async function sendPasswordResetLinkEmail(params: { to: string; name: string; token: string }): Promise<void> {
  const appUrl = getAppUrl();
  const url = resetUrl(appUrl, params.token);
  await sendMail({
    to: params.to,
    subject: 'Elegí tu nueva contraseña de Norte Tech',
    html: passwordResetLinkHtml({ name: params.name, resetUrl: url, expiresInMinutes: RESET_TOKEN_TTL_MINUTES, appUrl }),
    text: passwordResetLinkText({ name: params.name, resetUrl: url, expiresInMinutes: RESET_TOKEN_TTL_MINUTES }),
  });
}

/** Builder rechazado → mensaje cordial. */
export async function sendRejectedEmail(params: { to: string; name: string }): Promise<void> {
  const appUrl = getAppUrl();
  await getResend().emails.send({
    from: getFromAddress(),
    to: params.to,
    subject: 'Sobre tu registro en Norte Tech',
    html: rejectedEmailHtml({ name: params.name, appUrl }),
  });
}
