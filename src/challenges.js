import {getTeam} from './data.js';
import {createMatch, advanceMinute, playFullMatch, seedToState, updateCurrentFrame} from './engine.js';

// The lead-up is simulated so the takeover includes real scorers, statistics and replay frames.
export const rescues = [
  {title:'Chase the equaliser', minute:76, away:'club_east_bengal', seed:'RESCUE-0-79', goal:'Earn at least a draw', subs:4},
  {title:'Protect the lead', minute:80, away:'club_mumbai_city', seed:'RESCUE-1-5', goal:'Hold on for the win', subs:3},
  {title:'Extra-time decider', minute:105, away:'club_fc_goa', seed:'RESCUE-2-4', goal:'Win the tie, including penalties', subs:4}
];

export function rescueMatch(index, day = '') {
  const scenario = rescues[index];
  const m = createMatch({homeId:'club_mohun_bagan', awayId:scenario.away, seed:scenario.seed, knockout:index === 2});
  while (m.minute < scenario.minute && m.phase !== 'FULL_TIME') advanceMinute(m);
  m.substitutionsUsed = scenario.subs;
  const winger = m.playerStates.home.at(-1);
  winger.stamina = m.stamina[winger.id] = 35;
  if (day) {
    m.seed = day + '-' + scenario.seed;
    m.rng = seedToState(m.seed);
  }
  m.challenge = {kind:'rescue', index, day};
  updateCurrentFrame(m);
  return m;
}

export const draftRoles = ['GK','LB','CB','CB','RB','CDM','CM','CAM','LW','ST','RW','GK','CB','CM','ST','RW'];
export const draftPrice = p => Math.max(2, Math.ceil((p.ovr - 65) / 2));

function budgetTeam(squad) {
  if (squad.length !== 16 || squad.some((p,i) => p?.role !== draftRoles[i]) ||
      new Set(squad.map(p => p.id)).size !== 16 || squad.reduce((n,p) => n + draftPrice(p), 0) > 100)
    throw new Error('Choose 16 different players in position for at most 100 credits.');
  const players = squad.map((p,i) => ({...p, id:'budget-' + p.id, number:i+1}));
  return {id:'budget_xi', name:'Budget XI', short:'BXI', city:'Dream Team', primary:'#d8bc82',
    secondary:'#191d24', crest:'XI', isCustom:true, players,
    starting:players.slice(0,11).map(p=>p.id), substitutes:players.slice(11).map(p=>p.id)};
}

export function budgetMatch(squad, opponent) {
  const m = createMatch({customHomeTeam:budgetTeam(squad), awayId:opponent, formation:'4-2-3-1'});
  m.challenge = {kind:'budget', playerIds:squad.map(p=>p.id)};
  return m;
}

const runFixtures = ['club_aston_villa','club_newcastle','club_chelsea','club_tottenham','club_liverpool'];
export function newRun(seed) {
  return {seed, week:0, points:30, rivalPoints:31, gd:0, rivalGd:0, energy:{}, banned:[], results:[]};
}

function survivalTeam(banned) {
  const original = getTeam('club_brighton');
  const players = original.players.filter(p => !p.isGenerated && !banned.includes(p.id));
  const starting = original.starting.filter(id => players.some(p=>p.id===id));
  const lineup = original.starting.map(id => {
    if (starting.includes(id)) return id;
    const role = original.players.find(p=>p.id===id).role;
    const available = players.filter(p => !starting.includes(p.id) && (p.role==='GK') === (role==='GK'));
    const replacement = available.find(p=>p.role===role) || available[0];
    starting.push(replacement.id);
    return replacement.id;
  });
  return {...original, id:'survival_brighton', isCustom:true, players, starting:lineup,
    substitutes:players.filter(p=>!lineup.includes(p.id)).map(p=>p.id)};
}

export function replayChallengeTeam(m, pool) {
  if (m.homeId === 'budget_xi' && m.challenge?.kind === 'budget')
    return budgetTeam(m.challenge.playerIds.map(id=>pool.find(p=>p.id===id)));
  if (m.homeId === 'survival_brighton' && m.challenge?.kind === 'survival')
    return survivalTeam(m.challenge.banned);
}

export function runMatch(run) {
  if (run.week >= runFixtures.length) throw new Error('This run is complete.');
  const team = survivalTeam(run.banned);
  const m = createMatch({customHomeTeam:team, awayId:runFixtures[run.week], seed:run.seed+'-'+run.week});
  for (const p of team.players) m.stamina[p.id] = run.energy[p.id] ?? 100;
  for (const p of m.playerStates.home) p.stamina = m.stamina[p.id];
  m.challenge = {kind:'survival', week:run.week, runId:run.seed, banned:[...run.banned]};
  updateCurrentFrame(m);
  return m;
}

export function settleRun(run, m) {
  if (m.phase !== 'FULL_TIME' || m.challenge?.practice || m.challenge?.runId !== run.seed || run.week !== m.challenge.week) return run;
  const rival = playFullMatch(createMatch({homeId:'club_everton', awayId:runFixtures[(run.week+2)%5], seed:m.seed+'-rival'}));
  const points = s => s.home > s.away ? 3 : Number(s.home === s.away);
  const energy = {};
  for (const p of getTeam('club_brighton').players)
    energy[p.id] = Math.min(100,(m.stamina[p.id] ?? run.energy[p.id] ?? 100)+30);
  return {...run, week:run.week+1, points:run.points+points(m.score), rivalPoints:run.rivalPoints+points(rival.score),
    gd:run.gd+m.score.home-m.score.away, rivalGd:run.rivalGd+rival.score.home-rival.score.away,
    energy, banned:Object.keys(m.bookings.home).filter(id=>m.bookings.home[id]>=2),
    results:[...run.results, getTeam(m.awayId).name+' '+m.score.home+'–'+m.score.away]};
}

export function takeKick(game, shot, dive, shooting, random = Math.random) {
  if (game.winner || !['Left','Centre','Right'].includes(shot) || !['Left','Centre','Right'].includes(dive)) return;
  const side = game.kicks.length % 2;
  const outcome = random() > Math.min(.98,.72 + shooting*.0025) ? 'Wide' : shot === dive ? 'Saved' : 'Goal';
  if (outcome === 'Goal') game.score[side]++;
  game.kicks.push(outcome);
  const n = game.kicks.length;
  const [a,b] = game.score;
  if (n <= 10 && (a > b + 5-Math.floor(n/2) || b > a + 5-Math.ceil(n/2)) || n >= 10 && n%2 === 0 && a !== b)
    game.winner = a > b ? 1 : 2;
}
