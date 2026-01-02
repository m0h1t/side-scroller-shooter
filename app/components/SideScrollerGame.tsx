"use client";

import { useEffect, useRef } from "react";
import { Platform, Enemy, Projectile, HealthPack, Particle, Splat } from "./game/types";
import { rand, generateInitialPlatforms, addPlatformChunk } from "./game/platforms";
import { spawnEnemy } from "./game/spawn";
import { spawnGore as spawnGoreFx } from "./game/effects";
import { updateGame } from "./game/update";
import { renderGame, resetGameOverState } from "./game/render-ultimate";
import { audioManager } from "./game/audio";

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
      crouchAnim: 0,
      shootAnim: 0,
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
      // Toggle mute with M key
      if (k === "m") {
        audioManager.toggleMute();
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



    // Restart handler (regenerate level/enemies)
    const handleRestart = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r" && game.gameOver) {
        // Reset game over state
        resetGameOverState();
        
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
