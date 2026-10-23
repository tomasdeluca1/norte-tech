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
    ${paragraphRow('Un builder se registró y está <strong style="color:#E8A23B;">pendiente de aprobación</strong>.')}
    <tr><td style="padding:24px 40px 0 40px;">
      <div style="background:#16161A;border:1px solid #24242A;border-radius:12px;padding:20px 24px;font-family:'JetBrains Mono',Menlo,Consolas,'Courier New',monospace;font-size:14px;color:#FFFFFF;line-height:1.8;">
        <div>Nombre: <span style="color:#6EA6FF;">${escapeHtml(name)}</span></div>
        <div>Email: <span style="color:#6EA6FF;">${escapeHtml(email)}</span></div>
        <div>Rol: <span style="color:#6EA6FF;">${escapeHtml(role)}</span></div>
        ${company ? `<div>Empresa: <span style="color:#6EA6FF;">${escapeHtml(company)}</span></div>` : ''}
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
