# TOUCHLINE / XI

**A working, offline-first football (soccer) match simulator and squad lab.**

Built as an independent counterpart to [ShounaksHub/Cricket-Game](https://github.com/ShounaksHub/Cricket-Game). This is a new project, not a modification to the original repo.

## Run it

**Fastest:** Double-click `touchline-xi-standalone.html` to play the standalone build in your browser. This has CSS, JavaScript, player data and the match engine embedded in one HTML file. Some browsers limit storage for `file://` pages, so use the local server below if replays fail to persist.

**Development / modular source:** Requires Node.js 20 or newer. **No npm install or internet connection is required.**

```bash
npm start
```

Open **http://localhost:4173** in your browser. Alternatively, use any static server to serve this directory; JavaScript ES modules require HTTP (opening `index.html` directly using `file://` may be blocked).

Rebuild the self-contained HTML after changing the source:

```bash
npm run build:standalone
```

Run tests:

```bash
npm test
```

## Working features

- Four fictional 16-player clubs, each with an editable starting XI and bench.
- Formations: 4-3-3, 4-2-3-1, 4-4-2, 3-5-2.
- Live changes to pressing, tempo, width and team mentality.
- Deterministic seeded match engine; identical seeds and tactical decisions produce identical matches.
- Play, pause, step a minute at a time, run at 1×/2×/4× or simulate directly to full time.
- Animated Canvas 2D pitch with player positioning, ball and football field markings.
- Event feed, goals, shots, saves, yellow cards, fouls, offsides and corners.
- Real-time possession, shots, passes and approximate xG.
- Substitutions, including goalkeeper validation and a five-substitution limit.
- Local replay vault using localStorage, replay-by-frame, and JSON export.
- Responsive layout and keyboard shortcut: **Space** to play/pause when not focused on an input.

## What this MVP is (and isn't)

The engine advances in **one-minute simulation steps**, with a probabilistic football event model; it is not a continuous physics engine, fully accurate Laws of the Game implementation, real-world match predictor, or licensed player database. The xG values are generated heuristic estimates, not a trained expected-goals model. The on-screen player motion is a tactical representation, not rigid-ball football physics. Opponents use static AI tactics.

This MVP is intentionally dependency-free and built in **vanilla ES modules + Canvas 2D** so it can be run and tested offline immediately. Your reference cricket app uses **Next.js, React and PixiJS**; this prototype preserves the *concept* (simulation engine, team builder, tactical cockpit, stadium visualizer, replay archive), not the exact framework. The game domain and UI logic are separate in `src/`, so the code can migrate into a Next.js/PixiJS monorepo later.

## Project structure

```
touchline-xi/
├── index.html           # accessible, responsive UI
├── styles.css           # bespoke green / parchment design system
├── touchline-xi-standalone.html # double-clickable, bundled offline build
├── server.mjs           # zero-dependency local static server
├── src/
│   ├── data.js          # clubs, fictional players, formations
│   ├── engine.js        # seeded deterministic simulation and rules
│   ├── pitch.js         # Canvas 2D top-down rendering
│   └── app.js           # UI state, interactions, archive
├── assets/favicon.svg
└── tests/engine.test.mjs
```

## Potential production improvements

1. Port UI into the existing Next.js / React workspace and render pitch via PixiJS WebGL.
2. Add true seconds-based possession and physics with explicit player / ball trajectories and collision modelling.
3. Expand Laws-of-the-Game handling (offside geometry, VAR, stoppage time, red cards, competition-specific substitution windows).
4. Import licensed player datasets; add player stamina, injuries and AI opponent tactics.
5. IndexedDB instead of localStorage for a large replay archive, with versioned replay schema.
6. Add Playwright E2E tests and WebGL/mobile performance profiling.

## Controls

- Choose clubs in **Match setup** (starts a fresh match).
- Select your starting formation and tactics.
- Select any starter and then a bench player to swap (keeper must swap with keeper).
- Press **Kick off**. The minute ticks forward automatically; pause or step as needed.
- Click **Sim to FT** for an instant outcome, then use the **Replay vault** to watch a saved match or export it.
- Set a seed and click **New fixture** to create a new deterministic run.

Created as an original standalone MVP. Sample clubs and players are fictional.
