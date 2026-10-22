"use client";

// Barra superior de la home. Desktop: logo · Qué es · Meetups · Agenda ·
// Comunidad · Iniciar sesión (link) · Próximo meetup (botón sm 36 px).
// Mobile: logo horizontal + botón "Próximo meetup", siempre visible (los
// links van al footer). El borde inferior aparece después de 8 px de scroll.
import { useEffect, useState } from 'react';
import { PALETTE } from '@/lib/palette';
import { NAV_MEETUPS_LINK } from '@/lib/site';
import BrandLogo from '../BrandLogo';
import ThemeToggle from '../ThemeToggle';

export type MeetupLink = { href: string; target?: string; rel?: string; 'data-open-join'?: string };

export default function SiteNav({ meetup }: { meetup: MeetupLink }) {
  const [scrolled, setScrolled] = useState(false);
  const [me, setMe] = useState<{ name: string; initials: string; colorIndex: number } | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Estado de sesión para el chip del nav. Se pide después del load para no sumar
  // un round trip a la cadena crítica del primer paint.
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      fetch('/api/auth/me')
        .then((r) => r.json())
        .then((d) => { if (!cancelled) setMe(d.user ?? null); })
        .catch(() => {});
    };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onLoad = () => { timer = setTimeout(run, 0); };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad, { once: true });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('load', onLoad);
    };
  }, []);

  const c = me ? PALETTE[me.colorIndex % PALETTE.length] : null;

  return (
    <header className="nav" data-scrolled={scrolled}>
      <a href="#top" className="nav-logo" aria-label="Norte Tech, inicio">
        <BrandLogo variant="logo-horizontal" alt="" />
      </a>
      <nav aria-label="Principal">
        <ul className="nav-links">
          <li><a href="#sobre">Qué es</a></li>
          {NAV_MEETUPS_LINK && <li><a href="#fotos">Meetups</a></li>}
          <li><a href="#eventos">Agenda</a></li>
          <li><a href="#comunidad">Comunidad</a></li>
        </ul>
      </nav>
      <div className="nav-right">
        <ThemeToggle />
        {me && c ? (
          <a href="/dashboard" className="nav-user" title="Ir a mi dashboard">
            <span className="nav-user-av" style={{ background: c.bg, color: c.color }} aria-hidden="true">{me.initials}</span>
            <span className="nav-user-name">{me.name.split(' ')[0]}</span>
            <span className="sr-only">Mi dashboard</span>
          </a>
        ) : (
          <a href="/login" className="nav-login">Iniciar sesión</a>
        )}
        <a {...meetup} className="btn btn-primary btn-sm" data-cta="">Próximo meetup</a>
      </div>
    </header>
  );
}
