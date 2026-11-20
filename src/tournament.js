import { TEAMS, getTeam, getPlayer } from './data.js';
import { createMatch, playFullMatch } from './engine.js';
import { readStore, writeStore, removeStore } from './storage.js';

const STORAGE_KEY = 'tournament';

export const TOURNAMENT_PRESETS = [
  {
    id: 'champions_cup',
    name: 'Champions Cup 🏆',
    description: 'The pinnacle of club football. 8 European heavyweight giants battle in a direct knockout bracket.',
    type: 'club',
    teams: [
      'club_real_madrid', 'club_man_city', 'club_barcelona', 'club_bayern',
      'club_psg', 'club_liverpool', 'club_arsenal', 'club_inter'
    ]
  },
  {
    id: 'world_trophy',
    name: 'World International Trophy 🌍',
    description: 'The biggest stage on Earth. Top FIFA Senior National Teams fighting for national immortality.',
    type: 'national',
    teams: [
      'nat_spain', 'nat_argentina', 'nat_france', 'nat_england',
      'nat_portugal', 'nat_brazil', 'nat_netherlands', 'nat_germany'
    ]
  },
  {
    id: 'super_cup',
    name: 'Galácticos Super Cup ⭐',
    description: 'Open world invitational tournament pitting your squad against the best of the best.',
    type: 'any',
    teams: [
      'club_real_madrid', 'nat_argentina', 'club_man_city', 'nat_france',
      'club_barcelona', 'nat_brazil', 'club_bayern', 'nat_spain'
    ]
  }
];

export function createTournament(presetId, userTeamId, seed = `TOURNAMENT-${presetId}-${userTeamId || 'default'}`) {
  const preset = TOURNAMENT_PRESETS.find(p => p.id === presetId) || TOURNAMENT_PRESETS[0];
  let participants = [...preset.teams];

  // If user team is not in list, replace the first team or add
  if (userTeamId && !participants.includes(userTeamId)) {
    participants[0] = userTeamId;
  }

  // Shuffle remaining 7 teams deterministically
  const userTeam = participants.find(t => t === userTeamId) || participants[0];
  const others = participants.filter(t => t !== userTeam);
  
  // Deterministic seed
  const bracket = {
    qf: [
      { id: 'qf1', round: 'Quarter-Final', homeId: userTeam, awayId: others[0], played: false, score: null, winner: null, penaltyScore: null, scorers: [] },
      { id: 'qf2', round: 'Quarter-Final', homeId: others[1], awayId: others[2], played: false, score: null, winner: null, penaltyScore: null, scorers: [] },
      { id: 'qf3', round: 'Quarter-Final', homeId: others[3], awayId: others[4], played: false, score: null, winner: null, penaltyScore: null, scorers: [] },
      { id: 'qf4', round: 'Quarter-Final', homeId: others[5], awayId: others[6], played: false, score: null, winner: null, penaltyScore: null, scorers: [] }
    ],
    sf: [
      { id: 'sf1', round: 'Semi-Final', homeId: null, awayId: null, played: false, score: null, winner: null, penaltyScore: null, scorers: [] },
      { id: 'sf2', round: 'Semi-Final', homeId: null, awayId: null, played: false, score: null, winner: null, penaltyScore: null, scorers: [] }
    ],
    final: { id: 'final', round: 'Grand Final', homeId: null, awayId: null, played: false, score: null, winner: null, penaltyScore: null, scorers: [] }
  };

  const tournament = {
    presetId,
    title: preset.name,
    userTeamId,
    seed,
    stage: 'QF',
    champion: null,
    bracket,
    scorersMap: {}
  };

  saveTournament(tournament);
  return tournament;
}

export function saveTournament(tournament) {
  writeStore(STORAGE_KEY, tournament);
}

export function loadTournament() {
  return readStore(STORAGE_KEY, null);
}

export function clearTournament() {
  removeStore(STORAGE_KEY);
}

export function simulateAIMatch(matchObj, seed = `AI-KNOCKOUT-${matchObj.id}-${matchObj.homeId}-${matchObj.awayId}`) {
  if (matchObj.played) return matchObj;
  const m = createMatch({
    homeId: matchObj.homeId,
    awayId: matchObj.awayId,
    seed,
    knockout: true
  });
  playFullMatch(m);

  const goalEvents = m.events.filter(e => e.type === 'goal');
  const scorers = goalEvents.map(e => {
    let name = 'Scorer';
    if (e.playerId) {
      const p = getPlayer(getTeam(e.side === 'home' ? m.homeId : m.awayId), e.playerId);
      if (p) name = p.name;
    }
    if (name === 'Scorer' && e.text) {
      name = e.text.replace(/^[⚽\s]*PENALTY!\s*/, '').split(' finds the net!')[0].split(' calmly converts')[0] || 'Scorer';
    }
    return {
      name,
      side: e.side,
      teamId: e.side === 'home' ? m.homeId : m.awayId,
      minute: e.minute
    };
  });

  const winner = m.winner || (m.score.home > m.score.away ? 'home' : m.score.away > m.score.home ? 'away' : (m.penalties?.home > m.penalties?.away ? 'home' : 'away'));

  matchObj.played = true;
  matchObj.score = { ...m.score };
  matchObj.winner = winner === 'home' ? matchObj.homeId : matchObj.awayId;
  matchObj.penaltyScore = m.penalties ? { home: m.penalties.home, away: m.penalties.away } : null;
  matchObj.scorers = scorers;

  return matchObj;
}

export function recordTournamentResult(tournament, matchId, match) {
  // Find match in bracket
  let target = tournament.bracket.qf.find(m => m.id === matchId);
  let roundType = 'qf';
  if (!target) {
    target = tournament.bracket.sf.find(m => m.id === matchId);
    roundType = 'sf';
  }
  if (!target && tournament.bracket.final.id === matchId) {
    target = tournament.bracket.final;
    roundType = 'final';
  }
  if (!target) return;

  const winner = match.winner
    ? (match.winner === 'home' ? target.homeId : target.awayId)
    : (match.score.home > match.score.away
      ? target.homeId
      : (match.score.away > match.score.home
        ? target.awayId
        : (match.penalties?.home > match.penalties?.away ? target.homeId : target.awayId)));

  target.played = true;
  target.score = { ...match.score };
  target.winner = winner;
  target.penaltyScore = match.penalties ? { home: match.penalties.home, away: match.penalties.away } : null;
  target.scorers = match.scorers || (match.events ? match.events.filter(e => e.type === 'goal').map(e => {
    let name = 'Scorer';
    if (e.playerId) {
      const p = getPlayer(getTeam(e.side === 'home' ? target.homeId : target.awayId), e.playerId);
      if (p) name = p.name;
    }
    if (name === 'Scorer' && e.text) {
      name = e.text.replace(/^[⚽\s]*PENALTY!\s*/, '').split(' finds the net!')[0].split(' calmly converts')[0] || 'Scorer';
    }
    return {
      name,
      side: e.side,
      teamId: e.side === 'home' ? target.homeId : target.awayId,
      minute: e.minute
    };
  }) : []);

  // Update top scorers leaderboard
  for (const s of target.scorers) {
    tournament.scorersMap[s.name] = (tournament.scorersMap[s.name] || 0) + 1;
  }

  // Auto simulate remaining AI matches in this round if user's fixture was completed
  if (roundType === 'qf') {
    const userMatch = tournament.bracket.qf.find(m => m.homeId === tournament.userTeamId || m.awayId === tournament.userTeamId);
    if (userMatch?.played) {
      for (const qf of tournament.bracket.qf) {
        if (!qf.played) simulateAIMatch(qf, `${tournament.seed || 'TOURNAMENT'}-${qf.id}`);
      }
    }
    if (tournament.bracket.qf.every(m => m.played)) {
      tournament.bracket.sf[0].homeId = tournament.bracket.qf[0].winner;
      tournament.bracket.sf[0].awayId = tournament.bracket.qf[1].winner;
      tournament.bracket.sf[1].homeId = tournament.bracket.qf[2].winner;
      tournament.bracket.sf[1].awayId = tournament.bracket.qf[3].winner;
      tournament.stage = 'SF';
    }
  } else if (roundType === 'sf') {
    const userMatch = tournament.bracket.sf.find(m => m.homeId === tournament.userTeamId || m.awayId === tournament.userTeamId);
    if (userMatch?.played) {
      for (const sf of tournament.bracket.sf) {
        if (!sf.played) simulateAIMatch(sf, `${tournament.seed || 'TOURNAMENT'}-${sf.id}`);
      }
    }
    if (tournament.bracket.sf.every(m => m.played)) {
      tournament.bracket.final.homeId = tournament.bracket.sf[0].winner;
      tournament.bracket.final.awayId = tournament.bracket.sf[1].winner;
      tournament.stage = 'FINAL';
    }
  } else if (roundType === 'final') {
    tournament.champion = target.winner;
    tournament.stage = 'COMPLETED';
  }

  saveTournament(tournament);
}

export function getLeaderboard(tournament) {
  if (!tournament || !tournament.scorersMap) return [];
  return Object.entries(tournament.scorersMap)
    .map(([name, goals]) => ({ name, goals }))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 8);
}
