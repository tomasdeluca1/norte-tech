import { emailShell, escapeHtml, headingRow, paragraphRow, buttonRow } from './layout';

export function adminNewRegistrationHtml(params: {
  name: string;
  email: string;
  role: string;
  company?: string | null;
  adminUrl: string;
  appUrl: string;
}): string {
  const { name, email, role, company, adminUrl, appUrl } = params;

  const body = `
    ${headingRow('NUEVO REGISTRO 🛎️')}
    ${paragraphRow('Un builder se registró y está <strong style="color:#ffb020;">pendiente de aprobación</strong>.')}
    <tr><td style="padding:24px 40px 0 40px;">
      <div style="background:#131920;border:1px solid #252e35;border-radius:12px;padding:20px 24px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:14px;color:#dde4ea;line-height:1.8;">
        <div>Nombre: <span style="color:#a9b7f3;">${escapeHtml(name)}</span></div>
        <div>Email: <span style="color:#a9b7f3;">${escapeHtml(email)}</span></div>
        <div>Rol: <span style="color:#a9b7f3;">${escapeHtml(role)}</span></div>
        ${company ? `<div>Empresa: <span style="color:#a9b7f3;">${escapeHtml(company)}</span></div>` : ''}
      </div>
    </td></tr>
    ${buttonRow(adminUrl, 'Revisar en el panel')}
  `;

  return emailShell({
    appUrl,
    bodyHtml: body,
    footerNote: 'Notificación interna de administración de Norte Tech.',
  });
}
