/**
 * Logo — Wordmark de la marca Fermier.
 * variant "light" → sobre fondo claro (FERMIER azul + tagline verde)
 * variant "dark"  → sobre fondo oscuro/azul (FERMIER blanco + tagline verde claro)
 */

interface LogoProps {
  variant?: 'light' | 'dark';
  size?: number;          // tamaño de "FERMIER" en px
  tagline?: boolean;      // mostrar "Laboratorio y Asesoría Agrícola"
  className?: string;
}

const BLUE = '#1769a5';
const GREEN = '#3aa935';
const GREEN_LIGHT = '#7ed47a';

export default function Logo({ variant = 'light', size = 24, tagline = true, className = '' }: LogoProps) {
  const word = variant === 'dark' ? '#ffffff' : BLUE;
  const tag  = variant === 'dark' ? GREEN_LIGHT : GREEN;

  return (
    <div className={`leading-none select-none ${className}`}>
      <div className="brand-wordmark" style={{ color: word, fontSize: size, lineHeight: 1 }}>
        FERMIER
      </div>
      {tagline && (
        <div
          className="brand-tagline"
          style={{ color: tag, fontSize: Math.max(7, size * 0.255), marginTop: size * 0.12 }}
        >
          Laboratorio y Asesoría Agrícola
        </div>
      )}
    </div>
  );
}
