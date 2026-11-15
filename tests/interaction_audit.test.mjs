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
