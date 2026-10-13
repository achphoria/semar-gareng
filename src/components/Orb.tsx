import { useEffect, useRef } from 'react';

export type OrbState = 'idle' | 'listen' | 'think' | 'speak' | 'success';

const STATES: Record<OrbState, { color: number[]; speed: number; scale: number; amp: number }> = {
  idle:    { color: [79, 227, 255], speed: 0.25, scale: 1.00, amp: 0.05 },
  listen:  { color: [79, 227, 255], speed: 0.55, scale: 1.08, amp: 0.55 },
  think:   { color: [247, 183, 51], speed: 2.20, scale: 0.94, amp: 0.10 },
  speak:   { color: [79, 227, 255], speed: 0.70, scale: 1.04, amp: 0.80 },
  success: { color: [61, 220, 151], speed: 0.50, scale: 1.12, amp: 0.30 },
};

// kebisingan halus (gabungan sinus) supaya gerak terasa organik
const noise = (x: number, t: number) => Math.sin(x * 1.7 + t * 2.1) * .5 + Math.sin(x * 3.3 - t * 3.7) * .3 + Math.sin(x * 7.1 + t * 5.3) * .2;
const rgba = (c: number[], a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/** Wajah Gareng sementara: orb animasi ala Jarvis. Ganti `state` untuk berganti ekspresi. */
export default function Orb({ state, className }: { state: OrbState; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const flashRef = useRef(0);

  useEffect(() => {
    if (state === 'success' && stateRef.current !== 'success') flashRef.current = 1;
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext('2d')!;
    let W = 0, H = 0, raf = 0, rot = 0, level = 0;
    const cur = { color: [...STATES.idle.color], speed: .25, scale: 1, amp: .05 };
    const particles = Array.from({ length: 60 }, () => ({ a: Math.random() * 6.283, r: .62 + Math.random() * .5, s: .1 + Math.random() * .4, z: Math.random() }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();

    const targetLevel = (t: number) => {
      const s = stateRef.current;
      if (s === 'speak') return Math.abs(Math.sin(t * 9)) * (.55 + .45 * Math.sin(t * 2.3));
      if (s === 'listen') return .35 + .35 * Math.abs(noise(1, t * 1.5));
      return .15 + .1 * Math.sin(t * 1.2);
    };

    const frame = (ms: number) => {
      const t = ms / 1000, tg = STATES[stateRef.current];
      for (let i = 0; i < 3; i++) cur.color[i] += (tg.color[i] - cur.color[i]) * .06;
      cur.speed += (tg.speed - cur.speed) * .05;
      cur.scale += (tg.scale - cur.scale) * .06;
      cur.amp += (tg.amp - cur.amp) * .08;
      level += (targetLevel(t) - level) * .25;
      flashRef.current *= .96;
      rot += cur.speed * .016;

      const c = cur.color, cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * .46 * cur.scale, a = cur.amp * level;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.1);
      g.addColorStop(0, rgba(c, .22 + a * .15)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, 6.283); ctx.fill();

      const core = R * (.2 + a * .07);
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, core * 1.8);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.35, rgba(c, .85)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, core * 1.8, 0, 6.283); ctx.fill();

      const big = R > 90;
      ctx.shadowColor = rgba(c, .9); ctx.shadowBlur = big ? 18 : 8; ctx.lineCap = 'round';

      const bars = big ? 96 : 48;
      for (let i = 0; i < bars; i++) {
        const ang = i / bars * 6.283 + rot * .3;
        const len = R * (.03 + a * .16 * (.5 + .5 * noise(i * .35, t * 2)));
        const r0 = R * .34;
        ctx.strokeStyle = rgba(c, .35 + a * .5); ctx.lineWidth = big ? 2 : 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
        ctx.lineTo(cx + Math.cos(ang) * (r0 + len), cy + Math.sin(ang) * (r0 + len));
        ctx.stroke();
      }

      ctx.strokeStyle = rgba(c, .9); ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 180; i++) {
        const ang = i / 180 * 6.283;
        const r = R * (.55 + a * .05 * noise(ang * 3, t * 3));
        const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();

      ctx.lineWidth = big ? 4 : 2.5; ctx.strokeStyle = rgba(c, .8);
      for (let k = 0; k < 3; k++) {
        const s = rot + k * 2.094;
        ctx.beginPath(); ctx.arc(cx, cy, R * .66, s, s + 1.25); ctx.stroke();
      }
      ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(c, .5);
      for (let k = 0; k < 2; k++) {
        const s = -rot * 1.6 + k * 3.1416;
        ctx.beginPath(); ctx.arc(cx, cy, R * .72, s, s + .5); ctx.stroke();
      }

      ctx.shadowBlur = 0;
      const ticks = big ? 120 : 60;
      for (let i = 0; i < ticks; i++) {
        const ang = i / ticks * 6.283 - rot * .4, major = i % 10 === 0;
        const r1 = R * .8, r2 = R * (major ? .86 : .83);
        ctx.strokeStyle = rgba(c, major ? .75 : .28); ctx.lineWidth = major ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
        ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
        ctx.stroke();
      }

      ctx.strokeStyle = rgba(c, .25); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R * .95, 0, 6.283); ctx.stroke();
      ctx.shadowBlur = 14; ctx.strokeStyle = rgba(c, .95); ctx.lineWidth = 3;
      const fast = rot * 2.5;
      ctx.beginPath(); ctx.arc(cx, cy, R * .95, fast, fast + .18); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * .95, fast + 3.14, fast + 3.32); ctx.stroke();

      if (big) {
        ctx.shadowBlur = 8;
        for (const p of particles) {
          p.a += p.s * cur.speed * .02;
          const r = R * p.r * (1 + a * .08 * Math.sin(t * 3 + p.z * 9));
          ctx.fillStyle = rgba(c, .25 + p.z * .6);
          ctx.beginPath(); ctx.arc(cx + Math.cos(p.a) * r, cy + Math.sin(p.a) * r * .98, .8 + p.z * 1.6, 0, 6.283); ctx.fill();
        }
      }

      if (flashRef.current > .02) {
        ctx.strokeStyle = rgba(c, flashRef.current); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, R * (1.05 - flashRef.current * .5), 0, 6.283); ctx.stroke();
      }
      ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
