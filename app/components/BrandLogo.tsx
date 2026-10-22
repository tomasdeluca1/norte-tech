// Logo oficial de Norte Tech (brand-v1). Renderiza la versión para fondo oscuro y,
// si el tema claro está habilitado (lib/site.ts, D4), también la de fondo claro;
// el CSS muestra una u otra según [data-theme] en <html>.
import { THEME_TOGGLE_ENABLED } from '@/lib/site';

type Variant = 'logo-horizontal' | 'logo-vertical' | 'wordmark' | 'isologo' | 'cursor';

// Tamaño intrínseco (ancho x alto) de cada SVG a 32 px de alto, para reservar el lugar (sin CLS).
const SIZE: Record<Variant, [number, number]> = {
  'logo-horizontal': [118, 32],
  'logo-vertical': [44, 32],
  wordmark: [196, 32],
  isologo: [33, 32],
  cursor: [29, 32],
};

export default function BrandLogo({
  variant = 'logo-horizontal',
  className = '',
  alt = 'Norte Tech',
}: {
  variant?: Variant;
  className?: string;
  alt?: string;
}) {
  const [width, height] = SIZE[variant];
  return (
    <span className={`nt-logo nt-logo-${variant} ${className}`.trim()}>
      <img className="nt-logo-on-dark" src={`/brand/norte-tech-${variant}-dark-bg.svg`} alt={alt} width={width} height={height} />
      {THEME_TOGGLE_ENABLED && (
        <img className="nt-logo-on-light" src={`/brand/norte-tech-${variant}-light-bg.svg`} alt={alt} width={width} height={height} />
      )}
    </span>
  );
}
