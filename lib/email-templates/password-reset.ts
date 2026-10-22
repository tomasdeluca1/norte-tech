import { emailShell, escapeHtml, headingRow, paragraphRow, buttonRow } from './layout';

export function passwordResetHtml(params: {
  name: string;
  email: string;
  password: string;
  loginUrl: string;
  appUrl: string;
}): string {
  const { name, email, password, loginUrl, appUrl } = params;
  const firstName = name.split(/\s+/)[0] || name;

  const body = `
    ${headingRow(`RECUPERÁ TU ACCESO, ${escapeHtml(firstName.toUpperCase())} 🔑`)}
    ${paragraphRow(`Pediste recuperar tu contraseña de <strong style="color:#a9b7f3;">Norte Tech</strong>. Generamos una nueva contraseña temporal para que puedas entrar.`)}
    <tr><td style="padding:24px 40px 0 40px;">
      <div style="background:#131920;border:1px solid #252e35;border-radius:12px;padding:20px 24px;">
        <div style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#95a0c2;margin-bottom:12px;">Tu nuevo acceso</div>
        <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:14px;color:#dde4ea;margin-bottom:8px;">Email: <span style="color:#a9b7f3;">${escapeHtml(email)}</span></div>
        <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:14px;color:#dde4ea;">Contraseña: <span style="color:#a9b7f3;background:rgba(142,160,240,0.08);padding:2px 8px;border-radius:4px;">${escapeHtml(password)}</span></div>
        <p style="margin:14px 0 0 0;font-size:13px;color:#95a0c2;line-height:1.5;">Es temporal. Entrá y cambiala por una tuya desde el dashboard.</p>
      </div>
    </td></tr>
    ${buttonRow(loginUrl, 'Iniciar sesión')}
    ${paragraphRow(`Si no pediste esto, podés ignorar este email — tu contraseña anterior ya no funciona, pero nadie más tiene la nueva.`)}
  `;

  return emailShell({ appUrl, bodyHtml: body, footerNote: 'Recibís este email porque se solicitó recuperar el acceso a tu cuenta de Norte Tech.' });
}
