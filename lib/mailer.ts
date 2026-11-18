// Interfaz de envío de mails. Hoy el único proveedor es Resend (SDK `resend`).
// El resto de lib/email.ts todavía llama a Resend directo; los mails nuevos
// (reset de contraseña) pasan por acá, así cambiar de proveedor es tocar un
// solo archivo.
//
// Variables:
//   RESEND_API_KEY   clave de Resend (obligatoria para mandar de verdad)
//   EMAIL_FROM       remitente, ej. "Norte Tech <hola@DOMINIO_VERIFICADO>".
//                    Sin dominio verificado en Resend, onboarding@resend.dev
//                    sólo entrega al dueño de la cuenta.
//   RESEND_BASE_URL  (sólo pruebas locales) lo lee el SDK de Resend; apuntado
//                    a un receptor local, ningún mail sale a internet.
import { Resend } from 'resend';

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export interface MailTransport {
  readonly name: string;
  send(message: MailMessage & { from: string }): Promise<void>;
}

export const DEFAULT_FROM = 'Norte Tech <onboarding@resend.dev>';

export function getFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

class ResendTransport implements MailTransport {
  readonly name = 'resend';
  private client: Resend;
  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }
  async send(message: MailMessage & { from: string }): Promise<void> {
    const { error } = await this.client.emails.send({
      from: message.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      ...(message.text ? { text: message.text } : {}),
    });
    if (error) throw new Error(`Resend: ${error.name ?? 'error'}`);
  }
}

let transport: MailTransport | undefined;

/** Transporte configurado. Sin RESEND_API_KEY tira error (no se simula un envío en silencio). */
export function getMailTransport(): MailTransport {
  if (transport) return transport;
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error('Falta RESEND_API_KEY: no hay proveedor de mail configurado');
  transport = new ResendTransport(key);
  return transport;
}

/** Para tests: reemplaza el transporte. */
export function setMailTransportForTests(t: MailTransport | undefined): void {
  transport = t;
}

export async function sendMail(message: MailMessage): Promise<void> {
  await getMailTransport().send({ ...message, from: getFromAddress() });
}
