# Touchline XI — Master Technical Brain & Architecture Specification

> **Touchline XI** is an offline-first, deterministic football simulation studio and squad laboratory built with zero runtime npm dependencies. It pairs a calibrated 2D pitch radar simulation engine with deep tactical management, a knockout tournament bracket system, a fantasy Galácticos studio, an archive replay vault, and a massive 12,900+ real player and historic legend database across 357 global clubs and national teams.

---

## 1. Executive Summary & Core Philosophy

- **Repository**: [ShounaksHub/touchline-xi](https://github.com/ShounaksHub/touchline-xi)
- **Live Production URL**: [touchline-xi-fawn.vercel.app](https://touchline-xi-fawn.vercel.app/)
- **License**: MIT
- **Sibling Project**: [ShounaksHub/Cricket-Game](https://github.com/ShounaksHub/Cricket-Game)
- **Zero Runtime Dependencies**: 100% vanilla JavaScript (ES modules), CSS3, HTML5 Canvas, Web Audio API, and SVG. No frameworks, no external libraries, no CDNs required.
- **Offline-First Delivery**: Bundled into a self-contained single-file HTML executable (`touchline-xi-standalone.html`, ~5.3 MB) containing embedded CSS, vector heraldry, data arrays, and procedural audio.
- **Calibrated Football Science**: Powered by Mulberry32 deterministic PRNG. Tested across a massive 500-match Monte Carlo simulation benchmark to guarantee real-world top-flight statistical parity (2.9–3.1 goals/game, 40% home win bias, realistic card and xG distribution).

---

## 2. Global Database Architecture (357 Teams · 12,944 Players)

Touchline XI houses one of the most comprehensive open-source football databases ever assembled in a browser simulator:

### A. Team Breakdown (357 Teams)
1. **European Elite & Domestic Clubs (UEFA)**: 100 clubs spanning the Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie, Primeira Liga, Scottish Premiership, etc.
2. **South American Clubs (CONMEBOL)**: 39 clubs spanning Brazil (Brasileirão), Argentina (Primera División), Colombia, Uruguay, Chile, etc.
3. **North & Central American Clubs (CONCACAF)**: 20 clubs spanning MLS, Liga MX, Costa Rica, etc.
4. **Asian & Oceanic Clubs (AFC / OFC)**: 28 clubs spanning Saudi Pro League, J1 League, K League, ISL (India), A-League (Australia), etc.
5. **African Clubs (CAF)**: 20 clubs spanning Egypt, Morocco, South Africa, Nigeria, Tunisia, Ghana, etc.
6. **Senior FIFA National Teams**: Top 150 nations ranked by official FIFA points, complete with continental representation.

### B. Squad Depth & 20+ Reserve System
- **Every squad** in the game features **36 to 50 players**:
  - **Starting XI (11 players)**: Highest-rated positional specialist eleven matching the tactical shape.
  - **Substitutes (5–7 primary bench)**: Includes a backup goalkeeper (always `substitutes[0]`) and top tactical impact substitutes.
  - **Reserves (20–35 players)**: Deep reserves and historic icons accessible for rotation and substitutions in Squad Lab.
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

## 4. Deterministic Engine Specifications & Invariants

### A. Mulberry32 PRNG & Seed Invariance
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
**Invariant**: Given the same match seed, homeId, awayId, tactics, and lineups, the engine produces **100% byte-for-byte identical outcomes, scores, and events across all 90 frames on every device**.

### B. Positional & Lineup Invariants
1. `team.starting[0]` is **ALWAYS** a Goalkeeper (`role: 'GK'`).
2. `team.substitutes[0]` is **ALWAYS** the backup Goalkeeper (`role: 'GK'`).
3. Outfield players cannot be swapped into the goalkeeper slot; goalkeeper swaps are strictly goalkeeper-for-goalkeeper.
4. Starting XI always defaults to the highest-rated positional specialists available in the club.
5. In pre-match state, users can swap starters with any bench or reserve player; resetting starting XI restores the default peak XI.

### C. xG (Expected Goals) Mathematical Model
Shot probability and xG are computed using:
- Attacker Shooting attribute vs. Goalkeeper Keeping attribute.
- Spatial coordinate distance from goal center $(100, 50)$ or $(0, 50)$.
- Defensive pressure (nearby opponent defender defending attributes).
- Attacking tactical width and tempo adjustments.
- Real-world expected shot conversion: average shot xG ranges from $0.05$ (long-range speculative) to $0.75$ (uncontested box finish).

### D. Disciplinary & Stamina Engine
- Stamina begins at $100\%$ for all starters and bench reserves.
- Depletes dynamically per minute based on player pressing intensity and age/work rate.
- Fatigue threshold ($\le 40\%$) triggers `#quickSubAlert` recommending tactical substitutions.
- Fouls trigger yellow cards ($~1.3/\text{match}$) and red cards ($~0.14/\text{match}$). A red card reduces team pitch nodes from 11 to 10, widening defensive gaps.

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
# 1. Run Unit & Engine Test Suite (24 tests)
npm test

# 2. Validate DOM ID Consistency (146 unique IDs queried in JS)
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

### Automated Test Coverage Matrix:
- **`tests/engine.test.mjs`**: 18 tests covering Mulberry32 determinism, 90-minute bounds, frame replay parity, goal/shot consistency, formation live updates, substitution invariants, goalkeeper rules, extra time, penalty shootouts, disciplinary cards, and extended squad depth ($\ge 36$ players/team).
- **`tests/statistical_audit.test.mjs`**: 500-match Monte Carlo simulation audit verifying averages: $3.16$ goals/match, $20.5$ shots, $9.0$ on target, $1.36$ yellows, $0.13$ reds, $38.6\%$ home wins, $29.4\%$ draws, $32.0\%$ away wins.
- **`tests/interaction_audit.test.mjs`**: E2E cross-database player search, tournament bracket preservation during AI sim, and null-safety guards.
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
