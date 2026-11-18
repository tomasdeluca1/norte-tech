// Barra superior del área de miembros. Misma altura, logo y criterio que la
// barra de la home (SiteNav), sin los anchors de la landing.
import type { ReactNode } from 'react';
import BrandLogo from '../BrandLogo';

export default function MemberBar({ children }: { children?: ReactNode }) {
  return (
    <header className="mb-bar">
      <a href="/" className="mb-bar-logo" aria-label="Norte Tech, ir al inicio">
        <BrandLogo variant="logo-horizontal" alt="" />
      </a>
      <div className="mb-bar-right">
        {children ?? (
          <>
            <a href="/#comunidad" className="mb-bar-link is-wide">La comunidad</a>
            <a href="/#eventos" className="mb-bar-link is-wide">Agenda</a>
          </>
        )}
      </div>
    </header>
  );
}
