import { emailShell, escapeHtml, headingRow, paragraphRow, buttonRow, LABEL_STYLE } from './layout';

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
    ${paragraphRow(`Pediste recuperar tu contraseña de <strong style="color:#6EA6FF;">Norte Tech</strong>. Generamos una nueva contraseña temporal para que puedas entrar.`)}
    <tr><td style="padding:24px 40px 0 40px;">
      <div style="background:#16161A;border:1px solid #24242A;border-radius:12px;padding:20px 24px;">
        <div style="${LABEL_STYLE}">Tu nuevo acceso</div>
        <div style="font-family:'JetBrains Mono',Menlo,Consolas,'Courier New',monospace;font-size:14px;color:#FFFFFF;margin-bottom:8px;">Email: <span style="color:#6EA6FF;">${escapeHtml(email)}</span></div>
        <div style="font-family:'JetBrains Mono',Menlo,Consolas,'Courier New',monospace;font-size:14px;color:#FFFFFF;">Contraseña: <span style="color:#6EA6FF;background:rgba(23,116,253,0.14);padding:2px 8px;border-radius:4px;">${escapeHtml(password)}</span></div>
        <p style="margin:14px 0 0 0;font-size:13px;color:#82848F;line-height:1.5;">Es temporal. Entrá y cambiala por una tuya desde el dashboard.</p>
      </div>
    </td></tr>
    ${buttonRow(loginUrl, 'Iniciar sesión')}
    ${paragraphRow(`Si no pediste esto, podés ignorar este email. Tu contraseña anterior ya no funciona, pero nadie más tiene la nueva.`)}
  `;

  return emailShell({ appUrl, bodyHtml: body, footerNote: 'Recibís este email porque se solicitó recuperar el acceso a tu cuenta de Norte Tech.' });
}
