import { useId, type SVGProps } from 'react';

export interface LogoMarkProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  /** Adjusts gradient lightness so the ribbon leg remains legible on dark sidebars. */
  surface?: 'light' | 'dark';
}

/**
 * Official Aintrix Academy folded-ribbon 'A' brand mark.
 * Left ascending leg folds over at a rounded arch into a burgundy-to-rose right ribbon.
 */
export function LogoMark({
  size = 32,
  surface = 'light',
  className = '',
  ...props
}: LogoMarkProps) {
  const uid = useId().replace(/:/g, '');
  const leftGradId = `aintrix-left-${uid}`;
  const rightGradId = `aintrix-right-${uid}`;

  const leftStops =
    surface === 'dark'
      ? { top: '#C43264', bottom: '#8E1740' }
      : { top: '#781436', bottom: '#4F071E' };

  const rightStops =
    surface === 'dark'
      ? { shadow: '#5B0B26', mid: '#CC386B', rose: '#F07DA2', tip: '#FFD1E0' }
      : { shadow: '#3E0517', mid: '#9A1B47', rose: '#DD5C87', tip: '#F8AFC5' };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 80"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient
          id={leftGradId}
          x1="48"
          y1="8"
          x2="14"
          y2="74"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={leftStops.top} />
          <stop offset="100%" stopColor={leftStops.bottom} />
        </linearGradient>
        <linearGradient
          id={rightGradId}
          x1="50"
          y1="14"
          x2="88"
          y2="74"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={rightStops.shadow} />
          <stop offset="32%" stopColor={rightStops.mid} />
          <stop offset="72%" stopColor={rightStops.rose} />
          <stop offset="100%" stopColor={rightStops.tip} />
        </linearGradient>
      </defs>

      {/* Back right ribbon leg emerging from beneath the top fold */}
      <path
        d="M48 6H56.5C60.5 6 62.5 8.2 65 12.6L96 74H81.5C75.5 74 73 70.5 69.8 64.8L46.5 23.5L48 6Z"
        fill={`url(#${rightGradId})`}
      />

      {/* Front left ribbon leg wrapping across the rounded arch */}
      <path
        d="M4 74L37.8 12.8C40.4 8 43.4 6 48.5 6H56.2C59.4 6 60.4 8.2 58.3 12.2L49.5 27.2L27.8 65C24.5 70.7 21.8 74 16 74H4Z"
        fill={`url(#${leftGradId})`}
      />
    </svg>
  );
}

export default LogoMark;
