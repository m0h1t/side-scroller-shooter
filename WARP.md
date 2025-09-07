# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **Next.js 15.5.2** side-scroller shooter game built with React 19, TypeScript, and Tailwind CSS v4. The game is rendered using HTML5 Canvas with two implementation variants in the `app/components/` directory.

## Development Commands

### Core Commands
```bash
# Start development server with Turbopack
npm run dev

# Build for production (uses Turbopack)
npm run build

# Run production server
npm run start

# Lint the codebase
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Testing & Debugging
```bash
# Type checking only (no tests configured)
npx tsc --noEmit

# Run development server on a specific port
npm run dev -- --port 3001

# Preview production build locally
npm run build && npm start
```

Note: No test runner is configured. To add tests, install a framework like Jest or Vitest.

## Architecture & Code Structure

### Entry Points
- `app/page.tsx` - Main page that mounts the game
- `app/layout.tsx` - Root layout with Geist font and global styles

### Game Implementations

1. **`app/components/SideScrollerGame.tsx`** (Primary - Currently Active)
   - Main game component with modular architecture
   - Game logic split into modules in `app/components/game/`:
     - `types.ts` - TypeScript interfaces for all game entities
     - `update.ts` - Main game update logic
     - `render.ts` - Canvas rendering logic
     - `platforms.ts` - Platform generation and chunking
     - `spawn.ts` - Enemy spawning logic
     - `effects.ts` - Visual effects (particles, gore, blood splats)
     - `math.ts` - Utility functions (clamp, rand, etc.)
   - Uses `requestAnimationFrame` with delta time
   - High-DPI canvas rendering with devicePixelRatio scaling

2. **`app/components/GameCanvas.tsx`** (Alternative - Currently Unused)
   - More compact, inline implementation
   - Different physics constants and simpler enemy patterns
   - Could be used as a simpler example or fallback

### Key Game Systems

**Player System:**
- Smooth acceleration-based movement (2200 px/s² accel, 2400 px/s² friction)
- Variable jump with coyote time (0.08s) and jump buffering (0.12s)
- Crouch mechanics (height: 72px → 45px)
- Shooting with 0.18s cooldown
- 100 HP with health pack pickups

**Enemy Types:**
- Grunt: Basic enemy, 3 HP
- Fast: Quick movement, 2 HP
- Heavy: High HP (5), slower movement
- Sniper: Long-range, precise shooting

**Physics:**
- Gravity: 2600 px/s²
- Player max speed: 380 px/s
- Jump velocity: 950 px/s
- Frame-independent physics with delta time
- Axis-aligned bounding box collision detection

### Path Aliases
The project uses TypeScript path mapping:
- `@/*` maps to the project root (configured in `tsconfig.json`)

### Styling
- Tailwind CSS v4 with PostCSS configuration
- Dark mode support via CSS variables
- Geist font family from Next.js

## Common Development Tasks

### Adding New Game Features (SideScrollerGame.tsx)
- Game state object (around line ~41): camera, world, score, endless generation, difficulty
- Player object (around line ~61): movement, jump helpers, crouch, shooting, animation flags
- Main game loop (around line ~146): update and render called via `requestAnimationFrame`
- Enemy spawning: Handled in `game/spawn.ts` module
- Platform generation: Handled in `game/platforms.ts` module

### Development Workflow
- All entities use typed interfaces (Player, Enemy, Projectile, HealthPack)
- Canvas is high-DPI aware via devicePixelRatio transforms
- Cleanup on unmount: removes listeners and cancels RAF

### Performance Optimization
- `requestAnimationFrame` with delta time; dt capped to prevent instability
- Canvas transformations use save/restore
- Consider object pooling for projectiles if perf degrades

## Project Configuration Files

- `next.config.ts`: Next.js configuration (minimal)
- `tsconfig.json`: Strict TypeScript with `@/*` path alias
- `eslint.config.mjs`: ESLint using Next.js recommended rules; ignores `.next`, `node_modules`, etc.
- `postcss.config.mjs`: Tailwind CSS v4 via `@tailwindcss/postcss`
- `tailwind.config.js`: Not present (Tailwind v4 defaults)

## Development Tips

### Game Controls
- A/D: Move left/right
- W: Jump (coyote time + jump buffering)
- S: Crouch (reduced hitbox/speed)
- Space: Shoot
- R: Restart after game over

### Canvas Development
- Inspect canvas performance in DevTools; devicePixelRatio scaling is enabled
- Game loop targets 60 FPS; delta time is capped to 0.1s during pauses

## Important Implementation Notes

1. Canvas Rendering: SideScrollerGame scales by devicePixelRatio for crisp pixels; GameCanvas uses a simpler approach.
2. Game Loop: Standard update/render separation with frame-rate independent physics.
3. State Management: Local state within `useEffect`; no global store/context.
4. Cleanup: Event listeners and RAF are cleaned up on unmount.
5. Responsive: Canvas resizes to window dimensions via `resize` listener.
