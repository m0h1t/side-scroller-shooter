# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **Next.js 15.5.2** side-scroller shooter game built with React 19, TypeScript, and Tailwind CSS v4. The game is rendered using HTML5 Canvas with two implementation variants (`SideScrollerGame.tsx` and `GameCanvas.tsx`) in the `app/components/` directory.

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

Note: No test runner is configured in package.json. Running a single test is not applicable until a test framework is added.

## Architecture & Code Structure

- App entry mounts the main game: `app/page.tsx` imports and renders `app/components/SideScrollerGame.tsx`.

### Game Components
The game has two Canvas-based implementations:

1. **`app/components/SideScrollerGame.tsx`** — Main implementation used by the app
   - Self-contained game loop with logic in one component (update + render)
   - Uses `requestAnimationFrame` and delta time
   - Implements player, enemies, projectiles, collisions, endless chunk generation
   - Controls: A/D (move), W (jump), S (crouch), Space (shoot), R (restart)

2. **`app/components/GameCanvas.tsx`** — Alternative implementation (currently unused)
   - More modular helpers (collision resolution, entities)
   - Similar gameplay with different physics constants

### Key Game Systems

**Player System:**
- Position, velocity, HP, facing
- Acceleration/friction movement, variable jump (coyote time + jump buffering)
- Crouch alters hitbox and movement speed
- Shooting with cooldown timer

**Enemy System:**
- Patrol movement with boundary checks
- Progressive activation and variable types (grunt, fast, heavy, sniper)
- AI shooting when player within range; some types have spread fire

**Physics & Collision:**
- Axis-separated collision with platforms for ground detection
- Projectile collision with platforms, enemies, and player
- Camera follows player with screen shake and endless platform generation

### Path Aliases
The project uses TypeScript path mapping:
- `@/*` maps to the project root (configured in `tsconfig.json`)

### Styling
- Tailwind CSS v4 with PostCSS configuration
- Dark mode support via CSS variables
- Geist font family from Next.js

## Common Development Tasks

### Adding New Game Features (SideScrollerGame.tsx)
- Game state object (around line ~73): camera, world, score, endless generation, difficulty
- Player object (around line ~93): movement, jump helpers, crouch, shooting, animation flags
- Main game loop (around line ~303+): `update(dt)` and `render()`
- Enemy spawning (around line ~182+): type selection, spawn conditions
- Platform generation (around line ~132+): initial and chunk generation

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
