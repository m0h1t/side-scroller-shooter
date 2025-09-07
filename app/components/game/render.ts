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
  // Clear background and draw parallax dystopia
  ctx.fillStyle = "#0c0f1a"; // darker, bleaker
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  drawParallax(ctx, game, viewport);

  ctx.save();
  ctx.translate(-game.camera.x, -game.camera.y);

  // Draw platforms as retro bricks
  for (const platform of platforms) {
    drawBrickPlatform(ctx, platform.x, platform.y, platform.width, platform.height);
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

  // Draw player with consistent segment layout and smooth crouch blend
  const healthPct = player.hp / 100;
  const bloodiness = 1 - healthPct;
  const primaryColor = bloodiness > 0.3 ? `#ff${Math.floor(200 * healthPct).toString(16).padStart(2, '0')}${Math.floor(200 * healthPct).toString(16).padStart(2, '0')}` : "#00d4ff";
  const secondaryColor = "#0099cc";

  const px = player.x + player.width / 2;
  const py = player.y;
  const h = player.height;
  const walkBob = player.isWalking ? Math.sin(player.animTime * 8) * 1.5 : 0;
  const jumpStretch = player.isJumping ? -2 : 0;
  const recoilN = player.shootAnim > 0 ? Math.min(1, player.shootAnim / 0.12) : 0;
  const shootRecoil = player.facing * (-2 - 2 * recoilN);

  // Segment sizes blend between stand and crouch
  const headH = Math.round(14 - 4 * player.crouchAnim);
  const bodyH = Math.round(20 - 8 * player.crouchAnim);
  const legsH = Math.max(8, h - (headH + bodyH));

  const headY = py + 0 + jumpStretch + walkBob * 0.66;
  const bodyY = headY + headH;
  const legsY = bodyY + bodyH;

  // Space suit palette
  const suit = "#b8c2d0";        // light suit
  const suitShadow = "#8f9bb0";   // suit shading
  const visor = "#e8b84e";        // gold visor
  const visorGlow = "#f6d47a";
  const trim = "#d14c4c";         // red stripes
  const boot = "#5d6b7f";         // boots/gloves

  // Helmet (rounded box feel)
  ctx.fillStyle = suit;
  ctx.fillRect(px - 9 + shootRecoil, headY, 18, headH);
  ctx.fillStyle = suitShadow;
  ctx.fillRect(px - 9 + shootRecoil, headY + headH - 2, 18, 2);
  // Visor
  const visorH = Math.max(6, headH - 6);
  ctx.fillStyle = visor;
  ctx.fillRect(px - 7 + shootRecoil, headY + 3, 14, Math.min(visorH, headH - 4));
  ctx.fillStyle = visorGlow;
  ctx.fillRect(px - 6 + shootRecoil, headY + 4, 4, 2);

  // Backpack (behind body)
  ctx.fillStyle = suitShadow;
  ctx.fillRect(px - 14, bodyY + 2, 6, Math.max(10, bodyH - 4));

  // Torso
  ctx.fillStyle = suit;
  ctx.fillRect(px - 10 + shootRecoil * 0.5, bodyY, 20, bodyH);
  // Chest stripe
  ctx.fillStyle = trim;
  ctx.fillRect(px - 10 + shootRecoil * 0.5, bodyY + Math.max(2, Math.floor(bodyH * 0.25)), 20, 2);

  // Shoulder pads
  ctx.fillStyle = suit;
  ctx.fillRect(px - 16 + shootRecoil, bodyY + 6, 6, 6);
  ctx.fillRect(px + 10 + shootRecoil, bodyY + 6, 6, 6);

  // Arms with gloves
  const armSwing = player.isWalking ? Math.sin(player.animTime * 8) * (2 - player.crouchAnim) : 0;
  const armRaise = player.isShooting ? (-6 + 2 * player.crouchAnim) : 0;
  ctx.fillStyle = suit;
  // Left arm
  ctx.fillRect(px - 14 + armSwing + shootRecoil, bodyY + 10 + armRaise, 7, 4);
  ctx.fillRect(px - 16 + armSwing + shootRecoil, bodyY + 14 + armRaise, 4, Math.max(6, bodyH - 10));
  ctx.fillStyle = boot; // glove
  ctx.fillRect(px - 16 + armSwing + shootRecoil, bodyY + Math.min(bodyY + bodyH, bodyY + 18 + armRaise), 4, 3);
  // Right arm
  ctx.fillStyle = suit;
  ctx.fillRect(px + 7 - armSwing + shootRecoil, bodyY + 10 + armRaise, 7, 4);
  ctx.fillRect(px + 12 - armSwing + shootRecoil, bodyY + 14 + armRaise, 4, Math.max(6, bodyH - 10));
  ctx.fillStyle = boot;
  ctx.fillRect(px + 12 - armSwing + shootRecoil, bodyY + Math.min(bodyY + bodyH, bodyY + 18 + armRaise), 4, 3);

  // Weapon block aligned to facing (kept below)

  // Legs with boots - align to collision box bottom
  const legSwing = player.isWalking ? Math.sin(player.animTime * 8 + Math.PI) * (3 - 1.5 * player.crouchAnim) : 0;
  const bootHeight = 6;
  const legLength = Math.max(4, legsH - bootHeight);
  
  // Calculate the actual bottom of the collision box for proper alignment
  const feetY = py + h - bootHeight;
  const legStartY = feetY - legLength;
  
  ctx.fillStyle = suit;
  // Left leg and boot
  ctx.fillRect(px - 7 + legSwing, legStartY, 5, legLength);
  ctx.fillStyle = boot;
  ctx.fillRect(px - 8 + legSwing, feetY, 7, bootHeight);
  // Right leg and boot
  ctx.fillStyle = suit;
  ctx.fillRect(px + 2 - legSwing, legStartY, 5, legLength);
  ctx.fillStyle = boot;
  ctx.fillRect(px + 1 - legSwing, feetY, 7, bootHeight);

  // Blood smear on torso if damaged (still visible on suit)
  if (bloodiness > 0.3) {
    ctx.fillStyle = `rgba(177, 20, 20, ${bloodiness})`;
    ctx.fillRect(px - 4 + shootRecoil, bodyY + Math.floor(bodyH / 2), 8, 4);
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
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#000";
  const spacing = 3;
  for (let y = 0; y < viewport.height; y += spacing) {
    ctx.fillRect(0, y, viewport.width, 1);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // HUD panel
  drawHUD(ctx, game, player, viewport);

  // Game over overlay
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

function drawParallax(ctx: CanvasRenderingContext2D, game: GameState, viewport: Viewport) {
  // Far layer: tall industrial silhouettes
  const f1 = 0.2;
  const base1 = Math.floor((game.camera.x * f1) / 180) * 180 - 180;
  ctx.save();
  ctx.fillStyle = "#0d1221";
  for (let x = base1; x < game.camera.x * f1 + viewport.width + 180; x += 180) {
    const sx = Math.floor(x - game.camera.x * f1);
    const h = 120 + ((x / 180) % 4) * 30;
    ctx.fillRect(sx + 40, viewport.height - h - 40, 28, h);
    ctx.fillRect(sx + 80, viewport.height - h - 20, 10, h - 40);
  }
  ctx.restore();

  // Mid layer: pipes and walkways
  const f2 = 0.5;
  const base2 = Math.floor((game.camera.x * f2) / 220) * 220 - 220;
  ctx.save();
  ctx.fillStyle = "#12182c";
  for (let x = base2; x < game.camera.x * f2 + viewport.width + 220; x += 220) {
    const sx = Math.floor(x - game.camera.x * f2);
    const y = viewport.height - 110 - ((x / 220) % 3) * 12;
    ctx.fillRect(sx, y, 140, 6);
    // pipes
    ctx.fillRect(sx + 30, y - 30, 6, 30);
    ctx.fillRect(sx + 100, y - 20, 6, 20);
    // dim warning light
    ctx.fillStyle = Math.random() < 0.02 ? "#5c0000" : "#2a0b0b";
    ctx.fillRect(sx + 120, y - 10, 3, 3);
    ctx.fillStyle = "#12182c";
  }
  ctx.restore();
}

function drawBrickPlatform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Base slab
  ctx.fillStyle = "#4a5568"; // slate
  ctx.fillRect(x, y, w, h);

  // Horizontal mortar lines
  ctx.fillStyle = "#3b4455";
  const rowH = 6;
  for (let yy = y; yy < y + h; yy += rowH) {
    ctx.fillRect(x, yy, w, 1);
  }

  // Vertical mortar lines (offset every row for brick pattern)
  ctx.fillStyle = "#394151";
  const brickW = 20;
  for (let row = 0, yy = y; yy < y + h; yy += rowH, row++) {
    const offset = (row % 2) * (brickW / 2);
    for (let xx = x + offset; xx < x + w; xx += brickW) {
      ctx.fillRect(Math.floor(xx), yy, 1, Math.min(rowH, y + h - yy));
    }
  }

  // Subtle top highlight and bottom shadow for depth
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(x, y, w, 1);
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(x, y + h - 1, w, 1);
}

function drawHUD(ctx: CanvasRenderingContext2D, game: GameState, player: Player, viewport: Viewport) {
  const panelX = 16;
  const panelY = 16;
  const panelW = 420;
  const panelH = 110; // Increased height to prevent text bleeding

  // Panel background
  ctx.save();
  ctx.fillStyle = "rgba(8,10,18,0.8)"; // More opaque for better readability
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "#222638";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);

  // Text baseline so labels stay inside the panel
  ctx.textBaseline = "top";

  // Label and bar with more padding from top
  const barX = panelX + 16;
  const labelY = panelY + 18; // More space from top edge
  ctx.fillStyle = "#cfd3e5";
  ctx.font = "bold 16px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, sans-serif"; // Smaller font to fit better
  ctx.fillText("HP", barX, labelY);

  const barY = labelY + 22; // Tighter spacing
  const barW = panelW - 32;
  const barH = 12; // Slightly smaller bar
  const pct = Math.max(0, Math.min(1, player.hp / 100));
  ctx.fillStyle = "#1c2438";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = pct > 0.3 ? "#cf2e2e" : "#a51818";
  ctx.fillRect(barX, barY, Math.floor(barW * pct), barH);
  // Bar border
  ctx.strokeStyle = "#394055";
  ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

  // Row 2 stats with better spacing
  ctx.fillStyle = "#cfd3e5";
  ctx.font = "bold 14px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, sans-serif"; // Consistent smaller font
  const row2Y = barY + 24; // Better spacing after the bar
  ctx.fillText(`Score: ${game.score}`, barX, row2Y);
  ctx.fillText(`Distance: ${Math.floor(game.distance)}m`, barX + 140, row2Y); // Adjusted spacing
  ctx.fillText(`Difficulty: ${game.difficulty.toFixed(1)}x`, barX + 280, row2Y); // Adjusted spacing

  // Controls hint with more space
  ctx.fillStyle = "#aab0c7";
  ctx.font = "11px system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, sans-serif"; // Smaller font for controls
  ctx.fillText("Move: A/D | Jump: W | Crouch: S | Shoot: Space", barX, row2Y + 26); // More space between rows

  ctx.restore();
}

