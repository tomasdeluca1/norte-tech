// Logo oficial de Norte Tech (brand-v1). Renderiza la versión para fondo oscuro y
// la de fondo claro; el CSS muestra una u otra según [data-theme] en <html>.
type Variant = 'logo-horizontal' | 'logo-vertical' | 'wordmark' | 'isologo' | 'cursor';

export default function BrandLogo({
  variant = 'logo-horizontal',
  className = '',
  alt = 'Norte Tech',
}: {
  variant?: Variant;
  className?: string;
  alt?: string;
}) {
  return (
    <span className={`nt-logo nt-logo-${variant} ${className}`.trim()}>
      <img className="nt-logo-on-dark" src={`/brand/norte-tech-${variant}-dark-bg.svg`} alt={alt} />
      <img className="nt-logo-on-light" src={`/brand/norte-tech-${variant}-light-bg.svg`} alt={alt} />
    </span>
  );
}
