import { emailShell, escapeHtml, escapeAttr, headingRow, paragraphRow, buttonRow, EMAIL, BOX_STYLE, LABEL_STYLE, buttonHtml } from './layout';

export function acceptedEmailHtml(params: {
  name: string;
  email: string;
  password: string;
  loginUrl: string;
  whatsappUrl: string;
  appUrl: string;
}): string {
  const { name, email, password, loginUrl, whatsappUrl, appUrl } = params;
  const firstName = name.split(/\s+/)[0] || name;

  const whatsappBlock = whatsappUrl
    ? `<tr><td style="padding:28px 40px 0 40px;">
        <div style="${BOX_STYLE}">
          <div style="${LABEL_STYLE}">Grupo de WhatsApp</div>
          <p style="margin:0 0 16px 0;font-family:${EMAIL.fontBody};font-size:14px;line-height:1.6;color:${EMAIL.textSecondary};">Sumate al grupo de la comunidad para enterarte de todo y conocer a los demás builders.</p>
          ${buttonHtml(whatsappUrl, 'Entrar al grupo de WhatsApp')}
        </div>
      </td></tr>`
    : '';

  const body = `
    ${headingRow(`¡ENTRASTE, ${escapeHtml(firstName.toUpperCase())}! 🎉`)}
    ${paragraphRow(
      `Tu solicitud fue <strong style="color:#6EA6FF;">aceptada</strong>. Ya sos parte de <strong style="color:#6EA6FF;">Norte Tech</strong>, la comunidad tech de zona norte: founders, builders e inversores en la misma mesa.`,
    )}
    <tr><td style="padding:24px 40px 0 40px;">
      <div style="background:#16161A;border:1px solid #24242A;border-radius:12px;padding:20px 24px;">
        <div style="${LABEL_STYLE}">Tus credenciales</div>
        <div style="font-family:'JetBrains Mono',Menlo,Consolas,'Courier New',monospace;font-size:14px;color:#FFFFFF;margin-bottom:8px;">Email: <span style="color:#6EA6FF;">${escapeHtml(email)}</span></div>
        <div style="font-family:'JetBrains Mono',Menlo,Consolas,'Courier New',monospace;font-size:14px;color:#FFFFFF;">Contraseña: <span style="color:#6EA6FF;background:rgba(23,116,253,0.14);padding:2px 8px;border-radius:4px;">${escapeHtml(password)}</span></div>
        <p style="margin:14px 0 0 0;font-size:13px;color:#82848F;line-height:1.5;">Es una contraseña temporal. Te la vamos a pedir cambiar la primera vez que entres al dashboard.</p>
      </div>
    </td></tr>
    ${buttonRow(loginUrl, 'Iniciar sesión')}
    ${whatsappBlock}
    <tr><td style="padding:32px 40px 0 40px;">
      <div style="${LABEL_STYLE}">¿Qué sigue?</div>
      <ul style="margin:0;padding-left:20px;color:#A5A6B0;font-size:14px;line-height:1.7;">
        <li>Entrá al dashboard y cambiá tu contraseña</li>
        <li>Completá tu perfil y sumá tu sitio</li>
        <li>Sumate al grupo de WhatsApp</li>
      </ul>
    </td></tr>
  `;

  return emailShell({ appUrl, bodyHtml: body });
}
