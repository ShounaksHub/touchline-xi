import {getTeam, getPlayer, DEFAULT_TACTICS, FORMATIONS} from './data.js';

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

const emptyStats = () => ({possession:0, passes:0, completed:0, shots:0, onTarget:0, xg:0, fouls:0, yellow:0, corners:0, offsides:0, saves:0});

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
    rng:m.rng, events:m.events, tactics:m.tactics, formations:m.formations, lineups:m.lineups, substitutionsUsed:m.substitutionsUsed});
}

export function createMatch(options = {}) {
  const homeId = options.homeId ?? 'meridian';
  let awayId = options.awayId ?? 'borough';
  if (homeId === awayId) awayId = homeId === 'borough' ? 'meridian' : 'borough';
  const home = getTeam(homeId), away = getTeam(awayId);
  const lineups = {
    home: validateLineup(homeId, options.homeLineup) ? [...options.homeLineup] : [...home.starting],
    away: [...away.starting]
  };
  const m = {
    version:1, seed:String(options.seed ?? 'TOUCHLINE-001'), rng:seedToState(options.seed ?? 'TOUCHLINE-001'),
    homeId, awayId, minute:0, phase:'PRE_MATCH', possession:'home', ball:{x:50,y:50}, score:{home:0,away:0},
    stats:{home:emptyStats(),away:emptyStats()}, lineups, substitutionsUsed:0,
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
function selectAttacker(m,side,role='attack') {
  const team=getTeam(side==='home'?m.homeId:m.awayId);
  const picks=m.lineups[side].map(id=>getPlayer(team,id)).filter(Boolean);
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
  return m.lineups[side].map(id=>getPlayer(team,id)?.[attr] ?? 60).reduce((a,b)=>a+b,0)/11;
}
function attackFactor(m,side) {
  const {tempo,pressing,mentality}=m.tactics[side];
  return (average(m,side,'passing')*.28+average(m,side,'shooting')*.38+average(m,side,'pace')*.34)/75
    + (tempo-50)*0.003 + (pressing-50)*0.001
    + (mentality==='Attacking' ? .15 : mentality==='Defensive' ? -.12 : 0);
}

export function advanceMinute(m) {
  if (m.phase==='FULL_TIME' || m.minute>=90) return null;
  m.phase='LIVE';
  m.minute+=1;
  const homeBias=clamp(0.5+(attackFactor(m,'home')-attackFactor(m,'away'))*.13, .36, .64);
  const possessHome=clamp(homeBias + between(m,-.21,.21),.19,.81);
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
  const eventRoll=rand(m);
  const shotProbability=clamp(.205+(attacking.tempo-50)*.0009
    +(attacking.mentality==='Attacking'?.055:attacking.mentality==='Defensive'?-.04:0)
    +(attackFactor(m,side)-attackFactor(m,opponent))*.04,.13,.34);
  if(eventRoll<shotProbability){
    const shooter=selectAttacker(m,side,'shoot');
    const goalDistance=between(m,9,34);
    const inBox=goalDistance<17;
    m.ball={x:round2(side==='home'?100-goalDistance/105*100:goalDistance/105*100),y:round2(between(m,19,81))};
    const shotLocation={x:m.ball.x,y:m.ball.y};
    const rawXg=clamp((inBox ? .16 : .044)+(shooter.shooting-70)*.0028
      +(attacking.mentality==='Attacking'?.015:0)
      -(defending.pressing-50)*.00038+between(m,-.03,.08),.025,.39);
    const xg=round2(rawXg);
    m.stats[side].shots+=1;
    m.stats[side].xg=round2(m.stats[side].xg+xg);
    const accuracy=clamp(.39+(shooter.shooting-74)*.004,.25,.68);
    const onTarget=chance(m,accuracy);
    if(onTarget){
      m.stats[side].onTarget+=1;
      const goalkeeper=getPlayer(getTeam(opponent==='home'?m.homeId:m.awayId),m.lineups[opponent][0])?.keeping ?? 80;
      // Conditional conversion calibrated so per-shot goal likelihood roughly follows xG.
      const goalChance=clamp(rawXg/accuracy*(1-(goalkeeper-80)*.004),.018,.82);
      if(chance(m,goalChance)){
        m.score[side]+=1;
        m.ball={x:side==='home'?99:1,y:50};
        addEvent(m,'goal',side,`${shooter.name} finds the net!`,{playerId:shooter.id,xg,location:shotLocation});
      } else {
        m.stats[opponent].saves+=1;
        addEvent(m,'save',side,`${shooter.name} forces a sharp save.`,{playerId:shooter.id,xg,location:shotLocation});
        if(chance(m,.37)) m.stats[side].corners+=1;
      }
    } else {
      addEvent(m,'shot',side,`${shooter.name} sends the effort ${chance(m,.6)?'wide':'over the bar'}.`,{playerId:shooter.id,xg,location:shotLocation});
    }
  } else if(eventRoll<shotProbability+.072){
    m.stats[opponent].fouls+=1;
    const offender=selectAttacker(m,opponent,'defend');
    const booking=chance(m,.21);
    if(booking) m.stats[opponent].yellow+=1;
    addEvent(m,booking?'card':'foul',opponent,`${offender.name} ${booking?'goes into the book':'concedes a free kick'}.`,{playerId:offender.id});
  } else if(eventRoll<shotProbability+.105) {
    m.stats[side].offsides+=1;
    addEvent(m,'offside',side,`${selectAttacker(m,side,'shoot').name} is caught offside.`);
  } else if(eventRoll<shotProbability+.135) {
    m.stats[side].corners+=1;
    addEvent(m,'corner',side,`${side==='home'?getTeam(m.homeId).short:getTeam(m.awayId).short} win a corner.`);
  } else if(eventRoll<shotProbability+.23) {
    const maker=selectAttacker(m,side,'pass');
    const comment=chance(m,.5)?`${maker.name} breaks the line with a pass.`:`${maker.name} carries into the final third.`;
    addEvent(m,'build',side,comment,{playerId:maker.id});
  }
  // Reactive In-Match AI Decisions at key intervals (e.g. 45' and 65')
  if (m.minute === 46 || m.minute === 65) {
    const goalDiff = m.score.away - m.score.home;
    if (goalDiff < 0) {
      // AI is trailing: increase urgency, pressing and go attacking
      m.tactics.away.mentality = 'Attacking';
      m.tactics.away.pressing = clamp(m.tactics.away.pressing + 15, 60, 95);
      m.tactics.away.tempo = clamp(m.tactics.away.tempo + 12, 60, 90);
      addEvent(m, 'tactic', 'away', `AI Manager instructs a high pressing assault to chase the game.`);
    } else if (goalDiff > 0 && m.minute >= 65) {
      // AI is leading late: protect the lead
      m.tactics.away.mentality = 'Defensive';
      m.tactics.away.pressing = clamp(m.tactics.away.pressing - 12, 25, 55);
      m.tactics.away.tempo = clamp(m.tactics.away.tempo - 10, 30, 50);
      addEvent(m, 'tactic', 'away', `AI Manager switches to a compact defensive block to protect the lead.`);
    }
  }

  if(m.minute===45){
    m.phase='HALF_TIME';
    addEvent(m,'half',null,'Half-time. The coaches have work to do.');
  }
  if(m.minute===90){
    m.phase='FULL_TIME';
    addEvent(m,'full',null,'Full-time. The final whistle blows.');
  }
  m.frames.push(frameFromMatch(m));
  return m.events[m.events.length-1] ?? null;
}

export function playFullMatch(m) {while(m.minute<90)advanceMinute(m);return m;}

export function matchFromFrame(base, index) {
  const frame=base.frames[clamp(index,0,base.frames.length-1)];
  if(!frame) return base;
  return {...copy(frame),version:base.version,seed:base.seed,homeId:base.homeId,awayId:base.awayId,frames:base.frames};
}
export function resultLabel(m){const h=m.score.home,a=m.score.away;return h===a?'Draw':h>a?'Home win':'Away win';}
