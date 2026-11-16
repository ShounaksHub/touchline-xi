import test from 'node:test';
import assert from 'node:assert/strict';
import { TEAMS, getTeam, getPlayer, DEFAULT_TACTICS } from '../src/data.js';
import { createMatch, advanceMinute, playFullMatch, swapPlayer, applyTactic, changeFormation } from '../src/engine.js';
import { createTournament, simulateAIMatch, recordTournamentResult, getLeaderboard, TOURNAMENT_PRESETS } from '../src/tournament.js';

test('E2E Interaction: National Team vs National Team match runs without missing property errors', () => {
  const match = createMatch({
    homeId: 'nat_spain',
    awayId: 'nat_argentina',
    seed: 'E2E-NAT-TEST',
    formation: '4-3-3',
    tactics: DEFAULT_TACTICS
  });

  const home = getTeam(match.homeId);
  const away = getTeam(match.awayId);

  // Verify city property fallbacks
  const homeCity = (home.city || home.official_name || home.name || '').toUpperCase();
  const awayCity = (away.city || away.official_name || away.name || '').toUpperCase();

  assert.equal(homeCity, 'SPAIN');
  assert.equal(awayCity, 'ARGENTINA');

  // Advance full match
  playFullMatch(match);
  assert.equal(match.phase, 'FULL_TIME');
  assert.equal(match.minute, 90);
  assert.ok(match.frames.length >= 91);
});

test('E2E Interaction: Player substitution with cross-database search never returns null', () => {
  const match = createMatch({
    homeId: 'nat_brazil',
    awayId: 'club_real_madrid',
    seed: 'E2E-SUB-TEST'
  });

  const starterId = match.lineups.home[1]; // Outfield player
  const team = getTeam(match.homeId);
  const benchId = team.players.find(p => !match.lineups.home.includes(p.id) && p.role !== 'GK')?.id;

  assert.ok(benchId, 'Found an outfield bench player');

  const incomingPlayer = getPlayer(team, benchId);
  assert.ok(incomingPlayer, 'Incoming player found');
  assert.ok(incomingPlayer.name, 'Incoming player has valid name');

  const success = swapPlayer(match, starterId, benchId);
  assert.equal(success, true, 'Swap succeeded');
  assert.ok(match.lineups.home.includes(benchId), 'Lineup updated with bench player');
});

test('E2E Interaction: Tournament mode preserves unplayed user match during AI simulations', () => {
  const tournament = createTournament('champions_cup', 'club_barcelona');
  assert.equal(tournament.userTeamId, 'club_barcelona');

  // Verify QF matches
  const userMatch = tournament.bracket.qf.find(m => m.homeId === 'club_barcelona' || m.awayId === 'club_barcelona');
  assert.ok(userMatch, 'User match exists in QF');
  assert.equal(userMatch.played, false, 'User match is unplayed initially');

  // Simulate an AI match (e.g. QF4)
  const aiMatch = tournament.bracket.qf.find(m => m.id !== userMatch.id);
  simulateAIMatch(aiMatch, 'E2E-AI-QF');
  recordTournamentResult(tournament, aiMatch.id, aiMatch);

  // User match must STILL be unplayed!
  assert.equal(userMatch.played, false, 'User fixture was NOT auto-simulated when another AI match was simulated');
});

test('E2E Interaction: Cross-team getPlayer searches all 132 teams without crashing on null team', () => {
  const messi = getPlayer(null, 'argentina_1');
  assert.ok(messi, 'Found Messi across TEAMS even when team parameter is null');
  assert.equal(messi.name, 'Lionel Messi');

  const ronaldo = getPlayer(null, 'portugal_0');
  assert.ok(ronaldo, 'Found Ronaldo across TEAMS');
  assert.equal(ronaldo.name, 'Cristiano Ronaldo');

  const invalid = getPlayer(null, 'non_existent_player_id_9999');
  assert.equal(invalid, null, 'Non-existent player safely returns null');
});

test('E2E Data Integrity: Custom Dream Team matches do NOT mutate canonical TEAMS array', () => {
  const initialTeamsCount = TEAMS.length;
  const initialBarca = JSON.stringify(getTeam('club_barcelona'));

  const customTeamA = {
    id: 'isolated_custom_a',
    name: 'Custom Team Alpha',
    short: 'CTA',
    isCustom: true,
    players: [
      { id: 'p_gk_a', name: 'Alpha GK', role: 'GK', ovr: 95, keeping: 95, pace: 60, shooting: 20, passing: 70, defending: 40, physical: 80 },
      ...Array.from({length: 10}, (_, i) => ({
        id: `p_out_a_${i}`, name: `Alpha Outfielder ${i}`, role: 'CM', ovr: 90, keeping: 5, pace: 80, shooting: 80, passing: 85, defending: 75, physical: 80
      }))
    ],
    starting: ['p_gk_a', ...Array.from({length: 10}, (_, i) => `p_out_a_${i}`)],
    substitutes: []
  };

  const matchA = createMatch({
    customHomeTeam: customTeamA,
    awayId: 'club_barcelona',
    seed: 'CUSTOM-ISOLATION-1'
  });

  // Canonical TEAMS must remain untouched!
  assert.equal(TEAMS.length, initialTeamsCount, 'TEAMS array length must not increase when custom team is used');
  assert.equal(JSON.stringify(getTeam('club_barcelona')), initialBarca, 'Existing team data was not corrupted');
  assert.equal(getTeam('isolated_custom_a').name, 'Custom Team Alpha', 'Custom team is accessible via getTeam without polluting TEAMS');

  // Sequential custom team with same pattern
  const customTeamB = {
    id: 'isolated_custom_b',
    name: 'Custom Team Beta',
    short: 'CTB',
    isCustom: true,
    players: [
      { id: 'p_gk_b', name: 'Beta GK', role: 'GK', ovr: 92, keeping: 92, pace: 58, shooting: 20, passing: 70, defending: 40, physical: 80 },
      ...Array.from({length: 10}, (_, i) => ({
        id: `p_out_b_${i}`, name: `Beta Outfielder ${i}`, role: 'ST', ovr: 91, keeping: 5, pace: 85, shooting: 88, passing: 75, defending: 45, physical: 80
      }))
    ],
    starting: ['p_gk_b', ...Array.from({length: 10}, (_, i) => `p_out_b_${i}`)],
    substitutes: []
  };

  const matchB = createMatch({
    customHomeTeam: customTeamB,
    awayId: 'club_real_madrid',
    seed: 'CUSTOM-ISOLATION-2'
  });

  assert.equal(TEAMS.length, initialTeamsCount, 'TEAMS array length remains strictly constant');
  assert.equal(getTeam('isolated_custom_b').name, 'Custom Team Beta');
  assert.equal(getTeam('isolated_custom_a').name, 'Custom Team Alpha');
});
