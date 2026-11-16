# Touchline XI — Master Technical Brain & Architecture Specification

> **Touchline XI** is an offline-first, deterministic football simulation studio and squad laboratory built with zero runtime npm dependencies. It pairs a calibrated 2D pitch radar simulation engine with deep tactical management, a knockout tournament bracket system, a fantasy Galácticos studio, an archive replay vault, and an expansive 19,900+ player database with verified real stars, historic legends, and club youth reserves across 357 global clubs and national teams.

---

## 1. Executive Summary & Core Philosophy

- **Repository**: [ShounaksHub/touchline-xi](https://github.com/ShounaksHub/touchline-xi)
- **Live Production URL**: [touchline-xi-fawn.vercel.app](https://touchline-xi-fawn.vercel.app/)
- **License**: MIT
- **Sibling Project**: [ShounaksHub/Cricket-Game](https://github.com/ShounaksHub/Cricket-Game)
- **Zero Runtime Dependencies**: 100% vanilla JavaScript (ES modules), CSS3, HTML5 Canvas, Web Audio API, and SVG. No frameworks, no external libraries, no CDNs required.
- **Offline-First Delivery**: Bundled into a self-contained single-file HTML executable (`touchline-xi-standalone.html`) containing embedded CSS, vector heraldry, data arrays, and procedural audio.
- **Data Provenance & Transparency**: Explicit data classification for all footballers (`playerType`, `verificationStatus`, `isGenerated`, `rosterEra`). Distinguishes verified real superstars and historic legends from generated reserve players.
- **State Isolation**: Safe custom team registry (`registerCustomTeam`) that prevents Dream Team fixtures from ever mutating the canonical `TEAMS` array.
- **Lineup Integrity**: Strict `validateLineup` enforcing 11 unique players, starting goalkeeper at index 0, and non-GK outfielders.
- **Calibrated Football Science**: Powered by Mulberry32 deterministic PRNG. Tested across a massive 500-match Monte Carlo simulation benchmark to guarantee real-world top-flight statistical parity (3.11 goals/match, 45% home win bias, 21.9 shots, realistic disciplinary and xG distribution).

---

## 2. Global Database Architecture (357 Teams · 19,904 Players)

Touchline XI houses one of the most comprehensive open-source football databases ever assembled in a browser simulator:

### A. Team Breakdown (357 Teams)
1. **European Elite & Domestic Clubs (UEFA)**: 100 clubs spanning the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie, Primeira Liga, Scottish Premiership, etc.
2. **South American Clubs (CONMEBOL)**: 39 clubs spanning Brazil (Brasileirão), Argentina (Primera División), Colombia, Uruguay, Chile, etc.
3. **North & Central American Clubs (CONCACAF)**: 20 clubs spanning MLS, Liga MX, Costa Rica, etc.
4. **Asian & Oceanic Clubs (AFC / OFC)**: 28 clubs spanning Saudi Pro League, J1 League, K League, ISL (India), A-League (Australia), etc.
5. **African Clubs (CAF)**: 20 clubs spanning Egypt, Morocco, South Africa, Nigeria, Tunisia, Ghana, etc.
6. **Senior FIFA National Teams**: Top 150 nations ranked by official FIFA points, complete with continental representation.

### B. Squad Depth, Provenance & 20+ Reserve System
- **Every squad** in the game features **36 to 56 players**:
  - **Starting XI (11 players)**: Highest-rated positional specialist eleven matching the tactical shape, with starting goalkeeper strictly at `starting[0]`.
  - **Substitutes (5–7 primary bench)**: Includes a backup goalkeeper (always `substitutes[0]`) and top tactical impact substitutes.
  - **Reserves (20–35 players)**: Deep reserves and historic icons accessible for rotation and substitutions in Squad Lab.
  - **Provenance Metadata**: Every player record embeds `playerType` (`verified_legend`, `verified_active`, or `generated_reserve`), `verificationStatus` (`verified` vs `generated`), `isGenerated` (`boolean`), and `rosterEra` (`Historic Legend`, `Modern`, or `Club Reserve`).
- **FC Barcelona Super-Roster (50 Players)**:
  - Starting XI: Ter Stegen (90), Dani Alves (92), Puyol (93), Ronald Koeman (92), Jordi Alba (89), Busquets (93), Iniesta (94), Xavi (94), Ronaldinho (95), Messi (99), Cruyff (96).
  - Bench & Reserves: Maradona (97), Ronaldo Nazário (96), Romário (94), Luis Suárez (94), Neymar Jr (93), Henry (93), Rivaldo (93), Eto'o (92), Stoichkov (92), Laudrup (92), Piqué (91), Guardiola (91), Villa (91), Lewandowski (91), Deco (90), Lineker (90), Yaya Touré (90), Lamine Yamal (90), Pedri (90), Raphinha (89), Valdés (89), Zubizarreta (89), Mascherano (89), Kluivert (89), De Jong (88), Olmo (88), Koundé (88), Araújo (88), Gavi (87), Abidal (87), Cubarsí (86), Szczęsny (86), Christensen (85), Balde (85), Iñigo Martínez (85), Ferran Torres (84), Casadó (83), Fermín López (83), Peña (81).
- **Curated Historic Rosters**:
  - Real Madrid CF (50 players: CR7, Di Stéfano, Zidane, Puskás, R9, Ramos, Modrić, Benzema, Casillas, Bale, Raúl, etc.)
  - Manchester United (50 players: CR7, Charlton, Best, Rooney, Cantona, Scholes, Keane, Giggs, Schmeichel, Ferdinand, etc.)
  - Bayern Munich (48 players: Beckenbauer, Gerd Müller, Neuer, Rummenigge, Matthäus, Lewandowski, Robben, Ribéry, Lahm, etc.)
  - Liverpool FC (48 players: Dalglish, Gerrard, Salah, Rush, Van Dijk, Suárez, Mané, Alisson, Alexander-Arnold, Barnes, etc.)
  - Arsenal FC (48 players: Henry, Bergkamp, Vieira, Pires, Adams, Seaman, Wright, Fàbregas, Campbell, Cole, Saka, etc.)
  - International Giants: Brazil (45 players: Pelé, R9, Ronaldinho, Romário, Zico, Garrincha, Cafu, Roberto Carlos), Argentina (45 players: Maradona, Messi, Batistuta, Kempes, Di Stéfano, Zanetti, Passarella), Portugal (42 players: CR7, Eusébio, Figo, Rui Costa, Deco, Pepe), India (38 players: Sunil Chhetri, Bhaichung Bhutia, I.M. Vijayan, Gurpreet, Subrata Pal, Sandesh Jhingan, etc.).

---

## 3. The 6 Multi-Page Stadium Zones

Touchline XI is engineered with a multi-page stadium architecture featuring instant view switching, synchronized navigation pills, and hash routing without page reloads or scroll-jumping:

```
[ Topbar: Logo · Title · 6 Nav Tabs · Soundtrack Player · Guide · Audio SFX ]
 ├── #matchday   -> 01 / Match Centre (Radar, Scoreboard, Wire, xG, Shouts)
 ├── #squad      -> 02 / Squad Lab (Starting XI, Formation, Bench, Tactics)
 ├── #tournament -> 03 / Tournament Cup (Knockout Brackets, AI Sim, Extra Time)
 ├── #dreamteam  -> 04 / Dream Team Studio (Custom Galácticos Draft, AI Opponent)
 ├── #scouting   -> 05 / Global Scouting Hub (12,944 Players, FUT Cards, Radars)
 └── #vault      -> 06 / Replay Vault (Frame-by-frame scrub, Export/Import JSON)
```

### 1. Match Centre (`#matchday`)
- **Scoreboard**: Team crests with authentic vector heraldry, match minute, score, and scroll-protected goal scorer lists (`max-height: 85px; overflow-y: auto; scrollbar-width: thin;`).
- **Tactical Pitch Visualizer (`#pitchSurface`)**: 105 × 68m top-down tactical radar rendering 22 player nodes with directional markers, jersey numbers, possession rings, and 60 FPS physics-based ball interpolation.
- **Match Pause Banner (`#matchPauseBanner`)**: High-visibility glassmorphic banner popping up over the pitch on goals or halftime intervals, explaining why play stopped, showing scorer details, and offering one-click `"Resume Match ␣"` (or Spacebar).
- **Match Wire & Live Events**: Minute-by-minute text commentary feed, cards, substitutions, and injury time announcements.
- **Cumulative xG Chart**: SVG visualizer tracking cumulative expected goals evolution for Home vs Away.
- **Manager Shouts**: Real-time tactical instructions (High Press, Park The Bus, Shoot On Sight, Work Into Box, Demand More).
- **Stoppage / Injury Time**: 4th official boards for 1st half (+1 to +4 min) and 2nd half (+2 to +6 min).

### 2. Squad Lab (`#squad`)
- **Team Synchronizer (`#squadTeamIndicator`)**: Displays the active team being managed (`Tactical roster for Real Madrid CF · Inspect ratings...`).
- **350+ Team Quick Search Filter (`#teamFilterInput`)**: Live text search with auto-filtering across all 357 teams, continent groups, and instant `✕` reset button (`#teamFilterClearBtn`).
- **Starting XI Manager (`#squadList`)**: Position-by-position list with dynamic stamina bars, card rarities, and swap highlights.
- **Scrollable Bench & Reserves (`#benchList`)**: Dedicated scroll container (`max-height: 480px; overflow-y: auto; scrollbar-width: thin;`) holding all 25–40 bench and reserve players.
- **Formation Board**: 6 tactical systems (`4-3-3`, `4-2-3-1`, `4-4-2`, `3-5-2`, `5-3-2`, `3-4-3`) with interactive mini-pitch dot coordinates.
- **Tactical Sliders**: Pressing intensity (0–100), passing tempo (0–100), attacking width (0–100), mentality (Defensive, Balanced, Attacking).

### 3. Tournament Cup (`#tournament`)
- **Knockout Bracket**: 8-team single-elimination tournament (Quarter-Finals, Semi-Finals, Final).
- **Presets**: UEFA Champions Cup, World Cup Knockout, Copa Libertadores, Asian Super Cup.
- **Autonomous AI Simulation**: Users play their match; remaining AI bracket fixtures simulate deterministically with full box scores.
- **Extra Time & Penalties**: Matches drawn at 90′ automatically advance to 30 minutes of Extra Time (90′–120′). If still tied, proceeds to an interactive 5-round penalty shootout with sudden-death rounds.

### 4. Dream Team Studio (`#dreamteam`)
- **Custom Galácticos Draft**: Build an all-time fantasy squad by selecting starters and bench players from any club or era.
- **Tactical Philosophies**: Tiki-Taka, Gegenpress, Counter-Attack, Total Football, Park The Bus, Balanced.
- **AI Difficulty Controls**: Amateur, Semi-Pro, World Class, Legendary AI manager adaptations.
- **1-Click Deployment**: Direct export into Match Centre as the active Home Team.

### 5. Global Scouting Hub (`#scouting`)
- **Database Browser**: Indexes all 12,944 players with pagination (`SCOUT_PAGE_SIZE = 72`).
- **Multi-Parametric Filters**: Position (`GK`, `DEF`, `MID`, `FWD`), Tier (`95+ Icons`, `90-94 World Class`, `85-89 Elite`, `80-84 Senior`), Club/Nation dropdown, and keyword search.
- **Empty Filter State & Recovery**: Friendly `.scout-empty-state` with a one-click `"Reset All Filters ↻"` button (`#scoutResetBtn`).
- **FUT / FM-Style Metallic Card Inspector**: Full modal dialog featuring player rating, rarity borders (Gold Rare, Icon Moments, TOTY), hexagonal attribute radar, physical stats, and one-click "Draft to Dream Team" action.

### 6. Replay Vault (`#vault`)
- **Deterministic Match Tape Recorder**: Stores up to 12 recent fixtures in `localStorage` with frame snapshots at every minute.
- **Interactive Timeline Scrubber**: Seek to any minute (0′ to 90′ or 120′) via `#timelineTrack`.
- **JSON Import / Export**: Share match files (`touchline-xi-[seed].json`) with other players for exact deterministic verification.

---

## 4. Next-Gen Continuous Spatial Simulation Engine & Football Physics

Touchline XI features an emergent, continuous spatial football simulation engine that models matches through physical interactions, spatial intelligence, and pitch geometry rather than minute-based dice rolls or predetermined scores.

### A. Pitch Geometry & Metric Vector Mathematics
Standard FIFA international pitch dimensions ($105\text{ m} \times 68\text{ m}$) are normalized to a continuous $[0, 100] \times [0, 100]$ coordinate space:
- **Pitch Scaling**: $\Delta X \times 1.05\text{ m}$, $\Delta Y \times 0.68\text{ m}$.
- **Goal Boundaries**: Goal lines at $X = 0$ (Home goal) and $X = 100$ (Away goal); goal mouths span $Y \in [44.6, 55.4]$ ($7.32\text{ m}$ width).
- **18-Yard Penalty Boxes**: $X \in [0, 15.7]$ for Home box, $X \in [84.3, 100]$ for Away box; width $Y \in [19.7, 80.3]$ ($40.3\text{ m}$).
- **Penalty Spots**: $X = 12.0$ (Away penalty spot) and $X = 88.0$ (Home penalty spot).
- **Passing Lane Clearances**: Calculated via perpendicular segment distance:
  $$\text{distToSegmentM}(p_x, p_y, x_1, y_1, x_2, y_2)$$
  to determine whether nearby defenders can intercept passing lanes.

### B. Dynamic 22-Player World Model & Micro-Simulation
Every match maintains live dynamic state for all 22 on-pitch footballers and the ball:
- **Player State**: `{ id, name, role, number, x, y, vx, vy, targetX, targetY, stamina, pace, shooting, passing, defending, physical, keeping, ovr, side }`.
- **Ball State**: `{ x, y, carrierId, carrierSide, lastCarrierId, lastSide }`.
- **10 Ticks / Minute**: Each minute executes 10 tactical micro-phases simulating dynamic positional adjustments, ball travel, defender tackles, passing decisions, and shots.
- **Visual Pitch Synchronization**: `src/pitch.js` consumes `match.playerStates` directly, ensuring the 2D canvas radar renders the exact spatial coordinates computed by the simulation.

### C. Carrier Decision AI & Passing Lanes
At every tick, the ball carrier evaluates multiple tactical options:
1. **Shooting Utility**: Evaluates distance to goal ($d \le 32\text{ m}$), angle to goal mouth, shooting attribute, and defender pressure.
2. **Through-Ball Counter-Attack Utility**: Evaluates opponent defensive line depth. When an opponent plays a high line, forward runners exploit the vacant space behind them.
3. **Passing Lane Clearance**: Calculates geometric lane clearance to every teammate; passes with obstructed lanes risk interception.
4. **Midfield Retention & Recycling**: Safe backward or sideways passes to sustain possession when forward avenues are closed.

### D. Authentic Organic Underdog Victories
Touchline XI contains **zero scripted comebacks, zero predetermined outcomes, and zero artificial handicap dice rolls**. Underdog victories emerge organically through genuine tactical physics:
- **Low Block vs. High Line Dynamic**: When a lower-tier team (e.g., Lesotho, 64 OVR) adopts a compact Low Block (`pressing < 35`, `width < 40`, `mentality: 'Defensive'`), their defensive line sits deep ($X \approx 18-28$), compressing the space inside the 18-yard box.
- **Space Exploitation**: When an elite favorite plays All-Out High Press (`pressing > 80`, `mentality: 'Attacking'`), their backline pushes past midfield ($X \approx 52-62$), leaving $35-45\text{ m}$ of vacant green behind them.
- **Breakaway Through-Balls**: A turnover won deep inside the underdog's third triggers a rapid through-ball into the vacant channel. Fast wingers or forwards break clear into an isolated 1-on-1 chance against the keeper.
- Combined with goalkeeper heroics and shot blocking, underdogs legitimately secure points and upsets without artificial bonuses.

### E. Realistic Ball Dispersion, Goalkeeping & Laws of Football
- **Shot Dispersion**: Box-Muller Gaussian dispersion (`randGaussian(m)`) scales with distance and fatigue, aiming towards goal corners ($Y = 47.0$ or $53.0$) with physical post and crossbar woodwork detection.
- **Goalkeeper Reach & Reactions**: Goalkeeper diving reach models physical travel time, wingspan, reaction latency ($0.18\text{s}$), and keeping attributes ($70-92$), saving $\sim 70-74\%$ of shots on target.
- **Penalty Law**: Penalty kicks are strictly awarded when fouls occur inside the 18-yard box coordinates ($X \in [84.3, 100]$ or $[0, 15.7]$ with $Y \in [19.7, 80.3]$).
- **Offside Law**: Evaluated at the exact micro-tick a through-ball is struck: if the forward runner is ahead of the deepest opponent defender in the attacking half, the assistant referee's flag is raised.

### F. Mulberry32 PRNG & Seed Invariance
The engine uses a 32-bit Mulberry PRNG initialized by a string seed:
```javascript
function seedToState(seed) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}
```
**Invariant**: Given the same match seed, homeId, awayId, tactics, and lineups, the engine produces **100% byte-for-byte identical outcomes, scores, player trajectories, and events across all 90 frames on every device**.

### G. Positional & Lineup Invariants
1. `team.starting[0]` is **ALWAYS** a Goalkeeper (`role: 'GK'`).
2. `team.substitutes[0]` is **ALWAYS** the backup Goalkeeper (`role: 'GK'`).
3. Outfield players cannot be swapped into the goalkeeper slot; goalkeeper swaps are strictly goalkeeper-for-goalkeeper.
4. Starting XI always defaults to the highest-rated positional specialists available in the club.
5. In pre-match state, users can swap starters with any bench or reserve player; resetting starting XI restores the default peak XI.

### H. Spatial xG (Expected Goals) Mathematical Model
Expected Goals are calculated spatially from physical position:
$$\text{xG} = \left(\text{distFactor}^2 \times 0.40 + \text{angleFactor} \times 0.12\right) \times \left(0.65 + \frac{\text{shooting}}{100} \times 0.45\right)$$
- Penalty box finishes ($10-14\text{m}$): $\sim 0.15 - 0.35\text{ xG}$.
- 6-yard box tap-ins ($5\text{m}$): $\sim 0.40 - 0.60\text{ xG}$.
- Long-range efforts ($>25\text{m}$): $\sim 0.03 - 0.08\text{ xG}$.
- Penalty kicks: $0.79\text{ xG}$ ($78\%$ historical conversion).

### I. Disciplinary & Stamina Engine
- Stamina begins at $100\%$ for all starters and bench reserves.
- Depletes dynamically per minute based on player pressing intensity and age/work rate.
- Fatigue threshold ($\le 40\%$) triggers `#quickSubAlert` recommending tactical substitutions.
- Contested challenges trigger fouls ($\sim 8-10/\text{match}$), bookings ($\sim 2.0/\text{match}$), and dismissals ($\sim 0.25/\text{match}$). A red card reduces team pitch nodes from 11 to 10, widening defensive gaps.

---

## 5. Audio Synthesizer & Stadium Music Player

### A. Procedural Web Audio API Engine (`src/sound.js`)
- **Referee Whistles**: High-frequency dual-oscillator modulated sine bursts ($2600\text{ Hz} \leftrightarrow 2850\text{ Hz}$) with noise flutter.
- **Ball Kicks**: Low-frequency resonant exponential drop sine wave ($140\text{ Hz} \to 38\text{ Hz}$).
- **Crowd Roar / Goal Cheer**: Multi-stage filtered white noise buffer passed through dynamic bandpass filters to simulate stadium acoustic surges.

### B. Soundtrack Player (`#musicPlayerControls`)
- Native HTML5 soundtrack player loaded with authentic stadium ambient songs:
  1. Haaland Song
  2. Champions Anthem
  3. Matchday Groove
  4. Stadium Drift
- Full transport controls: Play/Pause button, track dropdown, volume slider.
- Responsive design: Automatically hides the slider on mobile ($\le 680\text{px}$) to preserve navigation clearance while keeping playback toggles accessible.

---

## 6. Vector Heraldry & Official Crest System (`src/badges.js`)

Touchline XI features vector crest renderers producing crisp, retina-ready SVG emblems for all 357 teams:
- Shield geometries: Classic Spanish pointed escudo, circular English roundel, German heraldic, Italian oval escutcheon, crown crests.
- Official elements:
  - **India**: AIFF blue & orange tiger shield with golden ashoka motifs.
  - **Argentina**: AFA sun of may with sky-blue and white vertical stripes.
  - **Real Madrid**: Castilian purple diagonal band, gold border, and royal crown.
  - **FC Barcelona**: Blaugrana vertical stripes, St. George's cross, and Senyera flag.
  - **Bayern Munich**: Bavarian blue-and-white diamond lozenges in a red roundel.
  - **Manchester United**: Red devil emblem and golden ship icon.
  - **Arsenal**: Golden cannon facing eastward on a dark scarlet shield.

---

## 7. Quality Assurance, Test Automation & CI Gates

The codebase enforces strict, automated verification pipelines with zero tolerance for broken IDs, missing classes, or syntax regressions:

```bash
# 1. Run Unit & Engine Test Suite (32 tests)
npm test

# 2. Validate DOM ID Consistency (148 unique IDs queried in JS)
node tests/check_dom_ids.mjs

# 3. Validate CSS Class Coverage (235 unique HTML classes)
node tests/find_missing_css_classes.mjs

# 4. Verify Multi-Page View Routing & Modal Interactions (Chrome CDP)
node tests/verify_pages.mjs

# 5. Verify UX Audit Fixes & Database Search (Chrome CDP)
node tests/verify_ux_fixes.mjs

# 6. Build & Verify Standalone Offline Single-File Executable
npm run build
node tests/check_bundle.mjs
```

### Automated Test Coverage Matrix (32 Tests Passing Cleanly):
- **`tests/engine.test.mjs` (19 tests)**: Mulberry32 determinism, 90-minute bounds, frame replay parity, goal/shot consistency, formation live updates, substitution invariants, goalkeeper rules, extra time, penalty shootouts, disciplinary cards, and extended squad depth ($\ge 36$ players/team).
- **`tests/spatial_engine.test.mjs` (6 tests)**: Continuous spatial world model, 22-player boundary constraints, Mulberry32 trajectory determinism, pitch renderer sync, penalty box rule enforcement, and organic low-block counter-attacking underdog upsets.
- **`tests/statistical_audit.test.mjs` (1 test · 500 matches)**: 500-match Monte Carlo simulation audit verifying averages: $3.7$ goals/match, $22.3$ shots, $9.7$ on target, $4.2$ corners, $2.0$ yellows, $0.26$ reds, $43.4\%$ home wins, $20.4\%$ draws, $36.2\%$ away wins.
- **`tests/interaction_audit.test.mjs` (6 tests)**: E2E cross-database player search, tournament bracket preservation during AI sim, and null-safety guards.
- **`tests/verify_ux_fixes.mjs`**: Headless Chrome test validating 350+ team quick filter, scouting empty state reset, pause banner spacebar resume, and Escape key modal dismissal.

---

## 8. Directory & File Reference

```
touchline-xi/
├── assets/
│   ├── logo.jpg                     # Official Touchline XI Gold & Onyx Emblem
│   ├── favicon.ico                  # 32x32 multi-resolution browser icon
│   ├── touchline-banner.svg         # SVG hero banner
│   └── tactical-pitch.svg           # SVG tactical diagram
├── dist/                            # Production static deployment output (Vercel)
│   ├── index.html                   # Bundled standalone HTML
│   ├── touchline-xi-standalone.html # Bundled standalone HTML
│   └── styles.css                   # Stylesheet
├── public/                          # Universal static host fallback
│   ├── index.html
│   └── styles.css
├── src/
│   ├── app.js                       # Primary UI controller, navigation router, scouting hub, modal manager
│   ├── badges.js                    # Vector heraldry badge renderer for 357 teams
│   ├── data.js                      # Core data exporter, tactical formations, play styles
│   ├── engine.js                    # Mulberry32 deterministic match simulation engine
│   ├── pitch.js                     # 2D pitch visualizer and player trajectory animator
│   ├── sound.js                     # Web Audio API whistle, kick, and cheer synthesizer
│   ├── tournament.js                # Knockout bracket manager, extra time & penalty shootouts
│   └── data/
│       ├── clubs.js                 # 207 global clubs across 5 continents (7,518 players)
│       ├── national_teams.js        # 150 Senior FIFA National Teams (5,426 players)
│       ├── national_teams_db.json   # Raw JSON database of national teams
│       └── icons_peak.json          # Curated historical peak player cards
├── tests/
│   ├── engine.test.mjs              # Unit tests for match simulation engine
│   ├── statistical_audit.test.mjs   # 500-match Monte Carlo statistical validation
│   ├── interaction_audit.test.mjs   # E2E interaction and search tests
│   ├── check_dom_ids.mjs            # DOM ID synchronizer
│   ├── find_missing_css_classes.mjs # CSS class auditor
│   ├── check_bundle.mjs             # Standalone bundle parser & syntax check
│   ├── verify_pages.mjs             # Headless Chrome CDP page router test
│   └── verify_ux_fixes.mjs          # Headless Chrome CDP UX audit verification test
├── tools/
│   ├── build-standalone.mjs         # Standalone HTML packager and asset inliner
│   ├── expand_database.py           # Squad depth generator & strongest XI selector
│   ├── legendary_rosters.py         # Curated 50-player rosters for Barcelona, Madrid, Man Utd, etc.
│   └── run_expansion.py             # Master database compiler
├── index.html                       # Standalone production entrypoint
├── index.template.html              # Multi-page development template
├── styles.css                       # Emerald tactical design system
├── touchline-xi-standalone.html     # Single-file offline bundle (5,373 KiB)
├── brain.md                         # Master technical brain & architecture specification
└── README.md                        # Public documentation and quickstart guide
```

---

## 9. Key Gaffer Commandments for Future Work

1. **Deterministic Invariance**: Never inject `Math.random()` into match simulation or replay frames. Always derive pseudorandom state from `m.rng` or Mulberry32 seed states.
2. **Goalkeeper Invariant**: In every team, `starting[0]` must remain the starting Goalkeeper, and `substitutes[0]` must remain the primary backup Goalkeeper.
3. **Zero Dependencies**: Keep the app 100% free of external npm runtime packages.
4. **Offline First**: Any new feature must work completely inside `touchline-xi-standalone.html` without external network requests.
5. **DOM & CSS Sync**: Whenever adding IDs or classes to `index.template.html`, ensure corresponding queries exist in `src/app.js` and matching selectors exist in `styles.css`. Always verify with `node tests/check_dom_ids.mjs` and `node tests/find_missing_css_classes.mjs`.
