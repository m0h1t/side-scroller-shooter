import { Particle, Splat } from "./types";

export function spawnGore(
  particles: Particle[],
  splats: Splat[],
  addShake: (mag: number, time: number) => void,
  x: number,
  y: number,
  count = 12
) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 120 + Math.random() * 180;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 50,
      life: 0.8 + Math.random() * 0.6,
      size: 2 + Math.random() * 3,
      color: "#b11414",
    });
  }
  // add some static splats
  for (let i = 0; i < 6; i++) {
    splats.push({
      x: x - 10 + Math.random() * 20,
      y: y - 6 + Math.random() * 12,
      w: 4 + Math.random() * 10,
      h: 2 + Math.random() * 6,
      alpha: 0.7,
    });
  }
  addShake(6, 0.2);
}

