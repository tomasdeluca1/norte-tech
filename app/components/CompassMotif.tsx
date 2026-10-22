// Motivo de brújula de la marca (BRAND.md §8): bisel con marcas cada 5°, más
// largas cada 30° y 90°, aro concéntrico fino y ejes N-S / E-O. Va de fondo,
// en gris muy oscuro (el color sale de --compass-line).
export default function CompassMotif({ className = '' }: { className?: string }) {
  const ticks = [];
  for (let deg = 0; deg < 360; deg += 5) {
    const len = deg % 90 === 0 ? 26 : deg % 30 === 0 ? 16 : 8;
    const rad = (deg * Math.PI) / 180;
    const r1 = 240;
    const r2 = r1 - len;
    ticks.push(
      <line
        key={deg}
        x1={(Math.sin(rad) * r1).toFixed(2)}
        y1={(-Math.cos(rad) * r1).toFixed(2)}
        x2={(Math.sin(rad) * r2).toFixed(2)}
        y2={(-Math.cos(rad) * r2).toFixed(2)}
        strokeWidth={deg % 30 === 0 ? 2 : 1}
      />,
    );
  }
  return (
    <svg className={`compass-motif ${className}`.trim()} viewBox="-260 -260 520 520" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor">
        <circle r="248" strokeWidth="1" />
        <circle r="200" strokeWidth="1" />
        <circle r="120" strokeWidth="1" strokeDasharray="2 6" />
        <line x1="0" y1="-200" x2="0" y2="200" strokeWidth="1" />
        <line x1="-200" y1="0" x2="200" y2="0" strokeWidth="1" />
        {ticks}
      </g>
    </svg>
  );
}
