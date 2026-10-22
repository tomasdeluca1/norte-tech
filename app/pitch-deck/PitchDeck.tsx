'use client';
import { useEffect, useState, useCallback } from 'react';
import './pitch-deck.css';
import { buildSlides } from './slides';
import { MEMBERS_FALLBACK, type Sponsor } from './pitch-data';
import { clampIndex, parseHash, hashFor } from './nav';
import BrandLogo from '../components/BrandLogo';

export default function PitchDeck({ sponsor }: { sponsor?: Sponsor }) {
  const [memberTotal, setMemberTotal] = useState<number>(MEMBERS_FALLBACK);
  const slides = buildSlides(memberTotal, sponsor);
  const total = slides.length;
  const [i, setI] = useState(0);

  // Total dinámico, igual que el home.
  useEffect(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((d) => { if (typeof d.total === 'number' && d.total > 0) setMemberTotal(d.total); })
      .catch(() => {});
  }, []);

  // Hash inicial + back/forward del browser.
  useEffect(() => {
    const sync = () => setI(parseHash(window.location.hash, total));
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [total]);

  const go = useCallback((next: number) => {
    const c = clampIndex(next, total);
    setI(c);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', hashFor(c));
  }, [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', ' ', 'PageDown'].includes(e.key)) { e.preventDefault(); go(i + 1); }
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(i - 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(total - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, go, total]);

  return (
    <div className="deck">
      <a className="deck-home" href="/" aria-label="Norte Tech, inicio"><BrandLogo variant="logo-horizontal" /></a>
      {sponsor && (
        <div className="deck-cobrand">
          <span className="cb-label">Sponsor principal</span>
          <img src={sponsor.logoSrc} alt={sponsor.name} />
        </div>
      )}
      <div className="deck-stage">
        {slides.map((node, idx) => (
          <section key={idx} className={`slide${idx === i ? ' is-active' : ''}`}>
            <span className="slide-no">{String(idx + 1).padStart(2, '0')} / {total}</span>
            {node}
          </section>
        ))}
      </div>
      <div className="deck-dots">
        {slides.map((_, idx) => (
          <button
            key={idx}
            className={`deck-dot${idx === i ? ' is-active' : ''}`}
            aria-label={`Slide ${idx + 1}`}
            onClick={() => go(idx)}
          />
        ))}
      </div>
      <div className="deck-nav">
        <button className="deck-arrow" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Anterior">←</button>
        <span className="deck-count">{i + 1} / {total}</span>
        <button className="deck-arrow" onClick={() => go(i + 1)} disabled={i === total - 1} aria-label="Siguiente">→</button>
      </div>
    </div>
  );
}
