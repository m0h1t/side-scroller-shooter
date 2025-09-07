"use client";

import { useEffect, useRef } from "react";
import { clamp } from "./game/math";

// Simple side-scroller shooter rendered on a Canvas.
// Controls:
// - Left/Right: A/D or ArrowLeft/ArrowRight
// - Jump: W or ArrowUp
// - Shoot: Space
// Player is drawn as a simple stick-figure. Enemies are squares that shoot.

type Vec = { x: number; y: number };

type Rect = { x: number; y: number; w: number; h: number };

type Platform = Rect;

type Bullet = {
  pos: Vec;
  vel: Vec;
  r: number; // radius
  from: "player" | "enemy";
  alive: boolean;
};

type Enemy = {
  pos: Vec; // top-left
  size: number;
  velX: number; // patrol velocity
  hp: number;
  shootCooldown: number; // seconds
  shootTimer: number; // seconds
  alive: boolean;
  active: boolean; // becomes true when introduced
};


export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to window
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // World setup
    const keys = new Set<string>();

    const gravity = 2600; // px/s^2
    const playerSpeed = 380; // px/s
    const jumpVel = 950; // px/s
    const friction = 0.0008; // ground friction factor per ms

    const player = {
      pos: { x: 100, y: 0 }, // top-left
      size: { w: 36, h: 72 },
      vel: { x: 0, y: 0 },
      onGround: false,
      hp: 100,
      shootCooldown: 0.18,
      shootTimer: 0,
    };

    const world = {
      width: 4000,
      height: 1200,
    };

    const camera = { x: 0, y: 0 };

    // Side-scroller friendly platform layout: frequent, reachable gaps
    const platforms: Platform[] = [];
    const segmentW = 300;
    const heights = [680, 600, 650, 580, 640, 600, 660, 610];
    for (let i = 0; i < world.width; i += segmentW) {
      const idx = Math.floor(i / segmentW) % heights.length;
      const y = heights[idx];
      platforms.push({ x: i, y, w: 260, h: 28 });
      // occasional upper platform for chaining jumps
      if (i > 0 && i % (segmentW * 2) === 0) {
        platforms.push({ x: i - 100, y: y - 140, w: 200, h: 20 });
      }
    }
    // safety ground layer
    platforms.push({ x: 0, y: 740, w: world.width, h: 40 });

    // spawn player atop the first platform
    if (platforms.length > 0) {
      const start = platforms[0];
      player.pos.x = 80;
      player.pos.y = start.y - player.size.h;
    }

    // Enemies: just 2 enemies, introduced progressively
    const enemies: Enemy[] = [
      {
        pos: { x: 800, y: 580 },
        size: 40,
        velX: 40,
        hp: 3,
        shootCooldown: 2.0,
        shootTimer: 0,
        alive: true,
        active: true,
      },
      {
        pos: { x: 1800, y: 580 },
        size: 48,
        velX: -30,
        hp: 4,
        shootCooldown: 2.2,
        shootTimer: 0,
        alive: true,
        active: false, // activated after 8 seconds
      },
    ];

    const rebuildEnemies = () => {
      enemies[0] = {
        pos: { x: 800, y: 580 },
        size: 40,
        velX: 40,
        hp: 3,
        shootCooldown: 2.0,
        shootTimer: 0,
        alive: true,
        active: true,
      };
      enemies[1] = {
        pos: { x: 1800, y: 580 },
        size: 48,
        velX: -30,
        hp: 4,
        shootCooldown: 2.2,
        shootTimer: 0,
        alive: true,
        active: false,
      };
    };

    const bullets: Bullet[] = [];

    // Helpers
    const rectsOverlap = (a: Rect, b: Rect) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    const resolveCollisions = (
      pos: Vec,
      size: { w: number; h: number },
      vel: Vec
    ): { onGround: boolean; vx: number; vy: number } => {
      // Move X then resolve
      pos.x += vel.x;
      let onGround = false;
      for (const p of platforms) {
        if (
          rectsOverlap(
            { x: pos.x, y: pos.y, w: size.w, h: size.h },
            { x: p.x, y: p.y, w: p.w, h: p.h }
          )
        ) {
          if (vel.x > 0) pos.x = p.x - size.w;
          else if (vel.x < 0) pos.x = p.x + p.w;
          vel.x = 0;
        }
      }
      // Move Y then resolve
      pos.y += vel.y;
      for (const p of platforms) {
        if (
          rectsOverlap(
            { x: pos.x, y: pos.y, w: size.w, h: size.h },
            { x: p.x, y: p.y, w: p.w, h: p.h }
          )
        ) {
          if (vel.y > 0) {
            pos.y = p.y - size.h;
            onGround = true;
          } else if (vel.y < 0) {
            pos.y = p.y + p.h;
          }
          vel.y = 0;
        }
      }
      return { onGround, vx: vel.x, vy: vel.y };
    };

    // Input
    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "a", "d", "w"].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === "ArrowUp" || e.key === "w") {
        jumpBufferTimer = JUMP_BUFFER_TIME;
      }
      keys.add(e.key);
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let last = performance.now();
    let score = 0;
    let gameOver = false;

    // jump responsiveness helpers
    let lastOnGround = false;
    let coyoteTimer = 0;
    const COYOTE_TIME = 0.12; // seconds after leaving ground you can still jump
    let jumpBufferTimer = 0;
    const JUMP_BUFFER_TIME = 0.12; // seconds after pressing jump it'll trigger when you land

    let elapsed = 0;

    const resetGame = () => {
      score = 0;
      gameOver = false;
      const start = platforms.find((p) => p.y < 730) || platforms[0];
      player.pos = { x: 80, y: start.y - player.size.h };
      player.vel = { x: 0, y: 0 } as Vec;
      player.onGround = false;
      player.hp = 100;
      player.shootTimer = 0;
      bullets.splice(0, bullets.length);
      rebuildEnemies();
      camera.x = 0;
      camera.y = 0;
      lastOnGround = false;
      coyoteTimer = 0;
      jumpBufferTimer = 0;
      elapsed = 0;
      last = performance.now();
    };

    const shoot = (from: "player" | "enemy", origin: Vec, dir: Vec) => {
      const speed = from === "player" ? 700 : 420;
      const len = Math.hypot(dir.x, dir.y) || 1;
      const v = { x: (dir.x / len) * speed, y: (dir.y / len) * speed };
      bullets.push({ pos: { x: origin.x, y: origin.y }, vel: v, r: 4, from, alive: true });
    };

    const update = (dt: number) => {
      if (gameOver) return;

      elapsed += dt;

      // Activate second enemy after 8 seconds
      if (elapsed >= 8 && !enemies[1]?.active) {
        enemies[1]!.active = true;
      }

      // update jump timers
      jumpBufferTimer = Math.max(0, jumpBufferTimer - dt);
      coyoteTimer = lastOnGround ? COYOTE_TIME : Math.max(0, coyoteTimer - dt);

      // Player input horizontal
      let moveX = 0;
      if (keys.has("ArrowLeft") || keys.has("a")) moveX -= 1;
      if (keys.has("ArrowRight") || keys.has("d")) moveX += 1;
      player.vel.x = moveX * playerSpeed;

      // Buffered/coyote jump
      if (jumpBufferTimer > 0 && coyoteTimer > 0) {
        player.vel.y = -jumpVel;
        jumpBufferTimer = 0;
        coyoteTimer = 0;
        lastOnGround = false;
      }

      // Apply gravity
      player.vel.y += gravity * dt;

      // Convert per-frame velocities to px/frame
      // Here dt is seconds; vel already in px/s, so use pos += vel*dt
      // Our resolveCollisions step separates X/Y updates, so we pass the per-frame deltas.
      const vFrame = { x: player.vel.x * dt, y: player.vel.y * dt };
      const col = resolveCollisions(player.pos, player.size, vFrame);
      player.onGround = col.onGround;
      // If collision canceled motion along an axis, zero out the base velocity too
      if (col.vx === 0 && Math.sign(player.vel.x) !== 0) player.vel.x = 0;
      if (col.vy === 0 && player.vel.y > 0) player.vel.y = 0;
      lastOnGround = player.onGround;

      // Shooting with Space
      player.shootTimer -= dt;
      if (keys.has(" ") && player.shootTimer <= 0) {
        const muzzle: Vec = { x: player.pos.x + player.size.w, y: player.pos.y + player.size.h / 2 };
        shoot("player", muzzle, { x: 1, y: 0 });
        player.shootTimer = player.shootCooldown;
      }

      // Clamp to world
      player.pos.x = clamp(player.pos.x, 0, world.width - player.size.w);
      player.pos.y = clamp(player.pos.y, 0, world.height - player.size.h);

      // Enemies update
      for (const e of enemies) {
        if (!e.alive || !e.active) continue;
        // Simple horizontal patrol
        e.pos.x += e.velX * dt;
        // Keep enemies on platforms
        const feet = { x: e.pos.x, y: e.pos.y + e.size, w: e.size, h: 2 };
        let supported = false;
        for (const p of platforms) {
          if (
            feet.x < p.x + p.w && feet.x + feet.w > p.x && Math.abs(feet.y - p.y) < 6
          ) {
            e.pos.y = p.y - e.size;
            supported = true;
          }
        }
        // Bounce at platform edges
        if (e.pos.x < 300 || e.pos.x + e.size > 2500) e.velX *= -1;

        // Enemy shooting toward player
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
          const origin = { x: e.pos.x, y: e.pos.y + e.size / 2 };
          const dir = { x: player.pos.x - origin.x, y: player.pos.y + player.size.h / 2 - origin.y };
          shoot("enemy", origin, dir);
          e.shootTimer = e.shootCooldown;
        }
      }

      // Bullets
      for (const b of bullets) {
        if (!b.alive) continue;
        b.pos.x += b.vel.x * dt;
        b.pos.y += b.vel.y * dt;
        // Kill if out of world
        if (b.pos.x < -100 || b.pos.x > world.width + 100 || b.pos.y < -100 || b.pos.y > world.height + 100) {
          b.alive = false;
          continue;
        }
        // Collide with platforms
        for (const p of platforms) {
          if (
            b.pos.x + b.r > p.x && b.pos.x - b.r < p.x + p.w && b.pos.y + b.r > p.y && b.pos.y - b.r < p.y + p.h
          ) {
            b.alive = false;
            break;
          }
        }
        // Collide with entities
        if (b.from === "player") {
          for (const e of enemies) {
            if (!e.alive) continue;
            const r: Rect = { x: e.pos.x, y: e.pos.y, w: e.size, h: e.size };
            if (b.pos.x + b.r > r.x && b.pos.x - b.r < r.x + r.w && b.pos.y + b.r > r.y && b.pos.y - b.r < r.y + r.h) {
              e.hp -= 1;
              b.alive = false;
              if (e.hp <= 0) {
                e.alive = false;
                score += 100;
              }
            }
          }
        } else if (b.from === "enemy") {
          const r: Rect = { x: player.pos.x, y: player.pos.y, w: player.size.w, h: player.size.h };
          if (b.pos.x + b.r > r.x && b.pos.x - b.r < r.x + r.w && b.pos.y + b.r > r.y && b.pos.y - b.r < r.y + r.h) {
            player.hp -= 10;
            b.alive = false;
            if (player.hp <= 0) {
              gameOver = true;
            }
          }
        }
      }

      // Cleanup bullets
      for (let i = bullets.length - 1; i >= 0; i--) if (!bullets[i].alive) bullets.splice(i, 1);

      // Camera follows player
      const viewportW = canvas.clientWidth;
      const viewportH = canvas.clientHeight;
      const lookAhead = 120;
      camera.x = clamp(player.pos.x + player.size.w / 2 - viewportW / 2 + lookAhead, 0, world.width - viewportW);
      camera.y = clamp(player.pos.y + player.size.h / 2 - viewportH / 2, 0, Math.max(0, world.height - viewportH));
    };

    const draw = () => {
      // Clear
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      ctx.save();
      ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));

      // Background parallax layers
      ctx.fillStyle = "#0f172a"; // far
      for (let i = 0; i < world.width; i += 200) {
        ctx.fillRect(i, 200, 120, 8);
      }

      // Platforms
      ctx.fillStyle = "#334155";
      for (const p of platforms) {
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }

      // Enemies (square)
      for (const e of enemies) {
        if (!e.alive || !e.active) continue;
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(e.pos.x, e.pos.y, e.size, e.size);
        // little eye
        ctx.fillStyle = "#111827";
        ctx.fillRect(e.pos.x + e.size * 0.6, e.pos.y + e.size * 0.25, e.size * 0.2, e.size * 0.2);
      }

      // Player (simple stick figure)
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 3;
      const px = player.pos.x;
      const py = player.pos.y;
      const w = player.size.w;
      const h = player.size.h;
      // torso
      ctx.beginPath();
      ctx.moveTo(px + w / 2, py + h * 0.25);
      ctx.lineTo(px + w / 2, py + h * 0.75);
      ctx.stroke();
      // head
      ctx.beginPath();
      ctx.arc(px + w / 2, py + h * 0.15, 10, 0, Math.PI * 2);
      ctx.stroke();
      // arms
      ctx.beginPath();
      ctx.moveTo(px + w / 2, py + h * 0.4);
      ctx.lineTo(px + w * 0.2, py + h * 0.5);
      ctx.moveTo(px + w / 2, py + h * 0.4);
      ctx.lineTo(px + w * 0.8, py + h * 0.5);
      ctx.stroke();
      // legs
      ctx.beginPath();
      ctx.moveTo(px + w / 2, py + h * 0.75);
      ctx.lineTo(px + w * 0.25, py + h);
      ctx.moveTo(px + w / 2, py + h * 0.75);
      ctx.lineTo(px + w * 0.75, py + h);
      ctx.stroke();

      // Bullets
      for (const b of bullets) {
        if (!b.alive) continue;
        ctx.fillStyle = b.from === "player" ? "#22c55e" : "#f59e0b";
        ctx.beginPath();
        ctx.arc(b.pos.x, b.pos.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // HUD
      ctx.fillStyle = "#e5e7eb";
      ctx.font = "16px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(`HP: ${player.hp}`, 16, 24);
      ctx.fillText(`Score: ${score}`, 16, 44);
      ctx.fillText("Move: A/D or Arrow Keys | Jump: W or ArrowUp | Shoot: Space", 16, 64);
ctx.fillText(`Enemies: ${enemies.filter(e => e.active && e.alive).length}/2 active`, 16, 84);

      if (gameOver) {
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 28px system-ui, -apple-system, Segoe UI";
        ctx.fillText("Game Over - Press R to Restart", 16, 100);
      }
    };

    const loop = (t: number) => {
      const dt = clamp((t - last) / 1000, 0, 1 / 20); // seconds, clamp to 50ms
      last = t;
      update(dt);
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    const onRestart = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r") {
        resetGame();
      }
    };
    window.addEventListener("keydown", onRestart);

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("keydown", onRestart);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="block w-screen h-screen"
      aria-label="Side-scroller shooter game canvas"
    />
  );
}
