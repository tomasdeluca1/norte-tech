// Charts brand-native en SVG (sin dependencias, imprimen perfecto en el PDF).
// Colores hardcodeados desde los tokens de globals.css para que el <svg> los
// respete en print (los custom properties no aplican como presentation attrs).
import React from 'react';

const ACCENT = '#1774FD';
const BORDER = '#24242A';
const BG = '#000000';
const MUTED = '#82848F';

export type Datum = { label: string; n: number };

// Paleta del degradado de la marca para composición (dona): durazno → violeta → azul → gris.
export const DONUT_COLORS = ['#1774FD', '#0F58DE', '#6EA6FF', '#A9CAFF', '#A5A6B0', '#5E5E5E'];

// Área/línea para series temporales (crecimiento).
export function AreaChart({
  data, width = 880, height = 220,
}: { data: Datum[]; width?: number; height?: number }) {
  const max = Math.max(...data.map((d) => d.n)) * 1.12;
  const padL = 12, padR = 12, padT = 34, padB = 30;
  const w = width - padL - padR;
  const h = height - padT - padB;
  const px = (i: number) => padL + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
  const py = (v: number) => padT + h - (v / max) * h;
  const pts = data.map((d, i) => [px(i), py(d.n)] as const);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${px(data.length - 1).toFixed(1)} ${(padT + h).toFixed(1)} L${px(0).toFixed(1)} ${(padT + h).toFixed(1)} Z`;
  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label="Crecimiento de la comunidad">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ACCENT} stopOpacity="0.32" />
          <stop offset="1" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={padL} y1={padT + h} x2={width - padR} y2={padT + h} stroke={BORDER} strokeWidth="1" />
      <path d={area} fill="url(#areaFill)" />
      <path d={line} fill="none" stroke={ACCENT} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={data[i].label}>
          <circle cx={p[0]} cy={p[1]} r="5" fill={BG} stroke={ACCENT} strokeWidth="3" />
          <text x={p[0]} y={p[1] - 14} textAnchor="middle" className="chart-val">{data[i].n}</text>
          <text x={p[0]} y={padT + h + 21} textAnchor="middle" className="chart-lbl">{data[i].label}</text>
        </g>
      ))}
    </svg>
  );
}

// Dona para composición (roles).
export function Donut({
  data, size = 200, thickness = 34,
}: { data: Datum[]; size?: number; thickness?: number }) {
  const total = data.reduce((s, d) => s + d.n, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;
  let offset = 0;
  const arcs = data.map((d, i) => {
    const len = (d.n / total) * c;
    const node = (
      <circle
        key={d.label}
        cx={cx} cy={cy} r={r} fill="none"
        stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth={thickness}
        strokeDasharray={`${len.toFixed(2)} ${(c - len).toFixed(2)}`}
        strokeDashoffset={(-offset).toFixed(2)}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    );
    offset += len;
    return node;
  });
  return (
    <svg className="chart" viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Composición de la comunidad">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={BORDER} strokeWidth={thickness} opacity="0.4" />
      {arcs}
      <text x={cx} y={cy - 4} textAnchor="middle" className="donut-c-num">{total}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" className="donut-c-lbl">builders</text>
    </svg>
  );
}

// Barras horizontales para rankings (verticales, qué buscan).
export function Bars({ data, max }: { data: Datum[]; max: number }) {
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar-row" key={d.label}>
          <span className="lbl">{d.label}</span>
          <span className="bar"><span className="bar-fill" style={{ width: `${Math.round((d.n / max) * 100)}%` }} /></span>
          <span className="n">{d.n}</span>
        </div>
      ))}
    </div>
  );
}

// Leyenda para la dona.
export function Legend({ data }: { data: Datum[] }) {
  const total = data.reduce((s, d) => s + d.n, 0);
  return (
    <ul className="legend">
      {data.map((d, i) => (
        <li key={d.label}>
          <span className="sw" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
          <span className="lg-lbl">{d.label}</span>
          <span className="lg-n">{d.n}<em>{Math.round((d.n / total) * 100)}%</em></span>
        </li>
      ))}
    </ul>
  );
}
