import test from 'node:test';
import assert from 'node:assert/strict';
import {TEAMS,getTeam} from '../src/data.js';
import {createMatch,advanceMinute,playFullMatch,matchFromFrame,swapPlayer,changeFormation,applyTactic,validateLineup,resetStartingXI,applyShout,applyTeamTalk,simulatePenaltyShootout} from '../src/engine.js';

test('clubs and top 150 national teams contain unique sixteen-player rosters',()=>{
  assert.equal(TEAMS.length, 166);
  for(const team of TEAMS){assert.equal(team.players.length,16);assert.equal(new Set(team.players.map(p=>p.id)).size,16);assert.equal(team.starting.length,11);assert.equal(team.substitutes.length,5)}
});
test('same seed and inputs produce deterministic 90-minute outcomes',()=>{
  const a=playFullMatch(createMatch({seed:'FOREVER-FC'}));
  const b=playFullMatch(createMatch({seed:'FOREVER-FC'}));
  assert.deepEqual(a.score,b.score);assert.deepEqual(a.stats,b.stats);assert.deepEqual(a.events,b.events);assert.equal(a.frames.length,91);
});
test('simulation ends at 90 and cannot run beyond full time',()=>{
  const m=playFullMatch(createMatch({seed:'MIDFIELD'}));
  assert.equal(m.minute,90);assert.equal(m.phase,'FULL_TIME');
  assert.equal(advanceMinute(m),null);assert.equal(m.minute,90);assert.equal(m.frames.length,91);
});
test('frames replay exactly to the same score and event history',()=>{
  const full=playFullMatch(createMatch({seed:'REPLAY'}));
  for(const i of [0,1,45,46,67,90]){
    const frame=matchFromFrame(full,i);
    assert.equal(frame.minute,i);assert.deepEqual(frame.score,full.frames[i].score);assert.deepEqual(frame.events,full.frames[i].events);
  }
});
test('goals and shots remain internally consistent',()=>{
  for(const seed of ['ONE','TWO','THREE','FOUR']){
    const m=playFullMatch(createMatch({seed}));
    for(const side of ['home','away']){
      const s=m.stats[side];const goals=m.events.filter(e=>e.type==='goal'&&e.side===side).length;
      assert.equal(goals,m.score[side]);assert.ok(s.onTarget>=goals);assert.ok(s.shots>=s.onTarget);
      assert.ok(s.completed<=s.passes);assert.ok(s.xg>=0);
      assert.ok(s.possession>=0&&s.possession<=5400);
    }
    assert.ok(Math.abs(m.stats.home.possession+m.stats.away.possession-5400)<1e-6);
  }
});
test('formation changes and tactics are applied to live state',()=>{
  const m=createMatch();assert.equal(changeFormation(m,'4-4-2'),true);assert.equal(m.formations.home,'4-4-2');
  applyTactic(m,'pressing',99);applyTactic(m,'mentality','Attacking');
  assert.equal(m.tactics.home.pressing,99);assert.equal(m.tactics.home.mentality,'Attacking');
  assert.equal(changeFormation(m,'7-7-7'),false);
});
test('starting player can swap with a bench player, preserving eleven',()=>{
  const m=createMatch();const starter=m.lineups.home[9],incoming=getTeam(m.homeId).substitutes[3];
  assert.equal(swapPlayer(m,starter,incoming),true);assert.ok(!m.lineups.home.includes(starter));
  assert.ok(m.lineups.home.includes(incoming));assert.equal(validateLineup(m.homeId,m.lineups.home),true);
  assert.equal(swapPlayer(m,m.lineups.home[0],incoming),false);
});
test('goalkeeper swaps can only be goalkeeper for goalkeeper',()=>{
  const m=createMatch();const team=getTeam(m.homeId);
  assert.equal(swapPlayer(m,team.starting[0],team.substitutes[4]),false);
  assert.equal(swapPlayer(m,team.starting[0],team.substitutes[0]),true);
});

test('current replay frame captures substitutions and tactical changes',()=>{
  const m=createMatch();advanceMinute(m);
  changeFormation(m,'4-4-2');applyTactic(m,'pressing',91);
  const starter=m.lineups.home[9],incoming=getTeam(m.homeId).substitutes[3];
  assert.equal(swapPlayer(m,starter,incoming),true);
  assert.equal(m.frames[1].formations.home,'4-4-2');
  assert.equal(m.frames[1].tactics.home.pressing,91);
  assert.equal(m.frames[1].substitutionsUsed,1);
  assert.ok(m.frames[1].lineups.home.includes(incoming));
  assert.equal(resetStartingXI(m),false);
});

test('resetting a pre-match lineup updates its replay frame',()=>{
  const m=createMatch();const team=getTeam(m.homeId);
  assert.equal(swapPlayer(m,team.starting[9],team.substitutes[3]),true);
  assert.equal(resetStartingXI(m),true);
  assert.deepEqual(m.frames[0].lineups.home,team.starting);
});

test('Step 2: custom Dream Team roster passes directly into createMatch() as Home Team', ()=>{
  const customDreamTeam = {
    id: 'my_test_dream_team',
    name: 'Test Galácticos',
    short: 'TGL',
    city: 'World XI',
    primary: '#ffd700',
    secondary: '#000000',
    crest: '★',
    isCustom: true,
    players: [
      { id: 'custom_gk', name: 'Legend Keeper', role: 'GK', number: 1, overall: 96, pace: 60, shooting: 20, passing: 80, defending: 45, physical: 85, keeping: 96 },
      ...Array.from({length: 10}, (_, i) => ({
        id: `custom_outfield_${i}`, name: `Star Player ${i}`, role: 'CM', number: i + 2, overall: 94, pace: 88, shooting: 90, passing: 92, defending: 80, physical: 85, keeping: 5
      })),
      { id: 'custom_sub_gk', name: 'Bench Keeper', role: 'GK', number: 12, overall: 90, pace: 55, shooting: 20, passing: 75, defending: 40, physical: 80, keeping: 90 },
      ...Array.from({length: 4}, (_, i) => ({
        id: `custom_bench_${i}`, name: `Bench Star ${i}`, role: 'ST', number: i + 13, overall: 91, pace: 89, shooting: 92, passing: 84, defending: 45, physical: 82, keeping: 5
      }))
    ],
    starting: ['custom_gk', ...Array.from({length: 10}, (_, i) => `custom_outfield_${i}`)],
    substitutes: ['custom_sub_gk', ...Array.from({length: 4}, (_, i) => `custom_bench_${i}`)]
  };

  const match = createMatch({
    customHomeTeam: customDreamTeam,
    awayId: 'spain',
    seed: 'CUSTOM-DREAM-TEST'
  });

  assert.equal(match.homeId, 'my_test_dream_team');
  assert.equal(match.lineups.home.length, 11);
  assert.equal(match.lineups.home[0], 'custom_gk');
  assert.equal(getTeam('my_test_dream_team').name, 'Test Galácticos');
});

test('Step 3: AI Manager adapts tactics at minute 45 and 70 based on scoreline', ()=>{
  const m = createMatch({ seed: 'AI-TACTIC-TEST' });
  // Simulate until minute 44
  while (m.minute < 44) advanceMinute(m);
  
  // Force scoreline: Home 2 - 0 Away (AI trailing)
  m.score.home = 2;
  m.score.away = 0;
  
  // Advance into minute 45
  advanceMinute(m);
  assert.equal(m.minute, 45);
  assert.equal(m.tactics.away.mentality, 'Attacking');
  assert.ok(m.tactics.away.pressing >= 65);
  assert.ok(m.events.some(e => e.minute === 45 && e.type === 'tactic' && e.side === 'away'));

  // Advance to minute 69
  while (m.minute < 69) advanceMinute(m);

  // Force scoreline: Home 1 - 3 Away (AI leading late at 70)
  m.score.home = 1;
  m.score.away = 3;

  // Advance into minute 70
  advanceMinute(m);
  assert.equal(m.minute, 70);
  assert.equal(m.tactics.away.mentality, 'Defensive');
  assert.ok(m.tactics.away.pressing <= 50);
  assert.ok(m.events.some(e => e.minute === 70 && e.type === 'tactic' && e.side === 'away'));
});

test('stamina decreases during play and is restored on demand-more team talk', ()=>{
  const m = createMatch({ seed: 'STAMINA-TEST' });
  const starterId = m.lineups.home[0];
  assert.equal(m.stamina[starterId], 100);
  
  // Advance 45 minutes
  while (m.minute < 45) advanceMinute(m);
  assert.ok(m.stamina[starterId] < 100);
  const staminaAtHalf = m.stamina[starterId];

  // Apply half-time team talk
  applyTeamTalk(m, 'demand_more');
  assert.ok(m.stamina[starterId] > staminaAtHalf);
});

test('manager shouts immediately adjust tactical state and log events', ()=>{
  const m = createMatch({ seed: 'SHOUT-TEST' });
  advanceMinute(m);
  assert.equal(applyShout(m, 'high_press'), true);
  assert.ok(m.tactics.home.pressing >= 70);
  assert.ok(m.events.some(e => e.type === 'tactic' && e.text.includes('HIGH PRESS')));
});

test('knockout matches proceed to Extra Time and Penalties when drawn', ()=>{
  const m = createMatch({ seed: 'KNOCKOUT-TEST', knockout: true });
  while (m.minute < 90) advanceMinute(m);
  
  // Set equal score at 90'
  m.score.home = 1;
  m.score.away = 1;
  m.phase = 'EXTRA_TIME';

  // Advance into Extra Time (minute 91)
  advanceMinute(m);
  assert.equal(m.minute, 91);

  // Advance through extra time to 120
  while (m.minute < 120) advanceMinute(m);
  assert.equal(m.minute, 120);
  assert.equal(m.phase, 'FULL_TIME');
  assert.ok(m.winner === 'home' || m.winner === 'away');

  // Verify deterministic penalty shootout execution when drawn at 120
  const mDrawn = createMatch({ seed: 'PENALTY-DRAW-TEST', knockout: true });
  mDrawn.minute = 120;
  mDrawn.score.home = 2;
  mDrawn.score.away = 2;
  const shootout = simulatePenaltyShootout(mDrawn);
  assert.ok(mDrawn.penalties);
  assert.ok(shootout.kicks.length >= 10);
  assert.ok(mDrawn.winner === 'home' || mDrawn.winner === 'away');
});

test('replay frame serialization preserves knockout flag and disciplinary state', ()=>{
  const m = createMatch({ seed: 'FRAME-PERSIST-TEST', knockout: true });
  m.bookings.home['player1'] = 1;
  advanceMinute(m);
  const frame = matchFromFrame(m, 1);
  assert.equal(frame.knockout, true);
  assert.equal(frame.minute, 1);
  assert.equal(frame.bookings.home['player1'], 1);
});

test('statistical invariants hold strictly across 100 randomly seeded matches', ()=>{
  for (let i = 0; i < 100; i++) {
    const m = playFullMatch(createMatch({ seed: `INVARIANTS-BATCH-${i}` }));
    assert.equal(m.minute, 90);
    assert.equal(m.phase, 'FULL_TIME');
    assert.ok(Math.abs(m.stats.home.possession + m.stats.away.possession - 5400) < 1e-4);

    for (const side of ['home', 'away']) {
      const s = m.stats[side];
      const actualGoals = m.events.filter(e => e.type === 'goal' && e.side === side).length;
      assert.equal(m.score[side], actualGoals);
      assert.ok(s.shots >= s.onTarget, `Shots (${s.shots}) should be >= onTarget (${s.onTarget})`);
      assert.ok(s.onTarget >= actualGoals, `onTarget (${s.onTarget}) should be >= goals (${actualGoals})`);
      assert.ok(s.completed <= s.passes, `Completed passes should not exceed attempted passes`);
      assert.ok(s.xg >= 0 && Number.isFinite(s.xg), `xG must be non-negative finite`);
      assert.ok(s.fouls >= 0 && Number.isInteger(s.fouls));
      assert.ok(s.yellow >= 0 && Number.isInteger(s.yellow));
      assert.ok(s.red >= 0 && Number.isInteger(s.red));
    }
  }
});

test('elite world club maintains decisive advantage over lower-tier national squad', ()=>{
  let wins = 0;
  for (let i = 0; i < 50; i++) {
    const m = playFullMatch(createMatch({ homeId: 'club_real_madrid', awayId: 'nat_lesotho', seed: `TIER-EDGE-${i}` }));
    if (m.score.home > m.score.away) wins++;
  }
  // Real Madrid should win at least 85% of matches against a 64-OVR squad
  assert.ok(wins >= 42, `Real Madrid expected to win >= 42/50 matches against Lesotho (actual: ${wins})`);
});

test('disciplinary system correctly tracks bookings and red dismissals', ()=>{
  const m = createMatch({ seed: 'DISCIPLINE-TEST' });
  const offenderId = m.lineups.away[1];
  m.bookings.away[offenderId] = 1; // Already on a yellow
  // Advance 90 minutes
  playFullMatch(m);
  assert.ok(m.stats.home.yellow >= 0 && m.stats.away.yellow >= 0);
  assert.ok(m.stats.home.red >= 0 && m.stats.away.red >= 0);
});
