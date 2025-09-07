import { Platform } from "./types";

export function rand(min = 0, max = 1) {
  return Math.random() * (max - min) + min;
}

export function generateInitialPlatforms(): Platform[] {
  const list: Platform[] = [];
  const segmentW = 280;
  // start with a few platforms
  for (let x = 0; x < 1400; x += segmentW) {
    const y = 520 + rand(-40, 40);
    list.push({ x, y, width: 240, height: 24 });
    if (x > 0 && Math.random() < 0.3) {
      list.push({ x: x + rand(-60, 60), y: y - rand(80, 140), width: 160, height: 18 });
    }
  }
  // safety ground strip
  list.push({ x: 0, y: 740, width: 2000, height: 40 });
  return list;
}

export function addPlatformChunk(startX: number, platforms: Platform[], game: { difficulty: number; nextPlatformX: number }) {
  const chunkW = 300;
  const gapChance = Math.min(0.2, game.difficulty * 0.02); // more gaps as difficulty rises
  const upperChance = Math.min(0.5, 0.2 + game.difficulty * 0.03);

  for (let x = startX; x < startX + 1200; x += chunkW) {
    if (Math.random() < gapChance && x > startX) continue; // skip for gap
    const y = 480 + rand(-60, 80) + Math.sin(x * 0.003) * 30; // some wave variation
    platforms.push({ x, y: Math.max(400, Math.min(640, y)), width: 220 + rand(-20, 40), height: 24 });

    if (Math.random() < upperChance) {
      platforms.push({ x: x + rand(-80, 80), y: y - rand(100, 180), width: 140 + rand(-20, 60), height: 18 });
    }
  }

  // extend safety ground
  const lastGround = platforms.find((p) => p.y > 700);
  if (lastGround && lastGround.x + lastGround.width < startX + 1200) {
    lastGround.width = startX + 1200 - lastGround.x + 200;
  }

  game.nextPlatformX = startX + 1200;
}

