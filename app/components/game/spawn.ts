import { Platform, Enemy } from "./types";
import { rand } from "./platforms";

export function spawnEnemy(x: number, platforms: Platform[], game: { difficulty: number }): Enemy | null {
  // find a suitable platform near x
  const candidates = platforms.filter((p) => p.y < 700 && Math.abs(p.x - x) < 300);
  if (candidates.length === 0) return null; // no suitable platform

  const p = candidates[Math.floor(Math.random() * candidates.length)];

  // Choose enemy type based on difficulty
  const typeRoll = Math.random();
  let type: Enemy["type"];
  if (game.difficulty < 2) {
    type = 'grunt';
  } else if (typeRoll < 0.5) {
    type = 'grunt';
  } else if (typeRoll < 0.7) {
    type = 'fast';
  } else if (typeRoll < 0.85) {
    type = 'heavy';
  } else {
    type = 'sniper';
  }

  let size: number, hp: number, speed: number, shootInterval: number;
  switch (type) {
    case 'grunt':
      size = 35 + game.difficulty;
      hp = Math.max(1, Math.floor(2 + game.difficulty * 0.5));
      speed = 30 + game.difficulty * 3;
      shootInterval = 2.2 - game.difficulty * 0.1;
      break;
    case 'fast':
      size = 28 + game.difficulty;
      hp = Math.max(1, Math.floor(1 + game.difficulty * 0.3));
      speed = 60 + game.difficulty * 6;
      shootInterval = 1.8 - game.difficulty * 0.05;
      break;
    case 'heavy':
      size = 45 + game.difficulty * 2;
      hp = Math.max(2, Math.floor(4 + game.difficulty * 0.8));
      speed = 20 + game.difficulty * 2;
      shootInterval = 3.0 - game.difficulty * 0.08;
      break;
    case 'sniper':
      size = 32 + game.difficulty;
      hp = Math.max(1, Math.floor(2 + game.difficulty * 0.4));
      speed = 15 + game.difficulty;
      shootInterval = 4.0 - game.difficulty * 0.15;
      break;
  }

  return {
    x: p.x + p.width * rand(0.2, 0.8),
    y: p.y - size,
    width: size,
    height: size,
    vx: (Math.random() < 0.5 ? -1 : 1) * speed,
    hp,
    maxHp: hp,
    active: true,
    shootTimer: rand(0, 1),
    shootInterval: Math.max(0.6, shootInterval),
    type,
    animTime: 0,
    dying: false,
    dyingTime: 0,
    flashTimer: 0,
  };
}

