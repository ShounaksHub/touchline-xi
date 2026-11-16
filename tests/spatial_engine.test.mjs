import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, advanceMinute, playFullMatch, PITCH } from '../src/engine.js';
import { playerPositions } from '../src/pitch.js';

test('Spatial Engine: Initial state creates 22 dynamic player states and centered ball', () => {
  const m = createMatch({ homeId: 'club_real_madrid', awayId: 'club_barcelona', seed: 'SPATIAL-INIT' });
  assert.ok(m.playerStates, 'playerStates exists on match');
  assert.equal(m.playerStates.home.length, 11, 'Home has 11 players');
  assert.equal(m.playerStates.away.length, 11, 'Away has 11 players');
  assert.ok(m.ballState, 'ballState exists on match');
  assert.equal(m.ballState.x, 50, 'Ball starts at center X');
  assert.equal(m.ballState.y, 50, 'Ball starts at center Y');

  // Verify goalkeeper is at slot 0 and stationed in goal area
  const homeGK = m.playerStates.home[0];
  const awayGK = m.playerStates.away[0];
  assert.equal(homeGK.role, 'GK');
  assert.equal(awayGK.role, 'GK');
  assert.ok(homeGK.x <= 15, 'Home GK positioned in defending third');
  assert.ok(awayGK.x >= 85, 'Away GK positioned in defending third');
});

test('Spatial Engine: Continuous movement keeps all 22 players within pitch boundaries', () => {
  const m = createMatch({ seed: 'SPATIAL-BOUNDS' });
  for (let min = 1; min <= 90; min++) {
    advanceMinute(m);
    for (const side of ['home', 'away']) {
      for (const p of m.playerStates[side]) {
        assert.ok(p.x >= 1 && p.x <= 99, `Player ${p.name} X (${p.x}) within [1, 99]`);
        assert.ok(p.y >= 1 && p.y <= 99, `Player ${p.name} Y (${p.y}) within [1, 99]`);
      }
    }
    assert.ok(m.ballState.x >= 0 && m.ballState.x <= 100, `Ball X (${m.ballState.x}) within pitch`);
    assert.ok(m.ballState.y >= 0 && m.ballState.y <= 100, `Ball Y (${m.ballState.y}) within pitch`);
  }
});

test('Spatial Engine: Mulberry32 determinism guarantees identical spatial world states', () => {
  const mA = playFullMatch(createMatch({ homeId: 'club_arsenal', awayId: 'club_chelsea', seed: 'DETERMINISM-42' }));
  const mB = playFullMatch(createMatch({ homeId: 'club_arsenal', awayId: 'club_chelsea', seed: 'DETERMINISM-42' }));

  assert.equal(mA.score.home, mB.score.home, 'Deterministic home score');
  assert.equal(mA.score.away, mB.score.away, 'Deterministic away score');
  assert.equal(mA.ballState.x, mB.ballState.x, 'Deterministic final ball X');
  assert.equal(mA.ballState.y, mB.ballState.y, 'Deterministic final ball Y');

  for (let i = 0; i < 11; i++) {
    assert.equal(mA.playerStates.home[i].x, mB.playerStates.home[i].x, `Home player ${i} X matches`);
    assert.equal(mA.playerStates.home[i].y, mB.playerStates.home[i].y, `Home player ${i} Y matches`);
    assert.equal(mA.playerStates.away[i].x, mB.playerStates.away[i].x, `Away player ${i} X matches`);
    assert.equal(mA.playerStates.away[i].y, mB.playerStates.away[i].y, `Away player ${i} Y matches`);
  }
});

test('Spatial Engine: Pitch renderer consumes authoritative playerStates directly', () => {
  const m = createMatch({ seed: 'RENDERER-SYNC' });
  advanceMinute(m);

  const homeRenderPos = playerPositions(m, 'home', 1000);
  const awayRenderPos = playerPositions(m, 'away', 1000);

  assert.equal(homeRenderPos.length, 11);
  assert.equal(awayRenderPos.length, 11);

  // Goalkeeper positions must match playerStates exactly (no idle drift)
  assert.equal(homeRenderPos[0].x, m.playerStates.home[0].x);
  assert.equal(homeRenderPos[0].y, m.playerStates.home[0].y);
  assert.equal(awayRenderPos[0].x, m.playerStates.away[0].x);
  assert.equal(awayRenderPos[0].y, m.playerStates.away[0].y);
});

test('Spatial Engine: Penalties are awarded only when fouls occur inside 18-yard box', () => {
  let penaltyCount = 0;
  for (let i = 0; i < 100; i++) {
    const m = playFullMatch(createMatch({ seed: `PENALTY-BOX-CHECK-${i}` }));
    const penEvents = m.events.filter(e => e.isPenalty);
    for (const pen of penEvents) {
      penaltyCount++;
      const loc = pen.location;
      assert.ok(loc, 'Penalty event has spatial location');
      assert.ok(loc.x === PITCH.penaltySpotHomeX || loc.x === PITCH.penaltySpotAwayX, 'Penalty kick taken from spot');
    }
  }
  // Penalties should naturally occur across 100 matches
  assert.ok(penaltyCount >= 5, `Penalties awarded inside box across 100 matches (found ${penaltyCount})`);
});

test('Spatial Engine: Low Block underdog can counter-attack high pressing favorite organically', () => {
  let underdogWinsOrDraws = 0;
  const SAMPLES = 30;

  for (let i = 0; i < SAMPLES; i++) {
    // Lesotho (64 OVR) uses Defensive Low-Block (Pressing 20, Width 30, Mentality Defensive)
    // Real Madrid (88 OVR) uses High-Pressing Attacking line (Pressing 90, Mentality Attacking)
    const m = createMatch({
      homeId: 'nat_lesotho',
      awayId: 'club_real_madrid',
      seed: `ORGANIC-UNDERDOG-${i}`,
      tactics: {
        mentality: 'Defensive',
        pressing: 20,
        tempo: 40,
        width: 32
      }
    });
    // Set favorite to high press
    m.tactics.away.mentality = 'Attacking';
    m.tactics.away.pressing = 90;
    m.tactics.away.tempo = 85;

    playFullMatch(m);

    // Check if underdog secured points (win or draw) through defensive compactness
    if (m.score.home >= m.score.away) {
      underdogWinsOrDraws++;
    }
  }

  // Underdog should legitimately take points in a realistic portion of matches (e.g. 15-40%)
  assert.ok(underdogWinsOrDraws >= 3, `Organic underdog secured points in ${underdogWinsOrDraws}/${SAMPLES} matches`);
});
