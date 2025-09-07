import { Particle, Splat } from "./types";

export function spawnGore(
  particles: Particle[],
  splats: Splat[],
  addShake: (mag: number, time: number) => void,
  x: number,
  y: number,
  count = 16
) {
  // Enhanced gore with varied particle types
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 150 + Math.random() * 250;
    const isChunk = Math.random() < 0.3; // 30% chance for larger chunks
    const isMist = Math.random() < 0.2; // 20% chance for blood mist
    
    particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(a) * s * (isMist ? 0.5 : 1),
      vy: Math.sin(a) * s - 80,
      life: isMist ? 0.4 + Math.random() * 0.3 : 0.8 + Math.random() * 0.8,
      size: isChunk ? 4 + Math.random() * 4 : (isMist ? 6 + Math.random() * 4 : 2 + Math.random() * 3),
      color: isChunk ? "#880000" : (isMist ? "rgba(170, 0, 0, 0.4)" : "#cc1414"),
    });
  }
  
  // More varied blood splats
  for (let i = 0; i < 8; i++) {
    const splatSize = Math.random() < 0.3 ? 'large' : 'small';
    splats.push({
      x: x - 15 + Math.random() * 30,
      y: y - 10 + Math.random() * 20,
      w: splatSize === 'large' ? 8 + Math.random() * 16 : 4 + Math.random() * 8,
      h: splatSize === 'large' ? 4 + Math.random() * 8 : 2 + Math.random() * 4,
      alpha: 0.6 + Math.random() * 0.4,
    });
  }
  
  // Stronger screen shake for impact
  addShake(8, 0.25);
}

// New function for explosion effects
export function spawnExplosion(
  particles: Particle[],
  x: number,
  y: number,
  intensity = 1
) {
  // Fire and smoke particles
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

// Muzzle flash effect
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

