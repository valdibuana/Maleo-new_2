"use client";

import { useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// WebGL Fluid Simulation — aurora/smoke effect tuned to Maleo SIAKAD palette
// Inspired by Shivam Sinha's portfolio fluid effect
// ─────────────────────────────────────────────────────────────────────────────

const VS = `
  attribute vec2 aPos;
  void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const ADVECT = `
  precision highp float;
  uniform sampler2D uVel, uSrc;
  uniform vec2 uRes;
  uniform float uDt, uDiss;
  void main() {
    vec2 uv  = gl_FragCoord.xy / uRes;
    vec2 vel = texture2D(uVel, uv).xy;
    gl_FragColor = uDiss * texture2D(uSrc, uv - vel * uDt);
  }
`;

const SPLAT = `
  precision highp float;
  uniform sampler2D uBase;
  uniform vec2 uRes, uPoint;
  uniform vec3 uColor;
  uniform float uRadius;
  void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float d = distance(uv, uPoint);
    float s = exp(-d*d / (2.0*uRadius*uRadius));
    gl_FragColor = vec4(texture2D(uBase, uv).rgb + s * uColor, 1.0);
  }
`;

const DIV = `
  precision highp float;
  uniform sampler2D uVel;
  uniform vec2 uRes;
  void main() {
    vec2 t  = 1.0 / uRes;
    vec2 uv = gl_FragCoord.xy / uRes;
    float l = texture2D(uVel, uv - vec2(t.x, 0)).x;
    float r = texture2D(uVel, uv + vec2(t.x, 0)).x;
    float b = texture2D(uVel, uv - vec2(0, t.y)).y;
    float tp = texture2D(uVel, uv + vec2(0, t.y)).y;
    gl_FragColor = vec4(0.5*((r-l)+(tp-b)), 0, 0, 1);
  }
`;

const PRESSURE = `
  precision highp float;
  uniform sampler2D uPres, uDiv;
  uniform vec2 uRes;
  void main() {
    vec2 t  = 1.0 / uRes;
    vec2 uv = gl_FragCoord.xy / uRes;
    float l = texture2D(uPres, uv - vec2(t.x, 0)).x;
    float r = texture2D(uPres, uv + vec2(t.x, 0)).x;
    float b = texture2D(uPres, uv - vec2(0, t.y)).x;
    float tp = texture2D(uPres, uv + vec2(0, t.y)).x;
    float d = texture2D(uDiv,  uv).x;
    gl_FragColor = vec4((l+r+b+tp-d)/4.0, 0, 0, 1);
  }
`;

const GRAD = `
  precision highp float;
  uniform sampler2D uVel, uPres;
  uniform vec2 uRes;
  void main() {
    vec2 t  = 1.0 / uRes;
    vec2 uv = gl_FragCoord.xy / uRes;
    float pl = texture2D(uPres, uv - vec2(t.x, 0)).x;
    float pr = texture2D(uPres, uv + vec2(t.x, 0)).x;
    float pb = texture2D(uPres, uv - vec2(0, t.y)).x;
    float pt = texture2D(uPres, uv + vec2(0, t.y)).x;
    vec2 v   = texture2D(uVel, uv).xy;
    gl_FragColor = vec4(v - 0.5*vec2(pr-pl, pt-pb), 0, 1);
  }
`;

const DISPLAY = `
  precision highp float;
  uniform sampler2D uDye;
  uniform vec2 uRes;
  void main() {
    vec2 uv    = gl_FragCoord.xy / uRes;
    vec3 color = texture2D(uDye, uv).rgb;
    color = pow(max(color, vec3(0.0)), vec3(0.42)); // gamma → glow
    gl_FragColor = vec4(color, 0.7);
  }
`;

// ─── Linear-style palette: purple #7b39fc dominant, orange #f87b52 rare accent ──
const COLORS = [
  [0.48, 0.22, 0.99],  // #7b39fc purple (dominant)
  [0.55, 0.25, 1.1],   // brighter purple
  [0.4,  0.18, 0.95],  // deeper purple
  [0.3,  0.15, 0.85],  // dark violet
  [0.6,  0.3,  1.15],  // light purple
  [0.97, 0.48, 0.32],  // #f87b52 orange (rare)
];
// weight pool: orange is index 5, appears ~10% of time
const COLOR_POOL = [0,0,0,1,1,2,2,3,4,4,5];

function randColor() {
  const c = COLORS[COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)]];
  const s = 1.2 + Math.random() * 1.8;
  return { r: c[0] * s, g: c[1] * s, b: c[2] * s };
}

// ─── GL helpers ──────────────────────────────────────────────────────────────
function mkShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src); gl.compileShader(s); return s;
}
function mkProg(gl: WebGLRenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, mkShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, mkShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p); return p;
}
function mkFBO(gl: WebGLRenderingContext, w: number, h: number) {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex, fbo };
}
function mkDFBO(gl: WebGLRenderingContext, w: number, h: number) {
  let A = mkFBO(gl, w, h), B = mkFBO(gl, w, h);
  return { get read() { return A; }, get write() { return B; }, swap() { [A,B]=[B,A]; } };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function FluidBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Wait for next paint so layout is settled and offsetWidth/Height are real
    let animId: number;
    let cleanup: (() => void) | null = null;

    const init = () => {
      const W = canvas.offsetWidth  || canvas.parentElement?.offsetWidth  || 600;
      const H = canvas.offsetHeight || canvas.parentElement?.offsetHeight || 700;
      canvas.width  = W;
      canvas.height = H;

      const gl = canvas.getContext("webgl", {
        alpha: true, premultipliedAlpha: false, antialias: false,
      }) as WebGLRenderingContext | null;
      if (!gl) return;

      const SIM = 128, DYE = 512;

      // Quad buffer
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

      const bindQ = (p: WebGLProgram) => {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        const a = gl.getAttribLocation(p, "aPos");
        gl.enableVertexAttribArray(a);
        gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      };
      const drawQ = (p: WebGLProgram) => { gl.useProgram(p); bindQ(p); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
      const u = (p: WebGLProgram, name: string) => gl.getUniformLocation(p, name);

      // Programs
      const advP  = mkProg(gl, VS, ADVECT);
      const splP  = mkProg(gl, VS, SPLAT);
      const divP  = mkProg(gl, VS, DIV);
      const preP  = mkProg(gl, VS, PRESSURE);
      const grP   = mkProg(gl, VS, GRAD);
      const disP  = mkProg(gl, VS, DISPLAY);

      // FBOs
      const vel  = mkDFBO(gl, SIM, SIM);
      const dye  = mkDFBO(gl, DYE, DYE);
      const pres = mkDFBO(gl, SIM, SIM);
      const divF = mkFBO(gl, SIM, SIM);

      let cW = W, cH = H;

      // ── Splat ──────────────────────────────────────────────────
      const splat = (
        x: number, y: number,
        dx: number, dy: number,
        col: { r: number; g: number; b: number }
      ) => {
        const ux = x / cW, uy = 1.0 - y / cH;
        const rad = 0.004 + Math.random() * 0.003;

        // velocity
        gl.useProgram(splP);
        gl.viewport(0, 0, SIM, SIM);
        gl.bindFramebuffer(gl.FRAMEBUFFER, vel.write.fbo);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vel.read.tex);
        gl.uniform1i(u(splP,"uBase"), 0);
        gl.uniform2f(u(splP,"uRes")!, SIM, SIM);
        gl.uniform2f(u(splP,"uPoint")!, ux, uy);
        gl.uniform3f(u(splP,"uColor")!, dx * 100, -dy * 100, 0);
        gl.uniform1f(u(splP,"uRadius")!, rad * (SIM / DYE));
        bindQ(splP); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        vel.swap();

        // dye
        gl.viewport(0, 0, DYE, DYE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, dye.write.fbo);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, dye.read.tex);
        gl.uniform1i(u(splP,"uBase"), 0);
        gl.uniform2f(u(splP,"uRes")!, DYE, DYE);
        gl.uniform2f(u(splP,"uPoint")!, ux, uy);
        gl.uniform3f(u(splP,"uColor")!, col.r, col.g, col.b);
        gl.uniform1f(u(splP,"uRadius")!, rad);
        bindQ(splP); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        dye.swap();
      };

      // ── Simulation step ────────────────────────────────────────
      const step = () => {
        const DT = 0.016;

        // 1. advect velocity
        gl.useProgram(advP);
        gl.viewport(0, 0, SIM, SIM);
        gl.bindFramebuffer(gl.FRAMEBUFFER, vel.write.fbo);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vel.read.tex);
        gl.uniform1i(u(advP,"uVel"), 0); gl.uniform1i(u(advP,"uSrc"), 0);
        gl.uniform2f(u(advP,"uRes")!, SIM, SIM);
        gl.uniform1f(u(advP,"uDt")!, DT); gl.uniform1f(u(advP,"uDiss")!, 0.998);
        bindQ(advP); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        vel.swap();

        // 2. advect dye
        gl.viewport(0, 0, DYE, DYE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, dye.write.fbo);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vel.read.tex);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, dye.read.tex);
        gl.uniform1i(u(advP,"uVel"), 0); gl.uniform1i(u(advP,"uSrc"), 1);
        gl.uniform2f(u(advP,"uRes")!, DYE, DYE);
        gl.uniform1f(u(advP,"uDt")!, DT); gl.uniform1f(u(advP,"uDiss")!, 0.987);
        bindQ(advP); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        dye.swap();

        // 3. divergence
        gl.useProgram(divP);
        gl.viewport(0, 0, SIM, SIM);
        gl.bindFramebuffer(gl.FRAMEBUFFER, divF.fbo);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vel.read.tex);
        gl.uniform1i(u(divP,"uVel"), 0); gl.uniform2f(u(divP,"uRes")!, SIM, SIM);
        bindQ(divP); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // 4. pressure
        for (let i = 0; i < 20; i++) {
          gl.useProgram(preP);
          gl.bindFramebuffer(gl.FRAMEBUFFER, pres.write.fbo);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, pres.read.tex);
          gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, divF.tex);
          gl.uniform1i(u(preP,"uPres"), 0); gl.uniform1i(u(preP,"uDiv"), 1);
          gl.uniform2f(u(preP,"uRes")!, SIM, SIM);
          bindQ(preP); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          pres.swap();
        }

        // 5. gradient subtract
        gl.useProgram(grP);
        gl.viewport(0, 0, SIM, SIM);
        gl.bindFramebuffer(gl.FRAMEBUFFER, vel.write.fbo);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vel.read.tex);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, pres.read.tex);
        gl.uniform1i(u(grP,"uVel"), 0); gl.uniform1i(u(grP,"uPres"), 1);
        gl.uniform2f(u(grP,"uRes")!, SIM, SIM);
        bindQ(grP); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        vel.swap();
      };

      // ── Input ──────────────────────────────────────────────────
      let lx = -1, ly = -1, lastT = 0, idle = 0;

      // Mouse events on the PARENT div (because canvas is pointer-events-none)
      const parent = canvas.parentElement!;

      const onMove = (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        if (lx >= 0) splat(x, y, x - lx, y - ly, randColor());
        lx = x; ly = y; lastT = performance.now();
      };
      const onLeave = () => { lx = -1; ly = -1; };
      const onTouch = (e: TouchEvent) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches[0];
        const x = t.clientX - r.left, y = t.clientY - r.top;
        if (lx >= 0) splat(x, y, x - lx, y - ly, randColor());
        lx = x; ly = y; lastT = performance.now();
      };

      parent.addEventListener("mousemove", onMove);
      parent.addEventListener("mouseleave", onLeave);
      parent.addEventListener("touchmove", onTouch, { passive: true });

      // ── Seed initial splats ────────────────────────────────────
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        splat(
          W * 0.5 + Math.cos(a) * W * 0.22,
          H * 0.5 + Math.sin(a) * H * 0.22,
          Math.cos(a + Math.PI / 2) * 4,
          Math.sin(a + Math.PI / 2) * 4,
          randColor()
        );
      }

      // ── Render loop ────────────────────────────────────────────
      const frame = (now: number) => {
        animId = requestAnimationFrame(frame);

        // Resize
        const nW = canvas.offsetWidth  || parent.offsetWidth  || cW;
        const nH = canvas.offsetHeight || parent.offsetHeight || cH;
        if (nW !== cW || nH !== cH) {
          cW = nW; cH = nH;
          canvas.width = cW; canvas.height = cH;
        }

        // Idle ambient splat (slow swirl when nobody moves mouse)
        if (now - lastT > 1000) {
          lastT = now;
          const a = (idle++ * 137.508 * Math.PI) / 180;
          const spd = 0.8 + Math.random() * 1.5;
          splat(
            cW * (0.25 + Math.random() * 0.5),
            cH * (0.25 + Math.random() * 0.5),
            Math.cos(a) * spd, Math.sin(a) * spd,
            randColor()
          );
        }

        step();

        // Draw to screen
        gl.useProgram(disP);
        gl.viewport(0, 0, cW, cH);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive → glow
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, dye.read.tex);
        gl.uniform1i(u(disP,"uDye"), 0);
        gl.uniform2f(u(disP,"uRes")!, cW, cH);
        bindQ(disP); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disable(gl.BLEND);
      };

      animId = requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(animId);
        parent.removeEventListener("mousemove", onMove);
        parent.removeEventListener("mouseleave", onLeave);
        parent.removeEventListener("touchmove", onTouch);
      };
    };

    // Small delay to let layout paint first
    const t = setTimeout(init, 50);

    return () => {
      clearTimeout(t);
      if (cleanup) cleanup();
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      // pointer-events-none so clicks pass through; parent handles mouse events
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    />
  );
}
