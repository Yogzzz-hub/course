import type { SVGProps } from 'react';

export interface LogoMarkProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

/**
 * Aintrix Academy geometric logo mark.
 * Features the Aintrix Cyber-Apex with dual ascending blades, precision matrix channels,
 * and a central neural core node.
 * Defaults to the authentic brand mint green (#1CE798).
 */
export function LogoMark({
  size = 32,
  color,
  className = '',
  fill,
  ...props
}: LogoMarkProps) {
  const resolvedFill = color || fill || '#1CE798';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill={resolvedFill}
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Left Wing & Matrix Bridge */}
      <path d="M16 84L48 16H52L38 54H46V62H34L24 84H16Z" />
      {/* Right Wing & Precision Channel */}
      <path d="M84 84L56 24L52 28L62 54H54V62H66L76 84H84Z" />
      {/* Central Matrix Core Node */}
      <path d="M50 36L58 46L50 56L42 46Z" />
    </svg>
  );
}

export default LogoMark;
