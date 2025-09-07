import type { Enemy, HealthPack, Particle, Platform, Projectile, Splat } from "./types";
import type { Player } from "./types";

export type Viewport = { width: number; height: number };
export type GameState = {
  camera: { x: number; y: number };
  world: { height: number };
  score: number;
  distance: number;
  gameOver: boolean;
  paused: boolean;
  shakeTime: number;
  shakeMag: number;
  difficulty: number;
  nextPlatformX: number;
  lastEnemySpawn: number;
};

export type RenderDeps = {
  ctx: CanvasRenderingContext2D;
  game: GameState;
  viewport: Viewport;
  platforms: Platform[];
  enemies: Enemy[];
  projectiles: Projectile[];
  healthPacks: HealthPack[];
  particles: Particle[];
  splats: Splat[];
  player: Player;
};

export function renderGame({ ctx, game, viewport, platforms, enemies, projectiles, healthPacks, particles, splats, player }: RenderDeps) {
  // Clear
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.save();
  ctx.translate(-game.camera.x, -game.camera.y);

  // Draw platforms
  ctx.fillStyle = "#4a5568";
  for (const platform of platforms) {
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
  }

  // Blood splats on top of platforms
  for (const s of splats) {
    ctx.fillStyle = `rgba(177, 20, 20, ${s.alpha})`;
    ctx.fillRect(s.x, s.y, s.w, s.h);
  }

  // Draw enemies (different appearances per type)
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || !enemy.active) continue;

    const healthPct = enemy.hp / enemy.maxHp;
    const r = Math.floor(255 * (1 - healthPct * 0.3));
    const g = Math.floor(100 * healthPct);
    const b = Math.floor(100 * healthPct);

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

    const bob = Math.sin(enemy.animTime * 4) * 2;
    ctx.fillRect(enemy.x, enemy.y + bob, enemy.width, enemy.height);

    ctx.fillStyle = "#000";
    switch (enemy.type) {
      case 'heavy':
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.strokeRect(enemy.x, enemy.y + bob, enemy.width, enemy.height);
        ctx.fillRect(enemy.x + enemy.width * 0.3, enemy.y + bob + 8, 6, 6);
        ctx.fillRect(enemy.x + enemy.width * 0.7, enemy.y + bob + 8, 6, 6);
        break;
      case 'fast':
        ctx.fillStyle = "rgba(255, 107, 74, 0.5)";
        for (let i = 1; i <= 3; i++) {
          ctx.fillRect(enemy.x - i * 8, enemy.y + bob + enemy.height * 0.3, 4, enemy.height * 0.4);
        }
        ctx.fillStyle = "#000";
        ctx.fillRect(enemy.x + enemy.width * 0.6, enemy.y + bob + 6, 4, 4);
        break;
      case 'sniper':
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.width, enemy.y + bob + enemy.height * 0.4);
        ctx.lineTo(enemy.x + enemy.width + 20, enemy.y + bob + enemy.height * 0.4);
        ctx.stroke();
        ctx.fillRect(enemy.x + enemy.width * 0.5, enemy.y + bob + 8, 8, 2);
        ctx.fillRect(enemy.x + enemy.width * 0.54, enemy.y + bob + 4, 2, 8);
        break;
      default:
        ctx.fillRect(enemy.x + enemy.width * 0.6, enemy.y + bob + 8, 6, 6);
    }
  }

  // Draw player
  const healthPct = player.hp / 100;
  const bloodiness = 1 - healthPct;
  const primaryColor = bloodiness > 0.3 ? `#ff${Math.floor(200 * healthPct).toString(16).padStart(2, '0')}${Math.floor(200 * healthPct).toString(16).padStart(2, '0')}` : "#00d4ff";
  const secondaryColor = "#0099cc";

  const px = player.x + player.width / 2;
  const py = player.y;
  const walkBob = player.isWalking ? Math.sin(player.animTime * 8) * 1.5 : 0;
  const jumpStretch = player.isJumping ? -2 : 0;
  const shootRecoil = player.isShooting ? player.facing * -1.5 : 0;
  const headY = py + 2;
  const bodyStartY = py + 18;

  ctx.fillStyle = primaryColor;
  ctx.fillRect(px - 8 + shootRecoil, headY + walkBob + jumpStretch, 16, 14);

  ctx.fillStyle = secondaryColor;
  ctx.fillRect(px - 6 + shootRecoil, headY + 2 + walkBob + jumpStretch, 12, 2);

  ctx.fillStyle = player.isShooting ? "#ff4444" : "#44ff44";
  ctx.fillRect(px - 5 + shootRecoil, headY + 5 + walkBob + jumpStretch, 3, 2);
  ctx.fillRect(px + 2 + shootRecoil, headY + 5 + walkBob + jumpStretch, 3, 2);

  if (bloodiness > 0.5) {
    ctx.fillStyle = "#b11414";
    ctx.fillRect(px - 3 + shootRecoil, headY + 3 + walkBob, 2, 2);
    ctx.fillRect(px + 2 + shootRecoil, headY + 8 + walkBob, 3, 1);
  }

  if (player.isCrouching) {
    const crouchBodyY = bodyStartY + 8;
    const crouchBodyHeight = 12;

    ctx.fillStyle = primaryColor;
    ctx.fillRect(px - 10 + shootRecoil * 0.5, crouchBodyY + walkBob, 20, crouchBodyHeight);

    ctx.fillStyle = secondaryColor;
    ctx.fillRect(px - 8 + shootRecoil * 0.5, crouchBodyY + 2 + walkBob, 16, 2);

    ctx.fillStyle = primaryColor;
    const armRaise = player.isShooting ? -4 : 0;
    ctx.fillRect(px - 14 + shootRecoil, crouchBodyY + 6 + armRaise + walkBob, 6, 3);
    ctx.fillRect(px - 16 + shootRecoil, crouchBodyY + 9 + armRaise + walkBob, 3, 8);
    ctx.fillRect(px + 8 + shootRecoil, crouchBodyY + 6 + armRaise + walkBob, 6, 3);
    ctx.fillRect(px + 13 + shootRecoil, crouchBodyY + 9 + armRaise + walkBob, 3, 8);

    if (player.isShooting) {
      ctx.fillStyle = "#666";
      ctx.fillRect(px + 16 + shootRecoil, crouchBodyY + 7 + armRaise + walkBob, 6, 2);
    }

    ctx.fillStyle = primaryColor;
    ctx.fillRect(px - 8, crouchBodyY + crouchBodyHeight, 5, 8);
    ctx.fillRect(px + 3, crouchBodyY + crouchBodyHeight, 5, 8);
    ctx.fillRect(px - 10, crouchBodyY + crouchBodyHeight + 4, 4, 12);
    ctx.fillRect(px + 6, crouchBodyY + crouchBodyHeight + 4, 4, 12);
    ctx.fillRect(px - 12, crouchBodyY + crouchBodyHeight + 14, 6, 3);
    ctx.fillRect(px + 6, crouchBodyY + crouchBodyHeight + 14, 6, 3);
  } else {
    const standBodyHeight = 20;

    ctx.fillStyle = primaryColor;
    ctx.fillRect(px - 10 + shootRecoil * 0.5, bodyStartY + walkBob, 20, standBodyHeight);

    ctx.fillStyle = secondaryColor;
    ctx.fillRect(px - 8 + shootRecoil * 0.5, bodyStartY + 3 + walkBob, 16, 3);

    const armSwing = player.isWalking ? Math.sin(player.animTime * 8) * 2 : 0;
    const armRaise = player.isShooting ? -6 : 0;

    ctx.fillStyle = primaryColor;
    ctx.fillRect(px - 16 + armSwing + shootRecoil, bodyStartY + 8 + armRaise + walkBob, 7, 4);
    ctx.fillRect(px - 18 + armSwing + shootRecoil, bodyStartY + 12 + armRaise + walkBob, 4, 10);
    ctx.fillRect(px + 9 - armSwing + shootRecoil, bodyStartY + 8 + armRaise + walkBob, 7, 4);
    ctx.fillRect(px + 14 - armSwing + shootRecoil, bodyStartY + 12 + armRaise + walkBob, 4, 10);

    const legSwing = player.isWalking ? Math.sin(player.animTime * 8 + Math.PI) * 3 : 0;
    const legsY = bodyStartY + standBodyHeight;
    const legHeight = player.height - (legsY - py);

    ctx.fillStyle = primaryColor;
    ctx.fillRect(px - 7 + legSwing, legsY + walkBob, 5, legHeight - 4);
    ctx.fillRect(px - 8 + legSwing, py + player.height - 4, 7, 4);
    ctx.fillRect(px + 2 - legSwing, legsY + walkBob, 5, legHeight - 4);
    ctx.fillRect(px + 1 - legSwing, py + player.height - 4, 7, 4);
  }

  if (bloodiness > 0.3) {
    ctx.fillStyle = `rgba(177, 20, 20, ${bloodiness})`;
    ctx.fillRect(px - 4 + shootRecoil, bodyStartY + 8 + walkBob, 8, 4);
  }

  // Gore particles
  for (const p of particles) {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
  }

  // Health packs
  for (const hp of healthPacks) {
    if (hp.collected) continue;
    const pulse = 0.8 + Math.sin(hp.animTime * 6) * 0.2;
    const size = hp.width * pulse;
    const x = hp.x + (hp.width - size) / 2;
    const y = hp.y + (hp.height - size) / 2;

    ctx.fillStyle = "#22c55e";
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = "#fff";
    const crossSize = size * 0.6;
    const crossX = x + (size - crossSize) / 2;
    const crossY = y + (size - crossSize) / 2;
    ctx.fillRect(crossX, crossY + crossSize * 0.35, crossSize, crossSize * 0.3);
    ctx.fillRect(crossX + crossSize * 0.35, crossY, crossSize * 0.3, crossSize);

    ctx.shadowColor = "#22c55e";
    ctx.shadowBlur = 8;
    ctx.fillRect(x, y, size, size);
    ctx.shadowBlur = 0;
  }

  // Projectiles
  for (const proj of projectiles) {
    ctx.fillStyle = proj.fromPlayer ? "#10b981" : "#f59e0b";
    ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
  }

  ctx.restore();

  // Post effects: scanlines + subtle vignette
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#000";
  const spacing = 3;
  for (let y = 0; y < viewport.height; y += spacing) {
    ctx.fillRect(0, y, viewport.width, 1);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // HUD
  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.fillText(`HP: ${player.hp}`, 20, 30);
  ctx.fillText(`Score: ${game.score}`, 20, 50);
  ctx.fillText(`Distance: ${Math.floor(game.distance)}m`, 20, 70);
  ctx.fillText(`Difficulty: ${game.difficulty.toFixed(1)}x`, 20, 90);
  ctx.fillText("Move: A/D | Jump: W | Crouch: S | Shoot: Space", 20, 110);

  if (game.gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    ctx.fillStyle = "#ef4444";
    ctx.font = "48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", viewport.width / 2, viewport.height / 2);
    ctx.font = "24px sans-serif";
    ctx.fillText("Press R to restart", viewport.width / 2, viewport.height / 2 + 40);
    ctx.textAlign = "left";
  }
}

