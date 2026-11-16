import { getPlayer } from './data.js';

export const DUEL_TYPES = {
  ATTACK_DEFENCE: 'attack_defence',
  DRIBBLING: 'dribbling',
  SKILL_CHALLENGE: 'skill_challenge'
};

export const DUEL_PITCH = {
  width: 100,
  height: 60,
  goalX: 96,
  goalYMin: 24,
  goalYMax: 36,
  goalCenterY: 30,
  dribbleTargetX: 90
};

export function dist2D(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Mulberry32 deterministic PRNG
export function duelRand(duel) {
  duel.rng = (duel.rng + 0x6D2B79F5) >>> 0;
  let t = duel.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function initRoundPhysics(duel) {
  const round = duel.currentRound;
  // In ATTACK_DEFENCE and DRIBBLING, players alternate roles each round:
  // Even rounds (0, 2, 4): P1 attacks, P2 defends
  // Odd rounds (1, 3): P2 attacks, P1 defends
  // In SKILL_CHALLENGE: both run mirrored attempts, round tracks turn
  const isP1Attacking = round % 2 === 0;
  duel.attackerId = isP1Attacking ? duel.p1.id : duel.p2.id;
  duel.defenderId = isP1Attacking ? duel.p2.id : duel.p1.id;
  
  const attacker = isP1Attacking ? duel.p1 : duel.p2;
  const defender = isP1Attacking ? duel.p2 : duel.p1;

  // Spatial starting coordinates
  duel.state = {
    roundTime: 0,
    maxRoundTime: 18, // 18 seconds per round
    phase: 'active', // active, goal, defended, scored, round_over
    outcome: null, // text summary
    ball: {
      x: 20,
      y: 30,
      vx: 0,
      vy: 0,
      carrierId: attacker.id,
      inAir: false
    },
    players: {
      [attacker.id]: {
        x: 18,
        y: 30,
        vx: 0,
        vy: 0,
        speed: (attacker.pace || 80) / 100 * 2.8,
        control: (attacker.dribbling || attacker.ovr || 80) / 100,
        tackle: (attacker.defending || 70) / 100,
        shooting: (attacker.shooting || 75) / 100,
        stamina: 100,
        role: 'attacker'
      },
      [defender.id]: {
        x: 58,
        y: 30,
        vx: 0,
        vy: 0,
        speed: (defender.pace || 80) / 100 * 2.6,
        control: (defender.dribbling || defender.ovr || 80) / 100,
        tackle: (defender.defending || 75) / 100,
        shooting: (defender.shooting || 70) / 100,
        stamina: 100,
        role: 'defender'
      }
    },
    gk: {
      x: 95,
      y: 30,
      vy: 0.8,
      keeping: Math.max(65, Math.min(92, Math.round(((attacker.ovr + defender.ovr) / 2) * 0.95)))
    }
  };
}

export function createPlayerDuel(p1, p2, duelType = DUEL_TYPES.ATTACK_DEFENCE, totalRounds = 5, seed = null) {
  if (!p1 || !p2) throw new Error('Both Player 1 and Player 2 must be provided for a duel.');
  if (p1.id === p2.id) throw new Error('Cannot duel a player against themselves.');

  const duelSeed = seed || `DUEL-${p1.id.slice(0, 5)}-vs-${p2.id.slice(0, 5)}-${Date.now()}`;
  let h = 2166136261;
  for (let i = 0; i < duelSeed.length; i++) {
    h ^= duelSeed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  const duel = {
    version: '1v1-v1',
    seed: duelSeed,
    rng: h >>> 0,
    duelType,
    totalRounds: Math.max(3, Math.min(9, totalRounds)),
    currentRound: 0,
    isComplete: false,
    winner: null,
    p1: {
      id: p1.id,
      name: p1.name,
      role: p1.role,
      ovr: p1.ovr || p1.overall || 85,
      pace: p1.pace || 80,
      shooting: p1.shooting || 75,
      passing: p1.passing || 80,
      dribbling: p1.dribbling || p1.ovr || 82,
      defending: p1.defending || 70,
      physical: p1.physical || 75,
      keeping: p1.keeping || (p1.role === 'GK' ? 85 : 5),
      nat: p1.nat || 'International',
      club: p1.club || p1.teamName || 'World XI'
    },
    p2: {
      id: p2.id,
      name: p2.name,
      role: p2.role,
      ovr: p2.ovr || p2.overall || 85,
      pace: p2.pace || 80,
      shooting: p2.shooting || 75,
      passing: p2.passing || 80,
      dribbling: p2.dribbling || p2.ovr || 82,
      defending: p2.defending || 70,
      physical: p2.physical || 75,
      keeping: p2.keeping || (p2.role === 'GK' ? 85 : 5),
      nat: p2.nat || 'International',
      club: p2.club || p2.teamName || 'World XI'
    },
    score: {
      [p1.id]: 0,
      [p2.id]: 0
    },
    stats: {
      [p1.id]: { goals: 0, dribbles: 0, tackles: 0, shots: 0, points: 0, roundsWon: 0 },
      [p2.id]: { goals: 0, dribbles: 0, tackles: 0, shots: 0, points: 0, roundsWon: 0 }
    },
    roundHistory: [],
    events: [],
    frames: []
  };

  initRoundPhysics(duel);
  recordDuelFrame(duel);
  return duel;
}

export function recordDuelFrame(duel) {
  const f = {
    round: duel.currentRound,
    time: duel.state.roundTime,
    phase: duel.state.phase,
    score: { ...duel.score },
    ball: { ...duel.state.ball },
    players: {
      [duel.p1.id]: { ...duel.state.players[duel.p1.id] },
      [duel.p2.id]: { ...duel.state.players[duel.p2.id] }
    },
    gk: { ...duel.state.gk },
    outcome: duel.state.outcome
  };
  duel.frames.push(f);
}

export function advanceDuelTick(duel, dt = 0.25) {
  if (duel.isComplete) return duel;

  const state = duel.state;
  state.roundTime += dt;

  // Move GK in goal mouth
  state.gk.y += state.gk.vy * (dt * 6);
  if (state.gk.y > DUEL_PITCH.goalYMax - 2) {
    state.gk.y = DUEL_PITCH.goalYMax - 2;
    state.gk.vy *= -1;
  } else if (state.gk.y < DUEL_PITCH.goalYMin + 2) {
    state.gk.y = DUEL_PITCH.goalYMin + 2;
    state.gk.vy *= -1;
  }

  const att = state.players[duel.attackerId];
  const def = state.players[duel.defenderId];
  const ball = state.ball;

  // AI Steer Attacker
  if (duel.duelType === DUEL_TYPES.ATTACK_DEFENCE || duel.duelType === DUEL_TYPES.DRIBBLING) {
    // Attacker target: Move toward goal area (X=85, Y=30)
    let targetX = 85;
    let targetY = 30;

    // If defender is blocking directly in front, attempt a lateral dribble juke
    const distToDef = dist2D(att.x, att.y, def.x, def.y);
    if (distToDef < 12 && def.x > att.x) {
      targetY = def.y > 30 ? 16 : 44; // Feint to the open flank
      const jukeChance = (att.control * 0.7) - (def.tackle * 0.4) + (duelRand(duel) * 0.4);
      if (jukeChance > 0.45 && ball.carrierId === duel.attackerId && att.x < def.x + 2) {
        // Successful burst of acceleration
        att.x += 1.8 * dt * att.speed;
        duel.stats[duel.attackerId].dribbles++;
        duel.events.push({
          type: 'dribble',
          round: duel.currentRound,
          time: Math.round(state.roundTime),
          text: `${duel.attackerId === duel.p1.id ? duel.p1.name : duel.p2.name} beats defender with lightning footwork!`
        });
      }
    }

    const dirX = targetX - att.x;
    const dirY = targetY - att.y;
    const len = Math.max(0.1, Math.sqrt(dirX * dirX + dirY * dirY));
    att.vx = (dirX / len) * att.speed * 2.2;
    att.vy = (dirY / len) * att.speed * 2.2;

    att.x = clamp(att.x + att.vx * dt, 4, 95);
    att.y = clamp(att.y + att.vy * dt, 4, 56);

    // Defender AI: close down attacker and tackle
    const defDirX = att.x - def.x;
    const defDirY = att.y - def.y;
    const defLen = Math.max(0.1, Math.sqrt(defDirX * defDirX + defDirY * defDirY));
    def.vx = (defDirX / defLen) * def.speed * 2.1;
    def.vy = (defDirY / defLen) * def.speed * 2.1;

    def.x = clamp(def.x + def.vx * dt, 10, 92);
    def.y = clamp(def.y + def.vy * dt, 4, 56);

    // Ball follows carrier
    if (ball.carrierId === duel.attackerId) {
      ball.x = att.x + 1.2;
      ball.y = att.y;

      // Check for tackle if defender gets within 3.5 units
      if (dist2D(att.x, att.y, def.x, def.y) < 3.8) {
        const tackleSkill = (def.tackle * 0.65) + (duelRand(duel) * 0.45);
        const retainSkill = (att.control * 0.60) + (duelRand(duel) * 0.35);

        if (tackleSkill > retainSkill) {
          // Defender strips the ball!
          ball.carrierId = duel.defenderId;
          duel.stats[duel.defenderId].tackles++;
          duel.score[duel.defenderId]++;
          state.phase = 'defended';
          state.outcome = `${duel.defenderId === duel.p1.id ? duel.p1.name : duel.p2.name} makes a clean slide tackle!`;
          duel.events.push({
            type: 'tackle',
            round: duel.currentRound,
            time: Math.round(state.roundTime),
            text: state.outcome
          });
          endDuelRound(duel);
          return duel;
        }
      }

      // Check for Shot in ATTACK_DEFENCE
      if (duel.duelType === DUEL_TYPES.ATTACK_DEFENCE && att.x >= 70 && state.phase === 'active') {
        duel.stats[duel.attackerId].shots++;
        const shotAccuracy = att.shooting * 0.7 + duelRand(duel) * 0.45;
        const gkSaveSkill = (state.gk.keeping / 100) * 0.7 + duelRand(duel) * 0.4;

        if (shotAccuracy > gkSaveSkill) {
          // GOAL!
          duel.score[duel.attackerId]++;
          duel.stats[duel.attackerId].goals++;
          state.phase = 'goal';
          state.outcome = `GOAL! ${duel.attackerId === duel.p1.id ? duel.p1.name : duel.p2.name} smashes it into the corner!`;
          duel.events.push({
            type: 'goal',
            round: duel.currentRound,
            time: Math.round(state.roundTime),
            text: state.outcome
          });
          endDuelRound(duel);
          return duel;
        } else {
          // SAVED!
          state.phase = 'defended';
          state.outcome = `SAVED! Goalkeeper tips the shot wide of the post!`;
          duel.score[duel.defenderId]++;
          duel.events.push({
            type: 'save',
            round: duel.currentRound,
            time: Math.round(state.roundTime),
            text: state.outcome
          });
          endDuelRound(duel);
          return duel;
        }
      }

      // Check for Objective Reach in DRIBBLING duel
      if (duel.duelType === DUEL_TYPES.DRIBBLING && att.x >= DUEL_PITCH.dribbleTargetX && state.phase === 'active') {
        duel.score[duel.attackerId]++;
        state.phase = 'scored';
        state.outcome = `${duel.attackerId === duel.p1.id ? duel.p1.name : duel.p2.name} dribbles across the finish line!`;
        duel.events.push({
          type: 'dribble_success',
          round: duel.currentRound,
          time: Math.round(state.roundTime),
          text: state.outcome
        });
        endDuelRound(duel);
        return duel;
      }
    }
  } else if (duel.duelType === DUEL_TYPES.SKILL_CHALLENGE) {
    // Both players complete comparable shooting / passing accuracy drills
    // We simulate progressive drill execution
    att.x = clamp(att.x + (att.speed * 2.5 * dt), 10, 85);
    def.x = clamp(def.x + (def.speed * 2.5 * dt), 10, 85);

    if (state.roundTime >= 5.0 && state.phase === 'active') {
      const p1Skill = (duel.p1.shooting * 0.4 + duel.p1.passing * 0.4 + duel.p1.dribbling * 0.2) / 100;
      const p2Skill = (duel.p2.shooting * 0.4 + duel.p2.passing * 0.4 + duel.p2.dribbling * 0.2) / 100;
      const p1Score = p1Skill + (duelRand(duel) * 0.35);
      const p2Score = p2Skill + (duelRand(duel) * 0.35);

      if (p1Score >= p2Score) {
        duel.score[duel.p1.id]++;
        state.outcome = `${duel.p1.name} hits the bullseye target (${Math.round(p1Score * 100)} pts)!`;
      } else {
        duel.score[duel.p2.id]++;
        state.outcome = `${duel.p2.name} hits the bullseye target (${Math.round(p2Score * 100)} pts)!`;
      }
      state.phase = 'scored';
      duel.events.push({
        type: 'skill_target',
        round: duel.currentRound,
        time: Math.round(state.roundTime),
        text: state.outcome
      });
      endDuelRound(duel);
      return duel;
    }
  }

  // Round Timeout (Defender wins round on clock expiry)
  if (state.roundTime >= state.maxRoundTime && state.phase === 'active') {
    state.phase = 'defended';
    state.outcome = `Time expired! Defensive stand by ${duel.defenderId === duel.p1.id ? duel.p1.name : duel.p2.name}!`;
    duel.score[duel.defenderId]++;
    duel.events.push({
      type: 'timeout',
      round: duel.currentRound,
      time: Math.round(state.roundTime),
      text: state.outcome
    });
    endDuelRound(duel);
    return duel;
  }

  recordDuelFrame(duel);
  return duel;
}

export function endDuelRound(duel) {
  duel.roundHistory.push({
    round: duel.currentRound + 1,
    attacker: duel.attackerId === duel.p1.id ? duel.p1.name : duel.p2.name,
    defender: duel.defenderId === duel.p1.id ? duel.p1.name : duel.p2.name,
    outcome: duel.state.outcome,
    score: { ...duel.score }
  });

  recordDuelFrame(duel);

  if (duel.currentRound + 1 >= duel.totalRounds) {
    // Check for tie-breaker if equal points
    if (duel.score[duel.p1.id] === duel.score[duel.p2.id]) {
      // Golden goal extra round!
      duel.totalRounds++;
      duel.currentRound++;
      initRoundPhysics(duel);
      duel.events.push({
        type: 'tiebreak',
        round: duel.currentRound,
        time: 0,
        text: 'Scores level! Sudden-death tie-breaker round initiated!'
      });
      return;
    }

    duel.isComplete = true;
    duel.winner = duel.score[duel.p1.id] > duel.score[duel.p2.id] ? duel.p1 : duel.p2;
    duel.events.push({
      type: 'duel_won',
      round: duel.currentRound + 1,
      time: Math.round(duel.state.roundTime),
      text: `🏆 ${duel.winner.name} wins the 1v1 Player Duel (${duel.score[duel.p1.id]} - ${duel.score[duel.p2.id]})!`
    });
  } else {
    duel.currentRound++;
    initRoundPhysics(duel);
  }
}

export function playFullDuel(duel) {
  while (!duel.isComplete && duel.frames.length < 1500) {
    advanceDuelTick(duel, 0.25);
  }
  return duel;
}

export function renderDuelPitch(canvas, duel) {
  if (!canvas || !duel || !duel.state) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const wPx = Math.max(1, Math.round(rect.width * scale));
  const hPx = Math.max(1, Math.round(rect.height * scale));
  if (canvas.width !== wPx || canvas.height !== hPx) {
    canvas.width = wPx;
    canvas.height = hPx;
  }
  const W = rect.width;
  const H = rect.height;

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // Deep obsidian turf with grass striping
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#122e22');
  grad.addColorStop(1, '#0e241b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Pitch boundary
  const pX = W * 0.06;
  const pY = H * 0.08;
  const pW = W * 0.88;
  const pH = H * 0.84;

  ctx.strokeStyle = 'rgba(212, 183, 123, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(pX, pY, pW, pH);

  // Half-way line
  ctx.beginPath();
  ctx.moveTo(pX + pW / 2, pY);
  ctx.lineTo(pX + pW / 2, pY + pH);
  ctx.stroke();

  // Center circle
  ctx.beginPath();
  ctx.arc(pX + pW / 2, pY + pH / 2, pH * 0.25, 0, Math.PI * 2);
  ctx.stroke();

  // Goal on right side
  const gY1 = pY + (pH * (DUEL_PITCH.goalYMin / 60));
  const gH = pH * ((DUEL_PITCH.goalYMax - DUEL_PITCH.goalYMin) / 60);
  ctx.fillStyle = 'rgba(212, 183, 123, 0.15)';
  ctx.strokeStyle = '#D4B77B';
  ctx.lineWidth = 3;
  ctx.fillRect(pX + pW - 8, gY1, 16, gH);
  ctx.strokeRect(pX + pW - 8, gY1, 16, gH);

  // Coordinate mapper from 0-100 X, 0-60 Y
  const mapX = x => pX + (x / 100) * pW;
  const mapY = y => pY + (y / 60) * pH;

  // Draw Goalkeeper
  const gk = duel.state.gk;
  ctx.fillStyle = '#F4CF67';
  ctx.beginPath();
  ctx.arc(mapX(gk.x), mapY(gk.y), 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0E1014';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw Players
  const p1State = duel.state.players[duel.p1.id];
  const p2State = duel.state.players[duel.p2.id];

  // Player 1 (Champagne Gold kit)
  if (p1State) {
    ctx.fillStyle = '#D4B77B';
    ctx.beginPath();
    ctx.arc(mapX(p1State.x), mapY(p1State.y), 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#0E1014';
    ctx.font = 'bold 9px Barlow Condensed, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P1', mapX(p1State.x), mapY(p1State.y));

    // Player 1 Name tag
    ctx.fillStyle = '#F4F2EC';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(duel.p1.name.split(' ').pop(), mapX(p1State.x), mapY(p1State.y) - 14);
  }

  // Player 2 (Electric Sky Blue kit)
  if (p2State) {
    ctx.fillStyle = '#92C8F0';
    ctx.beginPath();
    ctx.arc(mapX(p2State.x), mapY(p2State.y), 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#0E1014';
    ctx.font = 'bold 9px Barlow Condensed, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P2', mapX(p2State.x), mapY(p2State.y));

    // Player 2 Name tag
    ctx.fillStyle = '#F4F2EC';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(duel.p2.name.split(' ').pop(), mapX(p2State.x), mapY(p2State.y) - 14);
  }

  // Draw Ball
  const ball = duel.state.ball;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(mapX(ball.x), mapY(ball.y), 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0E1014';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
