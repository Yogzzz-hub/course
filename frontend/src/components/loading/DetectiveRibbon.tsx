import { useId } from 'react';

const BODY =
  'M200 30 C 150 30, 128 70, 108 140 L 62 330 C 52 372, 70 404, 108 404 L 142 404 C 142 350, 166 300, 200 296 C 234 300, 258 350, 258 404 L 292 404 C 330 404, 348 372, 338 330 L 292 140 C 272 70, 250 30, 200 30 Z';

/** Binoculars, drawn around the two eyes. */
function Binoculars() {
  return (
    <g className="dr-bino">
      <rect className="dr-bino-bridge" x="190" y="160" width="20" height="14" rx="4" />
      <rect className="dr-bino-wheel" x="193" y="146" width="14" height="14" rx="4" />
      {[174, 226].map(cx => (
        <g key={cx}>
          <circle className="dr-bino-ring" cx={cx} cy="170" r="31" />
          <circle className="dr-bino-band" cx={cx} cy="170" r="25" />
          <circle className="dr-bino-glass" cx={cx} cy="170" r="20" />
          <path className="dr-bino-shine" d={`M${cx - 13} ${163} A 15 15 0 0 1 ${cx - 3} ${154}`} />
        </g>
      ))}
    </g>
  );
}

/**
 * "Ribbon" the detective: the Aintrix "A" scanning left and right through binoculars while a page loads.
 * `staff` swaps the cap for a fedora and puts the body in a suit. `slow` lowers the binoculars and shrugs.
 */
export function DetectiveRibbon({ staff = false, slow = false, className = '' }: { staff?: boolean; slow?: boolean; className?: string }) {
  const clipId = useId().replace(/:/g, '');
  return (
    <svg className={`dr${staff ? ' is-staff' : ''}${slow ? ' is-slow' : ''} ${className}`.trim()} viewBox="0 0 440 500" role="img" aria-label="Ribbon, the Aintrix mascot, searching with binoculars">
      <defs>
        <clipPath id={clipId}><rect x="200" y="0" width="260" height="500" /></clipPath>
      </defs>
      <g transform="translate(20 40)">
        {/* Clues pop up on either side while it scans */}
        {slow ? (
          <g className="dr-clue dr-clue-slow"><circle cx="200" cy="-32" r="24" /><text x="200" y="-22" textAnchor="middle">?</text></g>
        ) : (
          <>
            <g className="dr-clue dr-clue-l"><circle cx="18" cy="70" r="22" /><text x="18" y="80" textAnchor="middle">?</text></g>
            <g className="dr-clue dr-clue-r"><circle cx="382" cy="50" r="22" /><text x="382" y="60" textAnchor="middle">!</text></g>
          </>
        )}

        <g className={slow ? 'dr-figure' : 'dr-figure dr-scan'}>
          <ellipse className={staff ? 'dr-shoe is-dark' : 'dr-shoe'} cx="104" cy="408" rx="48" ry="15" />
          <ellipse className={staff ? 'dr-shoe is-dark' : 'dr-shoe'} cx="296" cy="408" rx="48" ry="15" />

          {/* Arms behind the body: raised to the binoculars, or down when the search is slow */}
          {slow ? (
            <>
              <path className="dr-limb-edge" d="M98 262 C 62 272, 44 312, 52 346" />
              <path className="dr-limb" d="M98 262 C 62 272, 44 312, 52 346" />
              <path className="dr-limb-edge" d="M302 262 C 338 272, 356 312, 348 346" />
              <path className="dr-limb" d="M302 262 C 338 272, 356 312, 348 346" />
            </>
          ) : (
            <>
              <path className="dr-limb-edge" d="M98 262 C 70 244, 92 214, 138 202" />
              <path className="dr-limb" d="M98 262 C 70 244, 92 214, 138 202" />
              <path className="dr-limb-edge" d="M302 262 C 330 244, 308 214, 262 202" />
              <path className="dr-limb" d="M302 262 C 330 244, 308 214, 262 202" />
            </>
          )}

          <path className="dr-body-a" d={BODY} />
          <path className="dr-body-b" d={BODY} clipPath={`url(#${clipId})`} />
          <path className="dr-fold" d="M200 40 C 232 44, 256 70, 270 112 L 200 112 Z" />

          {staff && (
            <g>
              <path className="dr-shirt" d="M170 232 L200 288 L230 232 Z" />
              <path className="dr-lapel" d="M170 232 L150 278 L178 294 L200 288 Z M230 232 L250 278 L222 294 L200 288 Z" />
              <path className="dr-tie" d="M194 244 H206 L210 260 L200 290 L190 260 Z" />
            </g>
          )}

          {/* Face */}
          <ellipse className="dr-face" cx="200" cy="176" rx="76" ry="60" />
          <ellipse className="dr-blush" cx="146" cy="204" rx="12" ry="9" />
          <ellipse className="dr-blush" cx="254" cy="204" rx="12" ry="9" />
          {[174, 226].map(cx => (
            <g key={cx}>
              <ellipse className="dr-eye" cx={cx} cy="170" rx="15" ry="22" />
              <g className="dr-pupil">
                <circle className="dr-pupil-dot" cx={cx} cy="174" r="10.5" />
                <circle className="dr-glint" cx={cx + 3.5} cy="168" r="3.3" />
              </g>
            </g>
          ))}
          {slow ? (
            <path className="dr-mouth-line" d="M184 212 Q192 205 200 212 T216 212" />
          ) : (
            <path className="dr-mouth-line" d="M186 210 Q200 220 214 210" />
          )}

          {/* Binoculars: raised over the eyes, or hanging at the chest when slow */}
          <g transform={slow ? 'translate(0 104) scale(1)' : undefined}>
            <Binoculars />
          </g>
          {!slow && (
            <>
              <circle className="dr-hand" cx="138" cy="202" r="15" />
              <circle className="dr-hand" cx="262" cy="202" r="15" />
            </>
          )}
          {slow && (
            <>
              <circle className="dr-hand" cx="52" cy="358" r="18" />
              <circle className="dr-hand" cx="348" cy="358" r="18" />
            </>
          )}

          {/* Hat */}
          {staff ? (
            <g className="dr-hat">
              <path className="dr-fedora-crown" d="M156 58 Q158 4 200 6 Q242 4 244 58 Z" />
              <path className="dr-fedora-band" d="M156 46 H244 V58 H156 Z" />
              <ellipse className="dr-fedora-brim" cx="200" cy="60" rx="70" ry="13" />
            </g>
          ) : (
            <g className="dr-hat">
              <path className="dr-cap-dome" d="M146 62 Q150 -4 200 -2 Q250 -4 254 62 Q200 74 146 62 Z" />
              <path className="dr-cap-brim" d="M136 62 Q200 84 264 62 Q268 78 200 88 Q132 78 136 62 Z" />
              <circle className="dr-cap-button" cx="200" cy="2" r="5" />
              <path className="dr-cap-seam" d="M200 4 V68" />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}
