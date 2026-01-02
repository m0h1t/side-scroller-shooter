import type { Enemy, HealthPack, Particle, Platform, Projectile, Splat } from "./types";
import type { Player } from "./types";
import { audioManager } from "./audio";

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

// Enhanced color palette with more contrast and atmosphere
const COLORS = {
  // Deep blacks and atmospheric colors
  BLACK: '#000000',
  DEEP_BLACK: '#050505',
  
  // Sickly greens for toxic atmosphere
  TOXIC_GREEN: '#88ff00',
  SICK_GREEN: '#4a7c3c',
  DARK_GREEN: '#1a3a1a',
  NEON_GREEN: '#00ff00',
  
  // Blood reds for danger
  BLOOD_RED: '#8b0000',
  BRIGHT_RED: '#ff0000',
  DARK_RED: '#4a0000',
  
  // Industrial colors
  RUST: '#8b4513',
  METAL: '#4a4a5a',
  DARK_METAL: '#2a2a3a',
  
  // UI Colors
  UI_GREEN: '#00ff00',
  UI_YELLOW: '#ffff00',
  UI_RED: '#ff0000',
  UI_ORANGE: '#ff8800',
  UI_CYAN: '#00ffff',
};

// Global animation timers
let globalTime = 0;
let flickerTimer = 0;
let glitchTimer = 0;

// Environmental effects arrays
// eslint-disable-next-line prefer-const
let fogParticles: {x: number, y: number, size: number, opacity: number, speed: number}[] = [];
let sparks: {x: number, y: number, vx: number, vy: number, life: number}[] = [];
// eslint-disable-next-line prefer-const
let dust: {x: number, y: number, vx: number, vy: number, size: number, opacity: number}[] = [];

// Initialize environmental effects
function initEnvironmentalEffects(viewport: Viewport) {
  // Initialize fog
  if (fogParticles.length < 20) {
    for (let i = fogParticles.length; i < 20; i++) {
      fogParticles.push({
        x: Math.random() * viewport.width * 2,
        y: Math.random() * viewport.height,
        size: 100 + Math.random() * 200,
        opacity: 0.02 + Math.random() * 0.08,
        speed: 10 + Math.random() * 20
      });
    }
  }
  
  // Initialize dust
  if (dust.length < 50) {
    for (let i = dust.length; i < 50; i++) {
      dust.push({
        x: Math.random() * viewport.width,
        y: Math.random() * viewport.height,
        vx: -5 - Math.random() * 10,
        vy: -2 + Math.random() * 4,
        size: 1 + Math.random() * 2,
        opacity: 0.1 + Math.random() * 0.3
      });
    }
  }
}

// Update environmental effects
function updateEnvironmentalEffects(dt: number, viewport: Viewport, cameraX: number) {
  globalTime += dt;
  flickerTimer += dt;
  glitchTimer += dt;
  
  // Update fog
  fogParticles.forEach(fog => {
    fog.x -= fog.speed * dt;
    if (fog.x + fog.size < cameraX) {
      fog.x = cameraX + viewport.width + fog.size;
      fog.y = Math.random() * viewport.height;
    }
  });
  
  // Update dust
  dust.forEach(d => {
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if (d.x < cameraX - 10) {
      d.x = cameraX + viewport.width + 10;
      d.y = Math.random() * viewport.height;
    }
  });
  
  // Update sparks
  sparks = sparks.filter(s => {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vy += 500 * dt; // gravity
    s.life -= dt;
    return s.life > 0;
  });
  
  // Randomly spawn sparks from platforms
  if (Math.random() < 0.02) {
    sparks.push({
      x: cameraX + Math.random() * viewport.width,
      y: viewport.height - 100 - Math.random() * 200,
      vx: -50 + Math.random() * 100,
      vy: -100 - Math.random() * 100,
      life: 0.5 + Math.random() * 0.5
    });
  }
}

export function renderGame({ ctx, game, viewport, platforms, enemies, projectiles, healthPacks, particles, splats, player }: RenderDeps) {
  // Initialize and update effects
  initEnvironmentalEffects(viewport);
  updateEnvironmentalEffects(0.016, viewport, game.camera.x);
  
  // Start ambient sounds if not playing
  if (!game.gameOver) {
    try {
      audioManager.resume();
      audioManager.startAmbientSounds();
    } catch {
      // Audio may not be available
    }
  }
  
  // Clear with deep black
  ctx.fillStyle = COLORS.DEEP_BLACK;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  
  // Draw atmospheric gradient with sickly colors
  const gradient = ctx.createLinearGradient(0, 0, 0, viewport.height);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
  gradient.addColorStop(0.3, 'rgba(74, 124, 60, 0.1)'); // sick green tint
  gradient.addColorStop(0.7, 'rgba(139, 0, 0, 0.1)'); // blood red tint
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  
  // Draw enhanced parallax background
  drawEnhancedBackground(ctx, game, viewport);
  
  // Draw fog layer
  ctx.save();
  fogParticles.forEach(fog => {
    const screenX = fog.x - game.camera.x;
    if (screenX > -fog.size && screenX < viewport.width + fog.size) {
      const fogGradient = ctx.createRadialGradient(
        screenX, fog.y, 0,
        screenX, fog.y, fog.size
      );
      fogGradient.addColorStop(0, `rgba(136, 255, 0, ${fog.opacity})`);
      fogGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = fogGradient;
      ctx.fillRect(screenX - fog.size, fog.y - fog.size, fog.size * 2, fog.size * 2);
    }
  });
  ctx.restore();
  
  ctx.save();
  ctx.translate(-game.camera.x, -game.camera.y);
  
  // Draw platforms with grunge textures and shadows
  platforms.forEach(platform => {
    drawGrungePlatform(ctx, platform);
  });
  
  // Draw enhanced blood splats
  splats.forEach(s => {
    drawEnhancedBloodSplat(ctx, s);
  });
  
  // Draw enemies with shadows
  enemies.forEach(enemy => {
    if (enemy.hp <= 0 || !enemy.active) return;
    drawEnemyWithShadow(ctx, enemy);
  });
  
  // Draw player with dynamic lighting
  drawPlayerWithDynamicLighting(ctx, player);
  
  // Draw particles
  particles.forEach(p => {
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    gradient.addColorStop(0, p.color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(Math.floor(p.x - p.size/2), Math.floor(p.y - p.size/2), p.size * 2, p.size * 2);
  });
  
  // Draw health packs
  healthPacks.forEach(hp => {
    if (hp.collected) return;
    drawGlowingHealthPack(ctx, hp);
  });
  
  // Draw projectiles
  projectiles.forEach(proj => {
    drawEnhancedProjectile(ctx, proj);
  });
  
  ctx.restore();
  
  // Draw dust particles
  ctx.save();
  dust.forEach(d => {
    const screenX = d.x - game.camera.x;
    if (screenX > -10 && screenX < viewport.width + 10) {
      ctx.fillStyle = `rgba(200, 200, 200, ${d.opacity})`;
      ctx.fillRect(screenX, d.y, d.size, d.size);
    }
  });
  ctx.restore();
  
  // Draw sparks
  ctx.save();
  sparks.forEach(s => {
    const screenX = s.x - game.camera.x;
    if (screenX > -10 && screenX < viewport.width + 10) {
      ctx.fillStyle = `rgba(255, 255, 0, ${s.life * 2})`;
      ctx.shadowColor = COLORS.UI_YELLOW;
      ctx.shadowBlur = 5;
      ctx.fillRect(screenX, s.y, 2, 2);
    }
  });
  ctx.shadowBlur = 0;
  ctx.restore();
  
  // Draw foreground debris
  drawForegroundDebris(ctx, game, viewport);
  
  // Post-processing effects
  drawEnhancedPostEffects(ctx, viewport);
  
  // Draw ultimate HUD
  drawUltimateHUD(ctx, game, player, viewport);
  
  // Game over sequence
  if (game.gameOver) {
    // First show death transition, then game over screen
    if (!drawDeathTransition(ctx, viewport)) {
      return; // Still in transition
    }
    drawIntenseGameOver(ctx, viewport);
  }
}

function drawEnhancedBackground(ctx: CanvasRenderingContext2D, game: GameState, viewport: Viewport) {
  // Far layer - destroyed city skyline
  const f1 = 0.05;
  const base1 = Math.floor((game.camera.x * f1) / 400) * 400 - 400;
  
  ctx.save();
  for (let x = base1; x < game.camera.x * f1 + viewport.width + 400; x += 400) {
    const sx = Math.floor(x - game.camera.x * f1);
    const h = 250 + ((x / 400) % 4) * 50;
    
    // Building silhouette
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(sx + 50, viewport.height - h, 100, h);
    ctx.fillRect(sx + 180, viewport.height - h * 0.8, 80, h * 0.8);
    
    // Broken windows with pulsing and flickering lights
    for (let y = 20; y < h - 20; y += 25) {
      if (Math.random() > 0.3) {
        // Individual window light behavior
        const windowPulse = Math.sin(globalTime * 2 + x + y) * 0.5 + 0.5;
        const isFlickering = Math.random() < 0.05;
        const isDead = Math.random() < 0.7; // Most windows are dark
        
        if (isDead) {
          ctx.fillStyle = '#0a0000'; // Dark window
        } else if (isFlickering) {
          ctx.fillStyle = Math.random() < 0.5 ? '#ff4400' : '#000000'; // Flickering
        } else {
          // Pulsing light
          const r = Math.floor(100 + windowPulse * 155);
          ctx.fillStyle = `rgb(${r}, ${Math.floor(r * 0.2)}, 0)`;
        }
        
        ctx.fillRect(sx + 60, viewport.height - h + y, 10, 10);
        
        // Second window
        if (Math.random() > 0.5) {
          ctx.fillStyle = Math.random() < 0.9 ? '#0a0000' : '#aa2200';
          ctx.fillRect(sx + 80, viewport.height - h + y, 10, 10);
        }
      }
    }
  }
  
  // Mid layer - industrial structures
  const f2 = 0.2;
  const base2 = Math.floor((game.camera.x * f2) / 250) * 250 - 250;
  
  for (let x = base2; x < game.camera.x * f2 + viewport.width + 250; x += 250) {
    const sx = Math.floor(x - game.camera.x * f2);
    
    // Pipes and machinery
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(sx + 30, viewport.height - 180, 8, 120);
    ctx.fillRect(sx + 80, viewport.height - 150, 6, 90);
    
    // Horizontal walkways
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(sx, viewport.height - 120, 150, 4);
    
    // Warning lights (flickering)
    if (Math.sin(flickerTimer * 10 + x) > 0) {
      ctx.fillStyle = '#ff0000';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 10;
      ctx.fillRect(sx + 120, viewport.height - 130, 4, 4);
      ctx.shadowBlur = 0;
    }
  }
  
  // Near layer - damaged fences and wires
  const f3 = 0.5;
  const base3 = Math.floor((game.camera.x * f3) / 180) * 180 - 180;
  
  for (let x = base3; x < game.camera.x * f3 + viewport.width + 180; x += 180) {
    const sx = Math.floor(x - game.camera.x * f3);
    
    // Fence posts
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(sx, viewport.height - 80, 4, 60);
    ctx.fillRect(sx + 60, viewport.height - 80, 4, 60);
    
    // Wire (sagging)
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + 2, viewport.height - 70);
    ctx.quadraticCurveTo(sx + 30, viewport.height - 60, sx + 62, viewport.height - 70);
    ctx.stroke();
  }
  
  ctx.restore();
}

function drawGrungePlatform(ctx: CanvasRenderingContext2D, platform: Platform) {
  const { x, y, width: w, height: h } = platform;
  
  // Subtle platform shadow
  ctx.save();
  const shadowGradient = ctx.createLinearGradient(x, y + h, x, y + h + 6);
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
  shadowGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = shadowGradient;
  ctx.fillRect(x, y + h, w, 6);
  ctx.restore();
  
  // Main platform with gradient
  const platGradient = ctx.createLinearGradient(x, y, x, y + h);
  platGradient.addColorStop(0, '#3a3a3a');
  platGradient.addColorStop(0.5, '#2a2a2a');
  platGradient.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = platGradient;
  ctx.fillRect(x, y, w, h);
  
  // Grunge texture overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  for (let i = 0; i < 5; i++) {
    const gx = x + Math.random() * (w - 30);
    const gy = y + Math.random() * (h - 10);
    const gw = 20 + Math.random() * 20;
    const gh = 5 + Math.random() * 10;
    ctx.fillRect(gx, gy, gw, gh);
  }
  
  // Rust patches
  ctx.fillStyle = 'rgba(139, 69, 19, 0.4)';
  for (let i = 0; i < 3; i++) {
    const rx = x + Math.random() * (w - 20);
    const ry = y + Math.random() * (h - 8);
    ctx.fillRect(rx, ry, 15 + Math.random() * 10, 4 + Math.random() * 6);
  }
  
  // Edge highlights and details
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.fillRect(x, y, w, 2);
  
  // Metal rivets
  ctx.fillStyle = '#4a4a4a';
  for (let rx = x + 10; rx < x + w - 10; rx += 30) {
    ctx.fillRect(rx, y + 4, 3, 3);
    ctx.fillRect(rx, y + h - 7, 3, 3);
  }
  
  // Warning stripes on edges
  ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x + i * 6, y, 3, h);
    ctx.fillRect(x + w - 30 + i * 6, y, 3, h);
  }
}

function drawEnhancedBloodSplat(ctx: CanvasRenderingContext2D, splat: Splat) {
  // Multi-layer blood splat for more detail
  const gradient = ctx.createRadialGradient(
    splat.x + splat.w/2, splat.y + splat.h/2, 0,
    splat.x + splat.w/2, splat.y + splat.h/2, Math.max(splat.w, splat.h)
  );
  gradient.addColorStop(0, `rgba(139, 0, 0, ${splat.alpha})`);
  gradient.addColorStop(0.5, `rgba(100, 0, 0, ${splat.alpha * 0.8})`);
  gradient.addColorStop(1, `rgba(50, 0, 0, ${splat.alpha * 0.5})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(splat.x, splat.y, splat.w, splat.h);
  
  // Blood drips
  if (splat.alpha > 0.3) {
    ctx.fillStyle = `rgba(80, 0, 0, ${splat.alpha * 0.7})`;
    for (let i = 0; i < 3; i++) {
      const dx = splat.x + Math.random() * splat.w;
      const dripH = 5 + Math.random() * 15;
      ctx.fillRect(dx, splat.y + splat.h, 2, dripH);
    }
  }
}

function drawEnemyWithShadow(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  // Subtle enemy shadow
  ctx.save();
  const shadowGradient = ctx.createLinearGradient(
    enemy.x, enemy.y + enemy.height,
    enemy.x, enemy.y + enemy.height + 4
  );
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
  shadowGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = shadowGradient;
  ctx.fillRect(enemy.x, enemy.y + enemy.height, enemy.width, 4);
  ctx.restore();
  
  const healthPct = enemy.hp / enemy.maxHp;
  const bob = Math.sin(enemy.animTime * 4) * 3;
  
  ctx.save();
  
  // Enemy glow/aura
  const glowColor = enemy.type === 'heavy' ? '#ff0000' : 
                    enemy.type === 'sniper' ? '#00ff00' :
                    enemy.type === 'fast' ? '#ff8800' : '#aa0000';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 10;
  
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
      
      // Laser sight
      if (Math.sin(enemy.animTime * 3) > 0) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.width + 25, enemy.y + bob + enemy.height * 0.3);
        ctx.lineTo(enemy.x + enemy.width + 150, enemy.y + bob + enemy.height * 0.3);
        ctx.stroke();
      }
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

function drawPlayerWithDynamicLighting(ctx: CanvasRenderingContext2D, player: Player) {
  const px = player.x + player.width / 2;
  const py = player.y;
  const h = player.height;
  
  // Dynamic green aura with pulse
  ctx.save();
  const pulse = 1 + Math.sin(globalTime * 4) * 0.2;
  const auraSize = 150 * pulse;
  
  const auraGradient = ctx.createRadialGradient(
    px, py + player.height/2, 0,
    px, py + player.height/2, auraSize
  );
  auraGradient.addColorStop(0, `rgba(0, 255, 0, ${0.15 * pulse})`);
  auraGradient.addColorStop(0.5, `rgba(0, 200, 0, ${0.08 * pulse})`);
  auraGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = auraGradient;
  ctx.fillRect(px - auraSize, py - auraSize/2, auraSize * 2, auraSize * 1.5);
  ctx.restore();
  
  // Subtle player shadow (more realistic)
  ctx.save();
  const shadowGradient = ctx.createLinearGradient(
    player.x, player.y + player.height,
    player.x, player.y + player.height + 6
  );
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
  shadowGradient.addColorStop(1, 'transparent');
  ctx.fillStyle = shadowGradient;
  ctx.fillRect(player.x + 2, player.y + player.height, player.width - 4, 6);
  ctx.restore();
  
  // Draw detailed Doom Guy sprite
  const walkCycle = player.isWalking ? Math.sin(player.animTime * 10) : 0;
  const runBob = player.isWalking ? Math.abs(Math.sin(player.animTime * 10)) * 2 : 0;
  const shootRecoil = player.shootAnim > 0 ? -3 * (player.shootAnim / 0.12) : 0;
  const crouchScale = 1 - player.crouchAnim * 0.3;
  
  ctx.save();
  
  // Helmet
  const headH = Math.round(16 * crouchScale);
  const headY = py - runBob;
  
  ctx.fillStyle = '#2a4a2a';
  ctx.fillRect(px - 10 + shootRecoil, headY, 20, headH);
  
  ctx.fillStyle = '#1a2a1a';
  ctx.fillRect(px - 10 + shootRecoil, headY + headH - 3, 20, 3);
  ctx.fillRect(px - 10 + shootRecoil, headY, 3, headH);
  
  ctx.fillStyle = '#5a8a5a';
  ctx.fillRect(px + 5 + shootRecoil, headY + 2, 5, 2);
  
  // Visor
  ctx.fillStyle = COLORS.NEON_GREEN;
  ctx.shadowColor = COLORS.NEON_GREEN;
  ctx.shadowBlur = 6;
  ctx.fillRect(px - 7 + shootRecoil, headY + 4, 14, Math.max(6, headH - 8));
  ctx.fillStyle = 'rgba(0, 255, 100, 0.8)';
  ctx.fillRect(px - 6 + shootRecoil, headY + 5, 12, Math.max(4, headH - 10));
  ctx.shadowBlur = 0;
  
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(px - 5 + shootRecoil, headY + 5, 3, 2);
  
  // Body armor
  const bodyH = Math.round(24 * crouchScale);
  const bodyY = headY + headH;
  
  ctx.fillStyle = '#2a4a2a';
  ctx.fillRect(px - 12 + shootRecoil * 0.5, bodyY, 24, bodyH);
  
  ctx.fillStyle = '#1a2a1a';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(px - 10 + shootRecoil * 0.5, bodyY + 6 + i * 6, 20, 1);
  }
  ctx.fillRect(px - 12 + shootRecoil * 0.5, bodyY, 4, bodyH);
  ctx.fillRect(px + 8 + shootRecoil * 0.5, bodyY, 4, bodyH);
  
  ctx.fillStyle = '#5a8a5a';
  ctx.fillRect(px - 8 + shootRecoil * 0.5, bodyY + 2, 16, 2);
  
  // Arms
  const armSwing = walkCycle * 8;
  const gunRaise = player.isShooting ? -4 : 0;
  
  ctx.fillStyle = '#2a4a2a';
  ctx.fillRect(px - 16 - armSwing * 0.5 + shootRecoil, bodyY + 4 + gunRaise, 6, 14);
  ctx.fillStyle = '#1a2a1a';
  ctx.fillRect(px - 16 - armSwing * 0.5 + shootRecoil, bodyY + 4 + gunRaise, 2, 14);
  
  ctx.fillStyle = '#2a4a2a';
  ctx.fillRect(px + 10 + armSwing * 0.5 + shootRecoil, bodyY + 4 + gunRaise, 6, 14);
  ctx.fillStyle = '#4a6a4a';
  ctx.fillRect(px + 14 + armSwing * 0.5 + shootRecoil, bodyY + 4 + gunRaise, 2, 14);
  
  // Weapon
  if (player.facing === 1) {
    const gunY = py + h * 0.4 + (player.isShooting ? -2 : 0);
    const gunX = px + 12 + shootRecoil;
    
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(gunX, gunY, 25, 6);
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(gunX + 15, gunY, 10, 8);
    ctx.fillRect(gunX + 20, gunY + 1, 5, 6);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(gunX + 4, gunY + 4, 4, 8);
    
    // Muzzle flash
    if (player.shootAnim > 0.1) {
      const flashSize = 12 + Math.random() * 8;
      ctx.globalAlpha = player.shootAnim / 0.12;
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gunX + 25, gunY - 4, flashSize, 14);
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(gunX + 25, gunY, flashSize * 0.7, 6);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  }
  
  // Legs
  const legH = h - headH - bodyH;
  const legY = bodyY + bodyH;
  const legSwing = walkCycle * 6;
  
  ctx.fillStyle = '#2a4a2a';
  ctx.fillRect(px - 8 + legSwing, legY, 7, legH - 6);
  ctx.fillStyle = '#1a2a1a';
  ctx.fillRect(px - 8 + legSwing, legY, 2, legH - 6);
  
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(px - 9 + legSwing, py + h - 6, 9, 6);
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(px - 9 + legSwing, py + h - 6, 9, 2);
  
  ctx.fillStyle = '#2a4a2a';
  ctx.fillRect(px + 1 - legSwing, legY, 7, legH - 6);
  ctx.fillStyle = '#4a6a4a';
  ctx.fillRect(px + 6 - legSwing, legY, 2, legH - 6);
  
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(px - legSwing, py + h - 6, 9, 6);
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(px - legSwing, py + h - 6, 9, 2);
  
  // Battle damage
  if (player.hp < 70) {
    ctx.globalAlpha = (100 - player.hp) / 100;
    ctx.fillStyle = '#660000';
    ctx.fillRect(px - 4 + shootRecoil * 0.5, bodyY + 8, 8, 6);
    ctx.fillRect(px + 2, legY + 4, 4, 8);
    ctx.globalAlpha = 1;
  }
  
  ctx.restore();
}

function drawGlowingHealthPack(ctx: CanvasRenderingContext2D, hp: HealthPack) {
  const pulse = 0.8 + Math.sin(hp.animTime * 6) * 0.2;
  
  // Glow effect
  ctx.save();
  ctx.shadowColor = COLORS.NEON_GREEN;
  ctx.shadowBlur = 20 * pulse;
  
  ctx.fillStyle = COLORS.DARK_GREEN;
  ctx.fillRect(hp.x, hp.y, hp.width, hp.height);
  
  ctx.fillStyle = COLORS.NEON_GREEN;
  ctx.fillRect(hp.x + 2, hp.y + 2, hp.width - 4, hp.height - 4);
  
  // Cross
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(hp.x + hp.width * 0.4, hp.y + hp.height * 0.2, hp.width * 0.2, hp.height * 0.6);
  ctx.fillRect(hp.x + hp.width * 0.2, hp.y + hp.height * 0.4, hp.width * 0.6, hp.height * 0.2);
  
  ctx.restore();
}

function drawEnhancedProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  ctx.save();
  
  if (proj.fromPlayer) {
    // Player projectile with energy trail
    ctx.shadowColor = COLORS.UI_YELLOW;
    ctx.shadowBlur = 10;
    
    // Trail
    const trailGradient = ctx.createLinearGradient(
      proj.x - 20, proj.y,
      proj.x, proj.y
    );
    trailGradient.addColorStop(0, 'transparent');
    trailGradient.addColorStop(1, 'rgba(255, 255, 0, 0.8)');
    ctx.fillStyle = trailGradient;
    ctx.fillRect(proj.x - 20, proj.y, 20, proj.height);
    
    // Core
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(proj.x, proj.y, proj.width, proj.height);
  } else {
    // Enemy projectile (single style for all enemy shots)
    const enemyProjColor = COLORS.UI_ORANGE;
    ctx.shadowColor = enemyProjColor;
    ctx.shadowBlur = 15;
    
    ctx.fillStyle = enemyProjColor;
    ctx.fillRect(proj.x - 2, proj.y - 2, proj.width + 4, proj.height + 4);
  }
  
  ctx.restore();
}

function drawForegroundDebris(ctx: CanvasRenderingContext2D, game: GameState, viewport: Viewport) {
  // Foreground elements for depth
  ctx.save();
  ctx.globalAlpha = 0.8;
  
  const f = 1.5; // Moves faster than camera for foreground effect
  const base = Math.floor((game.camera.x * f) / 300) * 300 - 300;
  
  for (let x = base; x < game.camera.x * f + viewport.width + 300; x += 300) {
    const sx = Math.floor(x - game.camera.x * f);
    
    // Broken pipes
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(sx, viewport.height - 50, 4, 40);
    ctx.fillRect(sx + 100, viewport.height - 40, 3, 30);
    
    // Hanging wires
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + 50, 0);
    ctx.quadraticCurveTo(sx + 60, 100, sx + 55, 200);
    ctx.stroke();
  }
  
  ctx.restore();
}

function drawEnhancedPostEffects(ctx: CanvasRenderingContext2D, viewport: Viewport) {
  // Film grain effect
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * viewport.width;
    const y = Math.random() * viewport.height;
    const brightness = Math.random() * 255;
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
  
  // Vignette
  const vignette = ctx.createRadialGradient(
    viewport.width / 2, viewport.height / 2, viewport.height * 0.2,
    viewport.width / 2, viewport.height / 2, viewport.height * 0.9
  );
  vignette.addColorStop(0, 'transparent');
  vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  
  // Scanlines
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = '#000000';
  for (let y = 0; y < viewport.height; y += 3) {
    ctx.fillRect(0, y, viewport.width, 1);
  }
  ctx.globalAlpha = 1;
  
  // Screen flicker effect
  if (Math.sin(flickerTimer * 30) > 0.98) {
    ctx.fillStyle = 'rgba(0, 255, 0, 0.02)';
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }
}

function drawUltimateHUD(ctx: CanvasRenderingContext2D, game: GameState, player: Player, viewport: Viewport) {
  ctx.save();
  
  // HUD positioning
  const hudMargin = 25;
  const hudY = viewport.height - 60;
  
  // Digital display font setup
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  
  // === HEALTH DISPLAY ===
  const healthX = hudMargin;
  const healthWidth = 200;
  const segmentCount = 10;
  const segmentWidth = healthWidth / segmentCount;
  const healthPct = player.hp / 100;
  const filledSegments = Math.floor(healthPct * segmentCount);
  
  // Health label
  ctx.fillStyle = player.hp > 30 ? COLORS.UI_GREEN : COLORS.UI_RED;
  if (player.hp <= 30 && Math.sin(globalTime * 10) > 0) {
    ctx.fillStyle = COLORS.UI_YELLOW; // Flicker when low
  }
  ctx.font = 'bold 12px monospace';
  ctx.fillText('HEALTH', healthX, hudY - 5);
  
  // Segmented health bar
  for (let i = 0; i < segmentCount; i++) {
    const segX = healthX + i * segmentWidth;
    const isFilled = i < filledSegments;
    
    // Segment background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(segX, hudY, segmentWidth - 2, 12);
    
    // Segment fill
    if (isFilled) {
      const segmentColor = player.hp > 50 ? COLORS.UI_GREEN :
                          player.hp > 25 ? COLORS.UI_YELLOW : COLORS.UI_RED;
      ctx.fillStyle = segmentColor;
      
      // Add flicker effect for last segment
      if (i === filledSegments - 1 && Math.sin(globalTime * 8) > 0.5) {
        ctx.globalAlpha = 0.6;
      }
      ctx.fillRect(segX + 1, hudY + 1, segmentWidth - 3, 10);
      ctx.globalAlpha = 1;
    } else {
      // Empty segment
      ctx.fillStyle = 'rgba(0, 100, 0, 0.2)';
      ctx.fillRect(segX + 1, hudY + 1, segmentWidth - 3, 10);
    }
    
    // Segment border
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(segX, hudY, segmentWidth - 2, 12);
  }
  
  // Numeric HP display
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = player.hp > 30 ? COLORS.UI_GREEN : COLORS.UI_RED;
  ctx.fillText(`HP: ${player.hp}`, healthX + healthWidth + 15, hudY + 10);
  
  // === AMMO DISPLAY ===
  const ammoX = healthX + healthWidth + 100;
  ctx.fillStyle = COLORS.UI_YELLOW;
  ctx.font = 'bold 12px monospace';
  ctx.fillText('AMMO', ammoX, hudY - 5);
  
  // Terminal-style ammo display with glitch effect
  ctx.font = 'bold 16px monospace';
  if (Math.random() < 0.98) {
    ctx.fillText('[\u221e]', ammoX, hudY + 10);
  } else {
    // Glitch effect
    ctx.fillStyle = COLORS.UI_RED;
    ctx.fillText('[ERR]', ammoX, hudY + 10);
  }
  
  // === SCORE & DISTANCE ===
  const infoX = viewport.width - 250;
  ctx.font = '11px monospace';
  ctx.fillStyle = COLORS.UI_CYAN;
  
  // Digital display effect with leading zeros
  const scoreStr = String(game.score).padStart(6, '0');
  const distStr = String(Math.floor(game.distance)).padStart(5, '0');
  
  ctx.fillText(`SCORE: ${scoreStr}`, infoX, hudY);
  ctx.fillText(`DIST: ${distStr}m`, infoX, hudY + 15);
  
  // Difficulty indicator with warning color
  const diffColor = game.difficulty < 2 ? COLORS.UI_GREEN :
                    game.difficulty < 3 ? COLORS.UI_YELLOW : COLORS.UI_RED;
  ctx.fillStyle = diffColor;
  ctx.fillText(`LVL: ${game.difficulty.toFixed(1)}`, infoX + 120, hudY);
  
  // === STATIC/GLITCH INDICATORS ===
  // Bottom corners static effect
  if (Math.sin(glitchTimer * 20) > 0.8) {
    // Left corner glitch
    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.fillRect(0, viewport.height - 30, 50, 30);
    
    // Right corner glitch
    ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
    ctx.fillRect(viewport.width - 50, viewport.height - 30, 50, 30);
  }
  
  // Animated POWER indicator with glitches
  const powerX = 25;
  const powerY = 100;
  
  // Power indicator background
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(powerX - 5, powerY - 5, 100, 30);
  
  // Power status
  const powerStatus = Math.sin(globalTime * 2) > 0.3; // Flickers
  const isGlitched = Math.random() < 0.02; // Occasional glitch
  
  ctx.font = 'bold 12px monospace';
  if (isGlitched) {
    // Glitched state
    ctx.fillStyle = COLORS.UI_RED;
    ctx.fillText('[!ERR!]', powerX, powerY + 10);
    // Play beep sound
    if (Math.random() < 0.5) {
      try {
        audioManager.playPowerBeep();
      } catch {
        // Audio may not be available
      }
    }
  } else if (powerStatus) {
    // Normal state
    ctx.fillStyle = COLORS.UI_GREEN;
    ctx.fillText('[POWER]', powerX, powerY + 10);
  } else {
    // Low power state
    ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.fillText('[POWER]', powerX, powerY + 10);
  }
  
  // Power bar
  const powerLevel = 0.5 + Math.sin(globalTime * 3) * 0.5;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(powerX + 50, powerY, 40, 8);
  
  const powerColor = powerLevel > 0.3 ? COLORS.UI_GREEN : 
                     powerLevel > 0.1 ? COLORS.UI_YELLOW : COLORS.UI_RED;
  ctx.fillStyle = powerColor;
  ctx.fillRect(powerX + 50, powerY, 40 * powerLevel, 8);
  
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(powerX + 50, powerY, 40, 8);
  
  ctx.restore();
  
  // Mute indicator (top-right corner)
  ctx.save();
  const muteX = viewport.width - 150;
  const muteY = 25;
  const isMuted = audioManager.getMuteStatus();
  
  // Background for mute indicator
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(muteX - 5, muteY - 5, 130, 30);
  
  // Mute status
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  if (isMuted) {
    ctx.fillStyle = COLORS.UI_RED;
    ctx.fillText('🔇 MUTED', muteX, muteY + 10);
  } else {
    ctx.fillStyle = COLORS.UI_GREEN;
    ctx.fillText('🔊 AUDIO ON', muteX, muteY + 10);
  }
  
  // Mute toggle hint
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('Press [M]', muteX + 5, muteY + 22);
  ctx.restore();
  
  // Warning messages
  if (player.hp <= 20) {
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = Math.sin(globalTime * 15) > 0 ? COLORS.UI_RED : COLORS.UI_YELLOW;
    ctx.textAlign = 'center';
    ctx.fillText('! CRITICAL DAMAGE !', viewport.width / 2, 50);
  }
  
  // Controls hint (bottom center) - updated with mute
  ctx.save();
  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.textAlign = 'center';
  ctx.fillText('[A/D] Move  [W] Jump  [S] Crouch  [Space] Shoot  [M] Mute  [R] Restart', viewport.width / 2, viewport.height - 10);
  ctx.restore();
  
  ctx.restore();
}

// Track game over animation state
let gameOverTime = 0;
let lastGameOverState = false;
let glitchLines: {y: number, height: number, offset: number}[] = [];
let scanlineOffset = 0;
let chromaOffset = 0;
let shakeIntensity = 0;
let deathTransitionTime = 0;
let isDeathTransition = false;

// Death transition animation
function drawDeathTransition(ctx: CanvasRenderingContext2D, viewport: Viewport): boolean {
  if (!isDeathTransition) {
    isDeathTransition = true;
    deathTransitionTime = 0;
    try {
      audioManager.playDeathTransition();
    } catch {
      // Audio may not be available
    }
  }
  
  deathTransitionTime += 0.016;
  
  // Red static fade effect
  const fadeProgress = Math.min(deathTransitionTime / 1.5, 1);
  
  // Dark red overlay that gets stronger
  ctx.fillStyle = `rgba(80, 0, 0, ${fadeProgress * 0.7})`;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  
  // Red static noise
  ctx.save();
  ctx.globalAlpha = fadeProgress * 0.5;
  for (let i = 0; i < 1000 * fadeProgress; i++) {
    const x = Math.random() * viewport.width;
    const y = Math.random() * viewport.height;
    const isRed = Math.random() > 0.3;
    ctx.fillStyle = isRed ? `rgb(${Math.floor(Math.random() * 155 + 100)}, 0, 0)` : '#000000';
    ctx.fillRect(x, y, Math.random() * 5, Math.random() * 5);
  }
  ctx.restore();
  
  // Distortion lines
  ctx.save();
  ctx.globalAlpha = fadeProgress;
  for (let i = 0; i < 10; i++) {
    const y = Math.random() * viewport.height;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(viewport.width, y + (Math.random() - 0.5) * 20);
    ctx.stroke();
  }
  ctx.restore();
  
  // Return true when transition is complete
  return deathTransitionTime > 1.5;
}

function drawIntenseGameOver(ctx: CanvasRenderingContext2D, viewport: Viewport) {
  // Track time since game over started
  if (!lastGameOverState) {
    gameOverTime = 0;
    shakeIntensity = 20;
    // Initialize random glitch lines
    glitchLines = [];
    for (let i = 0; i < 5; i++) {
      glitchLines.push({
        y: Math.random() * viewport.height,
        height: 2 + Math.random() * 10,
        offset: -20 + Math.random() * 40
      });
    }
    // Play audio effects
    try {
      audioManager.resume();
      audioManager.playSystemFailure();
      setTimeout(() => audioManager.playRoboticVoice(), 200);
    } catch {
      // Audio might not be available
    }
  }
  gameOverTime += 0.016; // Assuming 60fps
  lastGameOverState = true;
  
  // Camera shake that decays over time
  if (shakeIntensity > 0) {
    ctx.save();
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;
    ctx.translate(shakeX, shakeY);
    shakeIntensity *= 0.95; // Decay shake
  }
  
  // Heavy dark overlay with slight transparency variation
  const overlayAlpha = 0.85 + Math.sin(globalTime * 30) * 0.05;
  ctx.fillStyle = `rgba(0, 0, 0, ${overlayAlpha})`;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  
  // CRT monitor curve distortion effect
  const gradient = ctx.createRadialGradient(
    viewport.width / 2, viewport.height / 2, 0,
    viewport.width / 2, viewport.height / 2, viewport.height
  );
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  
  // Heavy CRT noise overlay
  ctx.save();
  ctx.globalAlpha = 0.15 + Math.random() * 0.1;
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * viewport.width;
    const y = Math.random() * viewport.height;
    const brightness = Math.random() * 255;
    ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
  
  // Red static/blood effect
  ctx.save();
  ctx.globalAlpha = 0.3 + Math.sin(globalTime * 20) * 0.1;
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * viewport.width;
    const y = Math.random() * viewport.height;
    ctx.fillStyle = Math.random() > 0.3 ? '#ff0000' : '#000000';
    ctx.fillRect(x, y, Math.random() * 15, Math.random() * 3);
  }
  ctx.restore();
  
  // Horizontal glitch lines
  ctx.save();
  for (const line of glitchLines) {
    // Randomly update glitch positions
    if (Math.random() < 0.1) {
      line.y = Math.random() * viewport.height;
      line.offset = -30 + Math.random() * 60;
      // Play glitch sound occasionally
      if (Math.random() < 0.3) {
        try {
          audioManager.playGlitch();
        } catch {
          // Audio might not be available
        }
      }
    }
    
    // Draw glitched line segment
    ctx.globalAlpha = 0.8;
    ctx.drawImage(
      ctx.canvas,
      0, line.y, viewport.width, line.height,
      line.offset, line.y, viewport.width, line.height
    );
    
    // Add color distortion to glitch lines
    ctx.fillStyle = `rgba(255, 0, 0, ${0.1 + Math.random() * 0.2})`;
    ctx.fillRect(0, line.y, viewport.width, line.height);
  }
  ctx.restore();
  
  // Chromatic aberration effect on text
  chromaOffset = Math.sin(globalTime * 15) * 2 + Math.random() * 2;
  
  // Terminal-style game over text with multiple effects
  ctx.save();
  ctx.textAlign = 'center';
  
  // Main "SYSTEM FAILURE" text with effects
  if (gameOverTime > 0.2) { // Slight delay before showing
    ctx.font = 'bold 56px monospace';
    
    // Glitch duplicates
    if (Math.random() < 0.1) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#00ff00';
      ctx.fillText('SYSTEM FAILURE', viewport.width / 2 + 40, viewport.height / 2 - 20);
      ctx.fillStyle = '#ff00ff';
      ctx.fillText('SYSTEM FAILURE', viewport.width / 2 - 40, viewport.height / 2 - 20);
    }
    
    ctx.globalAlpha = 1;
    
    // Red channel (chromatic aberration)
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.fillText('SYSTEM FAILURE', viewport.width / 2 - chromaOffset, viewport.height / 2 - 20);
    
    // Green channel
    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.fillText('SYSTEM FAILURE', viewport.width / 2, viewport.height / 2 - 20);
    
    // Blue channel
    ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
    ctx.fillText('SYSTEM FAILURE', viewport.width / 2 + chromaOffset, viewport.height / 2 - 20);
    
    // Main white text on top
    ctx.fillStyle = '#ffffff';
    ctx.fillText('SYSTEM FAILURE', viewport.width / 2, viewport.height / 2 - 22);
    
    // Flickering glow effect
    if (Math.sin(globalTime * 40) > 0.5) {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ff0000';
      ctx.fillText('SYSTEM FAILURE', viewport.width / 2, viewport.height / 2 - 22);
      ctx.shadowBlur = 0;
    }
  }
  
  // "SUBJECT TERMINATED" subtitle with typewriter effect
  if (gameOverTime > 0.8) {
    ctx.font = 'bold 28px monospace';
    const subtitle = 'SUBJECT TERMINATED';
    const typedLength = Math.min(subtitle.length, Math.floor((gameOverTime - 0.8) * 30));
    const typedText = subtitle.substring(0, typedLength);
    
    // Red glow
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ff8800';
    ctx.fillText(typedText, viewport.width / 2, viewport.height / 2 + 30);
    ctx.shadowBlur = 0;
    
    // Cursor blink
    if (typedLength === subtitle.length && Math.sin(globalTime * 8) > 0) {
      ctx.fillRect(viewport.width / 2 + ctx.measureText(typedText).width / 2 + 5, 
                   viewport.height / 2 + 20, 2, 20);
    }
  }
  
  // Error code/diagnostic text (for atmosphere)
  if (gameOverTime > 1.2) {
    ctx.font = '12px monospace';
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#00ff00';
    ctx.textAlign = 'left';
    const diagnostics = [
      'ERROR CODE: 0xDEAD',
      'VITAL SIGNS: NULL',
      'COMBAT STATUS: KIA',
      'RESPAWN PROTOCOL: READY'
    ];
    diagnostics.forEach((text, i) => {
      if (gameOverTime > 1.2 + i * 0.1) {
        ctx.fillText(text, 20, 30 + i * 20);
      }
    });
    ctx.textAlign = 'center';
    ctx.globalAlpha = 1;
  }
  
  // Restart prompt (delayed by 2 seconds)
  if (gameOverTime > 2.0) {
    ctx.font = 'bold 20px monospace';
    
    // Pulsing effect
    const pulse = 0.7 + Math.sin(globalTime * 4) * 0.3;
    ctx.globalAlpha = pulse;
    
    // Green scanline effect over restart text
    if (Math.sin(globalTime * 3) > 0) {
      ctx.fillStyle = COLORS.UI_GREEN;
      ctx.shadowColor = COLORS.UI_GREEN;
      ctx.shadowBlur = 15;
      ctx.fillText('[PRESS R TO REINITIALIZE]', viewport.width / 2, viewport.height / 2 + 80);
      ctx.shadowBlur = 0;
    }
    
    // Brackets animation
    const bracketOffset = Math.sin(globalTime * 6) * 3;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('[', viewport.width / 2 - 140 - bracketOffset, viewport.height / 2 + 80);
    ctx.fillText(']', viewport.width / 2 + 140 + bracketOffset, viewport.height / 2 + 80);
  }
  
  // Scanlines moving down
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#00ff00';
  scanlineOffset = (scanlineOffset + 2) % 10;
  for (let y = scanlineOffset; y < viewport.height; y += 10) {
    ctx.fillRect(0, y, viewport.width, 1);
  }
  
  // Intermittent full-screen flash
  if (Math.random() < 0.02) {
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }
  
  ctx.restore();
  
  // End shake effect
  if (shakeIntensity > 0) {
    ctx.restore();
  }
}

// Reset game over state when game restarts
export function resetGameOverState() {
  lastGameOverState = false;
  gameOverTime = 0;
  shakeIntensity = 0;
  deathTransitionTime = 0;
  isDeathTransition = false;
  
  // Stop ambient sounds when game over
  try {
    audioManager.stopAmbientSounds();
  } catch {
    // Audio may not be available
  }
}
