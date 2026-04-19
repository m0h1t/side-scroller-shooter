import { Particle, Splat, ScreenSplat } from "./types";

export function spawnGore(
  particles: Particle[],
  splats: Splat[],
  addShake: (mag: number, time: number) => void,
  x: number,
  y: number,
  count = 32
) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 150 + Math.random() * 250;
    const isChunk = Math.random() < 0.3;
    const isMist = Math.random() < 0.2;
    const isLimb = Math.random() < 0.15;

    particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(a) * s * (isMist ? 0.5 : 1),
      vy: Math.sin(a) * s - 80,
      life: isMist ? 0.4 + Math.random() * 0.3 : 0.8 + Math.random() * 0.8,
      size: isLimb ? 7 + Math.random() * 3 : isChunk ? 4 + Math.random() * 4 : (isMist ? 6 + Math.random() * 4 : 2 + Math.random() * 3),
      color: isLimb ? "#5a0000" : isChunk ? "#880000" : (isMist ? "rgba(170, 0, 0, 0.4)" : "#cc1414"),
    });
  }

  for (let i = 0; i < 14; i++) {
    const splatSize = Math.random() < 0.3 ? 'large' : 'small';
    splats.push({
      x: x - 25 + Math.random() * 50,
      y: y - 17 + Math.random() * 35,
      w: splatSize === 'large' ? 8 + Math.random() * 16 : 4 + Math.random() * 8,
      h: splatSize === 'large' ? 4 + Math.random() * 8 : 2 + Math.random() * 4,
      alpha: 0.6 + Math.random() * 0.4,
    });
  }

  addShake(8, 0.25);
}

export function spawnExplosion(
  particles: Particle[],
  x: number,
  y: number,
  intensity = 1
) {
  const particleCount = Math.floor(20 * intensity);

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 300 * intensity;
    const isSmoke = Math.random() < 0.4;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 100,
      life: isSmoke ? 0.8 + Math.random() * 0.4 : 0.4 + Math.random() * 0.3,
      size: isSmoke ? 8 + Math.random() * 8 : 3 + Math.random() * 5,
      color: isSmoke
        ? `rgba(60, 60, 60, ${0.4 + Math.random() * 0.3})`
        : Math.random() < 0.5
          ? "#ff6600"
          : "#ffaa00",
    });
  }
}

export function spawnMuzzleFlash(
  particles: Particle[],
  x: number,
  y: number,
  direction: 1 | -1
) {
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: x + direction * (5 + Math.random() * 10),
      y: y + (Math.random() - 0.5) * 6,
      vx: direction * (200 + Math.random() * 100),
      vy: (Math.random() - 0.5) * 100,
      life: 0.1 + Math.random() * 0.1,
      size: 2 + Math.random() * 3,
      color: Math.random() < 0.5 ? "#ffff00" : "#ff8800",
    });
  }
}

export function spawnWallHitDebris(
  particles: Particle[],
  x: number,
  y: number,
  hitDir: 1 | -1
) {
  for (let i = 0; i < 6; i++) {
    const isSpark = i < 2;
    const spread = (Math.random() - 0.5) * 0.6;
    const speed = 80 + Math.random() * 120;
    particles.push({
      x,
      y,
      vx: -hitDir * Math.cos(spread) * speed,
      vy: Math.sin(spread) * speed - 40,
      life: 0.2 + Math.random() * 0.2,
      size: isSpark ? 2 + Math.random() * 2 : 2 + Math.random() * 3,
      color: isSpark ? "#ffff00" : "#888888",
    });
  }
}

export function spawnScreenSplat(
  screenSplats: ScreenSplat[],
  vpW: number,
  vpH: number,
  count = 3
) {
  for (let i = 0; i < count; i++) {
    const edge = Math.random();
    let sx: number, sy: number;
    if (edge < 0.3) { sx = Math.random() * vpW; sy = Math.random() * vpH * 0.4; }
    else if (edge < 0.6) { sx = Math.random() * vpW * 0.2; sy = Math.random() * vpH; }
    else { sx = vpW - Math.random() * vpW * 0.2; sy = Math.random() * vpH; }

    screenSplats.push({
      x: sx,
      y: sy,
      radius: 20 + Math.random() * 40,
      alpha: 0.4 + Math.random() * 0.3,
      age: 0,
    });
  }
}
