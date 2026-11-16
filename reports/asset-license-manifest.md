# Touchline XI — Asset Licensing, Intellectual Property & Attribution Manifest

**Audit Date:** November 2026  
**Auditor:** Principal Software Architect & QA Automation Team  
**Application Scope:** Touchline XI Football Simulation Studio  

---

## 1. Executive Summary

Touchline XI is an offline-first, browser-executable football management and tactical simulation game. This manifest details the licensing, ownership, and permissible usage rights for all media assets contained in the repository.

---

## 2. Audio & Soundtrack Assets

Located in `music of the game/`:

| Track Filename | Track Title / Artist | Context & Origin | License & Distribution Notice |
|---|---|---|---|
| `Calvin Harris, Dua Lipa - One Kiss (Official Video).mp3` | One Kiss — Calvin Harris & Dua Lipa | Commercial sound recording | ⚠️ Non-commercial / Educational / Personal Evaluation only. Must be excluded or substituted for commercial distributions. |
| `Dai Dai 2026.mp3` | Dai Dai 2026 | Fan / World Cup Theme remix | ⚠️ Community attribution / fair use demonstration. |
| `Dreamers.mp3` | Dreamers — Jung Kook (FIFA World Cup 2022) | FIFA official anthem soundtrack | ⚠️ Commercial copyright held by FIFA / Big Hit. Restricted to non-commercial offline demo. |
| `Haaland Song ( Ha Ha Ha).mp3` | Erling Haaland Chant | Fan chant / satire audio | Parody / community chant. |
| `John Newman - Love Me Again.mp3` | Love Me Again — John Newman | Commercial recording (FIFA 14 nostalgia) | ⚠️ Copyright held by Island Records. Restricted to non-commercial personal evaluation. |
| `K'NAAN - Wavin' Flag (Coca-Cola Celebration Mix).mp3` | Wavin' Flag — K'NAAN | FIFA World Cup 2010 anthem | ⚠️ Commercial copyright. Personal / educational demo only. |
| `La la la 2014.mp3` | La La La (Brazil 2014) — Shakira | FIFA World Cup 2014 anthem | ⚠️ Commercial copyright held by RCA Records. Personal demo only. |
| `Oh Kevin De Bruyne.mp3` | Seven Nation Army / KDB Chant | Football terrace chant recording | Fan culture chant adaptation. |
| `Ricky Martin - The Cup of Life.mp3` | The Cup of Life — Ricky Martin | France 1998 anthem | ⚠️ Commercial copyright held by Sony Music. Personal demo only. |
| `Waka Waka.mp3` | Waka Waka (This Time for Africa) — Shakira | South Africa 2010 anthem | ⚠️ Commercial copyright held by Epic Records. Personal demo only. |

### Audio Fallback & Zero-Dependency Engine
In offline standalone mode (`touchline-xi-standalone.html`), the game features procedural Web Audio synthesis for crowd whistles, cheers, and ball kicks (`src/sound.js`), which is 100% royalty-free and code-generated with zero audio file dependencies.

---

## 3. Visual Badges, Crests & Heraldry

Located in `src/badges.js`:

- **Implementation:** 100% programmatic SVG vector code.
- **Design Philosophy:** Simplified geometric heraldic designs, shield silhouettes, and national flag color combinations.
- **Trademark Notice:** All real-world club and national football association names, nicknames, and traditional color schemes are referenced under descriptive fair use for sports historical simulation and identification purposes. No official endorsement or partnership with FIFA, UEFA, or individual football clubs is implied.

---

## 4. Player Cards & Biographical Data

Located in `src/data/clubs.js`, `src/data/national_teams_db.json`, `src/data/icons_peak.json`:

- **Real Footballers & Legends:** Names, historical positions, and statistical ratings represent public factual records of sporting performance and are used descriptively.
- **Reserve Players & Youth Rosters:** Explicitly marked with provenance metadata (`isGenerated: true`, `playerType: 'generated_reserve'`, `rosterEra: 'Club Reserve'`) and synthesized deterministically through Mulberry32 hashing.
