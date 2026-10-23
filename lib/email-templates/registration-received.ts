import { emailShell, escapeHtml, headingRow, paragraphRow } from './layout';

export function registrationReceivedHtml(params: { name: string; appUrl: string }): string {
  const { name, appUrl } = params;
  const firstName = name.split(/\s+/)[0] || name;

  const body = `
    ${headingRow(`HOLA, ${escapeHtml(firstName.toUpperCase())} 👋`)}
    ${paragraphRow(
      `Recibimos tu registro en <strong style="color:#6EA6FF;">Norte Tech</strong>, la comunidad tech de zona norte: founders, builders e inversores en la misma mesa. 🙌`,
    )}
    ${paragraphRow(
      `Ahora un admin va a revisar tu solicitud. <strong style="color:#FFFFFF;">Cuando te aceptemos te llega otro email con tu acceso al dashboard y la invitación al grupo de WhatsApp.</strong>`,
    )}
    <tr><td style="padding:24px 40px 0 40px;">
      <div style="background:#16161A;border:1px solid #24242A;border-radius:12px;padding:18px 22px;font-size:14px;color:#A5A6B0;line-height:1.6;">
        <span style="font-family:'JetBrains Mono',Menlo,Consolas,'Courier New',monospace;color:#6EA6FF;">$ status</span><br/>
        → solicitud recibida · pendiente de aprobación
      </div>
    </td></tr>
    ${paragraphRow(`No tenés que hacer nada más por ahora. Si tenés alguna duda, respondé a este mismo email.`)}
  `;

  return emailShell({ appUrl, bodyHtml: body });
}
