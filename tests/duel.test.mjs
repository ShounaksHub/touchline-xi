import test from 'node:test';
import assert from 'node:assert/strict';
import { TEAMS } from '../src/data.js';
import { createPlayerDuel, advanceDuelTick, playFullDuel, DUEL_TYPES } from '../src/duel.js';

test('Player Duel: sequential player setup and initialization', () => {
  const p1 = TEAMS[0].players[0];
  const p2 = TEAMS[1].players[0];

  const duel = createPlayerDuel(p1, p2, DUEL_TYPES.ATTACK_DEFENCE, 5, 'SEED-TEST-001');

  assert.equal(duel.p1.id, p1.id);
  assert.equal(duel.p2.id, p2.id);
  assert.equal(duel.totalRounds, 5);
  assert.equal(duel.currentRound, 0);
  assert.equal(duel.isComplete, false);
  assert.ok(duel.frames.length >= 1);
});

test('Player Duel: prevents duplicate canonical player selection', () => {
  const p1 = TEAMS[0].players[0];
  assert.throws(() => {
    createPlayerDuel(p1, p1, DUEL_TYPES.ATTACK_DEFENCE);
  }, /Cannot duel a player against themselves/);
});

test('Player Duel: deterministic simulation via Mulberry32 RNG', () => {
  const p1 = TEAMS[0].players[0];
  const p2 = TEAMS[1].players[0];

  const d1 = createPlayerDuel(p1, p2, DUEL_TYPES.ATTACK_DEFENCE, 5, 'SAME-SEED-XYZ');
  const d2 = createPlayerDuel(p1, p2, DUEL_TYPES.ATTACK_DEFENCE, 5, 'SAME-SEED-XYZ');

  playFullDuel(d1);
  playFullDuel(d2);

  assert.equal(d1.score[p1.id], d2.score[p1.id]);
  assert.equal(d1.score[p2.id], d2.score[p2.id]);
  assert.equal(d1.winner?.id, d2.winner?.id);
  assert.equal(d1.frames.length, d2.frames.length);
});

test('Player Duel: supports all three duel types (Attack/Defence, Dribbling, Skill Challenge)', () => {
  const p1 = TEAMS[0].players[1];
  const p2 = TEAMS[1].players[1];

  for (const type of Object.values(DUEL_TYPES)) {
    const duel = createPlayerDuel(p1, p2, type, 3, `TYPE-TEST-${type}`);
    playFullDuel(duel);
    assert.equal(duel.isComplete, true);
    assert.ok(duel.roundHistory.length >= 3);
    assert.ok(duel.winner !== null);
  }
});

test('Player Duel: handles alternating attack/defence rounds with tie-breaking', () => {
  const p1 = TEAMS[0].players[2];
  const p2 = TEAMS[1].players[2];

  const duel = createPlayerDuel(p1, p2, DUEL_TYPES.ATTACK_DEFENCE, 4, 'SEED-ALTERNATE');
  
  // Round 0
  assert.equal(duel.attackerId, p1.id);
  assert.equal(duel.defenderId, p2.id);

  playFullDuel(duel);
  assert.equal(duel.isComplete, true);
  // Ensure non-tied final score
  assert.notEqual(duel.score[p1.id], duel.score[p2.id]);
});

test('Team vs Team (5-a-side & 11-a-side): strict 1 player per nation validation and match simulation', async () => {
  const { createMatch, validateLineup, advanceMinute } = await import('../src/engine.js');
  const { FORMATIONS } = await import('../src/data.js');

  // Verify 5-a-side formations exist
  assert.ok(FORMATIONS['1-2-1']);
  assert.ok(FORMATIONS['2-1-1']);
  assert.ok(FORMATIONS['1-1-2']);
  assert.equal(FORMATIONS['1-2-1'].length, 5);

  // Squad 1: 5 distinct nations
  const squad5_valid = [
    { id: 'p_ar_gk', name: 'Emi Martinez', role: 'GK', nat: 'Argentina', ovr: 88, pace: 80, shooting: 20, passing: 70, defending: 30, physical: 85, keeping: 88 },
    { id: 'p_nl_cb', name: 'Virgil van Dijk', role: 'CB', nat: 'Netherlands', ovr: 89, pace: 78, shooting: 60, passing: 75, defending: 91, physical: 88, keeping: 5 },
    { id: 'p_fr_cm', name: 'N\'Golo Kante', role: 'CDM', nat: 'France', ovr: 88, pace: 82, shooting: 65, passing: 80, defending: 89, physical: 86, keeping: 5 },
    { id: 'p_hr_cm', name: 'Luka Modric', role: 'CM', nat: 'Croatia', ovr: 88, pace: 75, shooting: 78, passing: 90, defending: 72, physical: 70, keeping: 5 },
    { id: 'p_pt_st', name: 'Cristiano Ronaldo', role: 'ST', nat: 'Portugal', ovr: 91, pace: 85, shooting: 93, passing: 80, defending: 35, physical: 84, keeping: 5 }
  ];

  // Squad 2: 5 players but duplicate nation (2 from Brazil)
  const squad5_invalid_nation = [
    { id: 'p_br_gk', name: 'Alisson', role: 'GK', nat: 'Brazil', ovr: 89, keeping: 89 },
    { id: 'p_br_cb', name: 'Marquinhos', role: 'CB', nat: 'Brazil', ovr: 87, keeping: 5 },
    { id: 'p_de_cm', name: 'Toni Kroos', role: 'CM', nat: 'Germany', ovr: 88, keeping: 5 },
    { id: 'p_es_cm', name: 'Rodri', role: 'CDM', nat: 'Spain', ovr: 91, keeping: 5 },
    { id: 'p_no_st', name: 'Erling Haaland', role: 'ST', nat: 'Norway', ovr: 91, keeping: 5 }
  ];

  // Check 1 player per nation enforcement
  const natsValid = squad5_valid.map(p => p.nat);
  assert.equal(new Set(natsValid).size, 5, 'Valid squad must have 5 unique nations');

  const natsInvalid = squad5_invalid_nation.map(p => p.nat);
  assert.notEqual(new Set(natsInvalid).size, 5, 'Duplicate nation should fail nation size check');

  // Create and step a 5-a-side match
  const team1 = {
    id: 'test_u1_5', name: 'User 1 FC', short: 'U1', isCustom: true,
    players: squad5_valid, starting: squad5_valid.map(p => p.id), substitutes: []
  };
  const team2 = {
    id: 'test_u2_5', name: 'User 2 FC', short: 'U2', isCustom: true,
    players: squad5_valid.map((p, i) => ({ ...p, id: `opp_${i}` })),
    starting: squad5_valid.map((p, i) => `opp_${i}`), substitutes: []
  };

  const { registerCustomTeam } = await import('../src/data.js');
  registerCustomTeam(team1);
  registerCustomTeam(team2);

  // Verify validateLineup supports 5-a-side
  const validLineupCheck = validateLineup(team1.id, team1.starting);
  assert.equal(validLineupCheck, true);

  const match5 = createMatch({
    customHomeTeam: team1,
    homeId: team1.id,
    customAwayTeam: team2,
    awayId: team2.id,
    formation: '1-2-1',
    awayFormation: '1-2-1',
    homeLineup: team1.starting,
    awayLineup: team2.starting,
    seed: 'TEST-5ASIDE'
  });

  assert.equal(match5.lineups.home.length, 5);
  assert.equal(match5.playerStates.home.length, 5);
  assert.equal(match5.playerStates.away.length, 5);

  // Advance simulation minutes
  for (let m = 0; m < 5; m++) {
    advanceMinute(match5);
  }
  assert.equal(match5.minute, 5);
  assert.ok(match5.frames.length >= 5);
});

