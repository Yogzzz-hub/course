import type { SVGProps } from 'react';

export interface LogoMarkProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

/**
 * Shadow Sphere geometric logo mark.
 * Features dual interlocking isometric ribbon curves with 180° rotational symmetry
 * and a central spherical cutout.
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
      viewBox="100 100 440 440"
      width={size}
      height={size}
      fill={resolvedFill}
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Top ribbon curve */}
      <path d="M248.5 137.5L147.5 188.5V267.5C147.5 294.5 191.5 322.5 215.5 331C208.5 296.1 258.6 259.5 289.5 259.5C330.5 259.5 371.5 275.8 412.5 291.5L530.5 321.5V220.5Z" />
      {/* Bottom ribbon curve (180° rotational symmetry around canvas center) */}
      <path d="M391.5 502.5L492.5 451.5V372.5C492.5 345.5 448.5 317.5 424.5 309C431.5 343.9 381.4 380.5 350.5 380.5C309.5 380.5 268.5 364.2 227.5 348.5L109.5 318.5V419.5Z" />
    </svg>
  );
}

export default LogoMark;
