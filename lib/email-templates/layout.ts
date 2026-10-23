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
 * Branding de mails (Norte Tech brand v1). Valores inline porque los clientes
 * de mail no leen variables CSS. Fuentes de marca con fallback seguro para mail.
 */
export const EMAIL = {
  bg: '#000000',
  card: '#0E0E11',
  box: '#16161A',
  border: '#24242A',
  text: '#FFFFFF',
  textSecondary: '#A5A6B0',
  muted: '#82848F',
  link: '#6EA6FF',
  button: '#0F58DE',
  onButton: '#FFFFFF',
  warning: '#E8A23B',
  fontDisplay: "Montserrat,'Helvetica Neue',Helvetica,Arial,sans-serif",
  fontBody: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  fontMono: "'JetBrains Mono',Menlo,Consolas,'Courier New',monospace",
} as const;

/** Estilo de las cajas internas (credenciales, estado, avisos). */
export const BOX_STYLE = `background:${EMAIL.box};border:1px solid ${EMAIL.border};border-radius:12px;padding:20px 24px;`;
/** Etiqueta mono en mayúsculas (chips / labels). */
export const LABEL_STYLE = `font-family:${EMAIL.fontMono};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${EMAIL.muted};margin-bottom:12px;`;
/** Texto resaltado en azul claro. */
export const HL_STYLE = `color:${EMAIL.link};`;

/** Botón primario como HTML suelto (para usar dentro de cajas). */
export function buttonHtml(href: string, label: string): string {
  return `<a href="${escapeAttr(href)}" style="display:inline-block;background:${EMAIL.button};color:${EMAIL.onButton};font-family:${EMAIL.fontBody};text-decoration:none;font-weight:600;font-size:14px;padding:14px 28px;border-radius:999px;mso-padding-alt:0;">${escapeHtml(label)} &rarr;</a>`;
}

/**
 * Shell oscuro compartido por todos los mails. `bodyHtml` va entre el logo y el
 * footer; tiene que ser una secuencia de <tr> armada con los helpers de abajo.
 * El logo es PNG hosteado en el sitio (muchos clientes no muestran SVG).
 */
export function emailShell(params: { appUrl: string; bodyHtml: string; footerNote?: string }): string {
  const { appUrl, bodyHtml } = params;
  const base = appUrl.replace(/\/$/, '');
  const footerNote =
    params.footerNote ??
    `Recibís este email porque te sumaste a <a href="${escapeAttr(base)}" style="color:${EMAIL.link};text-decoration:none;">Norte Tech</a>.`;
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
  <body style="margin:0;padding:0;background:${EMAIL.bg};font-family:${EMAIL.fontBody};color:${EMAIL.text};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${EMAIL.bg}" style="background:${EMAIL.bg};padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" bgcolor="${EMAIL.card}" style="max-width:560px;width:100%;background:${EMAIL.card};border:1px solid ${EMAIL.border};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 40px 0 40px;">
                <a href="${escapeAttr(base)}" style="text-decoration:none;">
                  <img src="${base}/brand/norte-tech-horizontal.png" width="180" alt="Norte Tech" style="display:block;border:0;outline:0;text-decoration:none;width:180px;height:auto;"/>
                </a>
              </td>
            </tr>
            ${bodyHtml}
            <tr>
              <td style="padding:32px 40px 32px 40px;">
                <div style="border-top:1px solid ${EMAIL.border};padding-top:20px;font-family:${EMAIL.fontBody};font-size:12px;color:${EMAIL.muted};line-height:1.6;">
                  ${footerNote}
                </div>
              </td>
            </tr>
          </table>
          <div style="margin-top:16px;font-family:${EMAIL.fontMono};font-size:11px;color:${EMAIL.muted};letter-spacing:0.12em;text-transform:uppercase;">
            © ${year} Norte Tech · Zona norte, Buenos Aires
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Título grande (Montserrat con fallback). */
export function headingRow(html: string): string {
  return `<tr><td style="padding:32px 40px 8px 40px;">
    <h1 style="margin:0;font-family:${EMAIL.fontDisplay};font-size:32px;font-weight:700;line-height:1.1;letter-spacing:-0.01em;color:${EMAIL.text};">${html}</h1>
  </td></tr>`;
}

/** Párrafo. */
export function paragraphRow(html: string): string {
  return `<tr><td style="padding:16px 40px 0 40px;">
    <p style="margin:0;font-family:${EMAIL.fontBody};font-size:16px;line-height:1.6;color:${EMAIL.textSecondary};">${html}</p>
  </td></tr>`;
}

/** Botón primario: siempre #0F58DE con texto blanco. */
export function buttonRow(href: string, label: string): string {
  return `<tr><td align="center" style="padding:28px 40px 0 40px;">
    ${buttonHtml(href, label)}
  </td></tr>`;
}
