import { emailShell, escapeHtml, headingRow, paragraphRow } from './layout';

/** Confirmación tras completar la presentación vía link mágico. */
export function presentationReceivedHtml(params: { name: string; appUrl: string }): string {
  const { name, appUrl } = params;
  const firstName = name.split(/\s+/)[0] || name;

  const body = `
    ${headingRow(`¡GRACIAS, ${escapeHtml(firstName.toUpperCase())}! ✅`)}
    ${paragraphRow(`Recibimos tu <strong style="color:#6EA6FF;">presentación</strong>. Ya quedó en la cola de revisión.`)}
    <tr><td style="padding:24px 40px 0 40px;">
      <div style="background:#16161A;border:1px solid #24242A;border-radius:12px;padding:18px 22px;font-size:14px;color:#A5A6B0;line-height:1.6;">
        <span style="font-family:'JetBrains Mono',Menlo,Consolas,'Courier New',monospace;color:#6EA6FF;">$ status</span><br/>
        → presentación recibida · pendiente de aprobación
      </div>
    </td></tr>
    ${paragraphRow(
      `Cuando un admin te acepte, te llega otro email con tu acceso al dashboard y la invitación al grupo de WhatsApp. Cualquier duda, respondé a este mismo email.`,
    )}
  `;

  return emailShell({ appUrl, bodyHtml: body });
}
