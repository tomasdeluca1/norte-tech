import { emailShell, escapeHtml, headingRow, paragraphRow, buttonRow, EMAIL } from './layout';

/** Mail con el link para elegir una contraseña nueva. Sin contraseñas en el mail. */
export function passwordResetLinkHtml(params: {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
  appUrl: string;
}): string {
  const { name, resetUrl, expiresInMinutes, appUrl } = params;
  const firstName = name.trim().split(/\s+/)[0] || name;

  const body = `
    ${headingRow(`Elegí tu nueva contraseña, ${escapeHtml(firstName)}`)}
    ${paragraphRow(`Pediste restablecer tu contraseña de <strong style="color:${EMAIL.text};">Norte Tech</strong>. Tocá el botón y elegí una nueva.`)}
    ${buttonRow(resetUrl, 'Elegir contraseña nueva')}
    ${paragraphRow(`El link vence en ${expiresInMinutes} minutos y sirve una sola vez. Cuando cambies la contraseña se cierran todas las sesiones abiertas.`)}
    <tr><td style="padding:16px 40px 0 40px;">
      <p style="margin:0;font-family:${EMAIL.fontBody};font-size:13px;line-height:1.6;color:${EMAIL.muted};">Si el botón no anda, copiá este link en el navegador:<br/><a href="${escapeHtml(resetUrl)}" style="color:${EMAIL.link};word-break:break-all;">${escapeHtml(resetUrl)}</a></p>
    </td></tr>
    ${paragraphRow(`Si no lo pediste vos, ignorá este mail: tu contraseña actual sigue igual.`)}
  `;

  return emailShell({ appUrl, bodyHtml: body, footerNote: 'Recibís este mail porque alguien pidió restablecer la contraseña de tu cuenta de Norte Tech.' });
}

export function passwordResetLinkText(params: { name: string; resetUrl: string; expiresInMinutes: number }): string {
  const firstName = params.name.trim().split(/\s+/)[0] || params.name;
  return [
    `Hola, ${firstName}.`,
    '',
    'Pediste restablecer tu contraseña de Norte Tech. Elegí una nueva desde este link:',
    params.resetUrl,
    '',
    `Vence en ${params.expiresInMinutes} minutos y sirve una sola vez. Al cambiarla se cierran todas las sesiones abiertas.`,
    'Si no lo pediste vos, ignorá este mail: tu contraseña actual sigue igual.',
  ].join('\n');
}
