import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, playFullMatch } from '../src/engine.js';
import { TEAMS } from '../src/data.js';

test('Massive 500-match statistical simulation validation', () => {
  const BATCH_SIZE = 500;
  let totalGoals = 0, totalShots = 0, totalOnTarget = 0, totalCorners = 0;
  let totalYellows = 0, totalReds = 0, totalFouls = 0, totalXg = 0;
  let homeWins = 0, awayWins = 0, draws = 0;
  let cleanSheets = 0;

  for (let i = 0; i < BATCH_SIZE; i++) {
    // Symmetrically alternate home and away across the same elite club pairs
    const idxA = Math.floor(i / 2) % 16;
    const idxB = (idxA + 1) % 16;
    const homeTeam = i % 2 === 0 ? TEAMS[idxA] : TEAMS[idxB];
    const awayTeam = i % 2 === 0 ? TEAMS[idxB] : TEAMS[idxA];
    const m = playFullMatch(createMatch({
      homeId: homeTeam.id,
      awayId: awayTeam.id,
      seed: `MASSIVE-AUDIT-${i}`
    }));

    const hGoals = m.score.home, aGoals = m.score.away;
    totalGoals += hGoals + aGoals;
    if (hGoals === 0 || aGoals === 0) cleanSheets++;
    if (hGoals > aGoals) homeWins++;
    else if (aGoals > hGoals) awayWins++;
    else draws++;

    totalShots += m.stats.home.shots + m.stats.away.shots;
    totalOnTarget += m.stats.home.onTarget + m.stats.away.onTarget;
    totalCorners += m.stats.home.corners + m.stats.away.corners;
    totalYellows += m.stats.home.yellow + m.stats.away.yellow;
    totalReds += (m.stats.home.red || 0) + (m.stats.away.red || 0);
    totalFouls += m.stats.home.fouls + m.stats.away.fouls;
    totalXg += m.stats.home.xg + m.stats.away.xg;

    // Strict invariant checks
    assert.ok(m.stats.home.shots >= m.stats.home.onTarget);
    assert.ok(m.stats.away.shots >= m.stats.away.onTarget);
    assert.ok(m.stats.home.onTarget >= m.score.home);
    assert.ok(m.stats.away.onTarget >= m.score.away);
    assert.ok(Math.abs(m.stats.home.possession + m.stats.away.possession - 5400) < 1e-4);
  }

  const metrics = {
    matches: BATCH_SIZE,
    avgGoals: Number((totalGoals / BATCH_SIZE).toFixed(2)),
    avgShots: Number((totalShots / BATCH_SIZE).toFixed(2)),
    avgOnTarget: Number((totalOnTarget / BATCH_SIZE).toFixed(2)),
    avgCorners: Number((totalCorners / BATCH_SIZE).toFixed(2)),
    avgYellows: Number((totalYellows / BATCH_SIZE).toFixed(2)),
    avgReds: Number((totalReds / BATCH_SIZE).toFixed(2)),
    avgFouls: Number((totalFouls / BATCH_SIZE).toFixed(2)),
    avgXg: Number((totalXg / BATCH_SIZE).toFixed(2)),
    homeWinPct: Number(((homeWins / BATCH_SIZE) * 100).toFixed(1)),
    drawPct: Number(((draws / BATCH_SIZE) * 100).toFixed(1)),
    awayWinPct: Number(((awayWins / BATCH_SIZE) * 100).toFixed(1)),
    cleanSheetPct: Number(((cleanSheets / BATCH_SIZE) * 100).toFixed(1))
  };

  console.log('500-Match Simulation Metrics:', metrics);

  assert.ok(metrics.avgGoals >= 1.8 && metrics.avgGoals <= 3.8, `Average goals (${metrics.avgGoals}) plausible`);
  assert.ok(metrics.avgShots >= 15 && metrics.avgShots <= 30, `Average shots (${metrics.avgShots}) plausible`);
  assert.ok(metrics.avgCorners >= 4 && metrics.avgCorners <= 12, `Average corners (${metrics.avgCorners}) plausible`);
  assert.ok(metrics.avgYellows >= 1.0 && metrics.avgYellows <= 5.0, `Average yellows (${metrics.avgYellows}) plausible`);
  assert.ok(metrics.avgReds >= 0.02 && metrics.avgReds <= 0.40, `Average reds (${metrics.avgReds}) plausible`);
  assert.ok(metrics.homeWinPct > metrics.awayWinPct, 'Home advantage is maintained');
});
