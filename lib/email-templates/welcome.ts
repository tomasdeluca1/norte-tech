import { emailShell, escapeHtml, escapeAttr, headingRow, paragraphRow, buttonRow, EMAIL, BOX_STYLE, LABEL_STYLE, buttonHtml } from './layout';

export function welcomeEmailHtml(params: {
  name: string;
  email: string;
  password: string;
  loginUrl: string;
  whatsappUrl: string;
  appUrl: string;
  needsWebsite: boolean;
}): string {
  const { name, email, password, loginUrl, whatsappUrl, appUrl, needsWebsite } = params;
  const firstName = name.split(/\s+/)[0] || name;

  const whatsappBlock = whatsappUrl
    ? `<tr><td style="padding:28px 40px 0 40px;">
        <div style="${BOX_STYLE}">
          <div style="${LABEL_STYLE}">Grupo de WhatsApp</div>
          <p style="margin:0 0 16px 0;font-family:${EMAIL.fontBody};font-size:14px;line-height:1.6;color:${EMAIL.textSecondary};">Entrá al grupo de la comunidad. Ahí se arma todo: presentaciones, eventos y la previa de los co-works.</p>
          ${buttonHtml(whatsappUrl, 'Entrar al grupo de WhatsApp')}
        </div>
      </td></tr>`
    : '';

  const websiteBlock = needsWebsite
    ? `<tr><td style="padding:28px 40px 0 40px;">
        <div style="background:#16161A;border:1px solid #24242A;border-radius:12px;padding:18px 22px;">
          <div style="${LABEL_STYLE}">Una cosa más</div>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#A5A6B0;">No nos dejaste tu web. Cuando entres al dashboard, sumá el link de tu proyecto así el resto de la comunidad sabe qué estás construyendo.</p>
        </div>
      </td></tr>`
    : '';

  const body = `
    ${headingRow(`BIENVENIDO, ${escapeHtml(firstName.toUpperCase())} 🚀`)}
    ${paragraphRow(
      `Ya estás adentro de <strong style="color:#6EA6FF;">Norte Tech</strong>, la comunidad tech de zona norte: founders, builders e inversores en la misma mesa. Sin esperas: tu acceso está listo.`,
    )}
    <tr><td style="padding:24px 40px 0 40px;">
      <div style="background:#16161A;border:1px solid #24242A;border-radius:12px;padding:20px 24px;">
        <div style="${LABEL_STYLE}">Tu acceso</div>
        <div style="font-family:'JetBrains Mono',Menlo,Consolas,'Courier New',monospace;font-size:14px;color:#FFFFFF;margin-bottom:8px;">Email: <span style="color:#6EA6FF;">${escapeHtml(email)}</span></div>
        <div style="font-family:'JetBrains Mono',Menlo,Consolas,'Courier New',monospace;font-size:14px;color:#FFFFFF;">Contraseña: <span style="color:#6EA6FF;background:rgba(23,116,253,0.14);padding:2px 8px;border-radius:4px;">${escapeHtml(password)}</span></div>
        <p style="margin:14px 0 0 0;font-size:13px;color:#82848F;line-height:1.5;">Es temporal. Te la pedimos cambiar la primera vez que entres.</p>
      </div>
    </td></tr>
    ${buttonRow(loginUrl, 'Iniciar sesión')}
    ${whatsappBlock}
    ${websiteBlock}
  `;

  return emailShell({ appUrl, bodyHtml: body });
}
