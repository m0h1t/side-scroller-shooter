"use client";

import { useEffect, useRef, useState } from "react";
import { Platform, Enemy, Projectile, HealthPack, Particle, Splat, ScreenSplat } from "./game/types";
import { rand, generateInitialPlatforms, addPlatformChunk } from "./game/platforms";
import { spawnEnemy } from "./game/spawn";
import { updateGame } from "./game/update";
import { renderGame, resetGameOverState } from "./game/render-ultimate";
import { audioManager } from "./game/audio";
import TouchControls from "./game/TouchControls";

export default function SideScrollerGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const jumpPressRef = useRef<() => void>(() => {});
  const doRestartRef = useRef<() => void>(() => {});
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  useEffect(() => {
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const viewport = { width: window.innerWidth, height: window.innerHeight };

    const resizeCanvas = () => {
      viewport.width = window.innerWidth;
      viewport.height = window.innerHeight;
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const game = {
      camera: { x: 0, y: 0 },
      cameraSmoothX: 0,
      cameraSmoothY: 0,
      gameTime: 0,
      world: { height: 800 },
      score: 0,
      distance: 0,
      gameOver: false,
      paused: false,
      shakeTime: 0,
      shakeMag: 0,
      difficulty: 1,
      nextPlatformX: 0,
      lastEnemySpawn: 0,
    };

    const addShake = (mag: number, time: number) => {
      game.shakeMag = Math.max(game.shakeMag, mag);
      game.shakeTime = Math.max(game.shakeTime, time);
    };

    const player = {
      x: 100,
      y: 0,
      width: 36,
      height: 72,
      baseHeight: 72,
      crouchHeight: 45,
      vx: 0,
      vy: 0,
      maxSpeed: 380,
      accel: 2200,
      friction: 2400,
      jumpPower: 950,
      onGround: false,
      hp: 100,
      facing: 1 as 1 | -1,
      shootCooldown: 0,
      shootInterval: 0.18,
      animTime: 0,
      isWalking: false,
      isJumping: false,
      isShooting: false,
      isCrouching: false,
      crouchAnim: 0,
      shootAnim: 0,
    };

    const GRAVITY = 2600;
    const COYOTE_TIME = 0.08;
    const JUMP_BUFFER = 0.12;

    let platforms: Platform[] = generateInitialPlatforms();
    game.nextPlatformX = 1400;

    if (platforms.length > 0) {
      const start = platforms[0];
      player.x = 80;
      player.y = start.y - player.height;
    }

    const enemies: Enemy[] = [];
    const projectiles: Projectile[] = [];
    const healthPacks: HealthPack[] = [];
    const particles: Particle[] = [];
    const splats: Splat[] = [];
    const screenSplats: ScreenSplat[] = [];

    const keys = keysRef.current;
    const controls = { coyoteTimer: 0, jumpBufferTimer: 0, jumpHeld: false };

    jumpPressRef.current = () => {
      controls.jumpBufferTimer = JUMP_BUFFER;
      controls.jumpHeld = true;
    };

    const doRestart = () => {
      if (!game.gameOver) return;
      resetGameOverState();
      game.score = 0;
      game.distance = 0;
      game.difficulty = 1;
      game.gameOver = false;
      game.lastEnemySpawn = 0;
      game.cameraSmoothX = 0;
      game.cameraSmoothY = 0;
      game.gameTime = 0;
      projectiles.length = 0;
      platforms = generateInitialPlatforms();
      game.nextPlatformX = 1400;
      enemies.length = 0;
      healthPacks.length = 0;
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
      player.height = player.baseHeight;
      controls.coyoteTimer = 0;
      controls.jumpBufferTimer = 0;
      controls.jumpHeld = false;
      game.shakeMag = 0;
      particles.length = 0;
      splats.length = 0;
      screenSplats.length = 0;
      setIsGameOver(false);
    };
    doRestartRef.current = doRestart;

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (k === " ") e.preventDefault();
      if (k === "w" || k === "arrowup") {
        controls.jumpBufferTimer = JUMP_BUFFER;
        controls.jumpHeld = true;
        audioManager.playJump();
      }
      if (k === "m") audioManager.toggleMute();
      if (k === "r") doRestart();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys[k] = false;
      if (k === "w" || k === "arrowup") controls.jumpHeld = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

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
          screenSplats,
          keys,
          addShake,
          constants: { GRAVITY, COYOTE_TIME },
          controls,
          rand,
          addPlatformChunk,
          spawnEnemy,
        });
        if (game.gameOver) setIsGameOver(true);
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
        screenSplats,
        player,
        isTouchDevice: "ontouchstart" in window || navigator.maxTouchPoints > 0,
      });
      animationId = requestAnimationFrame(gameLoop);
    };

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      {isTouchDevice && (
        <TouchControls
          keys={keysRef.current}
          onJumpPress={() => jumpPressRef.current()}
          onMuteToggle={() => audioManager.toggleMute()}
          onRestart={() => doRestartRef.current()}
          isGameOver={isGameOver}
        />
      )}
    </div>
  );
}
