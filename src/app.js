import {TEAMS, FORMATIONS, DEFAULT_TACTICS, PLAY_STYLES, getTeam, getPlayer, CLUBS} from './data.js';
import {createMatch, advanceMinute, playFullMatch, matchFromFrame, applyTactic, changeFormation, swapPlayer, resetStartingXI, resultLabel, applyShout, applyTeamTalk, simulatePenaltyShootout} from './engine.js';
import {renderPitch} from './pitch.js';
import {sound} from './sound.js';
import {createTournament, loadTournament, saveTournament, clearTournament, simulateAIMatch, recordTournamentResult, getLeaderboard, TOURNAMENT_PRESETS} from './tournament.js';

const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const STORAGE='touchline-xi-replays-v1';
const PREFS='touchline-xi-prefs-v1';
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatStat=(key,value)=>key==='possession'?`${Math.round(value)}%`:key==='xg'?Number(value).toFixed(2):Number(value).toLocaleString('en-GB');
const keyEvents=new Set(['goal','save','shot','card','half','full','sub','tactic','talk','shootout']);
const savedPrefs=(()=>{try{return JSON.parse(localStorage.getItem(PREFS))||{}}catch{return {}}})();

// Initialize match
let match=createMatch({
  homeId:savedPrefs.homeId??'club_real_madrid',
  awayId:savedPrefs.awayId??'club_man_city',
  seed:savedPrefs.seed??'KICKOFF-26',
  formation:savedPrefs.formation??'4-3-3',
  tactics:savedPrefs.tactics??DEFAULT_TACTICS
});

let running=false,replay=null,speed=1,accumulator=0,lastRenderAt=0,selectedStarter=null,feedFilter='all',toastTimeout=null,goalTimeout=null;
let scoutPage = 1;
const SCOUT_PAGE_SIZE = 72;

// Master player pool indexing all 2,750+ players across clubs, national teams & peak legends
const ALL_PLAYERS_POOL = (() => {
  const list = [];
  const seen = new Set();
  for (const team of TEAMS) {
    for (const p of (team.players || [])) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        list.push({
          id: p.id,
          name: p.name,
          role: p.role,
          nat: p.nat || 'International',
          club: p.club || team.name,
          teamName: team.name,
          ovr: p.ovr || p.overall || 85,
          overall: p.ovr || p.overall || 85,
          pace: p.pace || 80,
          shooting: p.shooting || 75,
          passing: p.passing || 80,
          defending: p.defending || 70,
          physical: p.physical || 75,
          keeping: p.keeping || (p.role === 'GK' ? 85 : 5),
          card: p.card || 'Gold Rare'
        });
      }
    }
  }
  return list.sort((a,b) => b.ovr - a.ovr);
})();

function getRoleCategory(role) {
  if (role === 'GK') return 'GK';
  if (['CB','LB','RB','LWB','RWB'].includes(role)) return 'DEF';
  if (['CDM','CM','CAM','LM','RM'].includes(role)) return 'MID';
  return 'FWD';
}

// State for the Dream Team Studio
let dreamConfig = {
  formation: '4-3-3',
  style: 'Tiki-Taka',
  opponentId: 'club_man_city',
  aiDifficulty: 'Standard',
  starters: [
    { role: 'GK', id: 'spain_0', name: 'Iker Casillas', nat: 'Spain', ovr: 94, card: '94 Icon Moments' },
    { role: 'LB', id: 'brazil_4', name: 'Roberto Carlos', nat: 'Brazil', ovr: 93, card: '93 Icon Moments' },
    { role: 'CB', id: 'spain_1', name: 'Sergio Ramos', nat: 'Spain', ovr: 98, card: '98 TOTY Peak' },
    { role: 'CB', id: 'netherlands_0', name: 'Virgil van Dijk', nat: 'Netherlands', ovr: 99, card: '99 TOTY / Futties Peak' },
    { role: 'RB', id: 'morocco_0', name: 'Achraf Hakimi', nat: 'Morocco', ovr: 95, card: '95 TOTY Peak' },
    { role: 'CDM', id: 'france_4', name: "N'Golo Kanté", nat: 'France', ovr: 97, card: '97 TOTY Peak' },
    { role: 'CM', id: 'croatia_0', name: 'Luka Modrić', nat: 'Croatia', ovr: 99, card: '99 Ballon d\'Or / TOTY Peak' },
    { role: 'CM', id: 'belgium_0', name: 'Kevin De Bruyne', nat: 'Belgium', ovr: 99, card: '99 TOTY / TOTS Peak' },
    { role: 'LW', id: 'brazil_3', name: 'Ronaldinho', nat: 'Brazil', ovr: 95, card: '95 Prime Icon' },
    { role: 'ST', id: 'portugal_0', name: 'Cristiano Ronaldo', nat: 'Portugal', ovr: 99, card: '99 Futties / TOTY Peak' },
    { role: 'RW', id: 'argentina_0', name: 'Lionel Messi', nat: 'Argentina', ovr: 99, card: '99 Futties / TOTY Peak' }
  ],
  bench: [
    { role: 'GK', id: 'italy_0', name: 'Gianluigi Buffon', nat: 'Italy', ovr: 96, card: '96 End of an Era / Prime Icon' },
    { role: 'CB', id: 'italy_2', name: 'Paolo Maldini', nat: 'Italy', ovr: 95, card: '95 Icon Moments' },
    { role: 'CM', id: 'france_0', name: 'Zinedine Zidane', nat: 'France', ovr: 97, card: '97 Icon Moments' },
    { role: 'ST', id: 'france_1', name: 'Kylian Mbappé', nat: 'France', ovr: 99, card: '99 TOTY / Futties Peak' },
    { role: 'RW', id: 'wales_0', name: 'Gareth Bale', nat: 'Wales', ovr: 98, card: '98 End of Era / Futties' }
  ]
};

let activeModalTarget = null;
let activeFutPlayer = null;
let currentTournament = loadTournament() || null;
let activeTournamentMatchId = null;

// ==========================================
// 1. Dream Team Studio
// ==========================================
function renderDreamStudio() {
  $('#dreamFormationButtons').innerHTML = Object.keys(FORMATIONS).map(f => `
    <button class="formation-button ${f === dreamConfig.formation ? 'is-active' : ''}" data-dream-formation="${f}">${f}</button>
  `).join('');

  $('#dreamFormationDots').innerHTML = (FORMATIONS[dreamConfig.formation] || FORMATIONS['4-3-3']).map(([role, x, y]) => `
    <span class="formation-dot" title="${escapeHtml(role)}" style="left:${x}%;top:${y}%"></span>
  `).join('');

  $('#dreamStyleCards').innerHTML = Object.entries(PLAY_STYLES).map(([name, s]) => `
    <div class="style-card ${name === dreamConfig.style ? 'is-active' : ''}" data-dream-style="${name}">
      <strong>${escapeHtml(name)}</strong>
      <p>${escapeHtml(s.description)}</p>
    </div>
  `).join('');

  const currentStyle = PLAY_STYLES[dreamConfig.style] || PLAY_STYLES['Tiki-Taka'];
  $('#dreamStylePreview').innerHTML = `
    <b>Tactical Parameters:</b> Pressing: ${currentStyle.pressing} · Tempo: ${currentStyle.tempo} · Width: ${currentStyle.width} · Mentality: ${currentStyle.mentality}
  `;

  const opponentSelect = $('#dreamOpponentSelect');
  if (opponentSelect && opponentSelect.children.length === 0) {
    const clubs = TEAMS.filter(t => t.isClub || !t.fifa_rank);
    const nations = TEAMS.filter(t => t.fifa_rank);
    opponentSelect.innerHTML = `
      <optgroup label="World Elite & Domestic Clubs">
        ${clubs.map(t=>`<option value="${t.id}" ${t.id===dreamConfig.opponentId?'selected':''}>${escapeHtml(t.name)}</option>`).join('')}
      </optgroup>
      <optgroup label="Top 150 FIFA Senior National Teams">
        ${nations.map(t=>`<option value="${t.id}" ${t.id===dreamConfig.opponentId?'selected':''}>#${t.fifa_rank} ${escapeHtml(t.name)}</option>`).join('')}
      </optgroup>
    `;
  }
  const oppTeam = getTeam(dreamConfig.opponentId);
  $('#dreamOpponentPreview').innerHTML = `
    <b>Target:</b> ${escapeHtml(oppTeam.name)} (${oppTeam.fifa_rank ? 'FIFA Rank #' + oppTeam.fifa_rank : 'Club'})<br>
    <small>Key Star: ${escapeHtml(oppTeam.max_card_player?.name || oppTeam.players?.[0]?.name || 'Captain')} · ${oppTeam.max_card_player?.ovr || 88} OVR</small>
  `;

  const formationSlots = FORMATIONS[dreamConfig.formation] || FORMATIONS['4-3-3'];
  for (let i = 0; i < 11; i++) {
    const slotRole = formationSlots[i][0];
    if (dreamConfig.starters[i]) {
      dreamConfig.starters[i].slotRole = slotRole;
    }
  }

  $('#dreamStartersGrid').innerHTML = dreamConfig.starters.map((p, i) => `
    <div class="dream-slot" data-slot-type="starter" data-slot-index="${i}">
      <span class="dream-slot-role">${escapeHtml(p.slotRole || p.role)}</span>
      <div class="dream-slot-info">
        <span class="dream-slot-name">${escapeHtml(p.name)}</span>
        <span class="dream-slot-meta">${escapeHtml(p.nat || p.role)} · ${escapeHtml(p.card || 'Gold')}</span>
      </div>
      <span class="dream-slot-ovr">${p.ovr}</span>
    </div>
  `).join('');

  $('#dreamBenchGrid').innerHTML = dreamConfig.bench.map((p, i) => `
    <div class="dream-slot" data-slot-type="bench" data-slot-index="${i}">
      <span class="dream-slot-role">${escapeHtml(p.role)}</span>
      <div class="dream-slot-info">
        <span class="dream-slot-name">${escapeHtml(p.name)}</span>
        <span class="dream-slot-meta">${escapeHtml(p.nat || p.role)} · ${escapeHtml(p.card || 'Gold')}</span>
      </div>
      <span class="dream-slot-ovr">${p.ovr}</span>
    </div>
  `).join('');

  const avgOvr = Math.round(dreamConfig.starters.reduce((acc, p) => acc + p.ovr, 0) / 11);
  $('#dreamTeamStatsBanner').innerHTML = `
    <span>SQUAD OVR: <b>${avgOvr}</b></span>
    <span>FORMATION: <b>${dreamConfig.formation}</b></span>
    <span>CHEMISTRY: <b>100%</b></span>
  `;
}

function openPlayerModal(type, index) {
  activeModalTarget = { type, index };
  const targetPlayer = type === 'starter' ? dreamConfig.starters[index] : dreamConfig.bench[index];
  const requiredRole = type === 'starter' ? (targetPlayer.slotRole || targetPlayer.role) : targetPlayer.role;
  activeModalTarget.role = requiredRole;

  $('#modalSlotTitle').textContent = `Select Player for ${requiredRole} (Current: ${targetPlayer.name})`;
  $('#playerPickerModal').classList.add('is-open');
  $('#playerSearchInput').value = '';

  const cat = getRoleCategory(requiredRole);
  $('#modalRoleFilter').value = cat === 'GK' ? 'GK' : 'ALL';
  renderModalPlayers();
}

function renderModalPlayers() {
  const query = $('#playerSearchInput').value.trim().toLowerCase();
  const filterCat = $('#modalRoleFilter').value;

  const filtered = ALL_PLAYERS_POOL.filter(p => {
    if (activeModalTarget.role === 'GK' && p.role !== 'GK') return false;
    if (activeModalTarget.role !== 'GK' && p.role === 'GK') return false;

    if (filterCat !== 'ALL') {
      if (getRoleCategory(p.role) !== filterCat) return false;
    }
    if (query) {
      const matchName = p.name.toLowerCase().includes(query);
      const matchNat = p.nat && p.nat.toLowerCase().includes(query);
      const matchClub = p.club && p.club.toLowerCase().includes(query);
      if (!matchName && !matchNat && !matchClub) return false;
    }
    return true;
  }).slice(0, 80);

  $('#modalPlayerList').innerHTML = filtered.map(p => `
    <div class="modal-player-item" data-pick-id="${p.id}">
      <span class="modal-player-role">${escapeHtml(p.role)}</span>
      <div class="modal-player-info">
        <strong>${escapeHtml(p.name)}</strong>
        <span>${escapeHtml(p.nat || 'Club')} · ${escapeHtml(p.card || 'Elite')}</span>
      </div>
      <span class="modal-player-ovr">${p.ovr}</span>
    </div>
  `).join('') || '<div style="grid-column:1/-1;text-align:center;padding:24px;color:#888;">No players found matching search.</div>';
}

function selectPlayerFromModal(playerId) {
  const chosen = ALL_PLAYERS_POOL.find(p => p.id === playerId);
  if (!chosen || !activeModalTarget) return;

  const target = {
    role: chosen.role,
    id: chosen.id,
    name: chosen.name,
    nat: chosen.nat,
    ovr: chosen.ovr,
    card: chosen.card
  };

  if (activeModalTarget.type === 'starter') {
    target.slotRole = dreamConfig.starters[activeModalTarget.index].slotRole;
    dreamConfig.starters[activeModalTarget.index] = target;
  } else {
    dreamConfig.bench[activeModalTarget.index] = target;
  }

  $('#playerPickerModal').classList.remove('is-open');
  renderDreamStudio();
  toast(`${chosen.name} drafted into your Dream Team!`);
}

function deployDreamTeamAndPlay() {
  stop();
  const all16 = [...dreamConfig.starters, ...dreamConfig.bench];
  const dreamTeamObj = {
    id: 'dream_team',
    name: 'Dream Team XI',
    short: 'DRM',
    city: 'Galácticos',
    primary: '#d8ff69',
    secondary: '#17241e',
    crest: '★',
    isCustom: true,
    players: all16.map((p, idx) => {
      const original = getPlayer(null, p.id);
      return {
        id: p.id,
        name: p.name,
        role: p.role || 'CM',
        number: idx < 11 ? [1,3,4,5,2,6,8,10,11,9,7][idx] : [12,13,14,15,16][idx - 11],
        overall: p.ovr,
        ovr: p.ovr,
        pace: original?.pace || p.ovr,
        shooting: original?.shooting || p.ovr,
        passing: original?.passing || p.ovr,
        defending: original?.defending || (p.role === 'GK' ? 35 : p.ovr),
        physical: original?.physical || p.ovr,
        keeping: p.role === 'GK' ? p.ovr : 5,
        card: p.card
      };
    }),
    starting: dreamConfig.starters.map(p => p.id),
    substitutes: dreamConfig.bench.map(p => p.id)
  };

  const existingDreamIdx = TEAMS.findIndex(t => t.id === 'dream_team');
  if (existingDreamIdx >= 0) {
    TEAMS[existingDreamIdx] = dreamTeamObj;
  } else {
    TEAMS.unshift(dreamTeamObj);
  }

  const chosenStyle = PLAY_STYLES[dreamConfig.style] || PLAY_STYLES['Tiki-Taka'];
  match = createMatch({
    customHomeTeam: dreamTeamObj,
    homeId: 'dream_team',
    awayId: dreamConfig.opponentId,
    seed: `DREAM-${Math.floor(Math.random() * 90000 + 10000)}`,
    formation: dreamConfig.formation,
    tactics: {
      pressing: chosenStyle.pressing,
      tempo: chosenStyle.tempo,
      width: chosenStyle.width,
      mentality: chosenStyle.mentality
    },
    homeLineup: dreamTeamObj.starting
  });

  renderSelects();
  persistPrefs();
  render();

  $('#matchday')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast(`Dream Team deployed in a ${dreamConfig.formation} (${dreamConfig.style}) vs ${getTeam(dreamConfig.opponentId).name}!`);
}

function randomizeGalacticos() {
  const gks = ALL_PLAYERS_POOL.filter(p => p.role === 'GK');
  const defs = ALL_PLAYERS_POOL.filter(p => ['CB','LB','RB'].includes(p.role));
  const mids = ALL_PLAYERS_POOL.filter(p => ['CDM','CM','CAM'].includes(p.role));
  const fwds = ALL_PLAYERS_POOL.filter(p => ['ST','LW','RW'].includes(p.role));

  const pickRandomTop = (pool) => pool[Math.floor(Math.random() * Math.min(pool.length, 15))];

  dreamConfig.starters[0] = { ...pickRandomTop(gks), slotRole: 'GK' };
  dreamConfig.starters[1] = { ...pickRandomTop(defs), slotRole: 'LB' };
  dreamConfig.starters[2] = { ...pickRandomTop(defs), slotRole: 'CB' };
  dreamConfig.starters[3] = { ...pickRandomTop(defs), slotRole: 'CB' };
  dreamConfig.starters[4] = { ...pickRandomTop(defs), slotRole: 'RB' };
  dreamConfig.starters[5] = { ...pickRandomTop(mids), slotRole: 'CDM' };
  dreamConfig.starters[6] = { ...pickRandomTop(mids), slotRole: 'CM' };
  dreamConfig.starters[7] = { ...pickRandomTop(mids), slotRole: 'CM' };
  dreamConfig.starters[8] = { ...pickRandomTop(fwds), slotRole: 'LW' };
  dreamConfig.starters[9] = { ...pickRandomTop(fwds), slotRole: 'ST' };
  dreamConfig.starters[10] = { ...pickRandomTop(fwds), slotRole: 'RW' };

  dreamConfig.bench[0] = { ...pickRandomTop(gks), slotRole: 'GK' };
  dreamConfig.bench[1] = { ...pickRandomTop(defs), slotRole: 'CB' };
  dreamConfig.bench[2] = { ...pickRandomTop(mids), slotRole: 'CM' };
  dreamConfig.bench[3] = { ...pickRandomTop(fwds), slotRole: 'ST' };
  dreamConfig.bench[4] = { ...pickRandomTop(fwds), slotRole: 'RW' };

  renderDreamStudio();
  toast('🎲 Drafted a fresh legendary squad of Galácticos!');
}

// ==========================================
// 2. Scouting & "All Players" Hub
// ==========================================
function renderScoutingHub() {
  const teamFilter = $('#scoutTeamFilter');
  if (teamFilter && teamFilter.children.length <= 1) {
    const clubs = TEAMS.filter(t => t.isClub || !t.fifa_rank);
    const nations = TEAMS.filter(t => t.fifa_rank);
    teamFilter.innerHTML = `
      <option value="ALL">All Clubs & Nations</option>
      <optgroup label="World Elite & Domestic Clubs">
        ${clubs.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
      </optgroup>
      <optgroup label="Top 150 Senior National Teams">
        ${nations.map(t=>`<option value="${t.id}">#${t.fifa_rank} ${escapeHtml(t.name)}</option>`).join('')}
      </optgroup>
    `;
  }

  const query = $('#scoutSearchInput').value.trim().toLowerCase();
  const roleCat = $('#scoutRoleFilter').value;
  const tier = $('#scoutTierFilter').value;
  const teamVal = $('#scoutTeamFilter').value;
  const sortKey = $('#scoutSortFilter').value;

  let pool = ALL_PLAYERS_POOL.filter(p => {
    if (roleCat !== 'ALL') {
      if (getRoleCategory(p.role) !== roleCat) return false;
    }
    if (tier !== 'ALL') {
      const minOvr = Number(tier);
      if (minOvr === 95 && p.ovr < 95) return false;
      if (minOvr === 90 && (p.ovr < 90 || p.ovr >= 95)) return false;
      if (minOvr === 85 && (p.ovr < 85 || p.ovr >= 90)) return false;
      if (minOvr === 80 && (p.ovr < 80 || p.ovr >= 85)) return false;
    }
    if (teamVal !== 'ALL') {
      const targetTeam = getTeam(teamVal);
      const isMember = targetTeam?.players?.some(tp => tp.id === p.id);
      if (!isMember) return false;
    }
    if (query) {
      const matchName = p.name.toLowerCase().includes(query);
      const matchNat = p.nat && p.nat.toLowerCase().includes(query);
      const matchClub = p.club && p.club.toLowerCase().includes(query);
      if (!matchName && !matchNat && !matchClub) return false;
    }
    return true;
  });

  // Sorting
  pool.sort((a,b) => {
    if (sortKey === 'pace') return b.pace - a.pace;
    if (sortKey === 'shooting') return b.shooting - a.shooting;
    if (sortKey === 'passing') return b.passing - a.passing;
    if (sortKey === 'defending') return b.defending - a.defending;
    if (sortKey === 'physical') return b.physical - a.physical;
    return b.ovr - a.ovr;
  });

  const displayList = pool.slice(0, scoutPage * SCOUT_PAGE_SIZE);
  $('#scoutingResultCount').textContent = `Showing ${displayList.length} of ${pool.length.toLocaleString('en-GB')} players`;

  let cardsHtml = displayList.map(p => `
    <div class="scouting-card" data-fut-id="${p.id}">
      <div>
        <div class="scouting-card-top">
          <div>
            <div class="scouting-card-name">${escapeHtml(p.name)}</div>
            <div class="scouting-card-meta">${escapeHtml(p.role)} · ${escapeHtml(p.nat)} · ${escapeHtml(p.club || p.teamName)}</div>
          </div>
          <span class="scouting-ovr-badge">${p.ovr}</span>
        </div>
        <span class="scouting-card-badge">${escapeHtml(p.card || 'Elite')}</span>
      </div>
      <div class="scouting-card-stats">
        <div class="scouting-stat-col"><span>PAC</span><b>${p.pace}</b></div>
        <div class="scouting-stat-col"><span>SHO</span><b>${p.shooting}</b></div>
        <div class="scouting-stat-col"><span>PAS</span><b>${p.passing}</b></div>
        <div class="scouting-stat-col"><span>DRI</span><b>${p.pace > 80 ? p.pace - 2 : 78}</b></div>
        <div class="scouting-stat-col"><span>DEF</span><b>${p.defending}</b></div>
        <div class="scouting-stat-col"><span>PHY</span><b>${p.physical}</b></div>
      </div>
    </div>
  `).join('') || '<div style="grid-column:1/-1;text-align:center;padding:48px;color:#888;">No players found matching your criteria.</div>';

  if (pool.length > displayList.length) {
    cardsHtml += `
      <div style="grid-column:1/-1;text-align:center;padding:24px 0 12px;">
        <button class="secondary-button" id="loadMoreScoutBtn" style="padding:10px 28px;font-size:13px;cursor:pointer;">
          Load More Players (+${Math.min(SCOUT_PAGE_SIZE, pool.length - displayList.length)}) ↓
        </button>
      </div>
    `;
  }
  $('#scoutingPlayerGrid').innerHTML = cardsHtml;
}

function openFutCardModal(playerId) {
  const p = ALL_PLAYERS_POOL.find(x => x.id === playerId);
  if (!p) return;
  activeFutPlayer = p;

  $('#futBigOvr').textContent = p.ovr;
  $('#futPos').textContent = p.role;
  $('#futNatName').textContent = p.nat || 'International';
  $('#futClubName').textContent = p.club || p.teamName || 'World Elite';
  $('#futPlayerName').textContent = p.name.toUpperCase();
  $('#futCardRarity').textContent = p.card || 'Elite Gold';

  $('#futPac').textContent = p.pace;
  $('#futSho').textContent = p.shooting;
  $('#futPas').textContent = p.passing;
  $('#futDri').textContent = p.pace > 80 ? p.pace - 2 : 78;
  $('#futDef').textContent = p.defending;
  $('#futPhy').textContent = p.physical;

  $('#futCardModal').classList.add('is-open');
}

function draftActiveFutToDreamTeam() {
  if (!activeFutPlayer) return;
  const p = activeFutPlayer;
  const targetIndex = dreamConfig.starters.findIndex(s => s.role === p.role) !== -1
    ? dreamConfig.starters.findIndex(s => s.role === p.role)
    : 10;

  dreamConfig.starters[targetIndex] = {
    role: p.role,
    id: p.id,
    name: p.name,
    nat: p.nat,
    ovr: p.ovr,
    card: p.card,
    slotRole: dreamConfig.starters[targetIndex].slotRole || p.role
  };

  $('#futCardModal').classList.remove('is-open');
  renderDreamStudio();
  toast(`🌟 ${p.name} drafted into your Dream Team XI!`);
}

// ==========================================
// 3. Tournament Mode
// ==========================================
function renderTournament() {
  $('#tournamentPresetsGrid').innerHTML = TOURNAMENT_PRESETS.map(p => `
    <div class="tournament-preset-card ${currentTournament?.presetId === p.id ? 'is-active' : ''}" data-tournament-preset="${p.id}">
      <span class="preset-badge">${p.type.toUpperCase()} TOURNAMENT</span>
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.description)}</p>
      <button class="secondary-button" style="width:100%;font-size:12px;">${currentTournament?.presetId === p.id ? 'Resume Tournament ↻' : 'Select Cup →'}</button>
    </div>
  `).join('');

  if (!currentTournament) {
    $('#tournamentBracketWrapper').style.display = 'none';
    $('#tournamentFooterGrid').style.display = 'none';
    return;
  }

  $('#tournamentBracketWrapper').style.display = 'block';
  $('#tournamentFooterGrid').style.display = 'grid';
  $('#tournamentBracketTitle').textContent = `${currentTournament.title} Bracket`;
  $('#tournamentStagePill').textContent = currentTournament.stage === 'COMPLETED' ? 'CHAMPION CROWNED' : currentTournament.stage;

  const renderMatchCard = (m) => {
    if (!m.homeId || !m.awayId) {
      return `<div class="bracket-match-card" style="opacity:0.5;"><small style="color:var(--muted)">Awaiting qualification</small></div>`;
    }
    const home = getTeam(m.homeId), away = getTeam(m.awayId);
    const isUser = m.homeId === currentTournament.userTeamId || m.awayId === currentTournament.userTeamId;
    const isChamp = currentTournament.champion && (m.id === 'final') && (m.winner === currentTournament.champion);

    const homeWon = m.played && m.winner === m.homeId;
    const awayWon = m.played && m.winner === m.awayId;

    let scorePill = '';
    if (m.played) {
      const penText = m.penaltyScore ? ` (${m.penaltyScore.home}-${m.penaltyScore.away} pen)` : '';
      scorePill = `<span class="bracket-score-pill">${m.score.home} : ${m.score.away}${penText}</span>`;
    }

    let actions = '';
    if (!m.played) {
      if (isUser) {
        actions = `
          <div class="bracket-match-actions">
            <button class="primary-button" data-play-tournament="${m.id}" style="padding:6px 12px;font-size:11px;">⚔️ Play Matchday</button>
            <button class="secondary-button" data-sim-tournament="${m.id}" style="padding:6px 10px;font-size:11px;">⚡ Quick Sim</button>
          </div>
        `;
      } else {
        actions = `
          <div class="bracket-match-actions">
            <button class="secondary-button" data-sim-tournament="${m.id}" style="padding:5px 8px;font-size:10px;">⚡ Simulate</button>
          </div>
        `;
      }
    }

    return `
      <div class="bracket-match-card ${isUser ? 'is-user' : ''} ${isChamp ? 'is-champion' : ''}">
        <div style="font-size:10px;font-weight:800;color:var(--muted);margin-bottom:6px;">${escapeHtml(m.round)} ${isUser ? '· YOUR FIXTURE' : ''}</div>
        <div class="bracket-team-row ${homeWon ? 'is-winner' : m.played ? 'is-loser' : ''}">
          <span>${home.crest} ${escapeHtml(home.name)}</span>
          ${m.played ? `<b>${m.score.home}</b>` : ''}
        </div>
        <div class="bracket-team-row ${awayWon ? 'is-winner' : m.played ? 'is-loser' : ''}">
          <span>${away.crest} ${escapeHtml(away.name)}</span>
          ${m.played ? `<b>${m.score.away}</b>` : ''}
        </div>
        ${scorePill ? `<div style="text-align:right;margin-top:4px;">${scorePill}</div>` : ''}
        ${actions}
      </div>
    `;
  };

  $('#bracketQF').innerHTML = currentTournament.bracket.qf.map(renderMatchCard).join('');
  $('#bracketSF').innerHTML = currentTournament.bracket.sf.map(renderMatchCard).join('');
  $('#bracketFinal').innerHTML = [renderMatchCard(currentTournament.bracket.final)].join('');

  // Top Scorers
  const leaders = getLeaderboard(currentTournament);
  $('#goldenBootList').innerHTML = leaders.map((s, idx) => `
    <div class="golden-boot-item">
      <span><b>#${idx + 1}</b> ${escapeHtml(s.name)}</span>
      <span class="golden-boot-goals">${s.goals} Goals</span>
    </div>
  `).join('') || '<div style="font-size:12px;color:#888;padding:8px 0;">No goals scored yet in this tournament.</div>';

  if (currentTournament.champion) {
    const champTeam = getTeam(currentTournament.champion);
    $('#trophyStatusTitle').textContent = `🏆 ${champTeam.name} Champions!`;
    $('#trophyStatusSub').textContent = `Glorious victory in the ${currentTournament.title}!`;
  } else {
    $('#trophyStatusTitle').textContent = 'Tournament Trophy';
    $('#trophyStatusSub').textContent = `Currently in ${currentTournament.stage}. Claim victory to lift the silverware.`;
  }
}

function startTournamentFromPreset(presetId) {
  const userTeamId = match.homeId || 'club_real_madrid';
  currentTournament = createTournament(presetId, userTeamId);
  renderTournament();
  toast(`🏆 ${currentTournament.title} initialized! Your team: ${getTeam(userTeamId).name}`);
}

function playTournamentMatchday(matchId) {
  let target = currentTournament.bracket.qf.find(m => m.id === matchId)
    || currentTournament.bracket.sf.find(m => m.id === matchId)
    || (currentTournament.bracket.final.id === matchId ? currentTournament.bracket.final : null);

  if (!target) return;
  activeTournamentMatchId = matchId;

  stop();
  match = createMatch({
    homeId: target.homeId,
    awayId: target.awayId,
    seed: `CUP-${matchId}-${Math.floor(Math.random() * 90000)}`,
    knockout: true
  });

  renderSelects();
  persistPrefs();
  render();

  $('#matchday')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast(`🏆 Knockout Fixture Loaded: ${getTeam(target.homeId).name} vs ${getTeam(target.awayId).name}! (Extra Time & Penalties active)`);
}

function quickSimulateTournamentMatch(matchId) {
  let target = currentTournament.bracket.qf.find(m => m.id === matchId)
    || currentTournament.bracket.sf.find(m => m.id === matchId)
    || (currentTournament.bracket.final.id === matchId ? currentTournament.bracket.final : null);

  if (!target) return;
  simulateAIMatch(target, `SIM-${matchId}-${Date.now()}`);

  const dummyMatch = {
    score: target.score,
    winner: target.winner === target.homeId ? 'home' : 'away',
    penalties: target.penaltyScore,
    events: target.scorers.map(s => ({ type: 'goal', text: `${s.name} finds the net!`, side: s.side, minute: s.minute }))
  };

  recordTournamentResult(currentTournament, matchId, dummyMatch);
  renderTournament();
  toast(`Match simulated: ${getTeam(target.homeId).short} ${target.score.home} - ${target.score.away} ${getTeam(target.awayId).short}`);
}

// ==========================================
// 4. Core Matchday Engine & Replay
// ==========================================
let vault=loadVault();

function loadVault(){try{const v=JSON.parse(localStorage.getItem(STORAGE)||'[]');return Array.isArray(v)?v.filter(item=>item?.match?.frames && item?.id).slice(0,12):[]}catch{return []}}
function persistPrefs(){if(replay)return;try{localStorage.setItem(PREFS,JSON.stringify({homeId:match.homeId,awayId:match.awayId,seed:match.seed,formation:match.formations.home,tactics:match.tactics.home}))}catch{}}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('visible'),2500)}
function stop(){running=false;accumulator=0;updatePlayButton()}
function updatePlayButton(){
  const isLast=replay?replay.index>=replay.source.frames.length-1:match.phase==='FULL_TIME';
  $('#playBtn').disabled=isLast;
  $('#stepBtn').disabled=isLast;
  $('#fullTimeBtn').disabled=isLast;
  $('#playText').textContent=isLast?'Full-time':running?'Pause':replay?'Play replay':match.minute?'Resume':'Kick off';
  $('#playGlyph').setAttribute('d',running?'M6 5h4v14H6zm8 0h4v14h-4z':'M8 5v14l11-7z');
}

function renderSelects(){
  const home=$('#homeSelect'),away=$('#awaySelect');
  const clubs = TEAMS.filter(t => t.isClub || !t.fifa_rank);
  const nations = TEAMS.filter(t => t.fifa_rank);

  const optionsHtml = `
    <optgroup label="World Elite & Domestic Clubs">
      ${clubs.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
    </optgroup>
    <optgroup label="Top 150 FIFA Senior National Teams">
      ${nations.map(t=>`<option value="${t.id}">#${t.fifa_rank} ${escapeHtml(t.name)}</option>`).join('')}
    </optgroup>
  `;
  home.innerHTML=optionsHtml;
  away.innerHTML=optionsHtml;
  home.value=match.homeId;
  away.value=match.awayId;
  $('#seedInput').value=match.seed;
}

function startMatch(){
  stop();replay=null;selectedStarter=null;
  const homeId=$('#homeSelect').value;
  let awayId=$('#awaySelect').value;
  if(homeId===awayId) awayId=TEAMS.find(t=>t.id!==homeId)?.id??'club_man_city';
  const seed=$('#seedInput').value.trim()||'TOUCHLINE-001';
  match=createMatch({
    homeId,
    awayId,
    seed,
    formation:match.formations.home,
    tactics:match.tactics.home,
    homeLineup:!replay && match.homeId===homeId?match.lineups.home:undefined
  });
  renderSelects();
  persistPrefs();
  render();
  sound.playWhistle(0.25);
  toast('Fresh fixture ready. Make your calls from the touchline.');
}

function renderScoreboard(){
  const home=getTeam(match.homeId),away=getTeam(match.awayId);
  $('#homeCrest').textContent=home.crest;
  $('#awayCrest').textContent=away.crest;
  $('#homeCrest').style.background=home.primary;
  $('#homeCrest').style.color=home.secondary;
  $('#awayCrest').style.background=away.primary;
  $('#awayCrest').style.color=away.secondary;
  $('#homeName').textContent=home.name;
  $('#awayName').textContent=away.name;
  $('#homeCity').textContent=home.city.toUpperCase();
  $('#awayCity').textContent=away.city.toUpperCase();
  $('#homeScore').textContent=match.score.home;
  $('#awayScore').textContent=match.score.away;

  $('#fixtureLabel').textContent=`${match.knockout ? 'KNOCKOUT CUP' : 'EXHIBITION'} / ${home.short} VS ${away.short}`;
  $('#matchMinute').textContent=String(match.minute).padStart(2,'0');
  $('#clockHalf').textContent=match.minute<46?'FIRST HALF':match.minute<91?'SECOND HALF':match.minute<=105?'ET 1ST HALF':'ET 2ND HALF';
  $('#matchState').textContent=replay?'REPLAY':match.phase==='PRE_MATCH'?'PRE-MATCH':match.phase==='HALF_TIME'?'HALF-TIME':match.phase==='EXTRA_TIME'?'EXTRA-TIME':match.phase==='PENALTIES'?'PENALTIES':match.phase==='FULL_TIME'?'FULL-TIME':'LIVE';
  $('#liveIndicator').textContent=replay?'REPLAY':match.phase==='FULL_TIME'?'FINAL':running?'ON AIR':'READY';
  $('#liveIndicator').classList.toggle('is-live',running);
  $('#pitchStatus').textContent=`${home.short} vs ${away.short}`;
  $('#pitchPossession').textContent=`${getTeam(match.possession==='home'?match.homeId:match.awayId).short} IN POSSESSION`;

  const notable=[...match.events].reverse().find(e=>['goal','save','shot','card','sub','tactic','talk'].includes(e.type));
  let scoreNoteText = match.phase==='FULL_TIME'?`${resultLabel(match).toUpperCase()} / FINAL WHISTLE`:notable?`${notable.minute}' ${notable.text.toUpperCase().slice(0,55)}`:'READY FOR KICK-OFF';
  if (match.penalties) {
    scoreNoteText += ` (Penalties: ${match.penalties.home}-${match.penalties.away})`;
  }
  $('#scoreNote').textContent = scoreNoteText;

  const maxMins = match.knockout ? 120 : 90;
  $('#timelineFill').style.width=`${Math.min(100, (match.minute/maxMins)*100)}%`;
  $('#timelineTrack').setAttribute('aria-valuenow',String(match.minute));
  $('#timelineStart').textContent=`${String(match.minute).padStart(2,'0')}:00`;
  $('#timelineEnd').textContent=`${maxMins}:00`;

  $('#statsHomeLabel').textContent=home.short;
  $('#statsAwayLabel').textContent=away.short;
  $('#seedInput').value=match.seed;

  // Show or hide Half-Time Team Talk banner
  const teamTalkEl = $('#teamTalkCard');
  if (teamTalkEl) {
    teamTalkEl.style.display = match.phase === 'HALF_TIME' ? 'block' : 'none';
  }

  updatePlayButton();
}

function renderStats(){
  const s=match.stats;
  const totals={
    possession:match.minute===0? [50,50]:[s.home.possession/(match.minute*60)*100,s.away.possession/(match.minute*60)*100],
    xg:[s.home.xg,s.away.xg],
    shots:[s.home.shots,s.away.shots],
    onTarget:[s.home.onTarget,s.away.onTarget],
    saves:[s.home.saves,s.away.saves],
    corners:[s.home.corners,s.away.corners],
    passes:[s.home.passes,s.away.passes],
    fouls:[s.home.fouls,s.away.fouls],
    yellow:[s.home.yellow,s.away.yellow],
    red:[s.home.red || 0, s.away.red || 0]
  };
  const labels={
    possession:'Possession',
    xg:'Expected goals (xG)',
    shots:'Total shots',
    onTarget:'Shots on target',
    saves:'Goalkeeper saves',
    corners:'Corner kicks',
    passes:'Total passes',
    fouls:'Fouls conceded',
    yellow:'Yellow cards',
    red:'Red cards'
  };
  $('#statsRows').innerHTML=Object.entries(totals).map(([key,[a,b]])=>{
    const denom=Math.max(a+b,.0001);
    const left=Math.round(a/denom*100),right=100-left;
    return `<div class="stat-row"><div class="stat-row-head"><b>${formatStat(key,a)}</b><span>${labels[key]}</span><b>${formatStat(key,b)}</b></div><div class="stat-bars"><div class="stat-left-bar"><span style="width:${left}%"></span></div><div class="stat-right-bar"><span style="width:${right}%"></span></div></div></div>`;
  }).join('');
}

function renderFeed(){
  const events=[...match.events].reverse().filter(e=>feedFilter==='all'||keyEvents.has(e.type)).slice(0,36);
  $('#eventFeed').innerHTML=events.map(e=>`
    <div class="feed-item ${escapeHtml(e.type)}">
      <div class="feed-time">${String(e.minute).padStart(2,'0')}′</div>
      <div class="feed-copy">
        <b>${e.type==='goal'?(e.isPenalty?'PENALTY GOAL ⚽':'GOAL ⚽'):e.type==='shootout'?'PENALTY SHOOTOUT 🎯':e.type==='save'?(e.isPenalty?'PENALTY SAVED 🧤':'SHOT ON TARGET 🧤'):e.type==='shot'?'SHOT':e.type==='card'?(e.card==='red'||e.card==='second_yellow'?'RED CARD 🔴':'BOOKING 🟨'):e.type==='foul'?'FREE KICK':e.type==='offside'?'OFFSIDE':e.type==='corner'?'CORNER':e.type==='half'?'INTERVAL':e.type==='full'?'FINAL WHISTLE':e.type==='sub'?'SUBSTITUTION':e.type==='tactic'?'TOUCHLINE SHOUT':e.type==='talk'?'DRESSING ROOM TALK':e.type==='kickoff'?'MATCHDAY':'OPEN PLAY'}${e.side?' / '+getTeam(e.side==='home'?match.homeId:match.awayId).short:''}</b>
        ${escapeHtml(e.text)}
      </div>
    </div>
  `).join('')||'<div class="feed-placeholder">No key moments yet.</div>';

  $$('.feed-filter').forEach(b=>b.classList.toggle('is-active',b.dataset.filter===feedFilter));
}

function renderFormation(){
  const formation=match.formations.home;
  $('#formationReadout').textContent=formation;
  $('#formationButtons').innerHTML=Object.keys(FORMATIONS).map(name=>`
    <button class="formation-button ${name===formation?'is-active':''}" data-formation="${name}" ${replay||match.phase==='FULL_TIME'?'disabled':''}>${name}</button>
  `).join('');
  $('#formationDots').innerHTML=(FORMATIONS[formation]||FORMATIONS['4-3-3']).map(([role,x,y])=>`
    <span class="formation-dot" title="${escapeHtml(role)}" style="left:${x}%;top:${y}%"></span>
  `).join('');
}

function renderTactics(){
  for(const key of ['pressing','tempo','width']){
    const value=match.tactics.home[key];
    $(`#${key}Range`).value=value;
    $(`#${key}Value`).textContent=value;
    $(`#${key}Range`).style.setProperty('--pct',`${value}%`);
    $(`#${key}Range`).disabled=!!replay||match.phase==='FULL_TIME';
  }
  $$('[data-mentality]').forEach(b=>{
    b.classList.toggle('is-active',b.dataset.mentality===match.tactics.home.mentality);
    b.disabled=!!replay||match.phase==='FULL_TIME';
  });
}

function renderSquad(){
  const team=getTeam(match.homeId);
  const lineup=match.lineups.home;
  const slots=FORMATIONS[match.formations.home] || FORMATIONS['4-3-3'];

  $('#squadList').innerHTML=lineup.map((id,i)=>{
    const p=getPlayer(team,id);
    if(!p) return '';
    const stam = match.stamina ? Math.round(match.stamina[id] ?? 100) : 100;
    const stamClass = stam > 65 ? '' : stam > 40 ? 'warn' : 'danger';
    const cardBadge = p.card ? `<span class="player-card-badge" title="${escapeHtml(p.card)}">${escapeHtml(p.card)}</span>` : '';
    return `
      <button class="player-item ${selectedStarter===id?'is-selected':''}" data-starter="${id}" ${replay||match.phase==='FULL_TIME'?'disabled':''}>
        <span class="shirt-number">${p.number || (i+1)}</span>
        <span class="player-main">
          <strong>${escapeHtml(p.name)}</strong>
          <small>${slots[i] ? slots[i][0] : p.role} · ${escapeHtml(p.role)} ${cardBadge}</small>
          <div class="player-stamina-bar" title="Stamina: ${stam}%"><div class="player-stamina-fill ${stamClass}" style="width:${stam}%"></div></div>
        </span>
        <span class="player-rating">${p.overall || p.ovr || 85}</span>
      </button>
    `;
  }).join('');

  const bench=(team.players || []).filter(p=>!lineup.includes(p.id));
  $('#benchList').innerHTML=bench.map((p, i)=>{
    const stam = match.stamina ? Math.round(match.stamina[p.id] ?? 100) : 100;
    const stamClass = stam > 65 ? '' : stam > 40 ? 'warn' : 'danger';
    const cardBadge = p.card ? `<span class="player-card-badge" title="${escapeHtml(p.card)}">${escapeHtml(p.card)}</span>` : '';
    return `
      <button class="player-item" data-bench="${p.id}" ${replay||match.phase==='FULL_TIME'?'disabled':''}>
        <span class="shirt-number">${p.number || (12+i)}</span>
        <span class="player-main">
          <strong>${escapeHtml(p.name)}</strong>
          <small>${escapeHtml(p.role)} ${cardBadge}</small>
          <div class="player-stamina-bar" title="Stamina: ${stam}%"><div class="player-stamina-fill ${stamClass}" style="width:${stam}%"></div></div>
        </span>
        <span class="player-rating">${p.overall || p.ovr || 85}</span>
      </button>
    `;
  }).join('');

  $('#benchCount').textContent=`${String(bench.length).padStart(2,'0')} AVAILABLE`;
  $('#resetLineupBtn').disabled=!!replay||match.minute>0;
  $('#squadHint').textContent=replay?'Replay is read-only. Start a new fixture to edit the XI.':match.phase==='FULL_TIME'?'Full time. Start a new fixture to manage players.':match.minute>0?`Select a starter then a substitute. ${5-(match.substitutionsUsed??0)} changes left.`:'Select a starter, then choose a substitute to swap.';
}

function renderFlow(){
  const home=getTeam(match.homeId),away=getTeam(match.awayId);
  $('#homeLegendDot').style.background='#578750';$('#homeLegendDot').style.border='none';
  $('#awayLegendDot').style.background='#8da4b1';$('#awayLegendDot').style.border='none';
  $('#flowHomeName').textContent=home.name.toUpperCase();$('#flowAwayName').textContent=away.name.toUpperCase();
  const maxMins = (match.knockout || (replay && replay.source.knockout)) ? 120 : 90;
  const frames=match.frames.slice(0,match.minute+1);const w=640,h=139,x0=43,y0=17;
  const mx=Math.max(1,...frames.flatMap(f=>[f.stats.home.xg,f.stats.away.xg]));const yMax=Math.ceil(mx*2)/2;
  const px=m=>x0+(m/maxMins)*w,py=v=>y0+h-(v/yMax)*h;
  let svg='';
  for(let i=0;i<=4;i++){let val=yMax*i/4,y=py(val);svg+=`<line x1="43" y1="${y}" x2="683" y2="${y}" stroke="#e6ece5" stroke-width="1" stroke-dasharray="3 5"/><text x="35" y="${y+3}" text-anchor="end" fill="#96a399" font-family="Arial" font-size="9" font-weight="700">${val.toFixed(1)}</text>`;}
  const step = maxMins > 90 ? 20 : 15;
  for(let i=0;i<=maxMins;i+=step){svg+=`<text x="${px(i)}" y="179" text-anchor="middle" fill="#96a399" font-family="Arial" font-size="9" font-weight="700">${i}′</text>`;}
  for(const [side,color] of [['home','#578750'],['away','#8da4b1']]){
    const pts=frames.map(f=>`${px(f.minute)},${py(f.stats[side].xg)}`).join(' ');
    svg+=`<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    const last=frames.at(-1);if(last)svg+=`<circle cx="${px(last.minute)}" cy="${py(last.stats[side].xg)}" r="4" fill="${color}" stroke="#fff" stroke-width="2"/>`;
  }
  $('#flowChart').innerHTML=svg;
  const moment=[...match.events].reverse().find(e=>['goal','save','shot','card','shootout'].includes(e.type));
  $('#flowMoment').textContent=moment?moment.type==='goal'?`Goal · ${moment.minute}′`:moment.type==='shootout'?`Shootout · 120′`:moment.type==='save'?`Crucial save · ${moment.minute}′`:moment.type==='shot'?`Shot off target · ${moment.minute}′`:`Booking · ${moment.minute}′`:'Kick-off awaits';
  $('#flowMomentNote').textContent=moment?moment.text:'The first chance is still to come.';
  const hPct=match.minute===0?50:Math.round(match.stats.home.possession/(match.minute*60)*100);
  const edge=hPct>=54?home.name:hPct<=46?away.name:'Evenly matched';
  $('#flowEdge').textContent=edge;$('#flowEdgeNote').textContent=match.minute?`${hPct}% ${home.short} / ${100-hPct}% ${away.short} across ${match.minute} minutes.`:'Nothing between the sides yet.';
}

function renderVault(){
  const container=$('#vaultList');
  if(!vault.length){container.innerHTML='<div class="empty-vault">No saved fixtures yet. Play a match and hit “Save this match”.</div>';return;}
  container.innerHTML=vault.map(item=>{
    const m=item.match;
    const h=getTeam(m.homeId),a=getTeam(m.awayId);
    return `<article class="vault-match"><div class="vault-match-top"><span>${escapeHtml(new Date(item.savedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase())}</span><span>${m.minute===90?'FULL TIME':`${m.minute}′ SAVED`}</span></div><div class="vault-score">${h.short} ${m.score.home}<span>:</span>${m.score.away} ${a.short}</div><div class="vault-sub">${escapeHtml(m.seed)} · ${m.frames.length} frames</div><div class="vault-match-actions"><button data-replay="${escapeHtml(item.id)}">↻ Replay</button><button data-export="${escapeHtml(item.id)}">↓ Export JSON</button><button data-delete="${escapeHtml(item.id)}">✕</button></div></article>`;
  }).join('');
}

function render(){
  renderScoreboard();
  renderStats();
  renderFeed();
  renderFlow();
  renderFormation();
  renderTactics();
  renderSquad();
  $('#homeSelect').value=match.homeId;
  $('#awaySelect').value=match.awayId;
  $('#homeSelect').disabled=!!replay;
  $('#awaySelect').disabled=!!replay;
  $('#newMatchBtn').textContent='↗ New fixture';
}

function saveVault(silent=false){
  if(replay){toast('Exit replay before saving.');return;}
  const snapshot=JSON.parse(JSON.stringify(match));
  const id=`${snapshot.seed}-${Date.now()}`;
  vault=[{id,savedAt:new Date().toISOString(),match:snapshot},...vault].slice(0,12);
  try{localStorage.setItem(STORAGE,JSON.stringify(vault));renderVault();if(!silent)toast('Match saved to your replay vault.');}catch{vault.shift();toast('Storage full; export replay instead.');}
}

function newTick(){
  if(replay){
    replay.index++;
    match=matchFromFrame(replay.source,replay.index);
    if(replay.index>=replay.source.frames.length-1)stop();
    render();
    return;
  }

  const prior=match.events.length;
  advanceMinute(match);
  persistPrefs();
  const nextEvents=match.events.slice(prior);

  const goal=nextEvents.find(e=>e.type==='goal');
  if(goal){
    flashGoal(goal);
    sound.playGoalCheer();
  } else {
    const shot=nextEvents.find(e=>e.type==='shot'||e.type==='save');
    if(shot) sound.playKick();
  }

  if(match.minute===45){
    sound.playWhistle(0.3);
  }

  if(match.phase==='FULL_TIME'){
    stop();
    sound.playWhistle(0.45);
    saveVault(true);

    if (activeTournamentMatchId && currentTournament) {
      recordTournamentResult(currentTournament, activeTournamentMatchId, match);
      activeTournamentMatchId = null;
      renderTournament();
      toast('🏆 Tournament match completed & recorded into bracket!');
    } else {
      toast('Full time. Match recorded in replay vault.');
    }
  }
  render();
}

function flashGoal(e){
  const el=$('#goalFlash');
  $('#goalFlashWho').textContent=getTeam(e.side==='home'?match.homeId:match.awayId).name.toUpperCase();
  el.classList.add('visible');
  clearTimeout(goalTimeout);
  goalTimeout=setTimeout(()=>el.classList.remove('visible'),1400);
}

function startReplay(item){
  stop();
  replay={source:item.match,index:0};
  match=matchFromFrame(item.match,0);
  selectedStarter=null;
  renderSelects();
  render();
  window.scrollTo({top:0,behavior:'smooth'});
  toast('Replay loaded. Press play to review the match.');
}

function exportReplay(item){
  const file=new Blob([JSON.stringify({format:'touchline-xi/v2',savedAt:item.savedAt,match:item.match},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(file);
  const a=document.createElement('a');
  a.href=url;
  a.download=`touchline-xi-${item.match.seed.replace(/[^a-z0-9_-]/gi,'_')}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}

function bind(){
  $('#playBtn').addEventListener('click',()=>{
    if(match.phase==='FULL_TIME'&&!replay) return;
    running=!running;
    if(running && match.minute===0) sound.playWhistle(0.25);
    accumulator=0;
    updatePlayButton();
  });

  $('#stepBtn').addEventListener('click',()=>{
    if(match.phase==='FULL_TIME'&&!replay) return;
    stop();
    newTick();
  });

  $('#fullTimeBtn').addEventListener('click',()=>{
    if(replay){
      replay.index=replay.source.frames.length-1;
      match=matchFromFrame(replay.source,replay.index);
      stop();
      render();
      return;
    }
    if(match.phase==='FULL_TIME') return;
    stop();
    playFullMatch(match);
    sound.playWhistle(0.45);
    saveVault(true);

    if (activeTournamentMatchId && currentTournament) {
      recordTournamentResult(currentTournament, activeTournamentMatchId, match);
      activeTournamentMatchId = null;
      renderTournament();
      toast('🏆 Tournament match completed & recorded into bracket!');
    }
    render();
    toast('Full time simulated. Result stored in vault.');
  });

  $('#newMatchBtn').addEventListener('click',startMatch);

  $('#randomSeedBtn')?.addEventListener('click', () => {
    const randomSeed = `MATCH-${Math.floor(Math.random() * 90000 + 10000)}`;
    $('#seedInput').value = randomSeed;
    match.seed = randomSeed;
    toast(`🎲 Seed randomized: ${randomSeed}`);
  });

  // Timeline scrub seeking for replays and match review
  $('#timelineTrack')?.addEventListener('click', e => {
    if (!replay && match.phase !== 'FULL_TIME') return;
    const rect = $('#timelineTrack').getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const maxMins = (match.knockout || (replay && replay.source.knockout)) ? 120 : 90;
    const targetMin = Math.round(pct * maxMins);
    if (replay) {
      replay.index = Math.min(targetMin, replay.source.frames.length - 1);
      match = matchFromFrame(replay.source, replay.index);
      render();
    } else if (match.phase === 'FULL_TIME') {
      startReplay({ match });
      replay.index = Math.min(targetMin, replay.source.frames.length - 1);
      match = matchFromFrame(replay.source, replay.index);
      render();
    }
  });

  $('#homeSelect').addEventListener('change',()=>{
    if($('#homeSelect').value===$('#awaySelect').value){
      $('#awaySelect').value=TEAMS.find(t=>t.id!==$('#homeSelect').value).id;
    }
    startMatch();
  });

  $('#awaySelect').addEventListener('change',()=>{
    if($('#awaySelect').value===$('#homeSelect').value){
      $('#awaySelect').value=TEAMS.find(t=>t.id!==$('#homeSelect').value).id;
    }
    startMatch();
  });

  $('#formationButtons').addEventListener('click',e=>{
    const b=e.target.closest('[data-formation]');
    if(!b||replay) return;
    if(changeFormation(match,b.dataset.formation)){
      persistPrefs();
      renderFormation();
      renderSquad();
      toast(`System adjusted to ${b.dataset.formation}.`);
    }
  });

  for(const key of ['pressing','tempo','width']){
    $(`#${key}Range`).addEventListener('input',e=>{
      if(replay) return;
      applyTactic(match,key,e.target.value);
      $(`#${key}Value`).textContent=e.target.value;
      $(`#${key}Range`).style.setProperty('--pct',e.target.value+'%');
      persistPrefs();
    });
  }

  $('#mentalityButtons').addEventListener('click',e=>{
    const b=e.target.closest('[data-mentality]');
    if(!b||replay) return;
    applyTactic(match,'mentality',b.dataset.mentality);
    renderTactics();
    persistPrefs();
  });

  $('#squadList').addEventListener('click',e=>{
    const b=e.target.closest('[data-starter]');
    if(!b||replay) return;
    selectedStarter=selectedStarter===b.dataset.starter?null:b.dataset.starter;
    renderSquad();
  });

  $('#benchList').addEventListener('click',e=>{
    const b=e.target.closest('[data-bench]');
    if(!b||replay) return;
    if(!selectedStarter){
      toast('Choose a starting player first, then select a substitute.');
      return;
    }
    const incoming=getPlayer(getTeam(match.homeId),b.dataset.bench);
    if(swapPlayer(match,selectedStarter,b.dataset.bench)){
      toast(`Substitution: ${incoming.name} enters the pitch!`);
      selectedStarter=null;
      renderSquad();
      renderFeed();
    }else{
      toast('Invalid swap. Keep 1 goalkeeper on pitch and respect 5 substitution limit.');
    }
  });

  $('#resetLineupBtn').addEventListener('click',()=>{
    if(replay||match.minute>0) return;
    resetStartingXI(match);
    selectedStarter=null;
    renderSquad();
    toast('Original starting eleven restored.');
  });

  $$('.speed-button').forEach(b=>b.addEventListener('click',()=>{
    speed=Number(b.dataset.speed);
    $$('.speed-button').forEach(x=>x.classList.toggle('is-active',x===b));
  }));

  $$('.feed-filter').forEach(b=>b.addEventListener('click',()=>{
    feedFilter=b.dataset.filter;
    renderFeed();
  }));

  $('#saveBtn').addEventListener('click',()=>saveVault());

  $('#importReplayBtn')?.addEventListener('click', () => {
    $('#replayFileInput')?.click();
  });

  $('#replayFileInput')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const targetMatch = data.match || data;
        if (!targetMatch.frames || !targetMatch.score || !targetMatch.seed) {
          toast('Invalid replay format: missing frames or match data.');
          return;
        }
        const id = `${targetMatch.seed}-${Date.now()}`;
        vault = [{ id, savedAt: data.savedAt || new Date().toISOString(), match: targetMatch }, ...vault].slice(0, 12);
        localStorage.setItem(STORAGE, JSON.stringify(vault));
        renderVault();
        toast(`Replay "${targetMatch.seed}" imported to vault!`);
      } catch (err) {
        toast('Failed to parse replay JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  $('#clearVaultBtn').addEventListener('click',()=>{
    if(!vault.length) return;
    if(window.confirm('Clear all saved match replays?')){
      vault=[];
      localStorage.removeItem(STORAGE);
      renderVault();
      toast('Vault cleared.');
    }
  });

  $('#vaultList').addEventListener('click',e=>{
    const button=e.target.closest('[data-replay],[data-export],[data-delete]');
    if(!button) return;
    const id=button.dataset.replay??button.dataset.export??button.dataset.delete;
    const item=vault.find(v=>v.id===id);
    if(!item) return;
    if(button.hasAttribute('data-replay')){
      startReplay(item);
    } else if(button.hasAttribute('data-export')){
      exportReplay(item);
      toast('Replay exported as JSON.');
    } else {
      vault=vault.filter(v=>v.id!==id);
      localStorage.setItem(STORAGE,JSON.stringify(vault));
      renderVault();
    }
  });

  // Sound toggle
  const soundBtn = $('#soundToggleBtn');
  const soundStatus = $('#soundStatusText');
  if (sound.enabled) {
    soundBtn.classList.add('is-active');
    soundStatus.textContent = 'ON';
  }
  soundBtn.addEventListener('click', () => {
    const isNowOn = sound.toggle();
    soundBtn.classList.toggle('is-active', isNowOn);
    soundStatus.textContent = isNowOn ? 'ON' : 'OFF';
    toast(isNowOn ? '🔊 Stadium audio enabled!' : '🔇 Audio muted.');
  });

  // Navigation Links
  $$('.nav-link').forEach(b=>b.addEventListener('click',()=>{
    $$('.nav-link').forEach(x=>x.classList.toggle('is-active',x===b));
    const section = $('#'+b.dataset.section);
    if (section) section.scrollIntoView({behavior:'smooth',block:'start'});
  }));

  // Touchline Shouts
  $('#managerShoutsPanel')?.addEventListener('click', e => {
    const b = e.target.closest('[data-shout]');
    if (!b || replay || match.phase === 'FULL_TIME') return;
    applyShout(match, b.dataset.shout);
    renderTactics();
    renderFeed();
    toast(`📢 Shout delivered to pitch!`);
  });

  // Half-Time Team Talk options
  $('#teamTalkCard')?.addEventListener('click', e => {
    const b = e.target.closest('[data-talk]');
    if (!b || match.phase !== 'HALF_TIME') return;
    applyTeamTalk(match, b.dataset.talk);
    renderSquad();
    renderFeed();
    $('#teamTalkCard').style.display = 'none';
    toast('Manager speech concluded. Squad ready for 2nd half.');
  });

  // Dream Team Bindings
  $('#dreamFormationButtons').addEventListener('click', e => {
    const b = e.target.closest('[data-dream-formation]');
    if (!b) return;
    dreamConfig.formation = b.dataset.dreamFormation;
    renderDreamStudio();
    toast(`Formation set to ${dreamConfig.formation}`);
  });

  $('#dreamStyleCards').addEventListener('click', e => {
    const card = e.target.closest('[data-dream-style]');
    if (!card) return;
    dreamConfig.style = card.dataset.dreamStyle;
    renderDreamStudio();
    toast(`Play Style set to ${dreamConfig.style}`);
  });

  $('#dreamOpponentSelect').addEventListener('change', e => {
    dreamConfig.opponentId = e.target.value;
    renderDreamStudio();
  });

  $('#aiDifficultyButtons').addEventListener('click', e => {
    const b = e.target.closest('[data-difficulty]');
    if (!b) return;
    $$('#aiDifficultyButtons button').forEach(x => x.classList.toggle('is-active', x === b));
    dreamConfig.aiDifficulty = b.dataset.difficulty;
    toast(`Opposition AI Difficulty set to ${dreamConfig.aiDifficulty}`);
  });

  $('#randomizeDreamBtn').addEventListener('click', randomizeGalacticos);
  $('#deployDreamBtn').addEventListener('click', deployDreamTeamAndPlay);

  $('#dreamStartersGrid').addEventListener('click', e => {
    const slot = e.target.closest('.dream-slot');
    if (!slot) return;
    openPlayerModal('starter', Number(slot.dataset.slotIndex));
  });

  $('#dreamBenchGrid').addEventListener('click', e => {
    const slot = e.target.closest('.dream-slot');
    if (!slot) return;
    openPlayerModal('bench', Number(slot.dataset.slotIndex));
  });

  $('#closePlayerModalBtn').addEventListener('click', () => {
    $('#playerPickerModal').classList.remove('is-open');
  });
  $('#playerModalBackdrop').addEventListener('click', () => {
    $('#playerPickerModal').classList.remove('is-open');
  });
  $('#playerSearchInput').addEventListener('input', renderModalPlayers);
  $('#modalRoleFilter').addEventListener('change', renderModalPlayers);

  $('#modalPlayerList').addEventListener('click', e => {
    const item = e.target.closest('[data-pick-id]');
    if (!item) return;
    selectPlayerFromModal(item.dataset.pickId);
  });

  // Scouting Hub Filters
  const resetAndScout = () => { scoutPage = 1; renderScoutingHub(); };
  $('#scoutSearchInput').addEventListener('input', resetAndScout);
  $('#scoutRoleFilter').addEventListener('change', resetAndScout);
  $('#scoutTierFilter').addEventListener('change', resetAndScout);
  $('#scoutTeamFilter').addEventListener('change', resetAndScout);
  $('#scoutSortFilter').addEventListener('change', resetAndScout);

  $('#scoutingPlayerGrid').addEventListener('click', e => {
    const loadMoreBtn = e.target.closest('#loadMoreScoutBtn');
    if (loadMoreBtn) {
      scoutPage++;
      renderScoutingHub();
      return;
    }
    const card = e.target.closest('[data-fut-id]');
    if (!card) return;
    openFutCardModal(card.dataset.futId);
  });

  // FUT Card Modal
  $('#closeFutModalBtn').addEventListener('click', () => {
    $('#futCardModal').classList.remove('is-open');
  });
  $('#futCardModal').addEventListener('click', e => {
    if (e.target.id === 'futCardModal') {
      $('#futCardModal').classList.remove('is-open');
    }
  });
  $('#futDraftToDreamBtn').addEventListener('click', draftActiveFutToDreamTeam);

  // Tournament Bindings
  $('#startNewTournamentBtn').addEventListener('click', () => {
    const selectedPreset = currentTournament?.presetId || 'champions_cup';
    startTournamentFromPreset(selectedPreset);
  });

  $('#tournamentPresetsGrid').addEventListener('click', e => {
    const card = e.target.closest('[data-tournament-preset]');
    if (!card) return;
    startTournamentFromPreset(card.dataset.tournamentPreset);
  });

  $('#tournamentBracketWrapper').addEventListener('click', e => {
    const playBtn = e.target.closest('[data-play-tournament]');
    if (playBtn) {
      playTournamentMatchday(playBtn.dataset.playTournament);
      return;
    }
    const simBtn = e.target.closest('[data-sim-tournament]');
    if (simBtn) {
      quickSimulateTournamentMatch(simBtn.dataset.simTournament);
      return;
    }
  });

  // Accessible keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement || e.target instanceof HTMLSelectElement) return;
    if (e.code === 'Space') {
      e.preventDefault();
      $('#playBtn')?.click();
    } else if (e.code === 'KeyS' || e.code === 'ArrowRight') {
      e.preventDefault();
      $('#stepBtn')?.click();
    } else if (e.code === 'KeyF') {
      e.preventDefault();
      $('#fullTimeBtn')?.click();
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      $('#soundToggleBtn')?.click();
    } else if (e.key === '1') {
      $('[data-speed="1"]')?.click();
    } else if (e.key === '2') {
      $('[data-speed="2"]')?.click();
    } else if (e.key === '5') {
      $('[data-speed="5"]')?.click();
    }
  });
}

function frame(now){
  const delta=lastRenderAt?Math.min(now-lastRenderAt,200):0;
  lastRenderAt=now;
  if(running){
    accumulator+=delta;
    const interval=850/speed;
    let loops=0;
    while(accumulator>=interval&&loops<8){
      accumulator-=interval;
      newTick();
      loops++;
      if(!running)break;
    }
  }
  renderPitch($('#pitchCanvas'),match,now);
  requestAnimationFrame(frame);
}

// Initial renders
renderSelects();
bind();
render();
renderDreamStudio();
renderScoutingHub();
renderTournament();
renderVault();
requestAnimationFrame(frame);
