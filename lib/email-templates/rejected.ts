import { emailShell, escapeHtml, headingRow, paragraphRow } from './layout';

export function rejectedEmailHtml(params: { name: string; appUrl: string }): string {
  const { name, appUrl } = params;
  const firstName = name.split(/\s+/)[0] || name;

  const body = `
    ${headingRow(`HOLA, ${escapeHtml(firstName.toUpperCase())}`)}
    ${paragraphRow(
      `Gracias por tu interés en sumarte a <strong style="color:#6EA6FF;">Norte Tech</strong>. 🙏`,
    )}
    ${paragraphRow(
      `Por ahora no vamos a poder darte el alta en la comunidad. Estamos arrancando de a poco y cuidando mucho el grupo, así que no es algo personal.`,
    )}
    ${paragraphRow(
      `Si creés que fue un error o querés contarnos más sobre lo que estás construyendo, respondé a este email y lo revisamos. 💙`,
    )}
  `;

  return emailShell({
    appUrl,
    bodyHtml: body,
    footerNote: 'Recibís este email porque te registraste en Norte Tech.',
  });
}
