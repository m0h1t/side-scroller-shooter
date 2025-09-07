import { Enemy, HealthPack, Particle, Platform, Projectile, Splat, HealthPack as HP } from "./types";
import type { Player } from "./types";
import { spawnGore } from "./effects";

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

export type Controls = { coyoteTimer: number; jumpBufferTimer: number; jumpHeld: boolean };

export type UpdateDeps = {
  game: GameState;
  player: Player;
  viewport: Viewport;
  platforms: Platform[];
  enemies: Enemy[];
  projectiles: Projectile[];
  healthPacks: HealthPack[];
  particles: Particle[];
  splats: Splat[];
  keys: Record<string, boolean>;
  addShake: (mag: number, time: number) => void;
  constants: { GRAVITY: number; COYOTE_TIME: number };
  controls: Controls;
  rand: (min?: number, max?: number) => number;
  addPlatformChunk: (startX: number, platforms: Platform[], game: GameState) => void;
  spawnEnemy: (x: number, platforms: Platform[], game: GameState) => Enemy | null;
};

export function updateGame(dt: number, deps: UpdateDeps) {
  const {
    game,
    player,
    viewport,
    platforms,
    enemies,
    projectiles,
    healthPacks,
    particles,
    splats,
    keys,
    addShake,
    constants: { GRAVITY, COYOTE_TIME },
    controls,
    rand,
    addPlatformChunk,
    spawnEnemy,
  } = deps;

  const prevDist = Math.floor(game.distance / 500);

  // Only increase distance when player moves
  if (Math.abs(player.vx) > 10) {
    game.distance += Math.max(0, player.vx * dt * 0.5);
  }
  game.difficulty = 1 + Math.floor(game.distance / 1000) * 0.3;

  // Award distance points
  const newDist = Math.floor(game.distance / 500);
  if (newDist > prevDist) game.score += 25;

  // Generate more platforms ahead
  if (player.x + 800 > game.nextPlatformX) {
    addPlatformChunk(game.nextPlatformX, platforms, game);
  }

  // Spawn enemies periodically (more frequent with difficulty)
  const spawnDist = Math.max(300, 800 - game.difficulty * 50);
  if (game.distance - game.lastEnemySpawn > spawnDist) {
    const newEnemy = spawnEnemy(player.x + rand(400, 800), platforms, game);
    if (newEnemy) {
      enemies.push(newEnemy);
      game.lastEnemySpawn = game.distance;
    }
  }

  // Clean up old platforms/enemies behind camera
  const cleanupX = game.camera.x - 500;
  for (let i = platforms.length - 1; i >= 0; i--) {
    const p = platforms[i];
    if (!(p.x + p.width > cleanupX || p.y > 700)) platforms.splice(i, 1);
  }
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!(e.x + e.width > cleanupX && e.hp > 0)) enemies.splice(i, 1);
  }

  // Update screen shake timer
  if (game.shakeTime > 0) game.shakeTime = Math.max(0, game.shakeTime - dt);

  // Update player animation state and inputs
  player.animTime += dt;
  const left = keys["a"] || keys["arrowleft"];
  const right = keys["d"] || keys["arrowright"];
  const crouch = keys["s"] || keys["arrowdown"];
  const dir = (left ? -1 : 0) + (right ? 1 : 0);

  // Handle crouching
  const wasCrouching = player.isCrouching;
  player.isCrouching = crouch && player.onGround;

  if (player.isCrouching && !wasCrouching) {
    const heightDiff = player.baseHeight - player.crouchHeight;
    player.y += heightDiff;
    player.height = player.crouchHeight;
  } else if (!player.isCrouching && wasCrouching) {
    const heightDiff = player.baseHeight - player.crouchHeight;
    player.y -= heightDiff;
    player.height = player.baseHeight;
  }

  player.isWalking = Math.abs(player.vx) > 50 && player.onGround && !player.isCrouching;
  player.isJumping = !player.onGround;

  // Player horizontal movement
  const crouchSpeedMultiplier = player.isCrouching ? 0.5 : 1.0;
  if (dir !== 0) {
    player.vx += dir * player.accel * dt * crouchSpeedMultiplier;
    const maxSpeed = player.maxSpeed * crouchSpeedMultiplier;
    if (Math.abs(player.vx) > maxSpeed) {
      player.vx = maxSpeed * Math.sign(player.vx);
    }
    player.facing = dir > 0 ? 1 : -1;
  } else {
    const f = player.friction * dt;
    if (Math.abs(player.vx) <= f) player.vx = 0;
    else player.vx -= Math.sign(player.vx) * f;
  }

  // Jump buffering / coyote time (can't jump while crouching)
  controls.coyoteTimer = player.onGround ? COYOTE_TIME : Math.max(0, controls.coyoteTimer - dt);
  if (controls.jumpBufferTimer > 0) controls.jumpBufferTimer -= dt;
  if (controls.jumpBufferTimer > 0 && (player.onGround || controls.coyoteTimer > 0) && !player.isCrouching) {
    player.vy = -player.jumpPower;
    player.onGround = false;
    controls.coyoteTimer = 0;
    controls.jumpBufferTimer = 0;
  }

  // Gravity (stronger when jump not held for variable jump height)
  player.vy += GRAVITY * dt * (controls.jumpHeld && player.vy < 0 ? 0.7 : 1);

  // Smooth crouch animation blend (visual-only)
  const crouchTarget = player.isCrouching ? 1 : 0;
  const blendSpeed = 10; // higher is snappier
  player.crouchAnim += (crouchTarget - player.crouchAnim) * Math.min(1, dt * blendSpeed);
  if (player.crouchAnim < 0) player.crouchAnim = 0; else if (player.crouchAnim > 1) player.crouchAnim = 1;

  // Integrate with axis-separated collision
  // Move X
  player.x += player.vx * dt;
  for (const p of platforms) {
    if (
      player.x < p.x + p.width &&
      player.x + player.width > p.x &&
      player.y < p.y + p.height &&
      player.y + player.height > p.y
    ) {
      if (player.vx > 0) player.x = p.x - player.width;
      else if (player.vx < 0) player.x = p.x + p.width;
      player.vx = 0;
    }
  }

  // Move Y
  player.y += player.vy * dt;
  player.onGround = false;
  for (const p of platforms) {
    if (
      player.x < p.x + p.width &&
      player.x + player.width > p.x &&
      player.y < p.y + p.height &&
      player.y + player.height > p.y
    ) {
      if (player.vy > 0) {
        player.y = p.y - player.height;
        player.onGround = true;
      } else if (player.vy < 0) {
        player.y = p.y + p.height;
      }
      player.vy = 0;
    }
  }

  // Keep player from going too far back but allow endless forward movement
  player.x = Math.max(game.camera.x - 200, player.x);
  if (player.y > game.world.height) game.gameOver = true;

  // Shooting (cooldown in seconds)
  player.shootCooldown -= dt;
  if (keys[" "] && player.shootCooldown <= 0) {
    const shootY = player.isCrouching ? player.y + player.height * 0.6 : player.y + player.height * 0.4;
    projectiles.push({
      x: player.x + (player.facing > 0 ? player.width : 0),
      y: shootY,
      vx: player.facing * 600,
      vy: 0,
      width: 8,
      height: 4,
      fromPlayer: true,
    });
    player.shootCooldown = player.shootInterval;
    player.isShooting = true;
    player.shootAnim = 0.12;
    setTimeout(() => {
      player.isShooting = false;
    }, 100);
  }

  // Shooting anim decay
  if (player.shootAnim > 0) player.shootAnim = Math.max(0, player.shootAnim - dt);

  // Update enemies
  for (const enemy of enemies) {
    if (!enemy.active || enemy.hp <= 0) continue;

    enemy.animTime += dt;

    // Patrol movement (adjust bounds based on camera)
    enemy.x += enemy.vx * dt;
    if (enemy.x < game.camera.x - 100 || enemy.x > game.camera.x + viewport.width + 100) {
      enemy.vx *= -1;
    }

    // Enemy shooting (different behavior per type)
    enemy.shootTimer -= dt;
    if (enemy.shootTimer <= 0) {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy);

      let range = 600;
      let projectileSpeed = 300;

      switch (enemy.type) {
        case 'sniper':
          range = 1000;
          projectileSpeed = 500;
          break;
        case 'fast':
          range = 400;
          projectileSpeed = 350;
          break;
        case 'heavy':
          range = 500;
          projectileSpeed = 250;
          if (dist < range) {
            for (let i = -1; i <= 1; i++) {
              const angle = Math.atan2(dy, dx) + i * 0.3;
              projectiles.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height / 2,
                vx: Math.cos(angle) * projectileSpeed,
                vy: Math.sin(angle) * projectileSpeed,
                width: 8,
                height: 8,
                fromPlayer: false,
              });
            }
            enemy.shootTimer = enemy.shootInterval;
          }
          continue;
      }

      if (dist < range) {
        projectiles.push({
          x: enemy.x + enemy.width / 2,
          y: enemy.y + enemy.height / 2,
          vx: (dx / Math.max(1, dist)) * projectileSpeed,
          vy: (dy / Math.max(1, dist)) * projectileSpeed,
          width: 6,
          height: 6,
          fromPlayer: false,
        });
        enemy.shootTimer = enemy.shootInterval;
      }
    }
  }

  // Update projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;

    if (
      proj.x < game.camera.x - 200 ||
      proj.x > game.camera.x + viewport.width + 200 ||
      proj.y < -100 ||
      proj.y > game.world.height + 100
    ) {
      projectiles.splice(i, 1);
      continue;
    }

    // Collision with platforms
    for (const platform of platforms) {
      if (
        proj.x < platform.x + platform.width &&
        proj.x + proj.width > platform.x &&
        proj.y < platform.y + platform.height &&
        proj.y + proj.height > platform.y
      ) {
        projectiles.splice(i, 1);
        break;
      }
    }

    // Collision with enemies/player
    if (proj.fromPlayer) {
      for (const enemy of enemies) {
        if (enemy.hp <= 0 || !enemy.active) continue;
        if (
          proj.x < enemy.x + enemy.width &&
          proj.x + proj.width > enemy.x &&
          proj.y < enemy.y + enemy.height &&
          proj.y + proj.height > enemy.y
        ) {
          enemy.hp--;
          projectiles.splice(i, 1);
          if (enemy.hp <= 0) {
            const points = enemy.type === 'heavy' ? 200 : enemy.type === 'sniper' ? 150 : enemy.type === 'fast' ? 75 : 100;
            game.score += points;
            spawnGore(particles, splats, addShake, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 16);
            // 40% chance to drop a health pack on kill
            if (Math.random() < 0.4) {
              healthPacks.push({
                x: enemy.x + enemy.width / 2 - 10,
                y: enemy.y + enemy.height / 2 - 10,
                width: 20,
                height: 20,
                animTime: 0,
                collected: false,
              });
            }
          }
          break;
        }
      }
    } else {
      if (
        proj.x < player.x + player.width &&
        proj.x + proj.width > player.x &&
        proj.y < player.y + player.height &&
        proj.y + proj.height > player.y
      ) {
        player.hp -= 10;
        projectiles.splice(i, 1);
        spawnGore(particles, splats, addShake, player.x + player.width / 2, player.y + player.height / 2, 10);
        addShake(4, 0.12);
        if (player.hp <= 0) game.gameOver = true;
      }
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += GRAVITY * 0.8 * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Update health packs
  for (let i = healthPacks.length - 1; i >= 0; i--) {
    const hp = healthPacks[i];
    hp.animTime += dt;
    hp.y += Math.sin(hp.animTime * 3) * 0.5;

    if (
      !hp.collected &&
      player.x < hp.x + hp.width &&
      player.x + player.width > hp.x &&
      player.y < hp.y + hp.height &&
      player.y + player.height > hp.y
    ) {
      player.hp = Math.min(100, player.hp + 25);
      game.score += 50;
      hp.collected = true;
      addShake(2, 0.1);
    }

    if (hp.collected || hp.x < game.camera.x - 200) {
      healthPacks.splice(i, 1);
    }
  }

  // Update camera
  const maxCamY = Math.max(0, game.world.height - deps.viewport.height);
  const shakeX = game.shakeTime > 0 ? (Math.random() * 2 - 1) * game.shakeMag : 0;
  const shakeY = game.shakeTime > 0 ? (Math.random() * 2 - 1) * game.shakeMag : 0;
  const targetCamX = Math.max(game.distance * 0.8, player.x - deps.viewport.width / 2 + 100);
  game.camera.x = targetCamX + shakeX;
  game.camera.y = Math.max(0, Math.min(maxCamY, player.y - deps.viewport.height / 2 + shakeY));
}

