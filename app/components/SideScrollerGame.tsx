"use client";

import { useEffect, useRef } from "react";
import { Platform, Enemy, Projectile, HealthPack, Particle, Splat } from "./game/types";
import { rand, generateInitialPlatforms, addPlatformChunk } from "./game/platforms";
import { spawnEnemy } from "./game/spawn";
import { spawnGore as spawnGoreFx } from "./game/effects";
import { updateGame } from "./game/update";
import { renderGame } from "./game/render";

export default function SideScrollerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Retro look: disable smoothing for crisper pixels
    ctx.imageSmoothingEnabled = false;

    // Track viewport in CSS pixels (independent of devicePixelRatio)
    const viewport = { width: window.innerWidth, height: window.innerHeight };

    // High-DPI aware canvas sizing
    const resizeCanvas = () => {
      viewport.width = window.innerWidth;
      viewport.height = window.innerHeight;
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Game state (endless scroller)
    const game = {
      camera: { x: 0, y: 0 },
      world: { height: 800 },
      score: 0,
      distance: 0, // total distance traveled
      gameOver: false,
      paused: false,
      shakeTime: 0,
      shakeMag: 0,
      difficulty: 1, // scales over time
      nextPlatformX: 0, // where to generate next platform chunk
      lastEnemySpawn: 0, // distance since last enemy spawn
    };

    const addShake = (mag: number, time: number) => {
      game.shakeMag = Math.max(game.shakeMag, mag);
      game.shakeTime = Math.max(game.shakeTime, time);
    };

    // Player (smoother motion with accel/friction and variable jump)
    const player = {
      x: 100,
      y: 0,
      width: 36,
      height: 72,
      baseHeight: 72, // original standing height
      crouchHeight: 45, // crouched height
      vx: 0,
      vy: 0,
      maxSpeed: 380, // px/s
      accel: 2200, // px/s^2
      friction: 2400, // px/s^2
      jumpPower: 950, // px/s
      onGround: false,
      hp: 100,
      facing: 1 as 1 | -1,
      shootCooldown: 0,
      shootInterval: 0.18, // seconds
      // Animation state
      animTime: 0,
      isWalking: false,
      isJumping: false,
      isShooting: false,
      isCrouching: false,
    };

    // Jump helpers
    const GRAVITY = 2600; // px/s^2
    const COYOTE_TIME = 0.08; // seconds grace after leaving ground
    const JUMP_BUFFER = 0.12; // seconds grace before landing
    let coyoteTimer = 0;
    let jumpBufferTimer = 0;
    let jumpHeld = false;

    // Endless platform generation

    let platforms: Platform[] = generateInitialPlatforms();
    game.nextPlatformX = 1400;

    // Place player on first platform
    if (platforms.length > 0) {
      const start = platforms[0];
      player.x = 80;
      player.y = start.y - player.height;
    }


    let enemies: Enemy[] = [];
    const projectiles: Projectile[] = [];
    const healthPacks: HealthPack[] = [];

    // Gore particles and blood splats
    const particles: Particle[] = [];
    const splats: Splat[] = [];

    // Input handling
    const keys: { [key: string]: boolean } = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (k === " ") e.preventDefault();
      if (k === "w" || k === "arrowup") {
        controls.jumpBufferTimer = JUMP_BUFFER;
        controls.jumpHeld = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = false;
      if (k === "w" || k === "arrowup") {
        controls.jumpHeld = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Controls used by update loop (jump helpers)
    const controls = { coyoteTimer: 0, jumpBufferTimer: 0, jumpHeld: false };

    // Game loop
    let lastTime = 0;
    let animationId: number;
    const gameLoop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
      lastTime = timestamp;
      if (!game.paused && !game.gameOver) {
        updateGame(dt, {
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
        });
      }
      renderGame({
        ctx,
        game,
        viewport,
        platforms,
        enemies,
        projectiles,
        healthPacks,
        particles,
        splats,
        player,
      });
      animationId = requestAnimationFrame(gameLoop);
    };

    const update = (dt: number) => {
      // Update distance and difficulty based on actual player movement
      const prevDist = Math.floor(game.distance / 500);
      const prevPlayerX = player.x;
      
      // Only increase distance when player moves forward (and is moving)
      if (Math.abs(player.vx) > 10) {
        game.distance += Math.max(0, player.vx * dt * 0.5); // Only forward movement counts
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
      platforms = platforms.filter(p => p.x + p.width > cleanupX || p.y > 700); // keep safety ground
      enemies = enemies.filter(e => e.x + e.width > cleanupX && e.hp > 0);
      
      // Update screen shake timer
      if (game.shakeTime > 0) game.shakeTime = Math.max(0, game.shakeTime - dt);

      // Update player animation state
      player.animTime += dt;
      const left = keys["a"] || keys["arrowleft"];
      const right = keys["d"] || keys["arrowright"];
      const crouch = keys["s"] || keys["arrowdown"];
      const dir = (left ? -1 : 0) + (right ? 1 : 0);
      
      // Handle crouching
      const wasCrouching = player.isCrouching;
      player.isCrouching = crouch && player.onGround;
      
      // Adjust player height and position when crouching
      if (player.isCrouching && !wasCrouching) {
        // Start crouching - move player down to maintain foot position
        const heightDiff = player.baseHeight - player.crouchHeight;
        player.y += heightDiff;
        player.height = player.crouchHeight;
      } else if (!player.isCrouching && wasCrouching) {
        // Stop crouching - move player up
        const heightDiff = player.baseHeight - player.crouchHeight;
        player.y -= heightDiff;
        player.height = player.baseHeight;
      }
      
      player.isWalking = Math.abs(player.vx) > 50 && player.onGround && !player.isCrouching;
      player.isJumping = !player.onGround;
      
      // Player horizontal movement (accel/friction)
      const crouchSpeedMultiplier = player.isCrouching ? 0.5 : 1.0;
      if (dir !== 0) {
        player.vx += dir * player.accel * dt * crouchSpeedMultiplier;
        const maxSpeed = player.maxSpeed * crouchSpeedMultiplier;
        if (Math.abs(player.vx) > maxSpeed) {
          player.vx = maxSpeed * Math.sign(player.vx);
        }
        player.facing = dir > 0 ? 1 : -1;
      } else {
        // apply friction towards 0
        const f = player.friction * dt;
        if (Math.abs(player.vx) <= f) player.vx = 0;
        else player.vx -= Math.sign(player.vx) * f;
      }

      // Jump buffering / coyote time (can't jump while crouching)
      coyoteTimer = player.onGround ? COYOTE_TIME : Math.max(0, coyoteTimer - dt);
      if (jumpBufferTimer > 0) jumpBufferTimer -= dt;
      if (jumpBufferTimer > 0 && (player.onGround || coyoteTimer > 0) && !player.isCrouching) {
        player.vy = -player.jumpPower;
        player.onGround = false;
        coyoteTimer = 0;
        jumpBufferTimer = 0;
      }

      // Gravity (stronger when jump not held for variable jump height)
      player.vy += GRAVITY * dt * (jumpHeld && player.vy < 0 ? 0.7 : 1);

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
        // Adjust shooting height based on crouch state
        const shootY = player.isCrouching ? 
          player.y + player.height * 0.6 : // shoot from upper body when crouching
          player.y + player.height * 0.4;  // shoot from chest when standing
        
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
        setTimeout(() => { player.isShooting = false; }, 100);
      }

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
              // Heavy enemies shoot 3 projectiles in spread
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

        // Remove if out of bounds (relative to camera)
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
                spawnGoreFx(particles, splats, addShake, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 16);
                
                // 25% chance to drop health pack
                if (Math.random() < 0.25) {
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
            spawnGoreFx(particles, splats, addShake, player.x + player.width / 2, player.y + player.height / 2, 10);
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
        hp.y += Math.sin(hp.animTime * 3) * 0.5; // gentle float animation
        
        // Check collision with player
        if (!hp.collected &&
            player.x < hp.x + hp.width &&
            player.x + player.width > hp.x &&
            player.y < hp.y + hp.height &&
            player.y + player.height > hp.y) {
          player.hp = Math.min(100, player.hp + 25);
          game.score += 50;
          hp.collected = true;
          addShake(2, 0.1);
        }
        
        // Remove if collected or too far behind
        if (hp.collected || hp.x < game.camera.x - 200) {
          healthPacks.splice(i, 1);
        }
      }

      // Update camera for endless scrolling with shake
      const maxCamY = Math.max(0, game.world.height - viewport.height);
      const shakeX = game.shakeTime > 0 ? (Math.random() * 2 - 1) * game.shakeMag : 0;
      const shakeY = game.shakeTime > 0 ? (Math.random() * 2 - 1) * game.shakeMag : 0;
      
      // Camera follows player but also auto-scrolls slightly
      const targetCamX = Math.max(game.distance * 0.8, player.x - viewport.width / 2 + 100);
      game.camera.x = targetCamX + shakeX;
      game.camera.y = Math.max(0, Math.min(maxCamY, player.y - viewport.height / 2 + shakeY));
    };

    const render = () => {
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
        
        // Color and style per enemy type (health-based variation below)
        
        // Health-based color variation
        const healthPct = enemy.hp / enemy.maxHp;
        const r = Math.floor(255 * (1 - healthPct * 0.3));
        const g = Math.floor(100 * healthPct);
        const b = Math.floor(100 * healthPct);
        
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        
        // Animate with slight bobbing
        const bob = Math.sin(enemy.animTime * 4) * 2;
        ctx.fillRect(enemy.x, enemy.y + bob, enemy.width, enemy.height);
        
        // Type-specific details
        ctx.fillStyle = "#000";
        switch (enemy.type) {
          case 'heavy':
            // Thick border
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.strokeRect(enemy.x, enemy.y + bob, enemy.width, enemy.height);
            // Double eyes
            ctx.fillRect(enemy.x + enemy.width * 0.3, enemy.y + bob + 8, 6, 6);
            ctx.fillRect(enemy.x + enemy.width * 0.7, enemy.y + bob + 8, 6, 6);
            break;
          case 'fast':
            // Motion lines behind
            ctx.fillStyle = "rgba(255, 107, 74, 0.5)";
            for (let i = 1; i <= 3; i++) {
              ctx.fillRect(enemy.x - i * 8, enemy.y + bob + enemy.height * 0.3, 4, enemy.height * 0.4);
            }
            // Single eye
            ctx.fillStyle = "#000";
            ctx.fillRect(enemy.x + enemy.width * 0.6, enemy.y + bob + 6, 4, 4);
            break;
          case 'sniper':
            // Scope line
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(enemy.x + enemy.width, enemy.y + bob + enemy.height * 0.4);
            ctx.lineTo(enemy.x + enemy.width + 20, enemy.y + bob + enemy.height * 0.4);
            ctx.stroke();
            // Cross-hair eye
            ctx.fillRect(enemy.x + enemy.width * 0.5, enemy.y + bob + 8, 8, 2);
            ctx.fillRect(enemy.x + enemy.width * 0.54, enemy.y + bob + 4, 2, 8);
            break;
          default: // grunt
            // Simple eye
            ctx.fillRect(enemy.x + enemy.width * 0.6, enemy.y + bob + 8, 6, 6);
        }
      }

      // Draw player (simplified robot character)
      const healthPct = player.hp / 100;
      const bloodiness = 1 - healthPct;
      
      // Main character colors - cyan robot
      const primaryColor = bloodiness > 0.3 ? `#ff${Math.floor(200 * healthPct).toString(16).padStart(2, '0')}${Math.floor(200 * healthPct).toString(16).padStart(2, '0')}` : "#00d4ff";
      const secondaryColor = "#0099cc";
      
      const px = player.x + player.width / 2;
      const py = player.y;
      
      // Animation offsets
      const walkBob = player.isWalking ? Math.sin(player.animTime * 8) * 1.5 : 0;
      const jumpStretch = player.isJumping ? -2 : 0;
      const shootRecoil = player.isShooting ? player.facing * -1.5 : 0;
      
      // Adjust positioning for crouching
      const headY = py + 2;
      const bodyStartY = py + 18;
      
      // Head/helmet (always at top)
      ctx.fillStyle = primaryColor;
      ctx.fillRect(px - 8 + shootRecoil, headY + walkBob + jumpStretch, 16, 14);
      
      // Helmet details
      ctx.fillStyle = secondaryColor;
      ctx.fillRect(px - 6 + shootRecoil, headY + 2 + walkBob + jumpStretch, 12, 2); // visor
      
      // Eyes/visor glow
      ctx.fillStyle = player.isShooting ? "#ff4444" : "#44ff44";
      ctx.fillRect(px - 5 + shootRecoil, headY + 5 + walkBob + jumpStretch, 3, 2);
      ctx.fillRect(px + 2 + shootRecoil, headY + 5 + walkBob + jumpStretch, 3, 2);
      
      // Blood splatter on helmet if low health
      if (bloodiness > 0.5) {
        ctx.fillStyle = "#b11414";
        ctx.fillRect(px - 3 + shootRecoil, headY + 3 + walkBob, 2, 2);
        ctx.fillRect(px + 2 + shootRecoil, headY + 8 + walkBob, 3, 1);
      }
      
      if (player.isCrouching) {
        // Crouched position - compact body
        const crouchBodyY = bodyStartY + 8;
        const crouchBodyHeight = 12;
        
        // Body (shorter when crouched)
        ctx.fillStyle = primaryColor;
        ctx.fillRect(px - 10 + shootRecoil * 0.5, crouchBodyY + walkBob, 20, crouchBodyHeight);
        
        // Chest detail
        ctx.fillStyle = secondaryColor;
        ctx.fillRect(px - 8 + shootRecoil * 0.5, crouchBodyY + 2 + walkBob, 16, 2);
        
        // Arms positioned for crouching
        ctx.fillStyle = primaryColor;
        const armRaise = player.isShooting ? -4 : 0;
        
        // Left arm
        ctx.fillRect(px - 14 + shootRecoil, crouchBodyY + 6 + armRaise + walkBob, 6, 3);
        ctx.fillRect(px - 16 + shootRecoil, crouchBodyY + 9 + armRaise + walkBob, 3, 8);
        
        // Right arm (shooting arm)
        ctx.fillRect(px + 8 + shootRecoil, crouchBodyY + 6 + armRaise + walkBob, 6, 3);
        ctx.fillRect(px + 13 + shootRecoil, crouchBodyY + 9 + armRaise + walkBob, 3, 8);
        
        // Weapon when shooting
        if (player.isShooting) {
          ctx.fillStyle = "#666";
          ctx.fillRect(px + 16 + shootRecoil, crouchBodyY + 7 + armRaise + walkBob, 6, 2);
        }
        
        // Legs - folded/bent
        ctx.fillStyle = primaryColor;
        // Thighs (horizontal when crouched)
        ctx.fillRect(px - 8, crouchBodyY + crouchBodyHeight, 5, 8);
        ctx.fillRect(px + 3, crouchBodyY + crouchBodyHeight, 5, 8);
        
        // Lower legs (bent back under body)
        ctx.fillRect(px - 10, crouchBodyY + crouchBodyHeight + 4, 4, 12);
        ctx.fillRect(px + 6, crouchBodyY + crouchBodyHeight + 4, 4, 12);
        
        // Feet
        ctx.fillRect(px - 12, crouchBodyY + crouchBodyHeight + 14, 6, 3);
        ctx.fillRect(px + 6, crouchBodyY + crouchBodyHeight + 14, 6, 3);
        
      } else {
        // Standing position
        const standBodyHeight = 20;
        
        // Body
        ctx.fillStyle = primaryColor;
        ctx.fillRect(px - 10 + shootRecoil * 0.5, bodyStartY + walkBob, 20, standBodyHeight);
        
        // Chest detail
        ctx.fillStyle = secondaryColor;
        ctx.fillRect(px - 8 + shootRecoil * 0.5, bodyStartY + 3 + walkBob, 16, 3);
        
        // Arms
        const armSwing = player.isWalking ? Math.sin(player.animTime * 8) * 2 : 0;
        const armRaise = player.isShooting ? -6 : 0;
        
        ctx.fillStyle = primaryColor;
        // Left arm
        ctx.fillRect(px - 16 + armSwing + shootRecoil, bodyStartY + 8 + armRaise + walkBob, 7, 4);
        ctx.fillRect(px - 18 + armSwing + shootRecoil, bodyStartY + 12 + armRaise + walkBob, 4, 10);
        
        // Right arm
        ctx.fillRect(px + 9 - armSwing + shootRecoil, bodyStartY + 8 + armRaise + walkBob, 7, 4);
        ctx.fillRect(px + 14 - armSwing + shootRecoil, bodyStartY + 12 + armRaise + walkBob, 4, 10);
        
        // Weapon when shooting
        if (player.isShooting) {
          ctx.fillStyle = "#666";
          ctx.fillRect(px + 16 + shootRecoil, bodyStartY + 10 + armRaise + walkBob, 8, 2);
        }
        
        // Legs
        const legSwing = player.isWalking ? Math.sin(player.animTime * 8 + Math.PI) * 3 : 0;
        const legsY = bodyStartY + standBodyHeight;
        const legHeight = player.height - (legsY - py);
        
        ctx.fillStyle = primaryColor;
        // Left leg
        ctx.fillRect(px - 7 + legSwing, legsY + walkBob, 5, legHeight - 4);
        ctx.fillRect(px - 8 + legSwing, py + player.height - 4, 7, 4); // foot
        
        // Right leg
        ctx.fillRect(px + 2 - legSwing, legsY + walkBob, 5, legHeight - 4);
        ctx.fillRect(px + 1 - legSwing, py + player.height - 4, 7, 4); // foot
      }
      
      // Blood on torso if damaged
      if (bloodiness > 0.3) {
        ctx.fillStyle = `rgba(177, 20, 20, ${bloodiness})`;
        ctx.fillRect(px - 4 + shootRecoil, bodyStartY + 8 + walkBob, 8, 4);
      }

      // Gore particles
      for (const p of particles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      }
      
      // Draw health packs (animated floating cross)
      for (const hp of healthPacks) {
        if (hp.collected) continue;
        
        const pulse = 0.8 + Math.sin(hp.animTime * 6) * 0.2;
        const size = hp.width * pulse;
        const x = hp.x + (hp.width - size) / 2;
        const y = hp.y + (hp.height - size) / 2;
        
        // Green cross background
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(x, y, size, size);
        
        // White cross symbol
        ctx.fillStyle = "#fff";
        const crossSize = size * 0.6;
        const crossX = x + (size - crossSize) / 2;
        const crossY = y + (size - crossSize) / 2;
        
        // Horizontal bar
        ctx.fillRect(crossX, crossY + crossSize * 0.35, crossSize, crossSize * 0.3);
        // Vertical bar
        ctx.fillRect(crossX + crossSize * 0.35, crossY, crossSize * 0.3, crossSize);
        
        // Glow effect
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = 8;
        ctx.fillRect(x, y, size, size);
        ctx.shadowBlur = 0;
      }

      // Draw projectiles
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

      // Draw HUD (use viewport size)
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
    };

    // Restart handler (regenerate level/enemies)
    const handleRestart = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r" && game.gameOver) {
        // Reset everything for new endless run
        game.score = 0;
        game.distance = 0;
        game.difficulty = 1;
        game.gameOver = false;
        game.lastEnemySpawn = 0;
        projectiles.length = 0;
        platforms = generateInitialPlatforms();
        game.nextPlatformX = 1400;
        enemies.length = 0;
        healthPacks.length = 0;
        
        // reposition player at start
        const start = platforms[0];
        player.x = 80;
        player.y = start ? start.y - player.height : 400;
        player.vx = 0;
        player.vy = 0;
        player.hp = 100;
        player.onGround = false;
        player.animTime = 0;
        player.isWalking = false;
        player.isJumping = false;
        player.isShooting = false;
        player.isCrouching = false;
        player.height = player.baseHeight; // Reset to standing height
        controls.coyoteTimer = 0;
        controls.jumpBufferTimer = 0;
        controls.jumpHeld = false;
        game.shakeMag = 0;
        particles.length = 0;
        splats.length = 0;
      }
    };
    window.addEventListener("keydown", handleRestart);

    // Start game loop
    animationId = requestAnimationFrame(gameLoop);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("keydown", handleRestart);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
