import { useEffect, useId, useRef } from 'react';

/** How far a pupil may travel inside its eye, in SVG units (the eye is 34 wide and 48 tall). */
const TRAVEL_X = 5;
const TRAVEL_Y = 9;
/** Pointer distance, in screen pixels, at which the pupil reaches full travel. */
const FULL_TRAVEL_DISTANCE = 180;

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
 * "Ribbon": the Aintrix folded-ribbon "A" as a friendly character whose eyes follow the pointer anywhere on the page.
 * `eyesClosed` shuts the lids, used while a password is being typed.
 * `staff` turns the body into a suit and swaps the student props (cap, straps, book) for glasses, a laptop and coffee.
 * `hopping` plays a quick hop, used while the Student / Staff transition runs.
 */
export function RibbonMascot({ eyesClosed = false, staff = false, hopping = false }: { eyesClosed?: boolean; staff?: boolean; hopping?: boolean }) {
  const root = useRef<SVGSVGElement>(null);
  const clipId = useId().replace(/:/g, '');

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
    <svg ref={root} className={`mascot${staff ? ' is-staff' : ''}${hopping ? ' is-hopping' : ''}`} viewBox="0 0 520 540" role="img" aria-label="Ribbon, the Aintrix mascot, whose eyes follow your cursor">
      <defs>
        <clipPath id={clipId}><rect x="200" y="0" width="260" height="480" /></clipPath>
      </defs>

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
          <g transform="translate(40 150)">
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
        {/* Shoes */}
        <ellipse className={staff ? 'mascot-shoe is-dark' : 'mascot-shoe'} cx="104" cy="408" rx="48" ry="15" />
        <ellipse className={staff ? 'mascot-shoe is-dark' : 'mascot-shoe'} cx="296" cy="408" rx="48" ry="15" />

        {/* Arms sit behind the body */}
        <Limb d="M98 262 C 62 272, 44 312, 52 346" />
        <Limb d="M302 262 C 352 280, 372 236, 364 176" />

        {/* Body: the folded-ribbon "A". The right half is the lighter side of the fold. */}
        <path className="mascot-body-a" d="M200 30 C 150 30, 128 70, 108 140 L 62 330 C 52 372, 70 404, 108 404 L 142 404 C 142 350, 166 300, 200 296 C 234 300, 258 350, 258 404 L 292 404 C 330 404, 348 372, 338 330 L 292 140 C 272 70, 250 30, 200 30 Z" />
        <path className="mascot-body-b" d="M200 30 C 150 30, 128 70, 108 140 L 62 330 C 52 372, 70 404, 108 404 L 142 404 C 142 350, 166 300, 200 296 C 234 300, 258 350, 258 404 L 292 404 C 330 404, 348 372, 338 330 L 292 140 C 272 70, 250 30, 200 30 Z" clipPath={`url(#${clipId})`} />
        <path className="mascot-fold" d="M200 40 C 232 44, 256 70, 270 112 L 200 112 Z" />

        {/* Staff suit: shirt, tie and lapels drawn on the body */}
        {staff && (
          <g className="mascot-costume mascot-blazer">
            <path className="mascot-shirt" d="M170 232 L200 288 L230 232 Z" />
            <path className="mascot-lapel" d="M170 232 L150 278 L178 294 L200 288 Z M230 232 L250 278 L222 294 L200 288 Z" />
            <path className="mascot-tie" d="M194 244 H206 L210 260 L200 290 L190 260 Z" />
            <path className="mascot-sleeve-edge" d="M98 262 C 62 272, 44 312, 52 338" />
            <path className="mascot-sleeve" d="M98 262 C 62 272, 44 312, 52 338" />
            <path className="mascot-cuff" d="M40 340 Q52 348 64 341" />
            <path className="mascot-sleeve-edge" d="M302 262 C 352 280, 372 236, 364 186" />
            <path className="mascot-sleeve" d="M302 262 C 352 280, 372 236, 364 186" />
            <path className="mascot-cuff" d="M352 188 Q364 180 376 188" />
          </g>
        )}

        {/* Student: backpack straps and a graduation cap */}
        {!staff && (
          <g className="mascot-costume">
            <path className="mascot-strap" d="M150 238 C 140 276, 138 306, 144 340" />
            <path className="mascot-strap" d="M250 238 C 260 276, 262 306, 256 340" />
          </g>
        )}

        {/* Right hand: peace sign (student) or coffee (staff) */}
        <g transform="translate(364 152)">
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

        {/* Left hand: hand, then a book (student) or a laptop (staff) */}
        <circle className="mascot-hand" cx="52" cy="358" r="19" />
        {staff ? (
          <g transform="translate(-48 14)">
            <g className="mascot-costume mascot-laptop">
              <path className="mascot-laptop-screen" d="M62 288 H132 L126 336 H68 Z" />
              <path className="mascot-laptop-glow" d="M70 295 H125 L121 329 H73 Z" />
              <path className="mascot-laptop-chart" d="M80 322 V312 M90 322 V304 M100 322 V316 M110 322 V300" />
              <path className="mascot-laptop-base" d="M52 338 H146 L140 348 Q99 352 58 348 Z" />
              <circle className="mascot-hand" cx="100" cy="344" r="12" />
            </g>
          </g>
        ) : (
          <g transform="translate(-56 18)">
            <g transform="translate(90 326) scale(1.35) translate(-90 -326)">
              <g className="mascot-costume mascot-book">
                <rect className="mascot-book-cover" x="64" y="306" width="52" height="40" rx="5" transform="rotate(-10 90 326)" />
                <path className="mascot-book-pages" d="M70 340 H112 M72 345 H113" transform="rotate(-10 90 326)" />
                <path className="mascot-book-mark" d="M100 306 V322 L105 318 L110 322 V306" transform="rotate(-10 90 326)" />
                <circle className="mascot-hand" cx="108" cy="340" r="11" />
              </g>
            </g>
          </g>
        )}

        {/* Face */}
        <ellipse className="mascot-face" cx="200" cy="176" rx="76" ry="60" />
        <ellipse className="mascot-blush" cx="146" cy="202" rx="12" ry="9" />
        <ellipse className="mascot-blush" cx="254" cy="202" rx="12" ry="9" />

        {[174, 226].map(cx => (
          <g key={cx}>
            <ellipse className="mascot-eye" data-eye cx={cx} cy="170" rx="15" ry="22" />
            <g className="mascot-pupil" data-pupil>
              <circle className="mascot-pupil-dot" cx={cx} cy="174" r="10.5" />
              <circle className="mascot-glint" cx={cx + 3.5} cy="168" r="3.3" />
            </g>
            <ellipse className={eyesClosed ? 'mascot-lid is-closed' : 'mascot-lid'} cx={cx} cy="170" rx="15" ry="22" />
            <path className={eyesClosed ? 'mascot-closed-line is-closed' : 'mascot-closed-line'} d={`M${cx - 13} 172 Q${cx} 182 ${cx + 13} 172`} />
          </g>
        ))}

        {staff && (
          <g className="mascot-glasses">
            <circle cx="174" cy="170" r="25" />
            <circle cx="226" cy="170" r="25" />
            <path d="M199 166 Q200 160 201 166 M149 166 L136 160 M251 166 L264 160" />
          </g>
        )}

        {/* Mouth */}
        {staff ? (
          <path className="mascot-smile" d="M184 206 Q200 220 216 206" />
        ) : (
          <>
            <path className="mascot-mouth" d="M176 202 Q200 238 224 202 Z" />
            <path className="mascot-teeth" d="M190 202 V214 M200 202 V218 M210 202 V214" />
          </>
        )}

        {/* Graduation cap sits on the apex of the A */}
        {!staff && (
          <g className="mascot-costume mascot-cap">
            <path className="mascot-cap-band" d="M158 48 V70 Q200 88 242 70 V48 Z" />
            <path className="mascot-cap-board" d="M200 6 L276 34 L200 62 L124 34 Z" />
            <circle className="mascot-cap-button" cx="200" cy="34" r="4.5" />
            <path className="mascot-tassel-cord" d="M200 34 L262 40 V74" />
            <rect className="mascot-tassel" x="257" y="72" width="10" height="16" rx="3" />
          </g>
        )}
      </g>
      </g>
    </svg>
  );
}
