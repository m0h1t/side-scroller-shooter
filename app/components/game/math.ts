export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const smoothstep = (t: number) => t * t * (3 - 2 * t);

export function smoothNoise1D(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const h = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  return lerp(h(i) * 2 - 1, h(i + 1) * 2 - 1, smoothstep(f));
}

