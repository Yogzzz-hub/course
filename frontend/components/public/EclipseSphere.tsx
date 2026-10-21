"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, BookOpen, Calendar, ShieldCheck } from "lucide-react";

const DISC = 0.19;
const REST = -0.72;

const vertexSource = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";

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

function toRgb(color: string, fallback: [number, number, number]): [number, number, number] {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color.trim());
  return match
    ? ([1, 2, 3].map((index) => parseInt(match[index], 16) / 255) as [number, number, number])
    : fallback;
}

function createCorona(canvas: HTMLCanvasElement, host: HTMLElement) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };

  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const position = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    res: uniform("uRes"),
    time: uniform("uTime"),
    disc: uniform("uDisc"),
    offset: uniform("uOffset"),
    flare: uniform("uFlare"),
    soft: uniform("uSoft"),
    accent: uniform("uAccent"),
  };
  gl.uniform1f(u.disc, DISC);

  return {
    resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.res, canvas.width, canvas.height);
    },
    colors() {
      gl.uniform3fv(u.soft, [0.82, 0.68, 0.35]); // Gold accent soft
      gl.uniform3fv(u.accent, [0.43, 0.1, 0.17]); // Deep Maroon
    },
    draw(time: number, [dx, dy]: [number, number], shift: number) {
      gl.uniform1f(u.time, time);
      gl.uniform2f(u.flare, dx, -dy);
      gl.uniform2f(u.offset, -dx * shift, dy * shift);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

export function EclipseOrb() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const node = root.current;
    const surface = canvas.current;
    if (!node || !surface) return;

    let angle = REST;
    let target = REST;
    let frame = 0;
    let visible = true;
    let pointer: [number, number] | null = null;
    const start = performance.now();

    const corona = createCorona(surface, node);
    if (corona) {
      corona.resize();
      corona.colors();
      node.dataset.gl = "on";
    }

    function render(time: number) {
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const shift = 0.0055;
      node!.style.setProperty("--flare", `${angle.toFixed(4)}rad`);
      node!.style.setProperty("--moon-x", `${((-dx * shift) / (DISC * 2) * 100).toFixed(3)}%`);
      node!.style.setProperty("--moon-y", `${((-dy * shift) / (DISC * 2) * 100).toFixed(3)}%`);
      corona?.draw(time, [dx, dy], shift);
    }

    function tick(now: number) {
      if (pointer) {
        const bounds = node!.getBoundingClientRect();
        target = Math.atan2(
          pointer[1] - (bounds.top + bounds.height / 2),
          pointer[0] - (bounds.left + bounds.width / 2)
        );
      } else {
        target += 0.0016;
      }

      angle += Math.atan2(Math.sin(target - angle), Math.cos(target - angle)) * 0.05;
      render((now - start) / 1000);
      frame = visible ? requestAnimationFrame(tick) : 0;
    }

    function onPointer(event: PointerEvent) {
      if (event.pointerType === "mouse") {
        pointer = [event.clientX, event.clientY];
      }
    }

    function onLeave() {
      pointer = null;
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) frame = requestAnimationFrame(tick);
    });
    observer.observe(node);

    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    render(6);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      corona?.dispose();
    };
  }, []);

  return (
    <div className="relative w-full max-w-[540px] aspect-square flex items-center justify-center pointer-events-none select-none">
      {/* Orbital Ring Back */}
      <svg
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <g transform="rotate(-14 50 50)">
          <path
            d="M9 50A41 10.5 0 0 1 91 50"
            fill="none"
            stroke="rgba(201, 162, 75, 0.35)"
            strokeWidth="1.2"
          />
          <circle cx="85.5" cy="44.8" r="0.9" fill="#C9A24B" opacity="0.75" />
        </g>
      </svg>

      {/* Sphere Container */}
      <div
        ref={root}
        className="eclipse relative w-full h-full max-w-[460px] aspect-square"
      >
        {/* CSS Fallback layers */}
        <div className="eclipse-css absolute inset-0">
          <span className="eclipse-halo" />
          <span className="eclipse-corona" />
          <span className="eclipse-corona-b" />
          <span className="eclipse-sun" />
          <span className="eclipse-moon" />
        </div>

        {/* Live WebGL Surface */}
        <canvas ref={canvas} className="eclipse-gl absolute inset-0 w-full h-full" />

        {/* Dynamic Flare Pointer Bead */}
        <span className="eclipse-flare absolute inset-0">
          <i />
        </span>
      </div>

      {/* Orbital Ring Front */}
      <svg
        className="absolute inset-0 w-full h-full z-20 pointer-events-none"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <g transform="rotate(-14 50 50)">
          <path
            d="M91 50A41 10.5 0 0 1 9 50"
            fill="none"
            stroke="rgba(201, 162, 75, 0.55)"
            strokeWidth="1.2"
          />
          <circle cx="14.5" cy="55.3" r="1.1" fill="#FFF" opacity="0.9" />
          <circle cx="70.5" cy="59.1" r="0.9" fill="#C9A24B" opacity="0.8" />
        </g>
      </svg>
    </div>
  );
}

export function EclipseHeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#0A070D] text-white pt-24 pb-20 sm:pt-32 sm:pb-28 border-b border-[#251A2C]">
      {/* Starry Twinkling Background Sky */}
      <div className="hero-sky absolute inset-0 pointer-events-none opacity-40" />

      {/* Radial Atmospheric Lighting */}
      <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-[650px] h-[650px] bg-gradient-radial from-[#6D1A2B]/40 via-[#C9A24B]/10 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Copy */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#6D1A2B]/40 border border-[#C9A24B]/35 text-[#F6EBCF] text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#C9A24B]" />
              <span>Institutional Computing & Architecture</span>
            </div>

            <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.08] text-balance">
              Where Engineering Rigor Meets{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F6EBCF] via-[#C9A24B] to-[#E5C988]">
                Architectural Depth
              </span>
            </h1>

            <p className="text-sm sm:text-base text-stone-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-sans">
              Intensive, production-grade programs in distributed backend systems, enterprise cloud engineering, and applied computing. Guided by industry architects.
            </p>

            {/* Interactive Action Dock */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link href="/courses">
                <button className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#C9A24B] to-[#B38D36] text-[#1B0F1C] font-semibold text-sm hover:brightness-110 shadow-lg shadow-[#C9A24B]/20 transition-all active:scale-95">
                  <BookOpen className="w-4 h-4" />
                  <span>Explore Academic Programs</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </Link>

              <Link href="/book-session">
                <button className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm backdrop-blur-md transition-all active:scale-95">
                  <Calendar className="w-4 h-4 text-[#C9A24B]" />
                  <span>Book Counselling Session</span>
                </button>
              </Link>
            </div>

            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-white/10 max-w-lg mx-auto lg:mx-0 text-left">
              <div>
                <p className="text-xl sm:text-2xl font-bold font-serif text-[#C9A24B]">100%</p>
                <p className="text-[11px] text-stone-400">Production Codebases</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold font-serif text-[#C9A24B]">1 : 1</p>
                <p className="text-[11px] text-stone-400">Architect Mentorship</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold font-serif text-[#C9A24B]">Verified</p>
                <p className="text-[11px] text-stone-400">Cryptographic Badges</p>
              </div>
            </div>
          </div>

          {/* Right: The Interactive 3D Eclipse Sphere */}
          <div className="lg:col-span-5 flex items-center justify-center z-10">
            <EclipseOrb />
          </div>
        </div>
      </div>
    </section>
  );
}
