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
