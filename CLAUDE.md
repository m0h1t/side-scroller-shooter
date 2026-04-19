# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server with Turbopack (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run lint -- --fix  # Auto-fix lint issues
npx tsc --noEmit     # Type-check without emitting
```

No test runner is configured. To add one, install Jest or Vitest.

## Architecture

This is a **Next.js 15 side-scroller shooter game** rendered entirely on an HTML5 Canvas — no game engine, all custom systems.

### Entry Points

- `app/page.tsx` — mounts `SideScrollerGame` in a full-screen container with a decorative DOOM-style frame (pointer-events-none overlay)
- `app/components/SideScrollerGame.tsx` — owns the canvas, input listeners, and the `requestAnimationFrame` game loop

### Game Loop

Each frame in `SideScrollerGame`:
1. `updateGame()` (`game/update.ts`) — physics, AI, collision, spawning, score
2. `renderGame()` (`game/render-ultimate.ts`) — parallax BG, platforms, sprites, HUD, post-processing, audio triggers

### Game Modules (`app/components/game/`)

| File | Responsibility |
|------|----------------|
| `types.ts` | Shared TypeScript interfaces: `Player`, `Enemy`, `Projectile`, `HealthPack`, `Particle`, `Splat` |
| `update.ts` | Per-frame physics, enemy AI, platform/health-pack updates |
| `render-ultimate.ts` | Primary renderer — HUD, post-processing glitch effects, audio integration (~1400 lines) |
| `platforms.ts` | Procedural chunk-based platform generation with sine-wave variation |
| `spawn.ts` | Difficulty-scaled enemy spawning (Grunt / Fast / Heavy / Sniper) |
| `effects.ts` | Particle effects: gore, explosions, muzzle flashes, screen shake |
| `audio.ts` | Web Audio API singleton — all sounds synthesized (no audio files); mute state in `localStorage` |
| `math.ts` | `clamp`, `rand`, other utilities |

`GameCanvas.tsx` is an alternative self-contained implementation (not used by `page.tsx`). The authoritative implementation is `SideScrollerGame.tsx` + `game/`.

### Key Systems

**Physics** — frame-independent delta time (capped at 0.1 s to prevent spiral of death); AABB collision; gravity 2600 px/s²; player acceleration/friction model (no instant velocity).

**Coyote time & jump buffering** — 0.08 s coyote, 0.12 s buffer window tracked on the player object.

**High-DPI canvas** — all draw calls are inside a `devicePixelRatio` scale transform; canvas CSS size ≠ backing buffer size.

**Platform generation** — chunk-based infinite scrolling; old chunks outside the camera window are discarded; sine wave drives height variation; difficulty increases gap frequency.

**Audio** — `audioManager` is a module-level singleton instantiated lazily on first user interaction. `render-ultimate.ts` calls into it each frame for ambient sounds and event-driven SFX.

**State** — all game state is plain objects (`gameState`, `player`, arrays of enemies/projectiles/etc.) owned inside a single `useEffect` closure; no React state, no global store.

### Controls

| Key | Action |
|-----|--------|
| A / D | Move |
| W | Jump |
| S | Crouch |
| Space | Shoot |
| R | Restart (game over) |
| M | Toggle mute |

### Path Alias

`@/*` resolves to the project root (configured in `tsconfig.json`).
