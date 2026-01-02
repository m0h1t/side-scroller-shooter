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

// Enhanced color palette for Doom atmosphere
const DOOM_COLORS = {
  // Dark hellish environment (slightly brighter for visibility)
  SKY_TOP: '#0a0508',
  SKY_MID: '#2a1515',
  SKY_BOTTOM: '#4a2020',
  FOG: 'rgba(80, 20, 20, 0.08)',
  LAVA_GLOW: '#ff4400',
  
  // Industrial/Hell platforms (more visible)
  PLATFORM_BASE: '#2a2028',
  PLATFORM_MID: '#3a3035',
  PLATFORM_LIGHT: '#4a3a40',
  PLATFORM_RUST: '#7a4030',
  METAL_SHINE: '#5a5560',
  
  // Doom Guy colors
  ARMOR_GREEN: '#2a4a2a',
  ARMOR_DARK: '#1a2a1a',
  ARMOR_LIGHT: '#4a6a4a',
  ARMOR_HIGHLIGHT: '#5a8a5a',
  HELMET_VISOR: '#00ff00',
  SKIN: '#d4a090',
  WEAPON_METAL: '#4a4a5a',
  WEAPON_BARREL: '#2a2a3a',
  
  // Effects
  MUZZLE_FLASH: ['#ffff00', '#ff8800', '#ffffff'],
  BLOOD_FRESH: '#cc0000',
  BLOOD_DARK: '#660000',
  ENERGY_BLUE: '#0088ff',
  ENERGY_GREEN: '#00ff88',
  TOXIC: '#88ff00',
};

// Add environmental particles array
let envParticles: {x: number, y: number, vx: number, vy: number, size: number, type: 'ember' | 'ash', life: number}[] = [];

// Initialize environmental particles
function initEnvParticles(viewport: Viewport) {
  if (envParticles.length < 30) {
    for (let i = envParticles.length; i < 30; i++) {
      envParticles.push({
        x: Math.random() * viewport.width,
        y: Math.random() * viewport.height,
        vx: -20 - Math.random() * 30,
        vy: -10 + Math.random() * 20,
        size: Math.random() < 0.7 ? 1 : 2,
        type: Math.random() < 0.8 ? 'ember' : 'ash',
        life: 1
      });
    }
  }
}

// Update environmental particles
function updateEnvParticles(dt: number, viewport: Viewport, cameraX: number) {
  envParticles = envParticles.filter(p => {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt * 0.3;
    
    // Wrap around for continuous effect
    if (p.x < cameraX - 100) p.x = cameraX + viewport.width + Math.random() * 100;
    if (p.y < -10) p.y = viewport.height + 10;
    if (p.y > viewport.height + 10) p.y = -10;
    
    return p.life > 0;
  });
  
  // Spawn new particles
  while (envParticles.length < 30) {
    envParticles.push({
      x: cameraX + viewport.width + Math.random() * 100,
      y: Math.random() * viewport.height,
      vx: -20 - Math.random() * 30,
      vy: -10 + Math.random() * 20,
      size: Math.random() < 0.7 ? 1 : 2,
      type: Math.random() < 0.8 ? 'ember' : 'ash',
      life: 1
    });
  }
}

export function renderGame({ ctx, game, viewport, platforms, enemies, projectiles, healthPacks, particles, splats, player }: RenderDeps) {
  // Initialize and update environmental effects
  initEnvParticles(viewport);
  updateEnvParticles(0.016, viewport, game.camera.x); // Assume 60fps for now
  
  // Draw hellish gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, viewport.height);
  gradient.addColorStop(0, DOOM_COLORS.SKY_TOP);
  gradient.addColorStop(0.5, DOOM_COLORS.SKY_MID);
  gradient.addColorStop(1, DOOM_COLORS.SKY_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  
  // Draw distant hellscape
  drawHellBackground(ctx, game, viewport);
  
  // Environmental particles (behind everything)
  ctx.save();
  for (const p of envParticles) {
    const screenX = p.x - game.camera.x;
    if (screenX < -10 || screenX > viewport.width + 10) continue;
    
    ctx.globalAlpha = p.life * 0.6;
    if (p.type === 'ember') {
      ctx.fillStyle = p.size > 1 ? DOOM_COLORS.LAVA_GLOW : '#ff6600';
      ctx.shadowColor = DOOM_COLORS.LAVA_GLOW;
      ctx.shadowBlur = p.size * 2;
    } else {
      ctx.fillStyle = '#3a3a3a';
    }
    ctx.fillRect(screenX, p.y, p.size, p.size);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.save();
  ctx.translate(-game.camera.x, -game.camera.y);

  // Draw detailed industrial platforms
  for (const platform of platforms) {
    drawIndustrialPlatform(ctx, platform);
  }

  // Blood splats with drip effect
  for (const s of splats) {
    const gradient = ctx.createLinearGradient(s.x, s.y, s.x, s.y + s.h);
    gradient.addColorStop(0, `rgba(140, 0, 0, ${s.alpha})`);
    gradient.addColorStop(1, `rgba(80, 0, 0, ${s.alpha * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    
    // Blood drips
    if (s.alpha > 0.5) {
      ctx.fillStyle = `rgba(100, 0, 0, ${s.alpha * 0.8})`;
      const dripCount = Math.floor(s.w / 8);
      for (let i = 0; i < dripCount; i++) {
        const dx = s.x + i * 8 + Math.random() * 4;
        const dh = 4 + Math.random() * 8;
        ctx.fillRect(dx, s.y + s.h, 2, dh);
      }
    }
  }

  // Draw enemies with demonic appearance
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || !enemy.active) continue;
    drawDemonicEnemy(ctx, enemy);
  }

  // Draw subtle green aura around player (matching visor glow)
  ctx.save();
  // Add subtle pulse effect based on animation time
  const pulse = 1 + Math.sin(player.animTime * 3) * 0.15;
  const auraRadius = 120 * pulse;
  
  const playerGradient = ctx.createRadialGradient(
    player.x + player.width/2, 
    player.y + player.height/2,
    0,
    player.x + player.width/2,
    player.y + player.height/2,
    auraRadius
  );
  // Green glow matching the visor with pulse intensity
  const intensity = 0.12 * pulse;
  playerGradient.addColorStop(0, `rgba(0, 255, 100, ${intensity})`);
  playerGradient.addColorStop(0.3, `rgba(0, 255, 50, ${intensity * 0.67})`);
  playerGradient.addColorStop(0.6, `rgba(0, 200, 0, ${intensity * 0.33})`);
  playerGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = playerGradient;
  ctx.fillRect(player.x - auraRadius, player.y - auraRadius, player.width + auraRadius * 2, player.height + auraRadius * 2);
  ctx.restore();
  
  // Draw Doom Guy player
  drawDoomGuy(ctx, player);

  // Enhanced gore particles
  for (const p of particles) {
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    gradient.addColorStop(0, p.color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(Math.floor(p.x - p.size/2), Math.floor(p.y - p.size/2), p.size * 2, p.size * 2);
  }

  // Glowing health packs
  for (const hp of healthPacks) {
    if (hp.collected) continue;
    drawHealthPack(ctx, hp);
  }

  // Enhanced projectiles with trails
  for (const proj of projectiles) {
    drawProjectile(ctx, proj);
  }

  ctx.restore();

  // Post-processing effects
  drawPostEffects(ctx, viewport, game);

  // Enhanced HUD
  drawDoomHUD(ctx, game, player, viewport);

  // Game over screen
  if (game.gameOver) {
    drawGameOver(ctx, viewport);
  }
}

function drawHellBackground(ctx: CanvasRenderingContext2D, game: GameState, viewport: Viewport) {
  // Distant mountains/structures
  const f1 = 0.1;
  const base1 = Math.floor((game.camera.x * f1) / 300) * 300 - 300;
  ctx.save();
  
  for (let x = base1; x < game.camera.x * f1 + viewport.width + 300; x += 300) {
    const sx = Math.floor(x - game.camera.x * f1);
    const h = 200 + ((x / 300) % 5) * 40;
    
    // Mountain/structure silhouette
    ctx.fillStyle = '#1a1018';
    ctx.beginPath();
    ctx.moveTo(sx - 50, viewport.height);
    ctx.lineTo(sx + 50, viewport.height - h);
    ctx.lineTo(sx + 150, viewport.height - h * 0.7);
    ctx.lineTo(sx + 250, viewport.height);
    ctx.fill();
  }
  
  // Mid-ground industrial ruins
  const f2 = 0.3;
  const base2 = Math.floor((game.camera.x * f2) / 200) * 200 - 200;
  
  for (let x = base2; x < game.camera.x * f2 + viewport.width + 200; x += 200) {
    const sx = Math.floor(x - game.camera.x * f2);
    const h = 120 + ((x / 200) % 3) * 30;
    
    // Ruined buildings
    ctx.fillStyle = '#25202a';
    ctx.fillRect(sx + 30, viewport.height - h - 80, 40, h);
    ctx.fillRect(sx + 80, viewport.height - h * 0.7 - 80, 25, h * 0.7);
    
    // Broken windows (dark red glow)
    ctx.fillStyle = '#5a1818';
    for (let y = 0; y < h - 20; y += 20) {
      if (Math.random() > 0.3) {
        ctx.fillRect(sx + 35, viewport.height - h - 80 + y + 10, 8, 8);
        ctx.fillRect(sx + 47, viewport.height - h - 80 + y + 10, 8, 8);
      }
    }
  }
  
  ctx.restore();
}

function drawIndustrialPlatform(ctx: CanvasRenderingContext2D, platform: Platform) {
  const { x, y, width: w, height: h } = platform;
  
  // Main platform body with gradient
  const gradient = ctx.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, DOOM_COLORS.PLATFORM_LIGHT);
  gradient.addColorStop(0.5, DOOM_COLORS.PLATFORM_MID);
  gradient.addColorStop(1, DOOM_COLORS.PLATFORM_BASE);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
  
  // Metal plating details
  ctx.fillStyle = DOOM_COLORS.PLATFORM_BASE;
  const plateWidth = 40;
  for (let px = x; px < x + w; px += plateWidth) {
    ctx.fillRect(px, y, 1, h);
    // Rivets
    ctx.fillStyle = DOOM_COLORS.METAL_SHINE;
    ctx.fillRect(px + 5, y + 3, 2, 2);
    ctx.fillRect(px + 5, y + h - 5, 2, 2);
    ctx.fillStyle = DOOM_COLORS.PLATFORM_BASE;
  }
  
  // Top edge highlight
  ctx.fillStyle = DOOM_COLORS.METAL_SHINE;
  ctx.fillRect(x, y, w, 2);
  
  // Bottom shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x, y + h - 2, w, 2);
  
  // Rust/damage patches
  ctx.fillStyle = DOOM_COLORS.PLATFORM_RUST;
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 3; i++) {
    const rx = x + Math.random() * (w - 20);
    const ry = y + Math.random() * (h - 10);
    const rw = 10 + Math.random() * 15;
    const rh = 5 + Math.random() * 8;
    ctx.fillRect(rx, ry, rw, rh);
  }
  ctx.globalAlpha = 1;
  
  // Warning stripes on edges
  ctx.fillStyle = '#ffaa00';
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + i * 4, y, 2, h);
    ctx.fillRect(x + w - 12 + i * 4, y, 2, h);
  }
  ctx.globalAlpha = 1;
}

function drawDemonicEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  const bob = Math.sin(enemy.animTime * 4) * 3;
  const pulse = 1 + Math.sin(enemy.animTime * 8) * 0.1;
  
  ctx.save();
  
  // Enemy glow/aura
  ctx.shadowColor = enemy.type === 'heavy' ? '#ff0000' : 
                    enemy.type === 'sniper' ? '#00ff00' :
                    enemy.type === 'fast' ? '#ff8800' : '#aa0000';
  ctx.shadowBlur = 10;
  
  // Main body
  const healthPct = enemy.hp / enemy.maxHp;
  
  switch(enemy.type) {
    case 'heavy':
      // Cyberdemon-inspired heavy
      ctx.fillStyle = '#4a2020';
      ctx.fillRect(enemy.x - 4, enemy.y + bob, enemy.width + 8, enemy.height);
      
      // Armor plates
      ctx.fillStyle = '#6a3030';
      ctx.fillRect(enemy.x, enemy.y + bob + 4, enemy.width, 8);
      ctx.fillRect(enemy.x, enemy.y + bob + enemy.height - 12, enemy.width, 8);
      
      // Glowing eyes
      ctx.fillStyle = '#ff0000';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 5;
      ctx.fillRect(enemy.x + enemy.width * 0.2, enemy.y + bob + 12, 6, 4);
      ctx.fillRect(enemy.x + enemy.width * 0.7, enemy.y + bob + 12, 6, 4);
      
      // Horns
      ctx.fillStyle = '#8a4040';
      ctx.beginPath();
      ctx.moveTo(enemy.x - 2, enemy.y + bob);
      ctx.lineTo(enemy.x - 6, enemy.y + bob - 8);
      ctx.lineTo(enemy.x + 2, enemy.y + bob + 4);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(enemy.x + enemy.width + 2, enemy.y + bob);
      ctx.lineTo(enemy.x + enemy.width + 6, enemy.y + bob - 8);
      ctx.lineTo(enemy.x + enemy.width - 2, enemy.y + bob + 4);
      ctx.fill();
      break;
      
    case 'fast':
      // Imp-like fast enemy
      ctx.fillStyle = '#6a2a2a';
      ctx.fillRect(enemy.x, enemy.y + bob, enemy.width, enemy.height);
      
      // Spikes on back
      ctx.fillStyle = '#8a3a3a';
      for (let i = 0; i < 3; i++) {
        const sx = enemy.x + i * (enemy.width / 3) + 4;
        ctx.beginPath();
        ctx.moveTo(sx, enemy.y + bob + enemy.height * 0.3);
        ctx.lineTo(sx - 4, enemy.y + bob + enemy.height * 0.1);
        ctx.lineTo(sx + 4, enemy.y + bob + enemy.height * 0.1);
        ctx.fill();
      }
      
      // Glowing mouth
      ctx.fillStyle = '#ff6600';
      ctx.fillRect(enemy.x + enemy.width * 0.3, enemy.y + bob + enemy.height * 0.4, enemy.width * 0.4, 3);
      
      // Motion blur
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ff6600';
      for (let i = 1; i <= 3; i++) {
        ctx.fillRect(enemy.x - i * 6, enemy.y + bob, 4, enemy.height);
      }
      ctx.globalAlpha = 1;
      break;
      
    case 'sniper':
      // Revenant-inspired sniper
      ctx.fillStyle = '#3a3a4a';
      ctx.fillRect(enemy.x, enemy.y + bob, enemy.width, enemy.height);
      
      // Skeletal details
      ctx.fillStyle = '#5a5a6a';
      ctx.fillRect(enemy.x + enemy.width * 0.2, enemy.y + bob + 8, 4, enemy.height - 16);
      ctx.fillRect(enemy.x + enemy.width * 0.7, enemy.y + bob + 8, 4, enemy.height - 16);
      
      // Glowing eye (sniper scope)
      ctx.fillStyle = '#00ff00';
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 8;
      ctx.fillRect(enemy.x + enemy.width * 0.45, enemy.y + bob + 10, 8, 8);
      
      // Rifle
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(enemy.x + enemy.width, enemy.y + bob + enemy.height * 0.3, 25, 4);
      // Scope
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(enemy.x + enemy.width + 8, enemy.y + bob + enemy.height * 0.3 - 3, 4, 10);
      break;
      
    default:
      // Basic possessed soldier
      ctx.fillStyle = '#4a3a3a';
      ctx.fillRect(enemy.x, enemy.y + bob, enemy.width, enemy.height);
      
      // Torn uniform details
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(enemy.x, enemy.y + bob + enemy.height * 0.3, enemy.width, 6);
      
      // Glowing eyes
      ctx.fillStyle = '#ff8800';
      ctx.fillRect(enemy.x + enemy.width * 0.3, enemy.y + bob + 10, 4, 3);
      ctx.fillRect(enemy.x + enemy.width * 0.6, enemy.y + bob + 10, 4, 3);
  }
  
  // Damage indicator (cracks/wounds)
  if (healthPct < 0.7) {
    ctx.strokeStyle = '#660000';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1 - healthPct;
    ctx.beginPath();
    ctx.moveTo(enemy.x + enemy.width * 0.2, enemy.y + bob + enemy.height * 0.2);
    ctx.lineTo(enemy.x + enemy.width * 0.4, enemy.y + bob + enemy.height * 0.5);
    ctx.lineTo(enemy.x + enemy.width * 0.3, enemy.y + bob + enemy.height * 0.8);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawDoomGuy(ctx: CanvasRenderingContext2D, player: Player) {
  const px = player.x + player.width / 2;
  const py = player.y;
  const h = player.height;
  
  // Animation parameters
  const walkCycle = player.isWalking ? Math.sin(player.animTime * 10) : 0;
  const runBob = player.isWalking ? Math.abs(Math.sin(player.animTime * 10)) * 2 : 0;
  const shootRecoil = player.shootAnim > 0 ? -3 * (player.shootAnim / 0.12) : 0;
  const crouchScale = 1 - player.crouchAnim * 0.3;
  
  ctx.save();
  
  // Draw weapon first (behind arm when facing left)
  if (player.facing === -1) {
    drawWeapon(ctx, px, py, h, player, shootRecoil);
  }
  
  // Helmet (more detailed)
  const headH = Math.round(16 * crouchScale);
  const headY = py - runBob;
  
  // Helmet base
  ctx.fillStyle = DOOM_COLORS.ARMOR_GREEN;
  ctx.fillRect(px - 10 + shootRecoil, headY, 20, headH);
  
  // Helmet shading
  ctx.fillStyle = DOOM_COLORS.ARMOR_DARK;
  ctx.fillRect(px - 10 + shootRecoil, headY + headH - 3, 20, 3);
  ctx.fillRect(px - 10 + shootRecoil, headY, 3, headH);
  
  // Helmet highlight
  ctx.fillStyle = DOOM_COLORS.ARMOR_HIGHLIGHT;
  ctx.fillRect(px + 5 + shootRecoil, headY + 2, 5, 2);
  
  // Visor with enhanced glow
  ctx.fillStyle = DOOM_COLORS.HELMET_VISOR;
  ctx.shadowColor = DOOM_COLORS.HELMET_VISOR;
  ctx.shadowBlur = 6;
  ctx.fillRect(px - 7 + shootRecoil, headY + 4, 14, Math.max(6, headH - 8));
  
  // Additional inner glow
  ctx.fillStyle = 'rgba(0, 255, 100, 0.8)';
  ctx.fillRect(px - 6 + shootRecoil, headY + 5, 12, Math.max(4, headH - 10));
  
  ctx.shadowBlur = 0;
  
  // Visor reflection
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(px - 5 + shootRecoil, headY + 5, 3, 2);
  
  // Body armor
  const bodyH = Math.round(24 * crouchScale);
  const bodyY = headY + headH;
  
  // Chest piece
  ctx.fillStyle = DOOM_COLORS.ARMOR_GREEN;
  ctx.fillRect(px - 12 + shootRecoil * 0.5, bodyY, 24, bodyH);
  
  // Armor details
  ctx.fillStyle = DOOM_COLORS.ARMOR_DARK;
  // Ab plates
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(px - 10 + shootRecoil * 0.5, bodyY + 6 + i * 6, 20, 1);
  }
  // Side panels
  ctx.fillRect(px - 12 + shootRecoil * 0.5, bodyY, 4, bodyH);
  ctx.fillRect(px + 8 + shootRecoil * 0.5, bodyY, 4, bodyH);
  
  // Chest plate highlight
  ctx.fillStyle = DOOM_COLORS.ARMOR_HIGHLIGHT;
  ctx.fillRect(px - 8 + shootRecoil * 0.5, bodyY + 2, 16, 2);
  
  // Arms
  const armSwing = walkCycle * 8;
  const gunRaise = player.isShooting ? -4 : 0;
  
  // Left arm
  ctx.fillStyle = DOOM_COLORS.ARMOR_GREEN;
  ctx.fillRect(px - 16 - armSwing * 0.5 + shootRecoil, bodyY + 4 + gunRaise, 6, 14);
  ctx.fillStyle = DOOM_COLORS.ARMOR_DARK;
  ctx.fillRect(px - 16 - armSwing * 0.5 + shootRecoil, bodyY + 4 + gunRaise, 2, 14);
  
  // Right arm (holding weapon)
  ctx.fillStyle = DOOM_COLORS.ARMOR_GREEN;
  ctx.fillRect(px + 10 + armSwing * 0.5 + shootRecoil, bodyY + 4 + gunRaise, 6, 14);
  ctx.fillStyle = DOOM_COLORS.ARMOR_LIGHT;
  ctx.fillRect(px + 14 + armSwing * 0.5 + shootRecoil, bodyY + 4 + gunRaise, 2, 14);
  
  // Legs
  const legH = h - headH - bodyH;
  const legY = bodyY + bodyH;
  const legSwing = walkCycle * 6;
  
  // Left leg
  ctx.fillStyle = DOOM_COLORS.ARMOR_GREEN;
  ctx.fillRect(px - 8 + legSwing, legY, 7, legH - 6);
  ctx.fillStyle = DOOM_COLORS.ARMOR_DARK;
  ctx.fillRect(px - 8 + legSwing, legY, 2, legH - 6);
  
  // Left boot
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(px - 9 + legSwing, py + h - 6, 9, 6);
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(px - 9 + legSwing, py + h - 6, 9, 2);
  
  // Right leg
  ctx.fillStyle = DOOM_COLORS.ARMOR_GREEN;
  ctx.fillRect(px + 1 - legSwing, legY, 7, legH - 6);
  ctx.fillStyle = DOOM_COLORS.ARMOR_LIGHT;
  ctx.fillRect(px + 6 - legSwing, legY, 2, legH - 6);
  
  // Right boot
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(px - legSwing, py + h - 6, 9, 6);
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(px - legSwing, py + h - 6, 9, 2);
  
  // Draw weapon in front (when facing right)
  if (player.facing === 1) {
    drawWeapon(ctx, px, py, h, player, shootRecoil);
  }
  
  // Battle damage/blood
  if (player.hp < 70) {
    ctx.globalAlpha = (100 - player.hp) / 100;
    ctx.fillStyle = DOOM_COLORS.BLOOD_DARK;
    ctx.fillRect(px - 4 + shootRecoil * 0.5, bodyY + 8, 8, 6);
    ctx.fillRect(px + 2, legY + 4, 4, 8);
    ctx.globalAlpha = 1;
  }
  
  ctx.restore();
}

function drawWeapon(ctx: CanvasRenderingContext2D, px: number, py: number, h: number, player: Player, recoil: number) {
  const gunY = py + h * 0.4 + (player.isShooting ? -2 : 0);
  const gunX = px + player.facing * 12 + recoil;
  
  // Shotgun-style weapon
  ctx.fillStyle = DOOM_COLORS.WEAPON_METAL;
  ctx.fillRect(gunX, gunY, player.facing * 25, 6);
  
  // Barrel details
  ctx.fillStyle = DOOM_COLORS.WEAPON_BARREL;
  ctx.fillRect(gunX + player.facing * 15, gunY, player.facing * 10, 8);
  ctx.fillRect(gunX + player.facing * 20, gunY + 1, player.facing * 5, 6);
  
  // Grip/trigger
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(gunX + player.facing * 4, gunY + 4, player.facing * 4, 8);
  
  // Muzzle flash
  if (player.shootAnim > 0.1) {
    ctx.save();
    const flashSize = 12 + Math.random() * 8;
    const flashX = gunX + player.facing * 25;
    
    // Multi-color flash
    ctx.globalAlpha = player.shootAnim / 0.12;
    ctx.shadowColor = DOOM_COLORS.MUZZLE_FLASH[0];
    ctx.shadowBlur = 20;
    
    ctx.fillStyle = DOOM_COLORS.MUZZLE_FLASH[2];
    ctx.fillRect(flashX, gunY - 4, player.facing * flashSize, 14);
    
    ctx.fillStyle = DOOM_COLORS.MUZZLE_FLASH[0];
    ctx.fillRect(flashX, gunY, player.facing * (flashSize * 0.7), 6);
    
    ctx.fillStyle = DOOM_COLORS.MUZZLE_FLASH[1];
    ctx.fillRect(flashX, gunY + 2, player.facing * (flashSize * 0.4), 2);
    
    ctx.restore();
  }
}

function drawHealthPack(ctx: CanvasRenderingContext2D, hp: HealthPack) {
  const pulse = 0.9 + Math.sin(hp.animTime * 5) * 0.1;
  const size = hp.width * pulse;
  const x = hp.x + (hp.width - size) / 2;
  const y = hp.y + (hp.height - size) / 2;
  
  // Glow effect
  ctx.save();
  ctx.shadowColor = '#00ff00';
  ctx.shadowBlur = 15;
  
  // Main health pack
  ctx.fillStyle = '#00aa00';
  ctx.fillRect(x, y, size, size);
  
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
  
  // Cross symbol
  ctx.fillStyle = '#ffffff';
  const crossSize = size * 0.6;
  const crossX = x + (size - crossSize) / 2;
  const crossY = y + (size - crossSize) / 2;
  ctx.fillRect(crossX, crossY + crossSize * 0.35, crossSize, crossSize * 0.3);
  ctx.fillRect(crossX + crossSize * 0.35, crossY, crossSize * 0.3, crossSize);
  
  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  ctx.save();
  
  if (proj.fromPlayer) {
    // Player bullet with trail
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 8;
    
    // Trail
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffaa00';
    const trailLength = proj.vx > 0 ? -15 : 15;
    ctx.fillRect(proj.x + trailLength, proj.y, Math.abs(trailLength), proj.height);
    
    // Main bullet
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
    
    // Hot core
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(proj.x + 2, proj.y + 1, proj.width - 4, proj.height - 2);
  } else {
    // Enemy projectile (plasma/fireball)
    const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;

    // Single plasma style for all enemy projectiles (no proj.type field)
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 10;

    // Plasma ball
    const gradient = ctx.createRadialGradient(
      proj.x + proj.width / 2,
      proj.y + proj.height / 2,
      0,
      proj.x + proj.width / 2,
      proj.y + proj.height / 2,
      proj.width
    );

    gradient.addColorStop(0, '#ffaa00');
    gradient.addColorStop(0.5, '#ff4400');
    gradient.addColorStop(1, 'transparent');

    ctx.globalAlpha = pulse;
    ctx.fillStyle = gradient;
    ctx.fillRect(proj.x - 2, proj.y - 2, proj.width + 4, proj.height + 4);
    ctx.globalAlpha = 1;
  }
  
  ctx.restore();
}

function drawPostEffects(ctx: CanvasRenderingContext2D, viewport: Viewport, game: GameState) {
  // Screen shake offset
  if (game.shakeTime > 0) {
    ctx.save();
    const shakeX = (Math.random() - 0.5) * game.shakeMag;
    const shakeY = (Math.random() - 0.5) * game.shakeMag;
    ctx.translate(shakeX, shakeY);
  }
  
  // Subtle fog overlay
  ctx.fillStyle = DOOM_COLORS.FOG;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  
  // Vignette effect
  const vignette = ctx.createRadialGradient(
    viewport.width / 2, viewport.height / 2, viewport.height * 0.3,
    viewport.width / 2, viewport.height / 2, viewport.height * 0.8
  );
  vignette.addColorStop(0, 'transparent');
  vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  
  // CRT scanlines
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#000';
  for (let y = 0; y < viewport.height; y += 3) {
    ctx.fillRect(0, y, viewport.width, 1);
  }
  ctx.globalAlpha = 1;
  
  if (game.shakeTime > 0) {
    ctx.restore();
  }
}

function drawDoomHUD(ctx: CanvasRenderingContext2D, game: GameState, player: Player, viewport: Viewport) {
  ctx.save();
  
  // Minimal top-left corner HUD
  const margin = 20;
  const barWidth = 200;
  const barHeight = 8;
  
  // Semi-transparent background panel
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(margin - 5, margin - 5, barWidth + 80, 70);
  
  // Health Bar
  const healthPct = Math.max(0, Math.min(1, player.hp / 100));
  const healthColor = player.hp > 50 ? '#00ff50' : player.hp > 25 ? '#ffaa00' : '#ff0000';
  
  // Health label
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('HEALTH', margin, margin + 10);
  
  // Health bar background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(margin, margin + 15, barWidth, barHeight);
  
  // Health bar fill
  ctx.fillStyle = healthColor;
  ctx.fillRect(margin, margin + 15, barWidth * healthPct, barHeight);
  
  // Health bar border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(margin, margin + 15, barWidth, barHeight);
  
  // Health percentage
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = healthColor;
  ctx.fillText(`${player.hp}%`, margin + barWidth + 10, margin + 22);
  
  // Score info (smaller, below health)
  ctx.font = '11px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText(`SCORE: ${game.score}`, margin, margin + 40);
  ctx.fillText(`DISTANCE: ${Math.floor(game.distance)}m`, margin, margin + 55);
  
  // Difficulty indicator (small, right side of health)
  ctx.font = '10px monospace';
  ctx.fillStyle = '#ffaa00';
  ctx.fillText(`LVL ${game.difficulty.toFixed(1)}`, margin + 150, margin + 55);
  
  // Top-right corner: Ammo counter
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(viewport.width - 100, margin - 5, 80, 30);
  ctx.fillStyle = '#ffaa00';
  ctx.fillText('AMMO: ∞', viewport.width - 90, margin + 15);
  
  // Small Doom face indicator (bottom-left corner, very minimal)
  const faceSize = 40;
  const faceX = margin;
  const faceY = viewport.height - margin - faceSize;
  
  // Face background with transparency
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(faceX - 5, faceY - 5, faceSize + 10, faceSize + 10);
  
  // Pixel art face based on health
  const drawPixelFace = () => {
    // Face base
    ctx.fillStyle = DOOM_COLORS.SKIN;
    ctx.fillRect(faceX + 8, faceY + 8, 24, 24);
    
    // Hair/helmet
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(faceX + 8, faceY + 8, 24, 6);
    
    if (player.hp > 70) {
      // Good health
      // Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(faceX + 12, faceY + 16, 4, 3);
      ctx.fillRect(faceX + 24, faceY + 16, 4, 3);
      // Smile
      ctx.fillRect(faceX + 16, faceY + 24, 8, 2);
      // Health indicator
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
      ctx.fillRect(faceX, faceY, faceSize, faceSize);
    } else if (player.hp > 30) {
      // Medium health
      // Eyes (worried)
      ctx.fillStyle = '#000';
      ctx.fillRect(faceX + 12, faceY + 15, 4, 3);
      ctx.fillRect(faceX + 24, faceY + 15, 4, 3);
      // Grimace
      ctx.fillRect(faceX + 14, faceY + 25, 12, 1);
      // Blood
      ctx.fillStyle = '#aa0000';
      ctx.fillRect(faceX + 14, faceY + 20, 2, 4);
      // Health indicator
      ctx.fillStyle = 'rgba(255, 170, 0, 0.3)';
      ctx.fillRect(faceX, faceY, faceSize, faceSize);
    } else {
      // Low health
      // Damaged face
      ctx.fillStyle = '#aa8877';
      ctx.fillRect(faceX + 8, faceY + 14, 24, 18);
      // Eyes (one closed)
      ctx.fillStyle = '#000';
      ctx.fillRect(faceX + 12, faceY + 17, 4, 1);
      ctx.fillRect(faceX + 24, faceY + 16, 4, 3);
      // Open mouth
      ctx.fillRect(faceX + 14, faceY + 24, 12, 4);
      ctx.fillStyle = '#660000';
      ctx.fillRect(faceX + 16, faceY + 25, 8, 2);
      // Blood
      ctx.fillStyle = '#660000';
      ctx.fillRect(faceX + 12, faceY + 20, 3, 8);
      ctx.fillRect(faceX + 26, faceY + 22, 2, 6);
      // Health indicator
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(faceX, faceY, faceSize, faceSize);
    }
  };
  
  drawPixelFace();
  
  // Controls hint (very subtle, bottom-right)
  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillText('[A/D] Move [W] Jump [S] Crouch [Space] Shoot', viewport.width - 250, viewport.height - 10);
  
  ctx.restore();
}

function drawGameOver(ctx: CanvasRenderingContext2D, viewport: Viewport) {
  // Dark overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  
  // Blood splatter effect
  ctx.save();
  for (let i = 0; i < 10; i++) {
    const x = viewport.width / 2 + (Math.random() - 0.5) * 400;
    const y = viewport.height / 2 + (Math.random() - 0.5) * 200;
    const size = 20 + Math.random() * 40;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, 'rgba(140, 0, 0, 0.8)');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - size, y - size, size * 2, size * 2);
  }
  ctx.restore();
  
  // Game over text
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 72px serif';
  
  // Text with blood drip effect
  ctx.fillStyle = '#880000';
  ctx.fillText('YOU DIED', viewport.width / 2, viewport.height / 2);
  
  ctx.fillStyle = '#ff0000';
  ctx.fillText('YOU DIED', viewport.width / 2 - 2, viewport.height / 2 - 2);
  
  // Restart prompt
  ctx.font = 'bold 28px monospace';
  ctx.fillStyle = '#ffaa00';
  ctx.fillText('PRESS [R] TO RISE AGAIN', viewport.width / 2, viewport.height / 2 + 60);
  
  ctx.restore();
}
