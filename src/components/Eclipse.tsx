import { useEffect, useRef } from 'react';
import type { MotionValue } from 'motion/react';
import { useSiteMotion } from './MotionSystem';

const motionActive = () => typeof document !== 'undefined' && document.documentElement.dataset.motion !== 'paused';

/** Radius of the sun (and of the moon that hides it) as a share of the eclipse box side. */
const DISC = 0.19;
/** Resting angle of the diamond-ring bead, in radians (screen space, upper right). */
const REST = -0.72;

const vertexSource = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

// A total eclipse: the moon covers the sun exactly, so only the corona streams out around it.
// Shifting the moon by uOffset lets a bead (then a crescent) of the sun through.
const fragmentSource = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform float uDisc;
uniform vec2 uOffset;
uniform vec2 uFlare;
uniform vec3 uSoft;
uniform vec3 uAccent;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.;float a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.07+13.1;a*=.5;}return v;}
void main(){
  vec2 p=(gl_FragCoord.xy-.5*uRes)/min(uRes.x,uRes.y);
  float r=length(p);
  vec2 dir=p/max(r,1e-4);
  float edge=r-uDisc;
  float outside=max(edge,0.);
  // Streamers are sampled on the unit circle so there is no seam, and drift outward over time.
  float flow=fbm(dir*2.4+vec2(uTime*.03,-uTime*.021)+outside*3.2);
  float fine=fbm(dir*8.5+vec2(-uTime*.045,uTime*.036)+outside*8.);
  float reach=mix(3.4,16.,1.-flow);
  float corona=exp(-outside*reach)*(.2+1.25*flow*flow)+exp(-outside*22.)*(.35+fine*.9);
  float halo=exp(-outside*3.)*.22;
  float lift=pow(max(dot(dir,uFlare),0.),5.);
  vec3 col=uSoft*corona*(.95+lift*1.5)+uAccent*halo*1.3;
  col+=vec3(1.)*exp(-abs(edge)*260.)*(.6+lift*1.2);
  float sun=1.-smoothstep(uDisc-.002,uDisc+.0015,r);
  col+=mix(vec3(1.),uSoft,.25)*sun*1.6;
  col=1.-exp(-col*1.3);
  col*=1.-smoothstep(.34,.5,r);
  float moon=1.-smoothstep(uDisc*1.012-.002,uDisc*1.012+.0015,length(p-uOffset));
  col*=1.-moon;
  float alpha=max(max(col.r,col.g),col.b);
  gl_FragColor=vec4(col,max(alpha,moon));
}`;

type Corona = { resize: () => void; colors: () => void; draw: (time: number, dir: [number, number], shift: number) => void; dispose: () => void };

function toRgb(color: string, fallback: [number, number, number]): [number, number, number] {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color.trim());
  return match ? [1, 2, 3].map(index => parseInt(match[index], 16) / 255) as [number, number, number] : fallback;
}

/** WebGL corona; returns null on software rendering or when WebGL is unavailable, leaving the CSS eclipse in place. */
function createCorona(canvas: HTMLCanvasElement, host: HTMLElement): Corona | null {
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, failIfMajorPerformanceCaveat: true, powerPreference: 'low-power' });
  if (!gl) return null;
  const compile = (type: number, source: string) => { const shader = gl.createShader(type)!; gl.shaderSource(shader, source); gl.compileShader(shader); return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null; };
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const u = { res: uniform('uRes'), time: uniform('uTime'), disc: uniform('uDisc'), offset: uniform('uOffset'), flare: uniform('uFlare'), soft: uniform('uSoft'), accent: uniform('uAccent') };
  gl.uniform1f(u.disc, DISC);
  return {
    resize() {
      // Layout size, not the transformed rect, so entrance and scroll scaling never resize the buffer.
      // The corona is soft, so a modest pixel ratio keeps the shader cheap without visible loss.
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.res, canvas.width, canvas.height);
    },
    colors() {
      const style = getComputedStyle(host);
      gl.uniform3fv(u.soft, toRgb(style.getPropertyValue('--accent-soft'), [0.66, 0.79, 0.86]));
      gl.uniform3fv(u.accent, toRgb(style.getPropertyValue('--accent'), [0.41, 0.11, 0.21]));
    },
    draw(time, [dx, dy], shift) {
      gl.uniform1f(u.time, time);
      // Canvas y points up; the moon slides away from the bead so the sun shows on the pointer side.
      gl.uniform2f(u.flare, dx, -dy);
      gl.uniform2f(u.offset, -dx * shift, dy * shift);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() { gl.getExtension('WEBGL_lose_context')?.loseContext(); },
  };
}

/** A tilted ring around the eclipse; its far half sits behind the sphere and its near half crosses in front. */
export function EclipseRing({ half }: { half: 'back' | 'front' }) {
  return <svg className={`eclipse-ring eclipse-ring-${half}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <g transform="rotate(-14 50 50)">
      <path d={half === 'back' ? 'M9 50A41 10.5 0 0 1 91 50' : 'M91 50A41 10.5 0 0 1 9 50'}/>
      {half === 'front' && <><circle className="ring-node ring-node-1" cx="14.5" cy="55.3" r=".42"/><circle className="ring-node ring-node-2" cx="70.5" cy="59.1" r=".42"/></>}
      {half === 'back' && <circle className="ring-node ring-node-3" cx="85.5" cy="44.8" r=".42"/>}
    </g>
  </svg>;
}

/**
 * The academy's eclipse mark: a total eclipse whose diamond-ring bead follows the pointer
 * and opens into a crescent as the reader scrolls. Decorative; the CSS layers are the
 * server-rendered and fallback image, and WebGL only adds the moving corona on top.
 */
export function Eclipse({ className = '', progress, live = true }: { className?: string; progress?: MotionValue<number>; live?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { enabled } = useSiteMotion();
  useEffect(() => {
    const node = root.current;
    const surface = canvas.current;
    if (!node || !live) return;
    const animate = enabled && motionActive();
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let angle = REST, target = REST, reveal = 0, frame = 0, visible = true, pointer: [number, number] | null = null;
    const start = performance.now();
    const corona = surface ? createCorona(surface, node) : null;
    if (corona) { corona.resize(); corona.colors(); }
    function render(time: number) {
      const dx = Math.cos(angle), dy = Math.sin(angle);
      // A hair of offset shows the bead at rest; scrolling widens it into a crescent.
      const shift = 0.0045 + reveal * 0.075;
      node!.style.setProperty('--flare', `${angle.toFixed(4)}rad`);
      node!.style.setProperty('--moon-x', `${(-dx * shift / (DISC * 2) * 100).toFixed(3)}%`);
      node!.style.setProperty('--moon-y', `${(-dy * shift / (DISC * 2) * 100).toFixed(3)}%`);
      node!.style.setProperty('--reveal', reveal.toFixed(3));
      corona?.draw(time, [dx, dy], shift);
    }
    function tick(now: number) {
      if (pointer) {
        const bounds = node!.getBoundingClientRect();
        target = Math.atan2(pointer[1] - (bounds.top + bounds.height / 2), pointer[0] - (bounds.left + bounds.width / 2));
      } else target += 0.0012;
      // Ease along the shortest arc so the bead never spins the long way round.
      angle += Math.atan2(Math.sin(target - angle), Math.cos(target - angle)) * 0.05;
      reveal += ((progress?.get() ?? 0) - reveal) * 0.12;
      render((now - start) / 1000);
      frame = visible ? requestAnimationFrame(tick) : 0;
    }
    function onPointer(event: PointerEvent) { if (event.pointerType === 'mouse') pointer = [event.clientX, event.clientY]; }
    function onLeave() { pointer = null; }
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && animate && !frame) frame = requestAnimationFrame(tick);
    });
    visibility.observe(node);
    const resize = new ResizeObserver(() => { corona?.resize(); if (!frame) render(6); });
    resize.observe(node);
    const theme = new MutationObserver(() => { corona?.colors(); if (!frame) render(6); });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const lost = (event: Event) => { event.preventDefault(); delete node.dataset.gl; };
    surface?.addEventListener('webglcontextlost', lost);
    if (corona) node.dataset.gl = 'on';
    if (animate && fine) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }
    render(6);
    return () => {
      cancelAnimationFrame(frame); frame = 0; visible = false;
      visibility.disconnect(); resize.disconnect(); theme.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      surface?.removeEventListener('webglcontextlost', lost);
      delete node.dataset.gl;
      corona?.dispose();
    };
  }, [enabled, live, progress]);
  return <div ref={root} className={`eclipse ${className}`} aria-hidden="true">
    <div className="eclipse-css">
      <span className="eclipse-halo"/>
      <span className="eclipse-corona"/>
      <span className="eclipse-corona eclipse-corona-b"/>
      <span className="eclipse-sun"/>
      <span className="eclipse-moon"/>
    </div>
    {live && <canvas ref={canvas} className="eclipse-gl"/>}
    <span className="eclipse-flare"><i/></span>
  </div>;
}
