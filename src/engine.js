import {TEAMS, getTeam, getPlayer, DEFAULT_TACTICS, FORMATIONS} from './data.js';

const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const round2 = n => Math.round(n * 100)/100;
const copy = o => JSON.parse(JSON.stringify(o));

export function seedToState(seed) {
  let h = 2166136261;
  const s = String(seed || 'TOUCHLINE-001');
  for (let i=0; i<s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Mulberry32 state transition, stored on the match. Deterministic across modern browsers.
function rand(m) {
  m.rng = (m.rng + 0x6D2B79F5) >>> 0;
  let t = m.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (m,a,b) => a + (b-a)*rand(m);
const chance = (m,p) => rand(m) < clamp(p,0,1);

const emptyStats = () => ({possession:0, passes:0, completed:0, shots:0, onTarget:0, xg:0, fouls:0, yellow:0, red:0, corners:0, offsides:0, saves:0});

export function validateLineup(teamId, ids) {
  const team = getTeam(teamId);
  const pool = new Set(team.players ? team.players.map(p=>p.id) : []);
  // For custom Dream Teams, pool might not be strictly bounded by one team
  if (teamId === 'dream_team' || team.isCustom) {
    return Array.isArray(ids) && ids.length===11 && new Set(ids).size===11 && ids.some(id => getPlayer(team, id)?.role==='GK');
  }
  return Array.isArray(ids) && ids.length===11 && new Set(ids).size===11 && ids.every(id=>pool.has(id)) && ids.some(id => getPlayer(team,id)?.role==='GK');
}

function frameFromMatch(m) {
  return copy({minute:m.minute, phase:m.phase, score:m.score, stats:m.stats, ball:m.ball, possession:m.possession,
    rng:m.rng, events:m.events, tactics:m.tactics, formations:m.formations, lineups:m.lineups, substitutionsUsed:m.substitutionsUsed,
    stamina:copy(m.stamina || {}), winner:m.winner || null, penalties:m.penalties || null, knockout:!!m.knockout,
    bookings:copy(m.bookings || { home: {}, away: {} })});
}

export function createMatch(options = {}) {
  // Support custom team objects directly passed via options (e.g., custom Dream Team XI)
  if (options.customHomeTeam) {
    const existingIdx = TEAMS.findIndex(t => t.id === options.customHomeTeam.id);
    if (existingIdx >= 0) {
      TEAMS[existingIdx] = options.customHomeTeam;
    } else {
      TEAMS.unshift(options.customHomeTeam);
    }
  }
  if (options.customAwayTeam) {
    const existingIdx = TEAMS.findIndex(t => t.id === options.customAwayTeam.id);
    if (existingIdx >= 0) {
      TEAMS[existingIdx] = options.customAwayTeam;
    } else {
      TEAMS.unshift(options.customAwayTeam);
    }
  }

  const homeId = options.homeId ?? (options.customHomeTeam ? options.customHomeTeam.id : 'meridian');
  let awayId = options.awayId ?? (options.customAwayTeam ? options.customAwayTeam.id : 'borough');
  if (homeId === awayId) awayId = homeId === 'borough' ? 'meridian' : 'borough';
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

  const m = {
    version:1, seed:String(options.seed ?? 'TOUCHLINE-001'), rng:seedToState(options.seed ?? 'TOUCHLINE-001'),
    homeId, awayId, minute:0, phase:'PRE_MATCH', possession:'home', ball:{x:50,y:50}, score:{home:0,away:0},
    stats:{home:emptyStats(),away:emptyStats()}, lineups, substitutionsUsed:0, stamina, knockout:!!options.knockout,
    winner:null, penalties:null, bookings:{home:{},away:{}},
    formations:{home:options.formation && FORMATIONS[options.formation] ? options.formation : '4-3-3',away:'4-3-3'},
    tactics:{home:{...DEFAULT_TACTICS,...(options.tactics ?? {})},away:{...DEFAULT_TACTICS,pressing:betweenFake(options.seed,42,72),tempo:betweenFake(`${options.seed}-tempo`,42,66)}},
    events:[{minute:0,type:'kickoff',side:null,text:'The teams are ready. Awaiting kick-off.'}],
    frames:[]
  };
  m.frames.push(frameFromMatch(m));
  return m;
}
// Replacing this minute's snapshot ensures pre-match and in-play instructions replay faithfully.
function updateCurrentFrame(m) {
  if(m.frames.length) m.frames[m.frames.length-1]=frameFromMatch(m);
}
function betweenFake(seed,a,b) {return a + (seedToState(seed) % (b-a+1));}

export function applyTactic(m,key,value) {
  if (m.phase==='FULL_TIME') return;
  if (key==='mentality') {
    if (['Defensive','Balanced','Attacking'].includes(value)) m.tactics.home.mentality=value;
  } else if (['pressing','tempo','width'].includes(key) && Number.isFinite(Number(value))) {
    m.tactics.home[key]=clamp(Number(value),0,100);
  }
  updateCurrentFrame(m);
}

export function changeFormation(m,formation) {
  if (m.phase==='FULL_TIME' || !FORMATIONS[formation]) return false;
  m.formations.home=formation;
  if (m.minute>0) addEvent(m,'tactic','home',`Shape adjusted to ${formation}.`);
  updateCurrentFrame(m);
  return true;
}

export function resetStartingXI(m) {
  if(m.minute>0 || m.phase==='FULL_TIME') return false;
  m.lineups.home=[...getTeam(m.homeId).starting];
  m.substitutionsUsed=0;
  updateCurrentFrame(m);
  return true;
}

export function swapPlayer(m,starterId,benchId) {
  if (m.phase==='FULL_TIME') return false;
  const team=getTeam(m.homeId);
  const idx=m.lineups.home.indexOf(starterId);
  if (idx<0 || m.lineups.home.includes(benchId) || !team.players.some(p=>p.id===benchId)) return false;
  const starter=getPlayer(team,starterId), incoming=getPlayer(team,benchId);
  // Always retain a keeper. In-match GK swaps must be GK-for-GK.
  if ((starter.role==='GK') !== (incoming.role==='GK')) return false;
  if (m.minute>0 && m.substitutionsUsed>=5) return false;
  m.lineups.home[idx]=benchId;
  if (m.minute>0) {
    m.substitutionsUsed=(m.substitutionsUsed ?? 0)+1;
    addEvent(m,'sub','home',`${incoming.name} replaces ${starter.name}.`);
  }
  updateCurrentFrame(m);
  return true;
}

function addEvent(m,type,side,text,extra={}) {
  const entry = {minute:m.minute,type,side,text,...extra};
  m.events.push(entry);
  return entry;
}

function selectAttacker(m,side,role='attack',excludeId=null) {
  const team=getTeam(side==='home'?m.homeId:m.awayId);
  const picks=m.lineups[side].map(id=>getPlayer(team,id)).filter(p=>p && p.id!==excludeId);
  if (!picks.length) {
    const fallback = getPlayer(team, m.lineups[side][0]) || { id: 'p0', name: 'Player', role: 'CM', shooting: 70, defending: 70, passing: 70, pace: 70, physical: 70, keeping: 5 };
    return fallback;
  }
  const weighted=picks.map(p=>{
    let w=role==='shoot' ? p.shooting : role==='defend' ? p.defending : p.passing;
    if (p.role==='GK') w*=0.03;
    if (role==='shoot' && /ST|LW|RW|CAM/.test(p.role)) w*=2.2;
    return Math.max(0.01,w);
  });
  let ticket=rand(m)*weighted.reduce((a,b)=>a+b,0);
  for(let i=0;i<picks.length;i++){ticket-=weighted[i];if(ticket<=0)return picks[i];}
  return picks[picks.length-1];
}

function average(m,side,attr) {
  const team=getTeam(side==='home'?m.homeId:m.awayId);
  const picks = m.lineups[side].map(id=>getPlayer(team,id)).filter(Boolean);
  if (!picks.length) return 65;
  return picks.map(p => p[attr] ?? 60).reduce((a,b)=>a+b,0)/picks.length;
}

function teamStrength(m, side) {
  const team = getTeam(side === 'home' ? m.homeId : m.awayId);
  const picks = m.lineups[side].map(id => getPlayer(team, id)).filter(Boolean);
  if (!picks.length) return 70;
  const avgOvr = picks.reduce((acc, p) => acc + (p.overall || p.ovr || 70), 0) / picks.length;
  const gk = picks.find(p => p.role === 'GK') || picks[0];
  const gkBonus = ((gk?.keeping || gk?.overall || 75) - 75) * 0.12;
  const reds = m.stats?.[side]?.red || 0;
  return avgOvr + gkBonus - (reds * 7);
}

function attackFactor(m,side) {
  const {tempo,pressing,mentality}=m.tactics[side];
  const str = teamStrength(m, side);
  return (str / 75)
    + (tempo-50)*0.003 + (pressing-50)*0.001
    + (mentality==='Attacking' ? .15 : mentality==='Defensive' ? -.12 : 0);
}

export function advanceMinute(m) {
  if (m.phase==='FULL_TIME' || (!m.knockout && m.minute>=90) || (m.knockout && m.minute>=120)) return null;
  m.phase='LIVE';
  m.minute+=1;

  // Dynamic stamina fatigue
  if (m.stamina) {
    const drainHome = 0.45 + (m.tactics.home.pressing > 70 ? 0.25 : 0) + (m.tactics.home.tempo > 70 ? 0.20 : 0);
    const drainAway = 0.45 + (m.tactics.away.pressing > 70 ? 0.25 : 0) + (m.tactics.away.tempo > 70 ? 0.20 : 0);
    for (const id of m.lineups.home) {
      m.stamina[id] = clamp(round2((m.stamina[id] ?? 100) - drainHome), 25, 100);
    }
    for (const id of m.lineups.away) {
      m.stamina[id] = clamp(round2((m.stamina[id] ?? 100) - drainAway), 25, 100);
    }
  }

  const sHome = teamStrength(m, 'home'), sAway = teamStrength(m, 'away');
  const tactHome = (m.tactics.home.mentality === 'Attacking' ? 3 : m.tactics.home.mentality === 'Defensive' ? -3 : 0) + (m.tactics.home.pressing - 50) * 0.04 + (m.tactics.home.tempo - 50) * 0.04;
  const tactAway = (m.tactics.away.mentality === 'Attacking' ? 3 : m.tactics.away.mentality === 'Defensive' ? -3 : 0) + (m.tactics.away.pressing - 50) * 0.04 + (m.tactics.away.tempo - 50) * 0.04;
  const netEdge = (sHome + tactHome) - (sAway + tactAway);
  // Authentic football home ground advantage (+4-6% baseline edge for hosts)
  const homeBias = clamp(0.535 + netEdge * 0.007, 0.18, 0.82);
  const possessHome = clamp(homeBias + between(m,-.18,.18),.15,.85);
  m.stats.home.possession+=possessHome*60;
  m.stats.away.possession+=(1-possessHome)*60;

  // All possession minutes include both teams' build-up play, not just a single event.
  for (const side of ['home','away']) {
    const s=m.stats[side];
    const share=side==='home' ? possessHome : 1-possessHome;
    const attempts=Math.max(1,Math.round(between(m,7,12)*share*2));
    const passSkill=average(m,side,'passing');
    const pressAgainst=m.tactics[side==='home'?'away':'home'].pressing;
    const completionRate=clamp(.69+(passSkill-65)*.0035-(pressAgainst-50)*.0012,.55,.9);
    s.passes+=attempts;
    for(let i=0;i<attempts;i++) if(chance(m,completionRate))s.completed+=1;
  }
  const side=chance(m,possessHome)?'home':'away';
  const opponent=side==='home'?'away':'home';
  m.possession=side;
  const progress=between(m,21,89), lane=between(m,10,90);
  m.ball={x:round2(side==='home'?progress:100-progress),y:round2(lane)};

  // Deliberately lightweight event model, with tactic- and ability-sensitive outcomes.
  const attacking=m.tactics[side];
  const defending=m.tactics[opponent];
  const sideStrength = side === 'home' ? sHome : sAway;
  const oppStrength = side === 'home' ? sAway : sHome;
  const oppDefending=average(m, opponent, 'defending');
  const eventRoll=rand(m);
  const homeShotBonus = side === 'home' ? 0.015 : 0;
  const shotProbability=clamp(.205+(attacking.tempo-50)*.0009
    +(attacking.mentality==='Attacking'?.055:attacking.mentality==='Defensive'?-.04:0)
    +(sideStrength - oppStrength)*.0032
    +homeShotBonus
    -(oppDefending-70)*.0015,.09,.39);

  if(eventRoll<shotProbability){
    const shooter=selectAttacker(m,side,'shoot');
    const goalDistance=between(m,9,34);
    const inBox=goalDistance<17;
    m.ball={x:round2(side==='home'?100-goalDistance/105*100:goalDistance/105*100),y:round2(between(m,19,81))};
    const shotLocation={x:m.ball.x,y:m.ball.y};
    const rawXg=clamp((inBox ? .16 : .044)+(shooter.shooting-70)*.0028
      +(attacking.mentality==='Attacking'?.015:0)
      -(defending.pressing-50)*.00038
      -(oppDefending-70)*.0012+between(m,-.03,.08),.025,.42);
    const xg=round2(rawXg);
    m.stats[side].shots+=1;
    m.stats[side].xg=round2(m.stats[side].xg+xg);
    const accuracy=clamp(.39+(shooter.shooting-74)*.004,.25,.68);
    const onTarget=chance(m,accuracy);
    if(onTarget){
      m.stats[side].onTarget+=1;
      const goalkeeper=getPlayer(getTeam(opponent==='home'?m.homeId:m.awayId),m.lineups[opponent][0])?.keeping ?? 80;
      // Conditional conversion calibrated so per-shot goal likelihood roughly follows xG and GK quality.
      const goalChance=clamp((rawXg/accuracy)*(1+(shooter.shooting-75)*0.005-(goalkeeper-75)*0.0065),.018,.86);
      if(chance(m,goalChance)){
        m.score[side]+=1;
        m.ball={x:side==='home'?99:1,y:50};
        const assister = chance(m, 0.72) ? selectAttacker(m, side, 'pass', shooter.id) : null;
        const assistText = assister ? ` (Assist: ${assister.name})` : '';
        addEvent(m,'goal',side,`${shooter.name} finds the net!${assistText}`,{playerId:shooter.id,assistId:assister?.id,assistName:assister?.name,xg,location:shotLocation});
      } else {
        m.stats[opponent].saves+=1;
        addEvent(m,'save',side,`${shooter.name} forces a sharp save.`,{playerId:shooter.id,xg,location:shotLocation});
        if(chance(m,.42)) m.stats[side].corners+=1;
      }
    } else {
      addEvent(m,'shot',side,`${shooter.name} sends the effort ${chance(m,.6)?'wide':'over the bar'}.`,{playerId:shooter.id,xg,location:shotLocation});
    }
  } else if(eventRoll<shotProbability+.075){
    m.stats[opponent].fouls+=1;
    const offender=selectAttacker(m,opponent,'defend');
    const inBoxPenalty = chance(m, 0.095);

    if (inBoxPenalty) {
      // In-regulation penalty kick
      const taker = selectAttacker(m, side, 'shoot');
      const gk = getPlayer(getTeam(opponent==='home'?m.homeId:m.awayId),m.lineups[opponent][0]);
      m.stats[side].shots+=1;
      m.stats[side].onTarget+=1;
      const penXg = 0.79;
      m.stats[side].xg = round2(m.stats[side].xg + penXg);
      const conversion = clamp(0.76 + ((taker.shooting - 75) * 0.003) - (((gk?.keeping ?? 75) - 75) * 0.003), 0.58, 0.90);
      const scored = chance(m, conversion);
      const shotLocation = { x: side==='home' ? 88 : 12, y: 50 };
      if (scored) {
        m.score[side]+=1;
        m.ball={x:side==='home'?99:1,y:50};
        addEvent(m,'goal',side,`⚽ PENALTY! ${taker.name} calmly converts from the spot!`,{playerId:taker.id,xg:penXg,location:shotLocation,isPenalty:true});
      } else {
        m.stats[opponent].saves+=1;
        addEvent(m,'save',side,`🧤 PENALTY SAVED! Keeper guesses right to deny ${taker.name} from the spot!`,{playerId:taker.id,xg:penXg,location:shotLocation,isPenalty:true});
        if (chance(m, 0.45)) m.stats[side].corners+=1;
      }
    } else {
      const straightRed = chance(m, 0.015);
      const booking = chance(m, 0.22);
      if (!m.bookings) m.bookings = { home: {}, away: {} };

      if (straightRed) {
        m.stats[opponent].red += 1;
        m.bookings[opponent][offender.id] = (m.bookings[opponent][offender.id] || 0) + 2;
        addEvent(m,'card',opponent,`🔴 DIRECT RED CARD! Dangerous foul by ${offender.name} — straight dismissal!`,{playerId:offender.id,card:'red'});
      } else if (booking) {
        const prior = m.bookings[opponent][offender.id] || 0;
        if (prior >= 1) {
          m.stats[opponent].yellow += 1;
          m.stats[opponent].red += 1;
          m.bookings[opponent][offender.id] = prior + 1;
          addEvent(m,'card',opponent,`🔴 SECOND YELLOW CARD! ${offender.name} receives his marching orders and is sent off!`,{playerId:offender.id,card:'second_yellow'});
        } else {
          m.stats[opponent].yellow += 1;
          m.bookings[opponent][offender.id] = 1;
          addEvent(m,'card',opponent,`🟨 BOOKING: ${offender.name} goes into the referee's notebook.`,{playerId:offender.id,card:'yellow'});
        }
      } else {
        addEvent(m,'foul',opponent,`${offender.name} concedes a tactical free kick.`,{playerId:offender.id});
      }
    }
  } else if(eventRoll<shotProbability+.108) {
    m.stats[side].offsides+=1;
    addEvent(m,'offside',side,`${selectAttacker(m,side,'shoot').name} is caught offside.`);
  } else if(eventRoll<shotProbability+.145) {
    m.stats[side].corners+=1;
    addEvent(m,'corner',side,`${side==='home'?getTeam(m.homeId).short:getTeam(m.awayId).short} win a corner.`);
  } else if(eventRoll<shotProbability+.24) {
    const maker=selectAttacker(m,side,'pass');
    const comment=chance(m,.5)?`${maker.name} breaks the line with a pass.`:`${maker.name} carries into the final third.`;
    addEvent(m,'build',side,comment,{playerId:maker.id});
  }
  // Reactive In-Match AI Decisions at key tactical intervals (Minute 45 and 70)
  if (m.minute === 45 || m.minute === 70) {
    const goalDiff = m.score.away - m.score.home;
    const awayTeam = getTeam(m.awayId);
    if (goalDiff < 0) {
      // AI is trailing: increase urgency, pressing and go attacking
      m.tactics.away.mentality = 'Attacking';
      m.tactics.away.pressing = clamp(m.tactics.away.pressing + 16, 65, 96);
      m.tactics.away.tempo = clamp(m.tactics.away.tempo + 14, 65, 92);
      m.tactics.away.width = clamp(m.tactics.away.width + 10, 60, 90);
      addEvent(m, 'tactic', 'away', `${awayTeam.short} Manager adapts at ${m.minute}′: switching to All-Out High Press to chase the game.`);
    } else if (goalDiff > 0 && m.minute >= 70) {
      // AI is leading late at 70': protect the lead with a compact low block
      m.tactics.away.mentality = 'Defensive';
      m.tactics.away.pressing = clamp(m.tactics.away.pressing - 14, 20, 50);
      m.tactics.away.tempo = clamp(m.tactics.away.tempo - 12, 25, 45);
      m.tactics.away.width = clamp(m.tactics.away.width - 15, 30, 50);
      addEvent(m, 'tactic', 'away', `${awayTeam.short} Manager adapts at ${m.minute}′: switching to a disciplined Low Block to secure the lead.`);
    } else if (goalDiff === 0 && m.minute === 70) {
      // Tight deadlock at 70': tactical nudge
      m.tactics.away.tempo = clamp(m.tactics.away.tempo + 6, 50, 75);
      addEvent(m, 'tactic', 'away', `${awayTeam.short} Manager calls for higher tempo in the final 20 minutes.`);
    }
  }

  if(m.minute===45){
    m.phase='HALF_TIME';
    addEvent(m,'half',null,'Half-time. The coaches have work to do.');
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
  return m.events[m.events.length-1] ?? null;
}

export function simulatePenaltyShootout(m) {
  const homeTeam = getTeam(m.homeId), awayTeam = getTeam(m.awayId);
  const shootout = { home: 0, away: 0, kicks: [] };
  const homeKickers = m.lineups.home.slice(1, 6);
  const awayKickers = m.lineups.away.slice(1, 6);

  for (let r = 0; r < 5; r++) {
    const hk = getPlayer(homeTeam, homeKickers[r]) || { id: `hk_${r}`, name: `Home #${r+1}`, shooting: 80 };
    const hScore = chance(m, clamp(0.74 + (hk.shooting - 75) * 0.003, 0.60, 0.90));
    if (hScore) shootout.home++;
    shootout.kicks.push({ side: 'home', round: r + 1, scored: hScore, player: hk.name });
    addEvent(m, 'shootout', 'home', `${hScore ? '⚽' : '❌'} Shootout [Round ${r+1}]: ${hk.name} ${hScore ? 'SCORES!' : 'denied by keeper!'} (${shootout.home}-${shootout.away})`, { playerId: hk.id, scored: hScore, round: r+1 });

    const ak = getPlayer(awayTeam, awayKickers[r]) || { id: `ak_${r}`, name: `Away #${r+1}`, shooting: 80 };
    const aScore = chance(m, clamp(0.74 + (ak.shooting - 75) * 0.003, 0.60, 0.90));
    if (aScore) shootout.away++;
    shootout.kicks.push({ side: 'away', round: r + 1, scored: aScore, player: ak.name });
    addEvent(m, 'shootout', 'away', `${aScore ? '⚽' : '❌'} Shootout [Round ${r+1}]: ${ak.name} ${aScore ? 'SCORES!' : 'denied by keeper!'} (${shootout.home}-${shootout.away})`, { playerId: ak.id, scored: aScore, round: r+1 });
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
    addEvent(m, 'shootout', 'home', `${hScore ? '⚽' : '❌'} Sudden Death [Round ${round}]: ${hk.name} ${hScore ? 'SCORES!' : 'misses!'} (${shootout.home}-${shootout.away})`, { playerId: hk.id, scored: hScore, round });
    shootout.kicks.push({ side: 'away', round, scored: aScore, player: ak.name });
    addEvent(m, 'shootout', 'away', `${aScore ? '⚽' : '❌'} Sudden Death [Round ${round}]: ${ak.name} ${aScore ? 'SCORES!' : 'misses!'} (${shootout.home}-${shootout.away})`, { playerId: ak.id, scored: aScore, round });
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

export function applyShout(m, shout) {
  if (m.phase === 'FULL_TIME') return false;
  if (shout === 'high_press') {
    m.tactics.home.pressing = clamp(m.tactics.home.pressing + 20, 60, 98);
    m.tactics.home.tempo = clamp(m.tactics.home.tempo + 15, 60, 95);
    addEvent(m, 'tactic', 'home', 'Manager shout: HIGH PRESS! Suffocate them high up the pitch.');
  } else if (shout === 'park_bus') {
    m.tactics.home.mentality = 'Defensive';
    m.tactics.home.pressing = clamp(m.tactics.home.pressing - 20, 15, 40);
    m.tactics.home.width = clamp(m.tactics.home.width - 15, 25, 45);
    addEvent(m, 'tactic', 'home', 'Manager shout: PARK THE BUS! Compact deep defensive fortress.');
  } else if (shout === 'shoot_sight') {
    addEvent(m, 'tactic', 'home', 'Manager shout: SHOOT ON SIGHT! Test their keeper every chance you get.');
  } else if (shout === 'work_box') {
    m.tactics.home.tempo = clamp(m.tactics.home.tempo - 15, 30, 50);
    addEvent(m, 'tactic', 'home', 'Manager shout: WORK BALL INTO BOX! Patient build-up, wait for the clear chance.');
  } else if (shout === 'demand_more') {
    addEvent(m, 'tactic', 'home', 'Manager shout: DEMAND MORE! Increase your work rate and intensity.');
  }
  updateCurrentFrame(m);
  return true;
}

export function applyTeamTalk(m, talk) {
  if (m.phase !== 'HALF_TIME') return false;
  if (talk === 'fire_up') {
    addEvent(m, 'talk', 'home', 'Half-time speech: "Show them who we are! Leave everything out on the pitch!" (Team motivated 🔥)');
  } else if (talk === 'demand_more') {
    for (const id of m.lineups.home) {
      if (m.stamina && m.stamina[id]) m.stamina[id] = clamp(m.stamina[id] + 8, 30, 100);
    }
    m.tactics.home.pressing = clamp(m.tactics.home.pressing + 10, 50, 95);
    addEvent(m, 'talk', 'home', 'Half-time speech: "Demand more! Our standards must be higher in the second half." (+Stamina recovery)');
  } else if (talk === 'praise') {
    addEvent(m, 'talk', 'home', 'Half-time speech: "Superb execution, lads. Keep the rhythm and trust our quality." (Confidence high)');
  } else if (talk === 'focus') {
    m.tactics.home.mentality = 'Balanced';
    addEvent(m, 'talk', 'home', 'Half-time speech: "Stay disciplined and organized. Give them no openings." (Defensive focus)');
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
  const frame=base.frames[clamp(index,0,base.frames.length-1)];
  if(!frame) return base;
  return {...copy(frame),version:base.version,seed:base.seed,homeId:base.homeId,awayId:base.awayId,knockout:base.knockout,frames:base.frames};
}
export function resultLabel(m){const h=m.score.home,a=m.score.away;return h===a?'Draw':h>a?'Home win':'Away win';}
