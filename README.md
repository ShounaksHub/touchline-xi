# TOUCHLINE / XI ⚽

**An interactive, offline-first football (soccer) match simulation and tactical management laboratory.**

Built as an independent counterpart to [ShounaksHub/Cricket-Game](https://github.com/ShounaksHub/Cricket-Game). Touchline XI translates strategic depth, deterministic seedable simulation, player attribute models, match presentation, and squad building into an authentic football engine.

[![Tests](https://img.shields.io/badge/tests-20%20passing-brightgreen)](tests/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/runtime%20dependencies-0-success)](package.json)
[![Offline First](https://img.shields.io/badge/offline-first-orange)](touchline-xi-standalone.html)

---

## 🌐 Live Deployments

- **Production (Vercel):** [https://touchline-xi-fawn.vercel.app/](https://touchline-xi-fawn.vercel.app/)
- **GitHub Pages:** [https://shounakshub.github.io/touchline-xi/](https://shounakshub.github.io/touchline-xi/)
- **Offline Standalone:** Double-click [`touchline-xi-standalone.html`](touchline-xi-standalone.html) directly in any modern browser. Zero network requests, zero npm installs required.

---

## 🕹️ Key Features

### 1. 132 Real Teams & 2,750+ Authentic Footballers
- Full rosters across top European leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1) and top 150 FIFA-ranked national teams.
- Granular player attributes: Pace, Shooting, Passing, Dribbling, Defending, Physical, Stamina, and Goalkeeping.
- **Scouting Hub:** Search by name or club, filter by position, and inspect detailed player radar cards with paginated browsing.
- **Dream Team Creator:** Build a custom fantasy starting XI from any players across the globe and field them against elite world clubs.

### 2. Tactical Cockpit & Live Management
- **Formations:** 4-3-3, 4-2-3-1, 4-4-2, 3-5-2, 5-3-2 with accurate pitch coordinate mapping.
- **Tactical Sliders:** Real-time adjustments to Pressing Intensity, Build-up Tempo, Pitch Width, and Team Mentality (Ultra-Defensive to All-Out Attack).
- **Substitutions:** 5-substitute rule with positional validation (goalkeepers strictly swap with goalkeepers).
- **Manager Shouts:** In-game touchline shouts (*"Demand More!"*, *"Focus!"*, *"Push Forward!"*) with immediate morale, stamina, and tactical impact.
- **Adaptive AI Managers:** Opposition managers react at half-time (45′) and late in the game (70′) based on the scoreline.

### 3. Calibrated Simulation Engine & Football Invariants
- **Deterministic Mulberry32 PRNG:** Providing repeatable, shareable match seeds. Same seed + identical tactics = identical 90-minute outcome.
- **Authentic Strength & Real-World Skill Scaling:** Calibrated using real-world Elo and skill ratings. Elite squads (e.g., Real Madrid, Man City) maintain a ~98% win rate against lower-tier national teams (e.g., Lesotho, FIFA #150), while evenly matched rivals produce realistic 41% Home / 25% Draw / 34% Away splits.
- **Home Advantage:** Realistic +4–6% home turf advantage modeled into possession recovery, pressing, and box penetration.
- **Regulation Penalty Kicks:** In-box fouls trigger penalty kicks (0.79 xG benchmark) with shooter shooting vs goalkeeper keeping checks.
- **Disciplinary System:** Realistic yellow card bookings, accumulation-based second-yellow dismissals, and direct red cards with team man-down handicaps.
- **Playmaker Assists:** Every open-play goal attributes authentic assists to the creative midfielder, winger, or overlapping fullback.
- **Stamina Degradation:** High pressing and high tempo exhaust players over 90 minutes, degrading acceleration, tackle success, and finishing composure.

### 4. Tournament Knockout Mode & Penalty Shootouts
- Enable **Knockout Mode** for cup fixtures.
- Tied fixtures proceed directly into **30 minutes of Extra Time (90′–120′)**.
- If still level, matches culminate in a dramatic **AB-AB Penalty Shootout** with kick-by-kick event commentary and sudden-death rounds.

### 5. 2D Interactive Pitch & Stadium Radar
- Real-time Canvas 2D top-down tactical radar displaying all 22 player positions and the match ball.
- Player markers feature squad numbers, ball-possession halos, and yellow/red disciplinary badges.
- Dynamic celebration effects, shot vectors, corner trajectories, and goal explosions.

### 6. Deep Match Analytics & Replay Vault
- **10-Metric Comprehensive Dashboard:**
  - Possession %
  - Cumulative Expected Goals (xG)
  - Total Shots
  - Shots on Target
  - Goalkeeper Saves
  - Corner Kicks
  - Total Passes
  - Fouls Conceded
  - Yellow Cards
  - Red Cards
- **Dynamic xG Flow Plot:** Smooth SVG momentum curves dynamically scaled to 90 or 120 minutes.
- **Interactive Timeline Scrubber:** Click or drag along the match timeline to inspect any minute of play.
- **Replay Vault:** Save matches to local storage, scrub frame-by-frame, and export/import full JSON match replays.

### 7. Audio & Keyboard Accessibility
- **Synthesized Web Audio:** Referee whistles, ball kicks, crowd cheers, and goal horns without external audio asset downloads.
- **Keyboard Shortcuts:**
  - <kbd>Space</kbd>: Play / Pause simulation or replay
  - <kbd>S</kbd> / <kbd>→</kbd>: Step 1 minute forward
  - <kbd>F</kbd>: Instant simulate to Full Time
  - <kbd>M</kbd>: Mute / Unmute synthesized audio
  - <kbd>1</kbd> / <kbd>2</kbd> / <kbd>5</kbd>: Switch playback speeds (1×, 2×, 5×)

---

## 🚀 Running Locally

### Quick Run (Zero Install)
Simply open `touchline-xi-standalone.html` in Chrome, Firefox, Safari, or Edge.

### Local Development Server
Requires Node.js 20+. **No external npm packages required** (uses native Node.js HTTP server and test runner).

```bash
# Clone the repository
git clone https://github.com/ShounaksHub/touchline-xi.git
cd touchline-xi

# Start the local development server
npm start
```
Open **http://localhost:4173** in your browser.

---

## 🧪 Testing & Verification

The suite includes 20 comprehensive unit, integration, and statistical audit tests, including a 500-match Monte Carlo simulation:

```bash
npm test
```

### 500-Match Monte Carlo Simulation Benchmark:
| Metric | Benchmark Result | Real-World Football Reference |
| :--- | :--- | :--- |
| **Total Matches** | 500 | Top-flight European leagues |
| **Average Goals / Match** | 2.91 | ~2.70 – 3.05 |
| **Average Shots / Match** | 20.83 | ~20 – 25 |
| **Shots on Target / Match** | 8.83 | ~7.5 – 10.0 |
| **Average Corners / Match** | 5.70 | ~5 – 7 |
| **Average Yellow Cards** | 1.29 | ~1.2 – 2.0 |
| **Average Red Cards** | 0.14 | ~0.10 – 0.18 |
| **Home Win %** | 41.2% | ~40 – 45% |
| **Draw %** | 24.6% | ~23 – 27% |
| **Away Win %** | 34.2% | ~30 – 35% |
| **Clean Sheet %** | 41.2% | ~38 – 44% |

---

## 📁 Project Architecture

```
touchline-xi/
├── index.html                   # Production root entrypoint (standalone bundle)
├── index.template.html          # Clean modular development template
├── styles.css                   # Responsive pitch & tactical UI design system
├── touchline-xi-standalone.html # Single-file offline build
├── server.mjs                   # Zero-dependency native Node.js static server
├── package.json                 # Project configuration & test scripts
├── vercel.json                  # Clean static Vercel deployment configuration
├── src/
│   ├── app.js                   # Application state, UI reactivity, audio, replay vault
│   ├── engine.js                # Deterministic match engine, xG, penalties, rules
│   ├── pitch.js                 # 2D Canvas radar renderer, animations, visual cues
│   └── data.js                  # 132 teams, 2,750+ real footballers, formations
├── tests/
│   ├── engine.test.mjs          # 19 core engine, rule, and invariant unit tests
│   └── statistical_audit.test.mjs # 500-match Monte Carlo simulation validator
└── tools/
    └── build-standalone.mjs     # Standalone HTML packager and bundle synchronizer
```

---

## 🛠️ Build Pipeline

To sync source updates into `touchline-xi-standalone.html`, `index.html`, `dist/`, and `public/`:

```bash
npm run build
```

---

## 📜 License

MIT License. Designed and built with ❤️ by Shounak.
