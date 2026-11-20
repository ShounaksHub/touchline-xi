import {TEAMS, getTeam, getPlayer, DEFAULT_TACTICS, FORMATIONS, registerCustomTeam} from './data.js';

const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const round2 = n => Math.round(n * 100)/100;
const copy = o => JSON.parse(JSON.stringify(o));

// Standard Football Pitch Geometry (105m x 68m normalized to 100 x 100)
export const PITCH = {
  length: 105,
  width: 68,
  // Goal dimensions in 0-100 coordinates
  goalYMin: 44.6,
  goalYMax: 55.4,
  goalCenterY: 50,
  // 18-yard penalty boxes
  penaltyBoxHomeX: 30.0,
  penaltyBoxAwayX: 70.0,
  penaltyBoxYMin: 19.7,
  penaltyBoxYMax: 80.3,
  // Penalty spots
  penaltySpotHomeX: 88.0, // Home shoots at away goal (X=100) from X=88
  penaltySpotAwayX: 12.0  // Away shoots at home goal (X=0) from X=12
};

export function distM(x1, y1, x2, y2) {
  const dx = (x2 - x1) * 1.05;
  const dy = (y2 - y1) * 0.68;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distToSegmentM(px, py, x1, y1, x2, y2) {
  const l2 = ((x2 - x1) * 1.05) ** 2 + ((y2 - y1) * 0.68) ** 2;
  if (l2 === 0) return distM(px, py, x1, y1);
  const t = Math.max(0, Math.min(1, (((px - x1) * 1.05 * (x2 - x1) * 1.05) + ((py - y1) * 0.68 * (y2 - y1) * 0.68)) / l2));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return distM(px, py, projX, projY);
}

export function seedToState(seed) {
  let h = 2166136261;
  const s = String(seed || 'TOUCHLINE-001');
  for (let i=0; i<s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Mulberry32 state transition, stored on the match. Deterministic across modern browsers.
export function rand(m) {
  m.rng = (m.rng + 0x6D2B79F5) >>> 0;
  let t = m.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const between = (m,a,b) => a + (b-a)*rand(m);
export const chance = (m,p) => rand(m) < clamp(p,0,1);

// Box-Muller standard normal variate (mean 0, stdDev 1) using Mulberry32
export function randGaussian(m) {
  let u = 0, v = 0;
  while (u === 0) u = rand(m);
  while (v === 0) v = rand(m);
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateFreshSeed() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    return `TL-${arr[0].toString(36)}-${arr[1].toString(36)}`;
  }
  return `TL-${Date.now().toString(36)}-${Math.floor(Math.random()*1e9).toString(36)}`;
}

const emptyStats = () => ({
  possession: 0,
  passes: 0,
  completed: 0,
  shots: 0,
  onTarget: 0,
  xg: 0,
  fouls: 0,
  yellow: 0,
  red: 0,
  corners: 0,
  offsides: 0,
  saves: 0
});

const emptyPlayerStats = () => ({
  minutes: 0, distance: 0, goals: 0, assists: 0, shots: 0, shotsOnTarget: 0, xg: 0,
  passes: 0, completedPasses: 0, keyPasses: 0, tackles: 0, tacklesWon: 0, offsides: 0,
  interceptions: 0, recoveries: 0, foulsCommitted: 0, foulsWon: 0,
  yellow: 0, red: 0, saves: 0, shotsFaced: 0, saveXg: 0, conceded: 0, substituted: false, sentOff: false
});

function createPlayerStats(team) {
  return Object.fromEntries((team.players || []).map(player => [player.id, emptyPlayerStats()]));
}

function playerStat(m, side, id) {
  if (!id) return null;
  if (!m.playerStats[side][id]) m.playerStats[side][id] = emptyPlayerStats();
  return m.playerStats[side][id];
}

function activePlayers(m, side) {
  return m.playerStates[side].filter(player => !player.sentOff);
}

function restartCarrier(m, side, excludeId = null) {
  const candidates = activePlayers(m, side).filter(player => player.role !== 'GK' && player.id !== excludeId);
  const pool = candidates.length ? candidates : activePlayers(m, side).filter(player => player.role !== 'GK');
  return pool[Math.floor(rand(m) * pool.length)] || activePlayers(m, side)[0] || null;
}

export function validateLineup(teamId, ids) {
  if (!Array.isArray(ids)) return false;
  const count = ids.length;
  // Supports standard 11-a-side and 5-a-side
  if (count !== 11 && count !== 5) return false;
  if (new Set(ids).size !== count) return false;

  const team = getTeam(teamId);
  if (!team) return false;
  
  // Starting goalkeeper contract: slot 0 MUST be a goalkeeper
  const starterGk = getPlayer(team, ids[0]);
  if (!starterGk || starterGk.role !== 'GK') {
    return false;
  }

  // Outfield slots 1..N-1 must not be goalkeepers (unless squad has no outfield players)
  for (let i = 1; i < count; i++) {
    const p = getPlayer(team, ids[i]);
    if (p && p.role === 'GK') {
      return false;
    }
  }

  // For standard teams, all players must belong to the team roster
  if (teamId !== 'dream_team' && !team.isCustom) {
    const pool = new Set(team.players ? team.players.map(p => p.id) : []);
    if (!ids.every(id => pool.has(id))) {
      return false;
    }
  }

  return true;
}

function frameFromMatch(m) {
  // Capture snapshot including playerStates for exact visual and simulation replay
  return copy({
    minute: m.minute,
    phase: m.phase,
    score: m.score,
    stats: m.stats,
    ball: m.ball,
    ballState: m.ballState ? {
      x: m.ballState.x,
      y: m.ballState.y,
      z: m.ballState.z,
      carrierId: m.ballState.carrierId,
      carrierSide: m.ballState.carrierSide
    } : null,
    playerStates: m.playerStates ? {
      home: m.playerStates.home.map(p => ({ id: p.id, role: p.role, x: round2(p.x), y: round2(p.y), stamina: Math.round(p.stamina), sentOff: !!p.sentOff, distanceRun: round2(p.distanceRun || 0) })),
      away: m.playerStates.away.map(p => ({ id: p.id, role: p.role, x: round2(p.x), y: round2(p.y), stamina: Math.round(p.stamina), sentOff: !!p.sentOff, distanceRun: round2(p.distanceRun || 0) }))
    } : null,
    possession: m.possession,
    rng: m.rng,
    events: m.events,
    tactics: m.tactics,
    formations: m.formations,
    lineups: m.lineups,
    substitutionsUsed: m.substitutionsUsed,
    substitutionsUsedBySide: copy(m.substitutionsUsedBySide || { home: 0, away: 0 }),
    stamina: copy(m.stamina || {}),
    winner: m.winner || null,
    penalties: m.penalties || null,
    knockout: !!m.knockout,
    injuryTime: copy(m.injuryTime || { firstHalf: 2, secondHalf: 4 }),
    bookings: copy(m.bookings || { home: {}, away: {} })
    ,playerStats: copy(m.playerStats || { home: {}, away: {} })
    ,lastShotId: m.lastShotId || null
    ,shotStreak: m.shotStreak || 0
  });
}

function betweenFake(seed,a,b) { return a + (seedToState(seed) % (b-a+1)); }

// Initialize spatial tactical anchor coordinates for 11 players
function getInitialPlayerStates(team, lineup, side, formationKey, tactics) {
  const formation = FORMATIONS[formationKey] || FORMATIONS['4-3-3'];
  const widthFactor = 0.72 + (tactics.width / 100) * 0.48;

  return lineup.map((id, idx) => {
    const p = getPlayer(team, id) || { id, name: `Player ${idx+1}`, role: 'CM', pace: 75, shooting: 70, passing: 75, defending: 70, physical: 75, keeping: 5, ovr: 75 };
    const formPos = formation[idx] || ['CM', 50, 50];
    const role = formPos[0];
    let bx = formPos[1];
    let by = 50 + (formPos[2] - 50) * widthFactor;

    // Tactical mentality adjustments
    if (idx !== 0) {
      if (tactics.mentality === 'Defensive') bx = Math.max(12, bx - 8);
      else if (tactics.mentality === 'Attacking') bx = Math.min(88, bx + 7);
    }

    const x = side === 'home' ? bx : 100 - bx;
    const y = by;

    return {
      id: p.id,
      name: p.name,
      role: p.role || role,
      side,
      number: p.number || (idx === 0 ? 1 : idx + 1),
      x: round2(x),
      y: round2(y),
      baseX: round2(x),
      baseY: round2(y),
      targetX: round2(x),
      targetY: round2(y),
      vx: 0,
      vy: 0,
      stamina: 100,
      pace: p.pace || 75,
      shooting: p.shooting || 70,
      passing: p.passing || 75,
      defending: p.defending || 70,
      physical: p.physical || 75,
      keeping: p.role === 'GK' || idx === 0 ? (p.keeping || p.overall || p.ovr || 82) : 5,
      ovr: p.overall || p.ovr || 75,
      sentOff: false,
      distanceRun: 0
    };
  });
}

export function createMatch(options = {}) {
  // Support custom team objects directly passed via options (e.g., custom Dream Team XI)
  if (options.customHomeTeam) {
    registerCustomTeam(options.customHomeTeam);
  }
  if (options.customAwayTeam) {
    registerCustomTeam(options.customAwayTeam);
  }

  const seed = options.seed ? String(options.seed) : generateFreshSeed();
  const homeId = options.homeId ?? (options.customHomeTeam ? options.customHomeTeam.id : 'club_real_madrid');
  let awayId = options.awayId ?? (options.customAwayTeam ? options.customAwayTeam.id : 'club_man_city');
  if (homeId === awayId) awayId = TEAMS.find(t => t.id !== homeId)?.id ?? 'club_man_city';
  const home = getTeam(homeId), away = getTeam(awayId);

  const lineups = {
    home: validateLineup(homeId, options.homeLineup) ? [...options.homeLineup] : [...home.starting],
    away: [...away.starting]
  };

  const stamina = {};
  for (const side of ['home', 'away']) {
    for (const id of lineups[side]) stamina[id] = 100;
    const team = getTeam(side === 'home' ? homeId : awayId);
    for (const id of team.substitutes || []) stamina[id] = 100;
  }

  const injuryFirstHalf = 1 + (seedToState(`${seed}-inj1`) % 4);
  const injurySecondHalf = 2 + (seedToState(`${seed}-inj2`) % 5);

  const homeFormation = options.formation && FORMATIONS[options.formation] ? options.formation : (lineups.home.length === 5 ? '1-2-1' : '4-3-3');
  const awayFormation = options.awayFormation && FORMATIONS[options.awayFormation] ? options.awayFormation : (lineups.away.length === 5 ? '1-2-1' : '4-3-3');

  const homeTactics = { ...DEFAULT_TACTICS, ...(options.tactics ?? {}) };
  const awayTactics = {
    ...DEFAULT_TACTICS,
    pressing: betweenFake(seed, 42, 72),
    tempo: betweenFake(`${seed}-tempo`, 42, 66)
  };

  const playerStates = {
    home: getInitialPlayerStates(home, lineups.home, 'home', homeFormation, homeTactics),
    away: getInitialPlayerStates(away, lineups.away, 'away', awayFormation, awayTactics)
  };

  // Ball starts at center circle
  const ball = { x: 50, y: 50 };
  const ballState = {
    x: 50,
    y: 50,
    z: 0,
    vx: 0,
    vy: 0,
    carrierId: playerStates.home.at(-1)?.id || lineups.home.at(-1) || null, // Forward has kickoff
    carrierSide: 'home',
    lastCarrierId: playerStates.home.at(-1)?.id || null,
    lastSide: 'home',
    inPlay: true
  };

  const m = {
    version: 2,
    seed,
    rng: seedToState(seed),
    homeId,
    awayId,
    minute: 0,
    phase: 'PRE_MATCH',
    possession: 'home',
    ball,
    ballState,
    lastShotId: null,
    shotStreak: 0,
    playerStates,
    score: { home: 0, away: 0 },
    stats: { home: emptyStats(), away: emptyStats() },
    lineups,
    substitutionsUsed: 0,
    substitutionsUsedBySide: { home: 0, away: 0 },
    stamina,
    knockout: !!options.knockout,
    winner: null,
    penalties: null,
    bookings: { home: {}, away: {} },
    playerStats: { home: createPlayerStats(home), away: createPlayerStats(away) },
    injuryTime: { firstHalf: injuryFirstHalf, secondHalf: injurySecondHalf },
    formations: { home: homeFormation, away: awayFormation },
    tactics: { home: homeTactics, away: awayTactics },
    events: [{ minute: 0, type: 'kickoff', side: null, text: 'The teams are ready. Awaiting kick-off.' }],
    frames: []
  };

  m.frames.push(frameFromMatch(m));
  return m;
}

export function updateCurrentFrame(m) {
  if (m.frames.length) m.frames[m.frames.length - 1] = frameFromMatch(m);
}

export function applyTactic(m, key, value, side = 'home') {
  if (m.phase === 'FULL_TIME') return;
  if (!['home', 'away'].includes(side)) return;
  if (key === 'mentality') {
    if (['Defensive','Balanced','Attacking'].includes(value)) m.tactics[side].mentality = value;
  } else if (['pressing','tempo','width'].includes(key) && Number.isFinite(Number(value))) {
    m.tactics[side][key] = clamp(Number(value), 0, 100);
  }
  updateCurrentFrame(m);
}

export function changeFormation(m, formation, side = 'home') {
  if (m.phase === 'FULL_TIME' || !FORMATIONS[formation]) return false;
  if (!['home', 'away'].includes(side)) return false;
  m.formations[side] = formation;
  if (m.minute > 0) addEvent(m, 'tactic', side, `Shape adjusted to ${formation}.`);
  updateCurrentFrame(m);
  return true;
}

export function resetStartingXI(m) {
  if (m.minute > 0 || m.phase === 'FULL_TIME') return false;
  const team = getTeam(m.homeId);
  m.lineups.home = [...team.starting];
  m.substitutionsUsed = 0;
  m.playerStates.home = getInitialPlayerStates(team, m.lineups.home, 'home', m.formations.home, m.tactics.home);
  for (const player of m.playerStates.home) player.stamina = m.stamina[player.id] ?? 100;
  updateCurrentFrame(m);
  return true;
}

export function swapPlayer(m, starterId, benchId, side = 'home') {
  if (m.phase === 'FULL_TIME') return false;
  if (!['home', 'away'].includes(side)) return false;
  const team = getTeam(side === 'home' ? m.homeId : m.awayId);
  const idx = m.lineups[side].indexOf(starterId);
  if (idx < 0 || m.lineups[side].includes(benchId) || !team.players.some(p => p.id === benchId)) return false;
  const starter = getPlayer(team, starterId), incoming = getPlayer(team, benchId);
  if (!starter || !incoming) return false;
  // Always retain a keeper. In-match GK swaps must be GK-for-GK.
  if ((starter.role === 'GK') !== (incoming.role === 'GK')) return false;
  const usedBySide = m.substitutionsUsedBySide?.[side] ?? (side === 'home' ? m.substitutionsUsed : 0);
  if (m.minute > 0 && usedBySide >= 5) return false;

  m.lineups[side][idx] = benchId;

  // Update dynamic spatial player state
  if (m.playerStates && m.playerStates[side] && m.playerStates[side][idx]) {
    const oldP = m.playerStates[side][idx];
    m.playerStates[side][idx] = {
      ...oldP,
      id: incoming.id,
      name: incoming.name,
      role: incoming.role || oldP.role,
      number: incoming.number || 20,
      stamina: m.stamina?.[incoming.id] ?? 100,
      pace: incoming.pace || 75,
      shooting: incoming.shooting || 70,
      passing: incoming.passing || 75,
      defending: incoming.defending || 70,
      physical: incoming.physical || 75,
      keeping: incoming.role === 'GK' || idx === 0 ? (incoming.keeping || 82) : 5,
      ovr: incoming.overall || incoming.ovr || 75
    };
  }

  if (m.minute > 0) {
    m.substitutionsUsed = (m.substitutionsUsed ?? 0) + 1;
    if (!m.substitutionsUsedBySide) m.substitutionsUsedBySide = { home: 0, away: 0 };
    m.substitutionsUsedBySide[side] = (m.substitutionsUsedBySide[side] || 0) + 1;
    playerStat(m, side, incoming.id).substituted = true;
    addEvent(m, 'sub', side, `${incoming.name} replaces ${starter.name}.`, { playerId: incoming.id, outgoingId: starter.id });
  }
  updateCurrentFrame(m);
  return true;
}

function addEvent(m, type, side, text, extra = {}) {
  const entry = { minute: m.minute, type, side, text, ...extra };
  m.events.push(entry);
  return entry;
}

// =========================================================================
// CONTINUOUS SPATIAL SIMULATION ENGINE
// =========================================================================

// Calculate spatial tactical targets for all 11 players based on match state
function updateTacticalTargets(m) {
  const homeTactics = m.tactics.home;
  const awayTactics = m.tactics.away;
  const ball = m.ballState;
  const attackingSide = m.possession;

  const homeFormation = FORMATIONS[m.formations.home] || FORMATIONS['4-3-3'];
  const awayFormation = FORMATIONS[m.formations.away] || FORMATIONS['4-3-3'];

  const homeWidth = 0.72 + (homeTactics.width / 100) * 0.48;
  const awayWidth = 0.72 + (awayTactics.width / 100) * 0.48;

  // Home Defensive Line Depth & Attack Shift (Subtle natural home territorial initiative)
  let homeDepthOffset = (homeTactics.mentality === 'Defensive' ? -10 : homeTactics.mentality === 'Attacking' ? 8 : 0) + 2;
  let awayDepthOffset = (awayTactics.mentality === 'Defensive' ? 10 : awayTactics.mentality === 'Attacking' ? -8 : 0) - 2;

  // High Press pushes line forward; Low Block drops line deep
  if (homeTactics.pressing > 75) homeDepthOffset += 6;
  else if (homeTactics.pressing < 35) homeDepthOffset -= 7;

  if (awayTactics.pressing > 75) awayDepthOffset -= 6;
  else if (awayTactics.pressing < 35) awayDepthOffset += 7;

  // Attacking possession shift (shift forward when on ball)
  const homeBallDrift = (ball.x - 50) * 0.28 + (attackingSide === 'home' ? 8 : -6);
  const awayBallDrift = (ball.x - 50) * 0.28 + (attackingSide === 'away' ? -8 : 6);

  // Update Home players
  activePlayers(m, 'home').forEach((p, idx) => {
    if (idx === 0) {
      // Goalkeeper: positions between ball and goal center
      p.targetX = clamp(5 + (ball.x * 0.08), 3, 14);
      p.targetY = clamp(50 + (ball.y - 50) * 0.22, 43, 57);
      return;
    }
    const formPos = homeFormation[idx] || ['CM', 50, 50];
    const bx = clamp(formPos[1] + homeDepthOffset + homeBallDrift, 8, 92);
    const by = clamp(50 + (formPos[2] - 50) * homeWidth + (ball.y - 50) * 0.12, 6, 94);
    p.targetX = bx;
    p.targetY = by;
  });

  // Update Away players
  activePlayers(m, 'away').forEach((p, idx) => {
    if (idx === 0) {
      p.targetX = clamp(95 - ((100 - ball.x) * 0.08), 86, 97);
      p.targetY = clamp(50 + (ball.y - 50) * 0.22, 43, 57);
      return;
    }
    const formPos = awayFormation[idx] || ['CM', 50, 50];
    const bx = clamp(100 - formPos[1] + awayDepthOffset + awayBallDrift, 8, 92);
    const by = clamp(50 + (formPos[2] - 50) * awayWidth + (ball.y - 50) * 0.12, 6, 94);
    p.targetX = bx;
    p.targetY = by;
  });
}

// Move players towards targets according to pace, stamina, and acceleration
function stepPlayerMovement(m) {
  for (const side of ['home', 'away']) {
    activePlayers(m, side).forEach((p, idx) => {
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.4) {
        const stamRatio = clamp((p.stamina || 100) / 100, 0.4, 1.0);
        const speed = clamp((p.pace / 100) * stamRatio * 2.8, 1.2, 3.8);
        const moveDist = Math.min(dist, speed);
        p.vx = (dx / dist) * moveDist;
        p.vy = (dy / dist) * moveDist;
        p.x = clamp(p.x + p.vx, 1, 99);
        p.y = clamp(p.y + p.vy, 1, 99);
        p.distanceRun = (p.distanceRun || 0) + moveDist;
      } else {
        p.vx = 0;
        p.vy = 0;
      }
    });
  }
}

// Resolve 10-tick micro-simulation within a match minute
function simulateMinutePhases(m) {
  const TICKS_PER_MINUTE = 10;
  let homeTicksPossessed = 0;
  let awayTicksPossessed = 0;

  for (let tick = 0; tick < TICKS_PER_MINUTE; tick++) {
    updateTacticalTargets(m);
    stepPlayerMovement(m);

    const side = m.possession || 'home';
    const opponent = side === 'home' ? 'away' : 'home';
    if (side === 'home') homeTicksPossessed++;
    else awayTicksPossessed++;

    // Find current carrier
    let carrier = activePlayers(m, side).find(p => p.id === m.ballState.carrierId);
    if (!carrier) {
      // Ball is contested / loose: closest player claims it
      let closestPlayer = null;
      let minD = Infinity;
      for (const s of ['home', 'away']) {
        for (const p of activePlayers(m, s)) {
          const d = distM(p.x, p.y, m.ballState.x, m.ballState.y);
          if (d < minD) {
            minD = d;
            closestPlayer = p;
          }
        }
      }
      const fallbackCarrier = restartCarrier(m, side);
      carrier = closestPlayer || fallbackCarrier || activePlayers(m, side)[0];
      m.ballState.carrierId = carrier.id;
      m.ballState.carrierSide = carrier.side;
      m.possession = carrier.side;
    }

    // Ball moves with carrier
    m.ballState.x = carrier.x;
    m.ballState.y = carrier.y;

    // Evaluate pressure from nearby opponents
    const oppPlayers = activePlayers(m, opponent);
    const nearbyOpponents = oppPlayers.map(op => ({
      p: op,
      distM: distM(carrier.x, carrier.y, op.x, op.y)
    })).sort((a, b) => a.distM - b.distM);

    const closestOpponent = nearbyOpponents[0];
    const pressure = nearbyOpponents.slice(0, 3).reduce((acc, curr) => acc + Math.max(0, 1 - curr.distM / 10), 0);

    // 1. TACKLE / CHALLENGE TEST (if opponent is within 3.4 meters)
    const effort = opponent === 'home' && m.minute <= (m.effortUntil ?? -1);
    if (closestOpponent && closestOpponent.distM < (effort ? 4.6 : 3.4)) {
      const tackler = closestOpponent.p;
      const tackleSkill = tackler.defending;
      const dribbleSkill = (carrier.pace * 0.6 + carrier.physical * 0.4);
      const foulProb = clamp(0.22 - (tackler.defending - 70) * 0.003 + (m.tactics[opponent].pressing > 70 ? 0.05 : 0), 0.09, 0.38);

      if (chance(m, foulProb)) {
        // FOUL COMMITTED!
        m.stats[opponent].fouls += 1;
        const inPenaltyBox = (opponent === 'away' && carrier.x >= PITCH.penaltyBoxAwayX && carrier.y >= PITCH.penaltyBoxYMin && carrier.y <= PITCH.penaltyBoxYMax) ||
                             (opponent === 'home' && carrier.x <= PITCH.penaltyBoxHomeX && carrier.y >= PITCH.penaltyBoxYMin && carrier.y <= PITCH.penaltyBoxYMax);

        if (inPenaltyBox) {
          // PENALTY KICK AWARDED!
          playerStat(m, opponent, tackler.id).foulsCommitted += 1;
          playerStat(m, side, carrier.id).foulsWon += 1;
          resolvePenaltyKick(m, side, opponent, carrier);
          break;
        } else {
          // Disciplinary check
          resolveDiscipline(m, opponent, tackler);
          // Free kick: possession stays with carrier team, reset ball
          m.ballState.x = carrier.x;
          m.ballState.y = carrier.y;
          break;
        }
      } else {
        playerStat(m, opponent, tackler.id).tackles += 1;
        // Clean Tackle vs Shielding (authentic home ground duel confidence)
        const homeEdge = tackler.side === 'home' ? 0.055 : -0.055;
        const winTackleProb = clamp(0.48 + (tackleSkill - dribbleSkill) * 0.007 + homeEdge, 0.15, 0.85);
        if (chance(m, winTackleProb)) {
          playerStat(m, opponent, tackler.id).tacklesWon += 1;
          playerStat(m, opponent, tackler.id).recoveries += 1;
          // Turnover! Tackler wins possession
          m.ballState.carrierId = tackler.id;
          m.ballState.carrierSide = tackler.side;
          m.possession = tackler.side;
          m.ballState.lastSide = tackler.side;
          // Organic counter-attack flag: opponent won ball deep
          continue;
        }
      }
    }

    // 2. CARRIER DECISION AI
    const goalX = side === 'home' ? 100 : 0;
    const goalDist = distM(carrier.x, carrier.y, goalX, PITCH.goalCenterY);
    const inAttackingThird = (side === 'home' && carrier.x > 68) || (side === 'away' && carrier.x < 32);

    // Decision utilities
    let shootUtil = 0;
    let throughUtil = 0;
    let passUtil = 0;

    if (inAttackingThird && goalDist <= 32) {
      const angleRad = Math.atan2(Math.abs(PITCH.goalYMax - PITCH.goalYMin) * 0.68, goalDist);
      shootUtil = (34 - goalDist) * 1.6 + (carrier.shooting - 65) * 0.85 - (pressure * 6) + (m.tactics[side].mentality === 'Attacking' ? 8 : -6);
      if (carrier.role === 'ST' || carrier.role === 'CF') shootUtil += 12;
      if (m.minute <= (m.shootUntilBySide?.[side] ?? (side === 'home' ? m.shootUntil : -1) ?? -1)) shootUtil += 24;
      if (m.lastShotId === carrier.id) {
        shootUtil -= 16 + Math.min(12, m.shotStreak * 4);
        passUtil += 10;
      }
    }

    // Check through-ball opportunity (exploiting opponent high defensive line)
    const oppDefenders = oppPlayers.filter(p => p.role !== 'GK');
    const deepestOppX = side === 'home'
      ? Math.max(...oppDefenders.map(d => d.x))
      : Math.min(...oppDefenders.map(d => d.x));

    const highLineSpace = side === 'home' ? (100 - deepestOppX) : deepestOppX;
    const isOpponentHighLine = (side === 'home' && deepestOppX < 65) || (side === 'away' && deepestOppX > 35);

    // Find forward runners
    const forwardTeammates = activePlayers(m, side).filter(tm => {
      if (tm.id === carrier.id || tm.role === 'GK') return false;
      return side === 'home' ? tm.x > carrier.x : tm.x < carrier.x;
    });

    if (isOpponentHighLine && highLineSpace > 18 && forwardTeammates.length > 0) {
      throughUtil = 22 + (carrier.passing - 65) * 0.75 + (highLineSpace * 0.5) - (pressure * 4);
    }

    passUtil = 15 + (carrier.passing - 65) * 0.4;

    // Keep match shot volume in a believable range. Without this soft cap,
    // repeated attacking possessions could turn a 90-minute match into a
    // goal-fest and swamp individual player stats.
    const teamShots = m.stats[side].shots;
    if (teamShots >= 18) shootUtil -= 24 + Math.min(18, (teamShots - 18) * 3);
    if (teamShots >= 20) throughUtil -= 18;

    // Pick action
    if (shootUtil > throughUtil && shootUtil > passUtil && shootUtil > 10) {
      resolveShot(m, side, opponent, carrier, goalDist);
      break;
    } else if (throughUtil > passUtil && throughUtil > 18 && forwardTeammates.length > 0) {
      resolveThroughBall(m, side, opponent, carrier, forwardTeammates, deepestOppX);
      break;
    } else {
      resolvePass(m, side, opponent, carrier);
    }
  }

  // Record 60-second possession split for the minute
  const totalTicks = Math.max(1, homeTicksPossessed + awayTicksPossessed);
  const homeSecs = Math.round((homeTicksPossessed / totalTicks) * 60);
  const awaySecs = 60 - homeSecs;
  m.stats.home.possession += homeSecs;
  m.stats.away.possession += awaySecs;
}

// =========================================================================
// ACTION RESOLVERS (SHOOTING, PASSING, COUNTER-ATTACKS, GOALKEEPING)
// =========================================================================

function resolveShot(m, side, opponent, shooter, goalDist) {
  const goalX = side === 'home' ? 100 : 0;
  const shotLocation = { x: round2(shooter.x), y: round2(shooter.y) };
  m.ballState.x = shooter.x;
  m.ballState.y = shooter.y;

  // Spatial xG calculation based on distance, angle, shooter finishing, and pressure
  const openAngle = Math.atan2(7.32, goalDist);
  const distFactor = clamp(1.0 - (goalDist / 38), 0.05, 0.95);
  const angleFactor = clamp(openAngle / 0.45, 0.20, 1.0);
  const baseCalibratedXg = clamp(
    // Calibrated against the match shot volume: the previous coefficients
    // made a normal 30-shot match report 7+ xG, which inflated both goals and
    // player ratings.
    ((distFactor * distFactor * 0.40 + angleFactor * 0.12) * (0.65 + (shooter.shooting / 100) * 0.45)) * 0.23,
    0.02,
    0.78
  );
  const xg = round2(baseCalibratedXg);
  m.shotStreak = m.lastShotId === shooter.id ? (m.shotStreak || 0) + 1 : 1;
  m.lastShotId = shooter.id;

  m.stats[side].shots += 1;
  m.stats[side].xg = round2(m.stats[side].xg + xg);
  const shooterStats = playerStat(m, side, shooter.id);
  shooterStats.shots += 1;
  shooterStats.xg = round2(shooterStats.xg + xg);

  // Defender block check (close defenders in trajectory cone)
  const oppDefenders = activePlayers(m, opponent).filter(p => p.role !== 'GK');
  const blockingDefender = oppDefenders.find(d => {
    const dDist = distM(shooter.x, shooter.y, d.x, d.y);
    return dDist < 3.8 && distToSegmentM(d.x, d.y, shooter.x, shooter.y, goalX, PITCH.goalCenterY) < 1.8;
  });

  if (blockingDefender && chance(m, clamp(0.24 + (blockingDefender.defending - 70) * 0.004, 0.10, 0.52))) {
    // Shot Blocked!
    playerStat(m, opponent, blockingDefender.id).blocks = (playerStat(m, opponent, blockingDefender.id).blocks || 0) + 1;
    addEvent(m, 'shot', side, `${shooter.name}'s shot is heroically BLOCKED by ${blockingDefender.name}!`, { playerId: shooter.id, xg, location: shotLocation });
    if (chance(m, 0.62)) {
      m.stats[side].corners += 1;
      addEvent(m, 'corner', side, `Deflected behind for a ${side === 'home' ? getTeam(m.homeId).short : getTeam(m.awayId).short} corner.`);
    }
    // Ball deflects loose
    m.ballState.x = clamp(blockingDefender.x + between(m, -4, 4), 5, 95);
    m.ballState.y = clamp(blockingDefender.y + between(m, -8, 8), 10, 90);
    m.ballState.carrierId = null;
    return;
  }

  // Trajectory dispersion: Shooter finishing, balance, and fatigue
  // Shooters aim towards the corners of the goal (47.0 or 53.0) with natural lateral dispersion that scales with distance
  const aimCorner = chance(m, 0.5) ? 47.0 : 53.0;
  const stamRatio = clamp((shooter.stamina || 100) / 100, 0.4, 1.0);
  const distSpread = clamp(goalDist / 13.5, 0.65, 2.2);
  const homeFinishBias = side === 'home' ? 2 : -1;
  const accuracySigma = clamp((5.4 - (shooter.shooting + homeFinishBias - 65) * 0.08 + (1 - stamRatio) * 2.2) * distSpread, 2.8, 11.5);
  const shotY = aimCorner + randGaussian(m) * accuracySigma;

  // Check On Target vs Woodwork vs Off Target
  if (shotY >= PITCH.goalYMin && shotY <= PITCH.goalYMax) {
    // SHOT ON TARGET!
    m.stats[side].onTarget += 1;
    const gk = activePlayers(m, opponent).find(player => player.role === 'GK') || { id: null, name: 'Emergency keeper', keeping: 35, stamina: 60, x: goalX === 100 ? 95 : 5, y: 50 }; // Goalkeeper
    const gkKeeping = gk?.keeping ?? 80;

    // Physical save probability:
    // Baseline goalkeeper save rate on target is ~70-74% in professional football
    const distFromKeeper = Math.abs(shotY - gk.y);
    const shotInCorner = (shotY <= 46.5 || shotY >= 53.5);

    // Anchor finishing to the xG shown in the match report. Player quality,
    // keeper quality, placement, and fatigue can move the result around it.
    // Keep realized goals anchored to the chance quality reported as xG.
    // Attribute modifiers are deliberately narrow so elite players improve
    // finishing without turning every high-quality chance into a goal.
    let goalProb = xg * 0.82;
    goalProb *= clamp(0.86 + (shooter.shooting - 70) * 0.0035, 0.72, 1.16);
    goalProb *= clamp(1 + (shooter.ovr - 78) * 0.03, 0.60, 1.55);
    goalProb *= clamp(1 + (shooter.ovr - (gk.ovr || gkKeeping)) * 0.04, 0.62, 2.05);
    goalProb *= clamp(1 - (gkKeeping - 75) * 0.0025, 0.78, 1.18);
    // Avoid arcade-style hat-trick loops: once a player has scored twice,
    // defenses adapt and subsequent chances become materially harder.
    if (shooterStats.goals >= 2) {
      goalProb *= clamp(1 - (shooterStats.goals - 1) * 0.18, 0.48, 1);
    }
    if (m.tactics[side].mentality === 'Defensive' && m.tactics[opponent].mentality === 'Attacking') goalProb *= 0.88;
    if (shotInCorner) goalProb *= 1.12;
    if (distFromKeeper < 1.6) goalProb *= 0.78;
    const gkStam = clamp((gk?.stamina || 100) / 100, 0.4, 1.0);
    goalProb *= 0.92 + gkStam * 0.08;
    const saveProb = clamp(1 - goalProb, 0.18, 0.98);

    if (chance(m, saveProb)) {
      // GOALKEEPER SAVE!
      m.stats[opponent].saves += 1;
      if (gk.id) {
        const keeperStats = playerStat(m, opponent, gk.id);
        keeperStats.saves += 1;
        keeperStats.shotsFaced += 1;
        keeperStats.saveXg = round2(keeperStats.saveXg + xg);
      }
      shooterStats.shotsOnTarget += 1;
      const isCorner = chance(m, 0.58);
      if (isCorner) {
        m.stats[side].corners += 1;
        addEvent(m, 'corner', side, `Tipped behind by ${gk.name} for a corner kick.`);
      }
      addEvent(m, 'save', side, `🧤 WHAT A SAVE! ${gk.name} denies ${shooter.name}'s goal-bound strike!`, { playerId: shooter.id, keeperId: gk.id, xg, location: shotLocation });
      m.ballState.x = gk.x;
      m.ballState.y = gk.y;
      m.ballState.carrierId = isCorner ? null : gk.id;
      m.ballState.carrierSide = opponent;
      m.possession = opponent;
    } else {
      // GOAL SCORED!
      m.score[side] += 1;
      shooterStats.shotsOnTarget += 1;
      shooterStats.goals += 1;
      if (gk.id) {
        const keeperStats = playerStat(m, opponent, gk.id);
        keeperStats.shotsFaced += 1;
        keeperStats.conceded += 1;
      }
      m.ballState.x = side === 'home' ? 99 : 1;
      m.ballState.y = 50;
      m.ballState.carrierId = null;

      // Find assister
      const assister = activePlayers(m, side).find(p => p.id === m.ballState.lastCarrierId && p.id !== shooter.id);
      const assistText = assister ? ` (Assist: ${assister.name})` : '';
      if (assister) playerStat(m, side, assister.id).assists += 1;
      addEvent(m, 'goal', side, `⚽ GOAL! ${shooter.name} finds the back of the net!${assistText}`, {
        playerId: shooter.id,
        assistId: assister?.id,
        assistName: assister?.name,
        xg,
        location: shotLocation
      });

      // Reset to kickoff
      m.possession = opponent;
      m.ballState.x = 50;
      m.ballState.y = 50;
      const restart = restartCarrier(m, opponent, shooter.id);
      m.ballState.carrierId = restart?.id || null;
      m.ballState.carrierSide = opponent;
    }
  } else if (Math.abs(shotY - PITCH.goalYMin) < 0.8 || Math.abs(shotY - PITCH.goalYMax) < 0.8) {
    // HIT WOODWORK (Post or crossbar)
    addEvent(m, 'shot', side, `OFF THE POST! ${shooter.name}'s thunderbolt rattles the woodwork!`, { playerId: shooter.id, xg, location: shotLocation });
    m.ballState.x = goalX;
    m.ballState.y = clamp(shotY, 40, 60);
    m.ballState.carrierId = null;
  } else {
    // SHOT WIDE / OVER
    addEvent(m, 'shot', side, `${shooter.name} sends the effort ${chance(m, 0.6) ? 'wide of the post' : 'over the crossbar'}.`, { playerId: shooter.id, xg, location: shotLocation });
    // Goal kick for defending side
    const gk = activePlayers(m, opponent).find(player => player.role === 'GK') || { id: null, name: 'Emergency keeper', keeping: 35, stamina: 60, x: goalX === 100 ? 95 : 5, y: 50 };
    m.ballState.x = gk.x;
    m.ballState.y = gk.y;
    m.ballState.carrierId = gk.id;
    m.ballState.carrierSide = opponent;
    m.possession = opponent;
  }
}

// Through-ball exploiting high defensive line (Authentic Underdog / Counter-Attack Engine)
function resolveThroughBall(m, side, opponent, carrier, forwardTeammates, deepestOppX) {
  const runners = [...forwardTeammates].sort((a, b) => b.pace - a.pace).slice(0, Math.min(3, forwardTeammates.length));
  const runner = runners[Math.floor(rand(m) * runners.length)] || runners[0];

  m.stats[side].passes += 1;
  const carrierStats = playerStat(m, side, carrier.id);
  carrierStats.passes += 1;

  // Offside check: was runner beyond deepest opponent when pass was struck?
  const isOffside = side === 'home'
    ? (runner.x > deepestOppX && runner.x > 50)
    : (runner.x < deepestOppX && runner.x < 50);

  if (isOffside) {
    m.stats[side].offsides += 1;
    playerStat(m, side, runner.id).offsides += 1;
    addEvent(m, 'offside', side, `Flag raised! ${runner.name} is caught offside on the through-ball.`);
    const oppGK = activePlayers(m, opponent).find(player => player.role === 'GK');
    m.ballState.x = oppGK.x;
    m.ballState.y = oppGK.y;
    m.ballState.carrierId = oppGK.id;
    m.ballState.carrierSide = opponent;
    m.possession = opponent;
    return;
  }

  // Interception check by opponent defenders
  const passTargetX = side === 'home' ? Math.min(92, runner.x + 14) : Math.max(8, runner.x - 14);
  const passTargetY = runner.y;

  const oppDefenders = activePlayers(m, opponent).filter(p => p.role !== 'GK');
  const interceptor = oppDefenders.find(d => distToSegmentM(d.x, d.y, carrier.x, carrier.y, passTargetX, passTargetY) < 2.5);

  if (interceptor && chance(m, clamp(0.35 + (interceptor.defending - carrier.passing) * 0.005, 0.15, 0.65))) {
    // Intercepted by recovering defender
    m.ballState.x = interceptor.x;
    m.ballState.y = interceptor.y;
    m.ballState.carrierId = interceptor.id;
    m.ballState.carrierSide = opponent;
    m.possession = opponent;
    playerStat(m, opponent, interceptor.id).interceptions += 1;
    return;
  }

  // Through-ball completed! Runner breaks clear behind defense!
  m.stats[side].completed += 1;
  carrierStats.completedPasses += 1;
  carrierStats.keyPasses += 1;
  m.ballState.lastCarrierId = carrier.id;
  runner.x = passTargetX;
  runner.y = passTargetY;
  m.ballState.carrierId = runner.id;
  m.ballState.x = runner.x;
  m.ballState.y = runner.y;

  addEvent(m, 'build', side, `⚡ COUNTER-ATTACK! ${carrier.name} threads a brilliant through-ball into space for ${runner.name}!`, { playerId: carrier.id });

  // 1-on-1 Scoring Opportunity directly created!
  const goalDist = distM(runner.x, runner.y, side === 'home' ? 100 : 0, PITCH.goalCenterY);
  resolveShot(m, side, opponent, runner, goalDist);
}

// Normal passing and midfield retention
function resolvePass(m, side, opponent, carrier) {
  const teammates = activePlayers(m, side).filter(p => p.id !== carrier.id);
  // Pick teammate with clearest passing lane
  const oppPlayers = activePlayers(m, opponent);

  const candidatePasses = teammates.map(tm => {
    let minOppDist = Infinity;
    for (const opp of oppPlayers) {
      const d = distToSegmentM(opp.x, opp.y, carrier.x, carrier.y, tm.x, tm.y);
      if (d < minOppDist) minOppDist = d;
    }
    return { tm, laneClearance: minOppDist };
  }).sort((a, b) => b.laneClearance - a.laneClearance);

  const target = candidatePasses[0]?.tm || teammates[0];
  m.stats[side].passes += 1;
  const carrierStats = playerStat(m, side, carrier.id);
  carrierStats.passes += 1;

  const pressAgainst = m.tactics[opponent].pressing;
  const homePassBonus = side === 'home' ? 0.045 : -0.045;
  const passAccuracy = clamp(0.72 + (carrier.passing - 68) * 0.006 - (pressAgainst - 50) * 0.0015 + homePassBonus, 0.48, 0.95);

  if (chance(m, passAccuracy)) {
    // Completed pass
    m.stats[side].completed += 1;
    carrierStats.completedPasses += 1;
    m.ballState.lastCarrierId = carrier.id;
    m.ballState.carrierId = target.id;
    m.ballState.x = target.x;
    m.ballState.y = target.y;
    if (chance(m, 0.08)) {
      addEvent(m, 'build', side, `${carrier.name} links play smartly with ${target.name}.`, { playerId: carrier.id });
    }
  } else {
    // Interception or misplaced pass
    const interceptor = oppPlayers.sort((a, b) => distM(carrier.x, carrier.y, a.x, a.y) - distM(carrier.x, carrier.y, b.x, b.y))[0];
    const isAttackingDeep = (side === 'home' && carrier.x > 68) || (side === 'away' && carrier.x < 32);
    if (isAttackingDeep && chance(m, 0.45)) {
      m.stats[side].corners += 1;
      addEvent(m, 'corner', side, `Cleared out of play by ${interceptor?.name || 'the defense'} for a corner.`);
    }
    m.ballState.lastCarrierId = carrier.id;
    m.ballState.carrierId = interceptor ? interceptor.id : null;
    m.ballState.carrierSide = opponent;
    m.possession = opponent;
    if (interceptor) {
      playerStat(m, opponent, interceptor.id).interceptions += 1;
      m.ballState.x = interceptor.x;
      m.ballState.y = interceptor.y;
    }
  }
}

// In-regulation penalty kick
function resolvePenaltyKick(m, side, opponent, fouledPlayer) {
  const taker = activePlayers(m, side).sort((a, b) => b.shooting - a.shooting)[0] || fouledPlayer;
  const gk = activePlayers(m, opponent).find(player => player.role === 'GK') || { id: null, name: 'Emergency keeper', keeping: 35, stamina: 60, x: side === 'home' ? 95 : 5, y: 50 };
  m.stats[side].shots += 1;
  m.stats[side].onTarget += 1;
  const penXg = 0.79;
  m.stats[side].xg = round2(m.stats[side].xg + penXg);
  const takerStats = playerStat(m, side, taker.id);
  takerStats.shots += 1;
  takerStats.shotsOnTarget += 1;
  takerStats.xg = round2(takerStats.xg + penXg);
  playerStat(m, side, fouledPlayer.id).foulsWon += 1;

  const conversion = clamp(0.76 + ((taker.shooting - 75) * 0.003) - (((gk?.keeping ?? 75) - 75) * 0.003), 0.58, 0.90);
  const scored = chance(m, conversion);
  const shotLocation = { x: side === 'home' ? PITCH.penaltySpotHomeX : PITCH.penaltySpotAwayX, y: 50 };

  if (scored) {
    m.score[side] += 1;
    if (gk.id) {
      const keeperStats = playerStat(m, opponent, gk.id);
      keeperStats.shotsFaced += 1;
      keeperStats.conceded += 1;
    }
    takerStats.goals += 1;
    m.ballState.x = side === 'home' ? 99 : 1;
    m.ballState.y = 50;
    addEvent(m, 'goal', side, `⚽ PENALTY GOAL! ${taker.name} coolly sends keeper the wrong way from the spot!`, {
      playerId: taker.id,
      keeperId: gk.id,
      xg: penXg,
      location: shotLocation,
      isPenalty: true
    });
    // Kickoff reset
    m.possession = opponent;
    m.ballState.x = 50;
    m.ballState.y = 50;
    m.ballState.carrierId = restartCarrier(m, opponent, taker.id)?.id || activePlayers(m, opponent)[0]?.id || null;
    m.ballState.carrierSide = opponent;
  } else {
    m.stats[opponent].saves += 1;
    if (gk.id) {
      const keeperStats = playerStat(m, opponent, gk.id);
      keeperStats.saves += 1;
      keeperStats.shotsFaced += 1;
      keeperStats.saveXg = round2(keeperStats.saveXg + penXg);
    }
    addEvent(m, 'save', side, `🧤 PENALTY SAVED! ${gk.name} dives full length to deny ${taker.name} from the spot!`, {
      playerId: taker.id,
      xg: penXg,
      location: shotLocation,
      isPenalty: true
    });
    if (chance(m, 0.75)) m.stats[side].corners += 1;
    m.ballState.x = gk.x;
    m.ballState.y = gk.y;
    m.ballState.carrierId = gk.id;
    m.ballState.carrierSide = opponent;
    m.possession = opponent;
  }
}

function resolveDiscipline(m, opponent, offender) {
  const straightRed = chance(m, 0.012);
  const booking = chance(m, 0.25);
  if (!m.bookings) m.bookings = { home: {}, away: {} };

  const offenderStats = playerStat(m, opponent, offender.id);
  offenderStats.foulsCommitted += 1;
  if (straightRed) {
    m.stats[opponent].red += 1;
    offenderStats.red += 1;
    offenderStats.sentOff = true;
    const dismissed = m.playerStates[opponent].find(player => player.id === offender.id);
    if (dismissed) dismissed.sentOff = true;
    m.bookings[opponent][offender.id] = (m.bookings[opponent][offender.id] || 0) + 2;
    addEvent(m, 'card', opponent, `🔴 DIRECT RED CARD! Dangerous foul by ${offender.name} — straight dismissal!`, { playerId: offender.id, card: 'red' });
      applyRedCardTactics(m, opponent);
  } else if (booking) {
    const prior = m.bookings[opponent][offender.id] || 0;
    if (prior >= 1) {
      m.stats[opponent].yellow += 1;
      m.stats[opponent].red += 1;
      offenderStats.yellow += 1;
      offenderStats.red += 1;
      offenderStats.sentOff = true;
      const dismissed = m.playerStates[opponent].find(player => player.id === offender.id);
      if (dismissed) dismissed.sentOff = true;
      m.bookings[opponent][offender.id] = prior + 1;
      addEvent(m, 'card', opponent, `🔴 SECOND YELLOW CARD! ${offender.name} receives his marching orders and is sent off!`, { playerId: offender.id, card: 'second_yellow' });
      applyRedCardTactics(m, opponent);
    } else {
      m.stats[opponent].yellow += 1;
      offenderStats.yellow += 1;
      m.bookings[opponent][offender.id] = 1;
      addEvent(m, 'card', opponent, `🟨 BOOKING: ${offender.name} goes into the referee's notebook.`, { playerId: offender.id, card: 'yellow' });
    }
  } else {
    addEvent(m, 'foul', opponent, `${offender.name} concedes a tactical free kick.`, { playerId: offender.id });
  }
}

function applyRedCardTactics(m, side) {
  const tactics = m.tactics[side];
  tactics.mentality = 'Defensive';
  tactics.pressing = clamp(tactics.pressing - 22, 15, 55);
  tactics.tempo = clamp(tactics.tempo - 16, 25, 60);
  tactics.width = clamp(tactics.width - 12, 25, 55);
  const opponent = side === 'home' ? 'away' : 'home';
  m.tactics[opponent].mentality = 'Attacking';
  m.tactics[opponent].pressing = clamp(m.tactics[opponent].pressing + 10, 40, 98);
  addEvent(m, 'tactic', side, `${side === 'home' ? getTeam(m.homeId).short : getTeam(m.awayId).short} drops into a compact defensive shape after the dismissal.`);
}

// =========================================================================
// MAIN ENTRYPOINTS: advanceMinute, playFullMatch, matchFromFrame
// =========================================================================

export function advanceMinute(m) {
  if (m.phase === 'FULL_TIME' || (!m.knockout && m.minute >= 90) || (m.knockout && m.minute >= 120)) return null;
  m.phase = 'LIVE';
  m.minute += 1;

  for (const side of ['home', 'away']) {
    for (const player of activePlayers(m, side)) playerStat(m, side, player.id).minutes += 1;
  }

  // Continuous Spatial Simulation of this minute
  simulateMinutePhases(m);

  // Fatigue follows actual work completed in this minute. Movement, tactical
  // intensity, role, pace, physicality, and live instructions all matter.
  if (m.stamina) {
    for (const side of ['home', 'away']) {
      const tactics = m.tactics[side];
      for (const player of activePlayers(m, side)) {
        const distance = player.distanceRun || 0;
        const roleCost = player.role === 'GK' ? 0.08 : ['CM','CDM','CAM'].includes(player.role) ? 0.16 : 0.12;
        const intensity = tactics.pressing * 0.0018 + tactics.tempo * 0.0012;
        const physicalBuffer = Math.max(0, player.physical - 70) * 0.0015;
        const paceCost = Math.max(0, player.pace - 70) * 0.001;
        const touchCost = player.id === m.ballState.carrierId ? 0.05 : 0;
        const shoutCost = m.minute <= (m.effortUntilBySide?.[side] ?? (side === 'home' ? m.effortUntil : -1) ?? -1) ? 0.35 : 0;
        const drain = clamp(roleCost + distance * 0.014 + intensity + paceCost + touchCost - physicalBuffer + shoutCost, 0.08, 1.25);
        m.stamina[player.id] = clamp(round2((m.stamina[player.id] ?? 100) - drain), 18, 100);
        player.stamina = m.stamina[player.id];
        const performance = playerStat(m, side, player.id);
        performance.distance = round2((performance.distance || 0) + distance * 0.68);
        player.distanceRun = 0;
      }
    }
  }

  // Keep wide attacks and defensive clearances represented in the long-run
  // match model even when no shot reaches the final third this minute.
  if (chance(m, 0.008)) m.stats.home.corners += 1;
  if (chance(m, 0.008)) m.stats.away.corners += 1;

  // Sync public ball property to canvas renderer
  m.ball = { x: round2(m.ballState.x), y: round2(m.ballState.y) };

  // Reactive In-Match AI Decisions at key tactical intervals (Minute 45 and 70)
  if (m.minute === 45 || m.minute === 70) {
    const goalDiff = m.score.away - m.score.home;
    const awayTeam = getTeam(m.awayId);
    if (goalDiff < 0) {
      m.tactics.away.mentality = 'Attacking';
      m.tactics.away.pressing = clamp(m.tactics.away.pressing + 16, 65, 96);
      m.tactics.away.tempo = clamp(m.tactics.away.tempo + 14, 65, 92);
      m.tactics.away.width = clamp(m.tactics.away.width + 10, 60, 90);
      addEvent(m, 'tactic', 'away', `${awayTeam.short} Manager adapts at ${m.minute}′: switching to All-Out High Press to chase the game.`);
    } else if (goalDiff > 0 && m.minute >= 70) {
      m.tactics.away.mentality = 'Defensive';
      m.tactics.away.pressing = clamp(m.tactics.away.pressing - 14, 20, 50);
      m.tactics.away.tempo = clamp(m.tactics.away.tempo - 12, 25, 45);
      m.tactics.away.width = clamp(m.tactics.away.width - 15, 30, 50);
      addEvent(m, 'tactic', 'away', `${awayTeam.short} Manager adapts at ${m.minute}′: switching to a disciplined Low Block to secure the lead.`);
    } else if (goalDiff === 0 && m.minute === 70) {
      m.tactics.away.tempo = clamp(m.tactics.away.tempo + 6, 50, 75);
      addEvent(m, 'tactic', 'away', `${awayTeam.short} Manager calls for higher tempo in the final 20 minutes.`);
    }
  }

  if (m.minute === 44) {
    const extra = m.injuryTime?.firstHalf || 2;
    addEvent(m, 'tactic', null, `⏱️ 4th Official Board: +${extra} min added injury time in the first half.`);
  }

  if (m.minute === 45) {
    m.phase = 'HALF_TIME';
    addEvent(m, 'half', null, 'Half-time. The coaches have work to do.');
  }

  if (m.minute === 89) {
    const extra = m.injuryTime?.secondHalf || 4;
    addEvent(m, 'tactic', null, `⏱️ 4th Official Board: +${extra} min added injury time in the second half.`);
  }

  if (!m.knockout) {
    if (m.minute >= 90) {
      m.phase = 'FULL_TIME';
      addEvent(m, 'full', null, 'Full-time. The final whistle blows.');
    }
  } else {
    if (m.minute === 90) {
      if (m.score.home === m.score.away) {
        m.phase = 'EXTRA_TIME';
        addEvent(m, 'half', null, 'Full-time: 90′ level! Moving into Extra Time.');
      } else {
        m.phase = 'FULL_TIME';
        m.winner = m.score.home > m.score.away ? 'home' : 'away';
        addEvent(m, 'full', null, `Full-time. ${getTeam(m.winner === 'home' ? m.homeId : m.awayId).name} advances!`);
      }
    } else if (m.minute === 105) {
      addEvent(m, 'half', null, 'Extra Time Half-time. 15 minutes left to decide the contest.');
    } else if (m.minute >= 120) {
      if (m.score.home === m.score.away) {
        m.phase = 'PENALTIES';
        addEvent(m, 'full', null, '120′ exhausted! Deciding the tie with a penalty shootout.');
        simulatePenaltyShootout(m);
      } else {
        m.phase = 'FULL_TIME';
        m.winner = m.score.home > m.score.away ? 'home' : 'away';
        addEvent(m, 'full', null, `Full-time (AET). ${getTeam(m.winner === 'home' ? m.homeId : m.awayId).name} advances!`);
      }
    }
  }

  m.frames.push(frameFromMatch(m));
  return m.events[m.events.length - 1] ?? null;
}

export function simulatePenaltyShootout(m) {
  const homeTeam = getTeam(m.homeId), awayTeam = getTeam(m.awayId);
  const shootout = { home: 0, away: 0, kicks: [] };
  const homeKickers = m.lineups.home.slice(1, 6);
  const awayKickers = m.lineups.away.slice(1, 6);
  const recordKick = (side, player, scored, round) => {
    const keeperSide = side === 'home' ? 'away' : 'home';
    const keeper = activePlayers(m, keeperSide).find(p => p.role === 'GK');
    const kickerStats = playerStat(m, side, player.id);
    kickerStats.shots += 1;
    kickerStats.xg = round2((kickerStats.xg || 0) + 0.76);
    if (scored) {
      kickerStats.shotsOnTarget += 1;
      kickerStats.goals += 1;
      if (keeper?.id) {
        const keeperStats = playerStat(m, keeperSide, keeper.id);
        keeperStats.shotsFaced += 1;
        keeperStats.conceded += 1;
      }
    } else if (keeper?.id) {
      const keeperStats = playerStat(m, keeperSide, keeper.id);
      keeperStats.saves += 1;
      keeperStats.shotsFaced += 1;
      keeperStats.saveXg = round2((keeperStats.saveXg || 0) + 0.76);
    }
    addEvent(m, 'shootout', side, `${scored ? '⚽' : '❌'} Shootout [Round ${round}]: ${player.name} ${scored ? 'SCORES!' : 'denied by keeper!'} (${shootout.home}-${shootout.away})`, { playerId: player.id, scored, round, isShootout: true });
  };

  for (let r = 0; r < 5; r++) {
    const hk = getPlayer(homeTeam, homeKickers[r]) || { id: `hk_${r}`, name: `Home #${r+1}`, shooting: 80 };
    const hScore = chance(m, clamp(0.74 + (hk.shooting - 75) * 0.003, 0.60, 0.90));
    if (hScore) shootout.home++;
    shootout.kicks.push({ side: 'home', round: r + 1, scored: hScore, player: hk.name });
    recordKick('home', hk, hScore, r + 1);

    const ak = getPlayer(awayTeam, awayKickers[r]) || { id: `ak_${r}`, name: `Away #${r+1}`, shooting: 80 };
    const aScore = chance(m, clamp(0.74 + (ak.shooting - 75) * 0.003, 0.60, 0.90));
    if (aScore) shootout.away++;
    shootout.kicks.push({ side: 'away', round: r + 1, scored: aScore, player: ak.name });
    recordKick('away', ak, aScore, r + 1);
  }

  let round = 6;
  while (shootout.home === shootout.away && round <= 11) {
    const hk = getPlayer(homeTeam, m.lineups.home[round - 1] || m.lineups.home[1]) || { id: `hk_sd`, name: 'Home Kicker', shooting: 75 };
    const ak = getPlayer(awayTeam, m.lineups.away[round - 1] || m.lineups.away[1]) || { id: `ak_sd`, name: 'Away Kicker', shooting: 75 };
    const hScore = chance(m, 0.72);
    const aScore = chance(m, 0.72);
    if (hScore) shootout.home++;
    if (aScore) shootout.away++;
    shootout.kicks.push({ side: 'home', round, scored: hScore, player: hk.name });
    recordKick('home', hk, hScore, round);
    shootout.kicks.push({ side: 'away', round, scored: aScore, player: ak.name });
    recordKick('away', ak, aScore, round);
    round++;
  }
  if (shootout.home === shootout.away) {
    shootout.home++;
  }
  m.penalties = shootout;
  m.winner = shootout.home > shootout.away ? 'home' : 'away';
  m.phase = 'FULL_TIME';
  const winningTeam = getTeam(m.winner === 'home' ? m.homeId : m.awayId);
  addEvent(m, 'full', m.winner, `Shootout ends: ${shootout.home}-${shootout.away}. ${winningTeam.name} wins on penalties!`);
  updateCurrentFrame(m);
  return shootout;
}

export function applyShout(m, shout, side = 'home') {
  if (m.phase === 'FULL_TIME') return false;
  if (!['home', 'away'].includes(side)) return false;
  if (shout === 'high_press') {
    m.tactics[side].pressing = clamp(m.tactics[side].pressing + 20, 60, 98);
    m.tactics[side].tempo = clamp(m.tactics[side].tempo + 15, 60, 95);
    addEvent(m, 'tactic', side, 'Manager shout: HIGH PRESS! Suffocate them high up the pitch.');
  } else if (shout === 'park_bus') {
    m.tactics[side].mentality = 'Defensive';
    m.tactics[side].pressing = clamp(m.tactics[side].pressing - 20, 15, 40);
    m.tactics[side].width = clamp(m.tactics[side].width - 15, 25, 45);
    addEvent(m, 'tactic', side, 'Manager shout: PARK THE BUS! Compact deep defensive fortress.');
  } else if (shout === 'shoot_sight') {
    m.shootUntilBySide = m.shootUntilBySide || {};
    m.shootUntilBySide[side] = m.minute + 10;
    addEvent(m, 'tactic', side, 'Shoot on sight: take earlier shots for the next ten minutes.');
  } else if (shout === 'work_box') {
    m.tactics[side].tempo = clamp(m.tactics[side].tempo - 15, 30, 50);
    addEvent(m, 'tactic', side, 'Manager shout: WORK BALL INTO BOX! Patient build-up, wait for the clear chance.');
  } else if (shout === 'demand_more') {
    m.effortUntilBySide = m.effortUntilBySide || {};
    m.effortUntilBySide[side] = m.minute + 10;
    addEvent(m, 'tactic', side, 'Demand more: close down harder for ten minutes at extra stamina cost.');
  }
  updateCurrentFrame(m);
  return true;
}

export function applyTeamTalk(m, talk, side = 'home') {
  if (m.phase !== 'HALF_TIME') return false;
  if (!['home', 'away'].includes(side)) return false;
  if (talk === 'fire_up') {
    addEvent(m, 'talk', side, 'Half-time speech: "Show them who we are! Leave everything out on the pitch!" (Team motivated 🔥)');
  } else if (talk === 'demand_more') {
    for (const id of m.lineups[side]) {
      if (m.stamina && m.stamina[id]) m.stamina[id] = clamp(m.stamina[id] + 8, 30, 100);
      const ps = m.playerStates?.[side]?.find(p => p.id === id);
      if (ps) ps.stamina = m.stamina[id];
    }
    m.tactics[side].pressing = clamp(m.tactics[side].pressing + 10, 50, 95);
    addEvent(m, 'talk', side, 'Half-time speech: "Demand more! Our standards must be higher in the second half." (+Stamina recovery)');
  } else if (talk === 'praise') {
    addEvent(m, 'talk', side, 'Half-time speech: "Superb execution, lads. Keep the rhythm and trust our quality." (Confidence high)');
  } else if (talk === 'focus') {
    m.tactics[side].mentality = 'Balanced';
    addEvent(m, 'talk', side, 'Half-time speech: "Stay disciplined and organized. Give them no openings." (Defensive focus)');
  }
  updateCurrentFrame(m);
  return true;
}

export function playFullMatch(m) {
  const maxMins = m.knockout ? 120 : 90;
  while(m.phase !== 'FULL_TIME' && m.minute < maxMins) advanceMinute(m);
  return m;
}

export function matchFromFrame(base, index) {
  const frame = base.frames[clamp(index, 0, base.frames.length - 1)];
  if (!frame) return base;
  return {
    ...copy(frame),
    version: base.version,
    seed: base.seed,
    homeId: base.homeId,
    awayId: base.awayId,
    knockout: base.knockout ?? frame.knockout,
    frames: base.frames
  };
}

export function resultLabel(m) {
  const h = m.score.home, a = m.score.away;
  return h === a ? 'Draw' : h > a ? 'Home win' : 'Away win';
}
