"use client";

// Terminal de "Qué es": los comandos se tipean al entrar en pantalla y `join`
// es un botón que abre el formulario de alta (data-open-join, ver JoinModal). Todo el texto está en el HTML
// desde el server (SEO y lectores de pantalla); la animación sólo lo revela.
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './capabilities';

type Line = { cmd: string } | { out: string } | { gap: true };

export default function Terminal({ total }: { total: number | null }) {
  const lines: Line[] = [
    { cmd: 'whoami' },
    { out: '→ founders, builders, inversores, growth, marketing, creators' },
    { gap: true },
    { cmd: 'cat ./comunidad.json' },
    { out: '{ "nombre": "Norte Tech",' },
    ...(total ? [{ out: `  "miembros": ${total},` }] : []),
    { out: '  "estado": "shipping" }' },
    { gap: true },
    { cmd: 'next --meetup' },
    { out: '→ zona norte, Buenos Aires' },
    { gap: true },
  ];
  const chars = lines.reduce((n, l) => n + ('cmd' in l ? l.cmd.length : 0), 0);
  // `typed` = cuántos caracteres de comandos se ven; -1 = todo visible (SSR, reduced motion).
  const [typed, setTyped] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return; // ya visible: no lo escondemos
    setTyped(0);
    let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      let n = 0;
      const step = () => {
        n += 1;
        setTyped(n);
        if (n < chars + 3) timer = window.setTimeout(step, 28); // 28 ms por carácter, una sola vez
        else setTyped(-1);
      };
      timer = window.setTimeout(step, 250);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, [chars]);

  let budget = typed < 0 ? Infinity : typed;
  let reachedEnd = true;
  const rows = lines.map((l, i) => {
    if (!reachedEnd) return <div key={i} className="t-hidden" aria-hidden="true">&nbsp;</div>;
    if ('gap' in l) return <div key={i}>&nbsp;</div>;
    if ('out' in l) return <div key={i}><span className="ou">{l.out.replace(/^ {2}/, '\u00a0\u00a0')}</span></div>;
    const shown = l.cmd.slice(0, Math.max(0, budget));
    const done = budget >= l.cmd.length;
    budget -= l.cmd.length;
    if (!done) reachedEnd = false;
    return (
      <div key={i}>
        <span className="pr">$</span> <span className="cm">{typed < 0 ? l.cmd : shown}</span>
        {!done && <span className="cursor" />}
        {/* El texto completo queda para lectores de pantalla mientras se tipea. */}
        {!done && <span className="sr-only">{l.cmd.slice(shown.length)}</span>}
      </div>
    );
  });

  return (
    <div className="terminal" ref={ref}>
      <div className="t-bar">
        <div className="td"></div><div className="td"></div><div className="td"></div>
        <span>~/norte-tech</span>
      </div>
      <div className="t-body mono">
        {rows}
        <div className={reachedEnd ? '' : 't-hidden'}>
          <span className="pr">$</span>{' '}
          <button type="button" className="t-join" data-open-join="" aria-label="join: abrir el formulario para sumarte a la comunidad">
            join
          </button>
          <span className="cursor"></span>
        </div>
      </div>
    </div>
  );
}
