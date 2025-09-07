export type Platform = { x: number; y: number; width: number; height: number };
export type EnemyType = 'grunt' | 'heavy' | 'fast' | 'sniper';

export type Enemy = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  hp: number;
  maxHp: number;
  active: boolean;
  shootTimer: number; // seconds
  shootInterval: number; // seconds
  activateAtSec?: number; // when to become active (seconds)
  type: EnemyType;
  animTime: number; // for animations
};

export type Projectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  fromPlayer: boolean;
};

export type HealthPack = {
  x: number;
  y: number;
  width: number;
  height: number;
  animTime: number;
  collected: boolean;
};

export type Particle = { x: number; y: number; vx: number; vy: number; life: number; size: number; color: string };
export type Splat = { x: number; y: number; w: number; h: number; alpha: number };

export type Player = {
  x: number;
  y: number;
  width: number;
  height: number;
  baseHeight: number;
  crouchHeight: number;
  vx: number;
  vy: number;
  maxSpeed: number;
  accel: number;
  friction: number;
  jumpPower: number;
  onGround: boolean;
  hp: number;
  facing: 1 | -1;
  shootCooldown: number;
  shootInterval: number;
  animTime: number;
  isWalking: boolean;
  isJumping: boolean;
  isShooting: boolean;
  isCrouching: boolean;
  // 0..1 visual blend for crouch transition (does not affect collisions)
  crouchAnim: number;
  shootAnim: number;
};

