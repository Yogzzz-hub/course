import { useEffect, useRef } from 'react';

/** How far a pupil may travel inside its eye, in SVG units (the eye is 34 wide and 48 tall). */
const TRAVEL_X = 5;
const TRAVEL_Y = 9;
/** Pointer distance, in screen pixels, at which the pupil reaches full travel. */
const FULL_TRAVEL_DISTANCE = 180;

const PETALS = Array.from({ length: 9 }, (_, index) => index * 40);

/** A rounded limb drawn as a dark outline under a white tube, so overlapping white shapes stay readable. */
function Limb({ d }: { d: string }) {
  return (
    <>
      <path d={d} className="mascot-limb-edge" />
      <path d={d} className="mascot-limb" />
    </>
  );
}

function Cloud({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g className="mascot-cloud" transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cx="26" cy="38" r="26" />
      <circle cx="62" cy="26" r="32" />
      <circle cx="100" cy="38" r="26" />
      <rect x="10" y="40" width="108" height="26" rx="13" />
      <path className="mascot-cloud-curl" d="M22 48 C 22 38, 36 36, 40 44" />
    </g>
  );
}

function Sparkle({ x, y, size = 1, soft = false }: { x: number; y: number; size?: number; soft?: boolean }) {
  return (
    <path
      className={soft ? 'mascot-spark mascot-spark-soft' : 'mascot-spark'}
      transform={`translate(${x} ${y}) scale(${size})`}
      d="M0 -16 Q2.5 -2.5 16 0 Q2.5 2.5 0 16 Q-2.5 2.5 -16 0 Q-2.5 -2.5 0 -16Z"
    />
  );
}

/**
 * The sign-up mascot: a cartoon flower whose eyes follow the pointer anywhere on the page.
 * `eyesClosed` shuts the lids, used while a password is being typed.
 * `staff` swaps the student look (backpack, book, headphones) for a professional one (blazer, tie, glasses, laptop, coffee).
 * `hopping` plays a quick hop, used while the Student / Staff transition runs.
 */
export function FlowerMascot({ eyesClosed = false, staff = false, hopping = false }: { eyesClosed?: boolean; staff?: boolean; hopping?: boolean }) {
  const root = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = root.current;
    if (!svg) return;
    const eyes = Array.from(svg.querySelectorAll<SVGElement>('[data-eye]'));
    const pupils = Array.from(svg.querySelectorAll<SVGElement>('[data-pupil]'));
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;

    function aim() {
      frame = 0;
      pupils.forEach((pupil, index) => {
        const eye = eyes[index];
        if (!eye) return;
        if (!pointer) {
          pupil.style.transform = 'translate(0px, 0px)';
          return;
        }
        const box = eye.getBoundingClientRect();
        const dx = pointer.x - (box.left + box.width / 2);
        const dy = pointer.y - (box.top + box.height / 2);
        const distance = Math.hypot(dx, dy) || 1;
        const reach = Math.min(1, distance / FULL_TRAVEL_DISTANCE);
        pupil.style.transform = `translate(${((dx / distance) * reach * TRAVEL_X).toFixed(2)}px, ${((dy / distance) * reach * TRAVEL_Y).toFixed(2)}px)`;
      });
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(aim);
    }
    function onMove(event: PointerEvent) {
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    }
    function onLeave() {
      pointer = null;
      schedule();
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <svg ref={root} className={hopping ? 'mascot is-hopping' : 'mascot'} viewBox="0 0 520 540" role="img" aria-label="A friendly cartoon flower whose eyes follow your cursor">
      {/* Sky: clouds, sparkles and dots sit behind the character. */}
      <Cloud x={10} y={70} scale={0.95} />
      <Cloud x={400} y={20} scale={0.62} />
      <Cloud x={392} y={400} scale={1.05} />
      <Cloud x={40} y={440} scale={0.8} />
      <Sparkle x={70} y={250} size={1.1} />
      <Sparkle x={456} y={196} size={0.9} />
      <Sparkle x={392} y={400} size={0.8} />
      <Sparkle x={170} y={18} size={0.7} soft />
      <Sparkle x={500} y={96} size={1} soft />
      <circle className="mascot-dot" cx="318" cy="38" r="6" />
      <circle className="mascot-dot" cx="488" cy="150" r="6" />
      <circle className="mascot-dot" cx="300" cy="510" r="5" />
      <circle className="mascot-dot" cx="130" cy="372" r="8" />
      <circle className="mascot-dot mascot-dot-faint" cx="236" cy="96" r="5" />

      {staff ? (
        <g className="mascot-costume">
          <g transform="translate(46 150)">
            <rect className="mascot-prop" x="0" y="0" width="84" height="64" rx="12" />
            <path className="mascot-prop-line" d="M16 48 V32 M32 48 V20 M48 48 V38 M64 48 V14" />
            <path className="mascot-prop-line mascot-prop-hi" d="M12 52 H72" />
          </g>
          <g transform="translate(456 292)">
            <circle className="mascot-prop" r="24" />
            <path className="mascot-prop-line mascot-prop-hi" d="M-11 1 L-3 9 L12 -8" />
          </g>
        </g>
      ) : (
        <g className="mascot-costume">
          <g transform="translate(70 176) rotate(-35)">
            <rect className="mascot-prop" x="-9" y="-44" width="18" height="70" rx="3" />
            <path className="mascot-prop-hi-fill" d="M-9 -44 H9 V-34 H-9 Z" />
            <path className="mascot-prop" d="M-9 26 L0 46 L9 26 Z" />
          </g>
          <g transform="translate(456 292)">
            <circle className="mascot-prop" cy="-6" r="20" />
            <rect className="mascot-prop" x="-9" y="10" width="18" height="12" rx="4" />
            <path className="mascot-prop-line" d="M-6 -10 Q0 -18 6 -10 M0 -2 V4" />
            <path className="mascot-prop-line mascot-prop-hi" d="M0 -34 V-42 M-24 -30 L-30 -36 M24 -30 L30 -36" />
          </g>
        </g>
      )}

      <g transform="translate(60 44)">
      <g className="mascot-bob">
        {!staff && (
          <g className="mascot-costume mascot-backpack">
            <rect x="132" y="238" width="156" height="118" rx="34" />
            <rect className="mascot-backpack-pocket" x="160" y="300" width="100" height="44" rx="16" />
          </g>
        )}
        {/* Legs and feet */}
        <Limb d="M196 262 C 190 320, 196 366, 186 408" />
        <Limb d="M244 262 C 252 318, 266 356, 262 404" />
        <ellipse className="mascot-foot" cx="176" cy="414" rx="26" ry="14" />
        <ellipse className="mascot-foot" cx="276" cy="410" rx="26" ry="14" />

        {/* Left arm, hand down */}
        <Limb d="M152 232 C 112 244, 92 282, 100 322" />
        <circle className="mascot-hand" cx="102" cy="332" r="19" />
        <ellipse className="mascot-hand" cx="124" cy="326" rx="9" ry="14" transform="rotate(-24 124 326)" />

        {/* Petals */}
        <g className="mascot-petals">
          {PETALS.map(angle => (
            <g key={angle} transform={`rotate(${angle} 210 190)`}>
              <ellipse className="mascot-petal" cx="210" cy="96" rx="27" ry="62" />
              <path className="mascot-vein" d="M210 62 C 206 84, 206 112, 210 138 M200 76 C 198 92, 199 108, 203 124 M220 76 C 222 92, 221 108, 217 124" />
            </g>
          ))}
        </g>

        {staff && (
          <g className="mascot-costume mascot-blazer">
            <path className="mascot-jacket" d="M146 246 Q210 280 274 246 Q282 262 270 346 Q210 362 150 346 Q138 262 146 246 Z" />
            <path className="mascot-shirt" d="M190 260 L210 308 L230 260 Q210 274 190 260 Z" />
            <path className="mascot-tie" d="M205 270 H215 L219 286 L210 322 L201 286 Z" />
            <path className="mascot-lapel" d="M190 260 L170 300 L192 330 L210 308 Z M230 260 L250 300 L228 330 L210 308 Z" />
            <path className="mascot-jacket-line" d="M210 330 V352 M166 322 H186" />
            <circle className="mascot-button" cx="218" cy="338" r="3.2" />
            <path className="mascot-sleeve-edge" d="M152 242 C 114 252, 94 284, 102 312" />
            <path className="mascot-sleeve" d="M152 242 C 114 252, 94 284, 102 312" />
            <path className="mascot-cuff" d="M90 314 Q102 322 114 315" />
          </g>
        )}

        {!staff && (
          <g className="mascot-costume">
            <path className="mascot-strap" d="M182 252 C 172 284, 174 312, 184 338" />
            <path className="mascot-strap" d="M238 252 C 248 284, 246 312, 236 338" />
          </g>
        )}

        {/* Right arm, hand up in a peace sign */}
        <Limb d="M272 236 C 322 262, 352 232, 346 176" />
        <g transform="translate(346 152)">
          {!staff && <rect className="mascot-hand" x="-16" y="-44" width="13" height="46" rx="6.5" transform="rotate(-14)" />}
          {!staff && <rect className="mascot-hand" x="3" y="-44" width="13" height="46" rx="6.5" transform="rotate(12)" />}
          <circle className="mascot-hand" cx="0" cy="12" r="19" />
          <ellipse className="mascot-hand" cx="-18" cy="16" rx="8" ry="12" transform="rotate(30 -18 16)" />
          {staff && (
            <g className="mascot-costume mascot-coffee">
              <path className="mascot-steam" d="M-6 -20 Q-12 -30 -6 -38 M6 -20 Q0 -30 6 -38" />
              <path className="mascot-cup-handle" d="M12 2 Q28 4 24 18 Q22 24 12 22" />
              <path className="mascot-cup" d="M-14 -8 H14 L11 26 Q0 30 -11 26 Z" />
              <path className="mascot-cup-band" d="M-13 4 H13" />
              <circle className="mascot-hand" cx="-8" cy="14" r="9" />
            </g>
          )}
        </g>

        {staff && (
          <g className="mascot-costume">
            <path className="mascot-sleeve-edge" d="M270 244 C 324 270, 354 238, 346 190" />
            <path className="mascot-sleeve" d="M270 244 C 324 270, 354 238, 346 190" />
            <path className="mascot-cuff" d="M334 188 Q346 180 358 188" />
          </g>
        )}

        {/* Left hand holds a book (student) or a laptop (staff) */}
        {staff ? (
          <g className="mascot-costume mascot-laptop">
            <path className="mascot-laptop-screen" d="M62 288 H132 L126 336 H68 Z" />
            <path className="mascot-laptop-glow" d="M70 295 H125 L121 329 H73 Z" />
            <path className="mascot-laptop-chart" d="M80 322 V312 M90 322 V304 M100 322 V316 M110 322 V300" />
            <path className="mascot-laptop-base" d="M52 338 H146 L140 348 Q99 352 58 348 Z" />
            <circle className="mascot-hand" cx="100" cy="344" r="12" />
          </g>
        ) : (
          <g transform="translate(90 326) scale(1.35) translate(-90 -326)"><g className="mascot-costume mascot-book">
            <rect className="mascot-book-cover" x="64" y="306" width="52" height="40" rx="5" transform="rotate(-10 90 326)" />
            <path className="mascot-book-pages" d="M70 340 H112 M72 345 H113" transform="rotate(-10 90 326)" />
            <path className="mascot-book-mark" d="M100 306 V322 L105 318 L110 322 V306" transform="rotate(-10 90 326)" />
            <circle className="mascot-hand" cx="108" cy="340" r="11" />
          </g></g>
        )}

        {/* Face */}
        <ellipse className="mascot-face" cx="210" cy="190" rx="84" ry="62" />
        {!staff && <circle className="mascot-blush" cx="138" cy="208" r="13" />}
        {!staff && <circle className="mascot-blush" cx="282" cy="208" r="13" />}
        <circle className="mascot-cheek" cx="144" cy="206" r="6.5" />
        <circle className="mascot-cheek" cx="276" cy="206" r="6.5" />

        {[182, 238].map(cx => (
          <g key={cx}>
            <path className="mascot-lash" d={`M${cx - 16} 158 l-8 -8 M${cx - 6} 153 l-3 -11 M${cx + 6} 153 l3 -11 M${cx + 16} 158 l8 -8`} />
            <ellipse className="mascot-eye" data-eye cx={cx} cy="180" rx="17" ry="24" />
            <g className="mascot-pupil" data-pupil>
              <circle className="mascot-pupil-dot" cx={cx} cy="184" r="11.5" />
              <circle className="mascot-glint" cx={cx + 4} cy="178" r="3.6" />
            </g>
            <ellipse className={eyesClosed ? 'mascot-lid is-closed' : 'mascot-lid'} cx={cx} cy="180" rx="17" ry="24" />
            <path className={eyesClosed ? 'mascot-closed-line is-closed' : 'mascot-closed-line'} d={`M${cx - 14} 182 Q${cx} 192 ${cx + 14} 182`} />
          </g>
        ))}

        {!staff && (
          <g className="mascot-costume mascot-headphones">
            <path className="mascot-band" d="M128 178 Q210 66 292 178" />
            <ellipse className="mascot-cup-ear" cx="126" cy="188" rx="12" ry="20" />
            <ellipse className="mascot-cup-ear" cx="294" cy="188" rx="12" ry="20" />
          </g>
        )}
        {staff && (
          <g className="mascot-glasses">
            <circle cx="182" cy="180" r="26" />
            <circle cx="238" cy="180" r="26" />
            <path d="M207 175 Q210 169 213 175 M156 176 L142 170 M264 176 L278 170" />
          </g>
        )}
        {/* Mouth */}
        {staff ? (
          <path className="mascot-smile" d="M190 214 Q210 230 230 214" />
        ) : (
          <>
            <path className="mascot-mouth" d="M180 210 Q210 250 240 210 Z" />
            <path className="mascot-teeth" d="M196 210 V224 M210 210 V230 M224 210 V224" />
          </>
        )}
      </g>
      </g>
    </svg>
  );
}
