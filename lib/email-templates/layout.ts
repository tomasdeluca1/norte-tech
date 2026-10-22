export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const escapeAttr = escapeHtml;

/**
 * Shared dark-themed email shell (Norte Tech brand). `bodyHtml` is injected
 * between the logo header and the footer; it should be a sequence of <tr> rows
 * built with the helpers below.
 */
export function emailShell(params: { appUrl: string; bodyHtml: string; footerNote?: string }): string {
  const { appUrl, bodyHtml } = params;
  const footerNote =
    params.footerNote ??
    `Recibís este email porque te sumaste a <a href="${escapeAttr(appUrl)}" style="color:#6EA6FF;text-decoration:none;">Norte Tech</a>.`;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>Norte Tech</title>
  </head>
  <body style="margin:0;padding:0;background:#0a0f24;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#dde4ea;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a0f24;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#111935;border:1px solid #1f2a52;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 40px 0 40px;">
                <table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr>
                  <td style="vertical-align:middle;">
                    <img src="${appUrl}/brand/norte-tech-horizontal.png" width="180" alt="Norte Tech" style="display:block;border:0;outline:0;text-decoration:none;width:180px;height:auto;"/>
                  </td>
                </tr></table>
              </td>
            </tr>
            ${bodyHtml}
            <tr>
              <td style="padding:32px 40px 32px 40px;">
                <div style="border-top:1px solid #1f2a52;padding-top:20px;font-size:12px;color:#52626e;line-height:1.6;">
                  ${footerNote}
                </div>
              </td>
            </tr>
          </table>
          <div style="margin-top:16px;font-size:11px;color:#52626e;letter-spacing:0.12em;text-transform:uppercase;">
            © ${year} Norte Tech · Zona norte, Buenos Aires
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Big display heading row. */
export function headingRow(html: string): string {
  return `<tr><td style="padding:32px 40px 8px 40px;">
    <h1 style="margin:0;font-family:'Outfit',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:36px;font-weight:700;line-height:1.08;letter-spacing:-0.02em;color:#ffffff;">${html}</h1>
  </td></tr>`;
}

/** Paragraph row. */
export function paragraphRow(html: string): string {
  return `<tr><td style="padding:16px 40px 0 40px;">
    <p style="margin:0;font-size:16px;line-height:1.6;color:#a9b6c0;">${html}</p>
  </td></tr>`;
}

/** Primary CTA button row. */
export function buttonRow(href: string, label: string, opts?: { bg?: string; color?: string }): string {
  const bg = opts?.bg ?? '#eef1fa';
  const color = opts?.color ?? '#0a0f24';
  return `<tr><td align="center" style="padding:28px 40px 0 40px;">
    <a href="${escapeAttr(href)}" style="display:inline-block;background:${bg};color:${color};text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;">${escapeHtml(label)} &rarr;</a>
  </td></tr>`;
}
