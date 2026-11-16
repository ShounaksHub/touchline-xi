import {TEAMS, FORMATIONS, DEFAULT_TACTICS, PLAY_STYLES, getTeam, getPlayer, CLUBS, registerCustomTeam} from './data.js';
import {createMatch, advanceMinute, playFullMatch, matchFromFrame, applyTactic, changeFormation, swapPlayer, resetStartingXI, resultLabel, applyShout, applyTeamTalk, simulatePenaltyShootout} from './engine.js';
import {renderPitch} from './pitch.js';
import {sound} from './sound.js';
import {createTournament, loadTournament, saveTournament, clearTournament, simulateAIMatch, recordTournamentResult, getLeaderboard, TOURNAMENT_PRESETS} from './tournament.js';
import {getTeamBadgeSvg} from './badges.js';
import {MatchEffectsController} from './match-effects.js';
import {createPlayerDuel, advanceDuelTick, playFullDuel, renderDuelPitch, DUEL_TYPES} from './duel.js';
import {TutorialController, TUTORIAL_MODES} from './tutorial.js';

const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const STORAGE='touchline-xi-replays-v1';
const PREFS='touchline-xi-prefs-v1';
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatStat=(key,value)=>{
  const num=Number(value)||0;
  if(key==='possession') return `${Math.round(num)}%`;
  if(key==='xg') return num.toFixed(2);
  return num.toLocaleString('en-GB');
};
const keyEvents=new Set(['goal','save','shot','card','half','full','sub','tactic','talk','shootout']);
const savedPrefs=(()=>{try{return JSON.parse(localStorage.getItem(PREFS))||{}}catch{return {}}})();

const MUSIC_TRACKS = [
  ['John Newman — Love Me Again', 'John Newman - Love Me Again.mp3'],
  ['Haaland Song', 'Haaland Song ( Ha Ha Ha).mp3'],
  ['Dreamers', 'Dreamers.mp3'],
  ['Dai Dai 2026', 'Dai Dai 2026.mp3'],
  ['La La La 2014', 'La la la 2014.mp3'],
  ['Wavin’ Flag', 'K\'NAAN - Wavin\' Flag (Coca-Cola Celebration Mix).mp3'],
  ['Oh Kevin De Bruyne', 'Oh Kevin De Bruyne.mp3'],
  ['One Kiss', 'Calvin Harris, Dua Lipa - One Kiss (Official Video).mp3'],
  ['The Cup of Life', 'Ricky Martin - The Cup of Life.mp3'],
  ['Waka Waka', 'Waka Waka.mp3']
];
const musicPlayer = (() => {
  const audio = new Audio();
  audio.loop = true;
  audio.volume = Number(localStorage.getItem('touchline_music_volume') ?? 0.45);
  let index = Number(localStorage.getItem('touchline_music_track') ?? 0) || 0;
  const source = () => `music%20of%20the%20game/${encodeURIComponent(MUSIC_TRACKS[index][1])}`;
  const load = () => { audio.src = source(); audio.load(); };
  load();
  return {
    tracks: MUSIC_TRACKS,
    get index() { return index; },
    get playing() { return !audio.paused; },
    play() { return audio.play().catch(() => {}); },
    pause() { audio.pause(); },
    toggle() { return this.playing ? (this.pause(), false) : (this.play(), true); },
    setTrack(next) { index = Number(next) || 0; localStorage.setItem('touchline_music_track', String(index)); load(); return this.play(); },
    setVolume(value) { audio.volume = Number(value); localStorage.setItem('touchline_music_volume', String(audio.volume)); }
  };
})();

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

const matchEffects = new MatchEffectsController({
  onPause: () => {
    if (running) {
      stop();
    }
  },
  onResume: () => {
    if (!running && match && match.phase !== 'FULL_TIME') {
      running = true;
      accumulator = 0;
      updatePlayButton();
    }
  }
});

function updatePresentationModeUi() {
  const mode = matchEffects.mode;
  const isBroadcast = mode === 'broadcast';
  const iconEl = $('#presentationModeIcon');
  const textEl = $('#presentationModeText');
  if (iconEl) {
    iconEl.innerHTML = isBroadcast
      ? '<svg class="icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>'
      : '<svg class="icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
  }
  if (textEl) textEl.textContent = isBroadcast ? 'Broadcast' : 'Continuous';
  const btn = $('#presentationModeBtn');
  if (btn) {
    btn.setAttribute('title', isBroadcast
      ? 'Broadcast Mode: Displays cinematic graphics and holds briefly for drama. Click to switch.'
      : 'Continuous Mode: Non-stop match flow with non-blocking overlays. Click to switch.'
    );
  }
}

// Master player pool indexing all unique footballers deduplicated to peak canonical rating
const ALL_PLAYERS_POOL = (() => {
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const pool = new Map();
  for (const team of TEAMS) {
    for (const p of (team.players || [])) {
      const k = norm(p.name);
      const playerOvr = p.ovr || p.overall || 85;
      if (!pool.has(k)) {
        pool.set(k, {
          id: p.id,
          name: p.name,
          role: p.role,
          nat: p.nat || 'International',
          club: p.club || team.name,
          teamName: team.name,
          ovr: playerOvr,
          overall: playerOvr,
          pace: p.pace || 80,
          shooting: p.shooting || 75,
          passing: p.passing || 80,
          defending: p.defending || 70,
          physical: p.physical || 75,
          keeping: p.keeping || (p.role === 'GK' ? 85 : 5),
          card: p.card || 'Gold Rare',
          playerType: p.playerType,
          verificationStatus: p.verificationStatus,
          isGenerated: p.isGenerated,
          rosterEra: p.rosterEra,
          appearances: [team.name]
        });
      } else {
        const existing = pool.get(k);
        if (!existing.appearances.includes(team.name)) existing.appearances.push(team.name);
        if (playerOvr > existing.ovr) {
          const apps = existing.appearances;
          Object.assign(existing, {
            id: p.id,
            name: p.name,
            role: p.role,
            nat: p.nat || existing.nat,
            club: p.club || team.name,
            teamName: team.name,
            ovr: playerOvr,
            overall: playerOvr,
            pace: p.pace || existing.pace,
            shooting: p.shooting || existing.shooting,
            passing: p.passing || existing.passing,
            defending: p.defending || existing.defending,
            physical: p.physical || existing.physical,
            keeping: p.keeping || existing.keeping,
            card: p.card || existing.card,
            playerType: p.playerType || existing.playerType,
            verificationStatus: p.verificationStatus || existing.verificationStatus,
            isGenerated: p.isGenerated !== undefined ? p.isGenerated : existing.isGenerated,
            rosterEra: p.rosterEra || existing.rosterEra,
            appearances: apps
          });
        }
      }
    }
  }
  return Array.from(pool.values()).sort((a,b) => b.ovr - a.ovr);
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
  opponentMode: 'selected',
  aiDifficulty: 'Standard',
  starters: [
    { role: 'GK', id: 'spain_5', name: 'Iker Casillas', nat: 'Spain', ovr: 94, card: '94 Icon Moments' },
    { role: 'LB', id: 'brazil_12', name: 'Roberto Carlos', nat: 'Brazil', ovr: 93, card: '93 Icon Moments' },
    { role: 'CB', id: 'spain_0', name: 'Sergio Ramos', nat: 'Spain', ovr: 98, card: '98 TOTY Peak' },
    { role: 'CB', id: 'netherlands_0', name: 'Virgil van Dijk', nat: 'Netherlands', ovr: 99, card: '99 TOTY / Futties Peak' },
    { role: 'RB', id: 'morocco_0', name: 'Achraf Hakimi', nat: 'Morocco', ovr: 95, card: '95 TOTY Peak' },
    { role: 'CDM', id: 'france_4', name: "N'Golo Kanté", nat: 'France', ovr: 97, card: '97 TOTY Peak' },
    { role: 'CM', id: 'croatia_0', name: 'Luka Modrić', nat: 'Croatia', ovr: 99, card: '99 Ballon d\'Or / TOTY Peak' },
    { role: 'CM', id: 'belgium_0', name: 'Kevin De Bruyne', nat: 'Belgium', ovr: 99, card: '99 TOTY / TOTS Peak' },
    { role: 'LW', id: 'brazil_7', name: 'Ronaldinho', nat: 'Brazil', ovr: 95, card: '95 Prime Icon' },
    { role: 'ST', id: 'portugal_0', name: 'Cristiano Ronaldo', nat: 'Portugal', ovr: 99, card: '99 Futties / TOTY Peak' },
    { role: 'RW', id: 'argentina_1', name: 'Lionel Messi', nat: 'Argentina', ovr: 99, card: '99 Futties / TOTY Peak' }
  ],
  bench: [
    { role: 'GK', id: 'italy_1', name: 'Gianluigi Buffon', nat: 'Italy', ovr: 96, card: '96 End of an Era / Prime Icon' },
    { role: 'CB', id: 'italy_2', name: 'Paolo Maldini', nat: 'Italy', ovr: 95, card: '95 Icon Moments' },
    { role: 'CM', id: 'france_3', name: 'Zinedine Zidane', nat: 'France', ovr: 97, card: '97 Icon Moments' },
    { role: 'ST', id: 'france_0', name: 'Kylian Mbappé', nat: 'France', ovr: 99, card: '99 TOTY / Futties Peak' },
    { role: 'RW', id: 'wales_0', name: 'Gareth Bale', nat: 'Wales', ovr: 98, card: '98 End of Era / Futties' }
  ]
};

let activeModalTarget = null;
let activeFutPlayer = null;
let currentTournament = loadTournament() || null;
let activeTournamentMatchId = null;

// ==========================================
// Team Selector Categories Helper
// ==========================================
let teamFilterQuery = '';

function buildTeamOptionsHtml(selectedId, includeAllOption = false, filterQuery = '') {
  const continents = [
    { key: 'Europe', label: '🏆 European Clubs (UEFA)' },
    { key: 'South America', label: '🔥 South American Clubs (CONMEBOL)' },
    { key: 'North America', label: '⭐ North & Central American Clubs (CONCACAF)' },
    { key: 'Asia & Oceania', label: '🌏 Asian & Oceanic Clubs (AFC / OFC)' },
    { key: 'Africa', label: '🦁 African Clubs (CAF)' }
  ];

  const q = (filterQuery || '').trim().toLowerCase();
  const matchesQuery = (t) => {
    if (!q) return true;
    return (
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.short && t.short.toLowerCase().includes(q)) ||
      (t.city && t.city.toLowerCase().includes(q)) ||
      (t.official_name && t.official_name.toLowerCase().includes(q))
    );
  };

  let html = '';
  if (includeAllOption) {
    html += '<option value="ALL">All Clubs & National Teams (12,900+ Players)</option>';
  }

  let totalMatches = 0;
  let selectedMatched = false;

  for (const c of continents) {
    const clubsInContinent = TEAMS.filter(t => (t.isClub || !t.fifa_rank) && t.continent === c.key && matchesQuery(t));
    if (clubsInContinent.length > 0) {
      totalMatches += clubsInContinent.length;
      html += `<optgroup label="${c.label}${q ? ` (${clubsInContinent.length})` : ''}">`;
      html += clubsInContinent.map(t => {
        const isSel = t.id === selectedId;
        if (isSel) selectedMatched = true;
        return `<option value="${t.id}" ${isSel ? 'selected' : ''}>${escapeHtml(t.name)}</option>`;
      }).join('');
      html += '</optgroup>';
    }
  }

  const otherClubs = TEAMS.filter(t => (t.isClub || !t.fifa_rank) && !t.continent && matchesQuery(t));
  if (otherClubs.length > 0) {
    totalMatches += otherClubs.length;
    html += `<optgroup label="🌐 Other World Clubs${q ? ` (${otherClubs.length})` : ''}">`;
    html += otherClubs.map(t => {
      const isSel = t.id === selectedId;
      if (isSel) selectedMatched = true;
      return `<option value="${t.id}" ${isSel ? 'selected' : ''}>${escapeHtml(t.name)}</option>`;
    }).join('');
    html += '</optgroup>';
  }

  const nations = TEAMS.filter(t => t.fifa_rank && matchesQuery(t));
  if (nations.length > 0) {
    totalMatches += nations.length;
    html += `<optgroup label="🌍 FIFA Senior National Teams${q ? ` (${nations.length})` : ' (Top 150)'}">`;
    html += nations.map(t => {
      const isSel = t.id === selectedId;
      if (isSel) selectedMatched = true;
      return `<option value="${t.id}" ${isSel ? 'selected' : ''}>#${t.fifa_rank} ${escapeHtml(t.name)}</option>`;
    }).join('');
    html += '</optgroup>';
  }

  if (selectedId && !selectedMatched) {
    const selTeam = getTeam(selectedId);
    if (selTeam) {
      html = `<optgroup label="📌 Active Match Fixture"><option value="${selTeam.id}" selected>${escapeHtml(selTeam.name)}</option></optgroup>` + html;
    }
  }

  if (q && totalMatches === 0) {
    html = `<option value="${selectedId || ''}" disabled ${!selectedId ? 'selected' : ''}>No teams matching "${escapeHtml(q)}"</option>` + (html || '');
  }

  return html;
}

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

  const opponentMode = $('#dreamOpponentMode');
  if (opponentMode) opponentMode.querySelectorAll('button').forEach(button => button.classList.toggle('is-active', button.dataset.opponentMode === dreamConfig.opponentMode));
  const opponentSelect = $('#dreamOpponentSelect');
  if (opponentSelect) opponentSelect.disabled = dreamConfig.opponentMode === 'ai-dream';
  if (opponentSelect && opponentSelect.children.length === 0) {
    opponentSelect.innerHTML = buildTeamOptionsHtml(dreamConfig.opponentId);
  }
  const oppTeam = getTeam(dreamConfig.opponentId);
  $('#dreamOpponentPreview').innerHTML = dreamConfig.opponentMode === 'ai-dream'
    ? '<b>Target:</b> AI Dream Team<br><small>Elite players drafted from the global database · adaptive opposition manager</small>'
    : `<b>Target:</b> ${escapeHtml(oppTeam.name)} (${oppTeam.fifa_rank ? 'FIFA Rank #' + oppTeam.fifa_rank : 'Club'})<br><small>Key Star: ${escapeHtml(oppTeam.max_card_player?.name || oppTeam.players?.[0]?.name || 'Captain')} · ${oppTeam.max_card_player?.ovr || 88} OVR</small>`;

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

  const is1v1Duel = activeModalTarget && (activeModalTarget.type === 'duelP1' || activeModalTarget.type === 'duelP2');
  const isTeamSlot = activeModalTarget && (activeModalTarget.type === 'duelU1' || activeModalTarget.type === 'duelU2');

  const filtered = ALL_PLAYERS_POOL.filter(p => {
    if (!is1v1Duel) {
      if (activeModalTarget.role === 'GK' && p.role !== 'GK') return false;
      if (activeModalTarget.role !== 'GK' && p.role === 'GK') return false;
    }

    // In Team vs Team mode, enforce distinct nations and no duplicate players across BOTH squads
    if (isTeamSlot) {
      const mySquad = activeModalTarget.type === 'duelU1' ? user1Squad : user2Squad;
      const otherSquad = activeModalTarget.type === 'duelU1' ? user2Squad : user1Squad;

      // 1. No repeat player in either team
      if (otherSquad.some(x => x && x.id === p.id)) return false;
      if (mySquad.some((x, i) => i !== activeModalTarget.index && x && x.id === p.id)) return false;

      // 2. Strict 1 player per nation in own team
      const currentNats = mySquad.map((x, i) => i === activeModalTarget.index ? null : x?.nat).filter(Boolean);
      if (currentNats.includes(p.nat)) return false;
    }

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

  if (activeModalTarget.type === 'duelP1') {
    if (chosen.id === duelP2.id) {
      toast('Player 1 and Player 2 cannot be the same footballer.');
      return;
    }
    duelP1 = chosen;
    $('#playerPickerModal').classList.remove('is-open');
    renderDuelMode();
    toast(`${chosen.name} selected as Player 1!`);
    return;
  }

  if (activeModalTarget.type === 'duelP2') {
    if (chosen.id === duelP1.id) {
      toast('Player 2 and Player 1 cannot be the same footballer.');
      return;
    }
    duelP2 = chosen;
    $('#playerPickerModal').classList.remove('is-open');
    renderDuelMode();
    toast(`${chosen.name} selected as Player 2!`);
    return;
  }

  if (activeModalTarget.type === 'duelU1') {
    // 1. Check duplicate player across both squads
    if (user2Squad.some(p => p && p.id === chosen.id)) {
      toast(`${chosen.name} is already drafted in User 2's squad. No duplicate players allowed across teams!`);
      return;
    }
    // 2. Check one player per nation
    const currentNats = user1Squad.map((p, i) => i === activeModalTarget.index ? null : p?.nat).filter(Boolean);
    if (currentNats.includes(chosen.nat)) {
      toast(`User 1 squad already has a player from ${chosen.nat}. Exactly one player per nation is allowed.`);
      return;
    }
    user1Squad[activeModalTarget.index] = { ...chosen };
    $('#playerPickerModal').classList.remove('is-open');
    handleDraftSlotFilled('u1', activeModalTarget.index);
    renderDuelMode();
    toast(`${chosen.name} (${chosen.nat}) selected for User 1!`);
    return;
  }

  if (activeModalTarget.type === 'duelU2') {
    // 1. Check duplicate player across both squads
    if (user1Squad.some(p => p && p.id === chosen.id)) {
      toast(`${chosen.name} is already drafted in User 1's squad. No duplicate players allowed across teams!`);
      return;
    }
    // 2. Check one player per nation
    const currentNats = user2Squad.map((p, i) => i === activeModalTarget.index ? null : p?.nat).filter(Boolean);
    if (currentNats.includes(chosen.nat)) {
      toast(`User 2 squad already has a player from ${chosen.nat}. Exactly one player per nation is allowed.`);
      return;
    }
    user2Squad[activeModalTarget.index] = { ...chosen };
    $('#playerPickerModal').classList.remove('is-open');
    handleDraftSlotFilled('u2', activeModalTarget.index);
    renderDuelMode();
    toast(`${chosen.name} (${chosen.nat}) selected for User 2!`);
    return;
  }

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

function draftAIDreamTeam() {
  const used = new Set();
  const pick = roles => {
    const player = ALL_PLAYERS_POOL.find(p => roles.includes(p.role) && !used.has(p.id));
    if (player) used.add(player.id);
    return player;
  };
  const slots = [['GK'], ['LB','RB','CB'], ['CB'], ['CB'], ['LB','RB','CB'], ['CDM','CM'], ['CM','CAM'], ['CM','CAM'], ['LW','RW','LM','RM'], ['ST'], ['RW','LW','ST']];
  const roles = ['GK','LB','CB','CB','RB','CDM','CM','CM','LW','ST','RW'];
  const starters = slots.map((slot, index) => ({ ...pick(slot), slotRole: roles[index] }));
  const bench = [['GK'], ['CB','LB','RB'], ['CDM','CM','CAM'], ['ST','LW','RW'], ['RW','LW','ST']].map(slot => ({ ...pick(slot) }));
  return { starters, bench };
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

  let awayId = dreamConfig.opponentId;
  let customAwayTeam = null;
  if (dreamConfig.opponentMode === 'ai-dream') {
    const aiDraft = draftAIDreamTeam();
    const aiPlayers = [...aiDraft.starters, ...aiDraft.bench];
    customAwayTeam = {
      id: 'ai_dream_team', name: 'AI Dream Team', short: 'AID', city: 'Global XI',
      primary: '#3f5d80', secondary: '#eef2f6', crest: 'AI', isCustom: true,
      players: aiPlayers.map((p, index) => ({ ...p, number: index + 1, overall: p.ovr, keeping: p.role === 'GK' ? p.ovr : 5 })),
      starting: aiDraft.starters.map(p => p.id), substitutes: aiDraft.bench.map(p => p.id)
    };
    registerCustomTeam(customAwayTeam);
    const existingAiIdx = TEAMS.findIndex(t => t.id === 'ai_dream_team');
    if (existingAiIdx >= 0) {
      TEAMS[existingAiIdx] = customAwayTeam;
    } else {
      TEAMS.unshift(customAwayTeam);
    }
    awayId = customAwayTeam.id;
  }

  registerCustomTeam(dreamTeamObj);
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
    awayId,
    customAwayTeam,
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

  showPage('matchday');
  scrollToSection('#matchday');
  running = true;
  accumulator = 0;
  updatePlayButton();
  sound.playWhistle(0.25);
  toast(`⚔️ Dream Team deployed & kicked off in a ${dreamConfig.formation} (${dreamConfig.style}) vs ${getTeam(awayId).name}!`);
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
  toast('Drafted a fresh legendary squad of Galácticos');
}

// ==========================================
// 2. Scouting & "All Players" Hub
// ==========================================
function renderScoutingHub() {
  const teamFilter = $('#scoutTeamFilter');
  if (teamFilter && teamFilter.children.length <= 1) {
    teamFilter.innerHTML = buildTeamOptionsHtml(null, true);
  }

  const query = $('#scoutSearchInput').value.trim().toLowerCase();
  const provFilter = $('#scoutProvenanceFilter')?.value || 'ALL';
  const roleCat = $('#scoutRoleFilter').value;
  const tier = $('#scoutTierFilter').value;
  const teamVal = $('#scoutTeamFilter').value;
  const sortKey = $('#scoutSortFilter').value;

  let pool = ALL_PLAYERS_POOL.filter(p => {
    if (provFilter !== 'ALL') {
      if (provFilter === 'verified' && p.isGenerated) return false;
      if (provFilter === 'legend' && p.playerType !== 'verified_legend') return false;
      if (provFilter === 'active' && (p.playerType !== 'verified_active' || p.isGenerated)) return false;
      if (provFilter === 'generated' && !p.isGenerated) return false;
    }
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
        <div style="display:flex;align-items:center;gap:6px;margin-top:4px;">
          <span class="scouting-card-badge">${escapeHtml(p.card || 'Elite')}</span>
          <span class="scouting-card-badge" style="background:${p.isGenerated ? 'rgba(255,255,255,0.06)' : 'rgba(212,175,55,0.18)'};color:${p.isGenerated ? '#888' : '#ffd700'};border-color:${p.isGenerated ? 'rgba(255,255,255,0.1)' : 'rgba(212,175,55,0.4)'};">${p.isGenerated ? '🛡️ Reserve' : (p.playerType === 'verified_legend' ? '⭐ Legend' : '⚽ Verified')}</span>
        </div>
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
  `).join('');

  if (pool.length === 0) {
    cardsHtml = `
      <div class="scout-empty-state">
        <div style="font-size:36px;margin-bottom:12px;">🔍</div>
        <h3 style="margin:0 0 8px;font-size:17px;font-weight:700;">No players match your active filters</h3>
        <p style="margin:0 0 18px;color:var(--text-sub, #666);font-size:13px;">Try clearing search keywords or resetting tier, position, or team filters.</p>
        <button type="button" class="secondary-button scout-reset-btn" id="scoutEmptyResetBtn" style="padding:9px 20px;font-size:13px;font-weight:600;cursor:pointer;">Reset All Filters ↻</button>
      </div>
    `;
  }

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

  const provLabel = p.isGenerated 
    ? 'PROVENANCE: GENERATED RESERVE' 
    : (p.playerType === 'verified_legend' ? 'PROVENANCE: VERIFIED HISTORIC LEGEND' : 'PROVENANCE: VERIFIED REAL FOOTBALLER');
  const provEl = $('#futCardProvenance');
  if (provEl) provEl.textContent = provLabel;

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
  let targetIndex = -1;
  if (p.role === 'GK') {
    targetIndex = 0;
  } else {
    targetIndex = dreamConfig.starters.findIndex((s, idx) => idx > 0 && s.role === p.role);
    if (targetIndex === -1) {
      targetIndex = 10;
    }
  }

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
  toast(`${p.name} drafted into your Dream Team XI`);
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
            <button class="primary-button" data-play-tournament="${m.id}" style="padding:6px 12px;font-size:11px;">Play matchday</button>
            <button class="secondary-button" data-sim-tournament="${m.id}" style="padding:6px 10px;font-size:11px;">Quick sim</button>
          </div>
        `;
      } else {
        actions = `
          <div class="bracket-match-actions">
            <button class="secondary-button" data-sim-tournament="${m.id}" style="padding:5px 8px;font-size:10px;">Simulate</button>
          </div>
        `;
      }
    }

    return `
      <div class="bracket-match-card ${isUser ? 'is-user' : ''} ${isChamp ? 'is-champion' : ''}">
        <div style="font-size:10px;font-weight:800;color:var(--muted);margin-bottom:6px;">${escapeHtml(m.round)} ${isUser ? '· YOUR FIXTURE' : ''}</div>
        <div class="bracket-team-row ${homeWon ? 'is-winner' : m.played ? 'is-loser' : ''}">
          <span style="display:inline-flex;align-items:center;gap:6px;">${getTeamBadgeSvg(home, 16, 17)} ${escapeHtml(home.name)}</span>
          ${m.played ? `<b>${m.score.home}</b>` : ''}
        </div>
        <div class="bracket-team-row ${awayWon ? 'is-winner' : m.played ? 'is-loser' : ''}">
          <span style="display:inline-flex;align-items:center;gap:6px;">${getTeamBadgeSvg(away, 16, 17)} ${escapeHtml(away.name)}</span>
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

  showPage('matchday');
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
// 4. 1v1 Player Duel & Team vs Team Mode
// ==========================================
let duelP1 = ALL_PLAYERS_POOL[0]; // Top rated (e.g. Messi)
let duelP2 = ALL_PLAYERS_POOL[1]; // Second top rated (e.g. Ronaldo)
let currentDuel = null;
let duelRunning = false;
let duelAccumulator = 0;
let duelReplay = null;

// Multi-user Team vs Team State (Turn-by-Turn Draft, Toss, Captains, 1 Player per Nation)
let user1Squad = [];
let user2Squad = [];
let user1Formation = '1-2-1';
let user2Formation = '1-2-1';
let user1CaptainId = null;
let user2CaptainId = null;

// Draft State Machine
let draftState = {
  active: false,
  tossWinner: null,      // 'u1' or 'u2'
  currentTurnUser: null, // 'u1' or 'u2'
  phase: 'TOSS',         // 'TOSS', 'FORMATION_PICK_1', 'FORMATION_PICK_2', 'PLAYER_DRAFT', 'CAPTAIN_PICK_1', 'CAPTAIN_PICK_2', 'READY'
  currentPickIndex: 0,   // Slot index being drafted (0..N-1)
  size: 5
};

function getAvailableFormations(size) {
  return size === 5 ? ['1-2-1', '2-1-1', '1-1-2'] : ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '5-3-2', '3-4-3'];
}

function resetTeamVsTeamDraft(mode = '5aside') {
  const size = mode === '5aside' ? 5 : 11;
  draftState = {
    active: true,
    tossWinner: null,
    currentTurnUser: null,
    phase: 'TOSS',
    currentPickIndex: 0,
    size
  };
  user1Formation = size === 5 ? '1-2-1' : '4-3-3';
  user2Formation = size === 5 ? '1-2-1' : '4-3-3';
  user1CaptainId = null;
  user2CaptainId = null;

  // Initialize placeholder empty squads matching the formation slots
  const u1Slots = FORMATIONS[user1Formation] || [];
  const u2Slots = FORMATIONS[user2Formation] || [];

  user1Squad = u1Slots.map(([role]) => ({
    id: null,
    name: 'Vacant Slot',
    role,
    nat: 'Unselected',
    ovr: 75,
    isVacant: true
  }));

  user2Squad = u2Slots.map(([role]) => ({
    id: null,
    name: 'Vacant Slot',
    role,
    nat: 'Unselected',
    ovr: 75,
    isVacant: true
  }));
}

function initDefaultUserSquads(mode = '5aside') {
  resetTeamVsTeamDraft(mode);
}

function handleCoinToss() {
  const disc = $('#coinDisc');
  if (disc) disc.classList.add('is-flipping');
  $('#flipCoinBtn').disabled = true;

  setTimeout(() => {
    if (disc) disc.classList.remove('is-flipping');
    const winner = Math.random() < 0.5 ? 'u1' : 'u2';
    draftState.tossWinner = winner;
    draftState.currentTurnUser = winner;
    draftState.phase = 'FORMATION_PICK_1';

    $('#draftTossTitle').textContent = `🎉 ${winner === 'u1' ? 'User 1' : 'User 2'} Won the Toss!`;
    $('#draftTossDesc').textContent = `${winner === 'u1' ? 'User 1' : 'User 2'} will pick formation first, followed by User ${winner === 'u1' ? '2' : '1'}, then pick players position by position.`;
    $('#draftTossActions').innerHTML = `<span style="font-size:12px;color:var(--color-accent);font-weight:800;">✓ Toss Decided</span>`;

    renderDraftTurnBanner();
    renderDuelMode();
    toast(`🪙 ${winner === 'u1' ? 'User 1' : 'User 2'} won the toss and chooses formation first!`);
  }, 900);
}

function handleFormationChosen(user, formation) {
  if (user === 'u1') user1Formation = formation;
  else user2Formation = formation;

  // Update slots to match chosen formation
  const slots = FORMATIONS[formation] || [];
  const targetSquad = user === 'u1' ? user1Squad : user2Squad;
  for (let i = 0; i < slots.length; i++) {
    if (targetSquad[i]?.isVacant) {
      targetSquad[i].role = slots[i][0];
    }
  }

  const otherUser = user === 'u1' ? 'u2' : 'u1';
  if (draftState.phase === 'FORMATION_PICK_1') {
    draftState.phase = 'FORMATION_PICK_2';
    draftState.currentTurnUser = otherUser;
  } else {
    // Both formations picked! Begin position-by-position player draft starting with toss winner
    draftState.phase = 'PLAYER_DRAFT';
    draftState.currentTurnUser = draftState.tossWinner;
    draftState.currentPickIndex = 0;
  }

  renderDraftTurnBanner();
  renderDuelMode();
  toast(`User ${user === 'u1' ? '1' : '2'} selected formation ${formation}!`);
}

function handleDraftSlotFilled(user, slotIndex) {
  // Check if all slots filled across both squads
  const u1Vacant = user1Squad.some(p => p.isVacant);
  const u2Vacant = user2Squad.some(p => p.isVacant);

  if (!u1Vacant && !u2Vacant) {
    // Both teams fully drafted! Proceed to Captain Selection
    draftState.phase = 'CAPTAIN_PICK_1';
    draftState.currentTurnUser = draftState.tossWinner;
    renderDraftTurnBanner();
    renderDuelMode();
    return;
  }

  // Strictly alternate turns between users: one player lock per turn
  const otherUser = user === 'u1' ? 'u2' : 'u1';
  draftState.currentTurnUser = otherUser;

  // Find the earliest vacant slot in the next user's squad to lock next
  const nextSquad = otherUser === 'u1' ? user1Squad : user2Squad;
  const nextVacantIndex = nextSquad.findIndex(p => p.isVacant);
  if (nextVacantIndex !== -1) {
    draftState.currentPickIndex = nextVacantIndex;
  }

  renderDraftTurnBanner();
  renderDuelMode();
}

function handleCaptainSelected(user, playerId) {
  if (user === 'u1') {
    user1CaptainId = playerId;
    const p = user1Squad.find(x => x.id === playerId);
    toast(`User 1 appointed ${p?.name} as Captain ©!`);
  } else {
    user2CaptainId = playerId;
    const p = user2Squad.find(x => x.id === playerId);
    toast(`User 2 appointed ${p?.name} as Captain ©!`);
  }

  const otherUser = user === 'u1' ? 'u2' : 'u1';
  if (draftState.phase === 'CAPTAIN_PICK_1') {
    draftState.phase = 'CAPTAIN_PICK_2';
    draftState.currentTurnUser = otherUser;
  } else {
    draftState.phase = 'READY';
    draftState.currentTurnUser = null;
    toast(`🏆 Both squads ready with formations, unique nationalities, and captains!`);
  }

  renderDraftTurnBanner();
  renderDuelMode();
}

function renderDraftTurnBanner() {
  const banner = $('#draftTurnBanner');
  if (!banner) return;

  if (!draftState.active || draftState.phase === 'TOSS') {
    banner.style.display = 'none';
    return;
  }

  banner.style.display = 'flex';
  const uLabel = draftState.currentTurnUser === 'u1' ? 'USER 1' : 'USER 2';
  $('#draftTurnBadge').textContent = `${uLabel}'S TURN`;

  const actionsContainer = $('#draftTurnActions');
  actionsContainer.innerHTML = '';

  if (draftState.phase === 'FORMATION_PICK_1' || draftState.phase === 'FORMATION_PICK_2') {
    $('#draftTurnAction').textContent = `${uLabel}: Select Formation`;
    $('#draftTurnSub').textContent = `Choose your team's tactical blueprint for the ${draftState.size}-a-side match.`;

    const forms = getAvailableFormations(draftState.size);
    actionsContainer.innerHTML = forms.map(f => `
      <button type="button" class="draft-formation-opt-btn" data-form="${f}">${f}</button>
    `).join('');
    return;
  }

  if (draftState.phase === 'PLAYER_DRAFT') {
    const activeSquad = draftState.currentTurnUser === 'u1' ? user1Squad : user2Squad;
    const targetSlot = activeSquad[draftState.currentPickIndex];
    const role = targetSlot ? targetSlot.role : 'Any';
    $('#draftTurnAction').textContent = `${uLabel}: Draft ${role} (Slot ${draftState.currentPickIndex + 1}/${draftState.size})`;
    $('#draftTurnSub').textContent = `Select your player. Must be a unique nation and not chosen by the other user.`;
    actionsContainer.innerHTML = `
      <button type="button" class="primary-button" id="draftOpenPickerBtn" style="padding:6px 14px;font-size:12px;">Open Player Scout 🔍</button>
    `;
    return;
  }

  if (draftState.phase === 'CAPTAIN_PICK_1' || draftState.phase === 'CAPTAIN_PICK_2') {
    $('#draftTurnAction').textContent = `${uLabel}: Select Team Captain ©`;
    $('#draftTurnSub').textContent = `Choose your on-field leader from your drafted squad.`;
    const squad = draftState.currentTurnUser === 'u1' ? user1Squad : user2Squad;
    actionsContainer.innerHTML = squad.map(p => `
      <button type="button" class="draft-formation-opt-btn" data-captain-id="${p.id}">© ${p.name.split(' ').pop()} (${p.ovr})</button>
    `).join('');
    return;
  }

  if (draftState.phase === 'READY') {
    $('#draftTurnBadge').textContent = 'DRAFT COMPLETE';
    $('#draftTurnAction').textContent = 'All Squads & Captains Ready!';
    $('#draftTurnSub').textContent = 'Press Kick Off below to launch the match in Match Centre.';
    actionsContainer.innerHTML = `
      <span style="font-size:12px;color:var(--color-accent);font-weight:800;">✓ Ready for Kick Off</span>
    `;
  }
}

function renderDuelMode() {
  const modeVal = $('#duelTypeSelect')?.value || 'attack_defence';
  const isTeamMode = modeVal.startsWith('team_');

  // Update mode quick tabs
  $$('.duel-tab-btn').forEach(btn => {
    const btnMode = btn.dataset.duelMode;
    if (btnMode === 'attack_defence') {
      btn.classList.toggle('is-active', !isTeamMode);
    } else {
      btn.classList.toggle('is-active', modeVal === btnMode);
    }
  });

  // Toggle visible sections depending on mode
  if (isTeamMode) {
    $('.duel-setup-grid').style.display = 'none';
    $('#duelComparisonCard').style.display = 'none';
    $('#duelTeamBuilderCard').style.display = 'block';

    const count = modeVal === 'team_5aside' ? 5 : 11;
    if (user1Squad.length !== count) {
      resetTeamVsTeamDraft(modeVal === 'team_5aside' ? '5aside' : '11aside');
    }

    $('#duelTeamModeBadge').textContent = `${count}-A-SIDE · TURN DRAFT · 1 PLAYER PER NATION`;
    $('#duelU1FormationBadge').textContent = `Formation: ${user1Formation}`;
    $('#duelU2FormationBadge').textContent = `Formation: ${user2Formation}`;

    // Render Captain indicators
    if (user1CaptainId) {
      const cap = user1Squad.find(p => p.id === user1CaptainId);
      $('#duelU1CaptainTag').style.display = 'block';
      $('#duelU1CaptainTag').textContent = `© Captain: ${cap ? cap.name : 'Selected'}`;
    } else {
      $('#duelU1CaptainTag').style.display = 'none';
    }

    if (user2CaptainId) {
      const cap = user2Squad.find(p => p.id === user2CaptainId);
      $('#duelU2CaptainTag').style.display = 'block';
      $('#duelU2CaptainTag').textContent = `© Captain: ${cap ? cap.name : 'Selected'}`;
    } else {
      $('#duelU2CaptainTag').style.display = 'none';
    }

    // Active column turn highlight
    $('#duelU1Column')?.classList.toggle('is-active-turn', draftState.currentTurnUser === 'u1');
    $('#duelU2Column')?.classList.toggle('is-active-turn', draftState.currentTurnUser === 'u2');

    const renderSquadSlots = (squad, gridId, userPrefix) => {
      const container = $(gridId);
      if (!container) return;
      const isMyTurn = draftState.active && draftState.currentTurnUser === userPrefix && draftState.phase === 'PLAYER_DRAFT';

      container.innerHTML = squad.map((p, idx) => {
        const isCurrentActiveSlot = isMyTurn && idx === draftState.currentPickIndex;
        // In turn draft mode, any slot that is not the currently active drafting slot for this user is locked
        const isSlotLocked = draftState.active && draftState.phase === 'PLAYER_DRAFT' && !isCurrentActiveSlot;
        const isCaptain = (userPrefix === 'u1' && user1CaptainId === p.id) || (userPrefix === 'u2' && user2CaptainId === p.id);
        const ovrVal = p.isVacant ? '--' : p.ovr;
        const nameVal = p.isVacant ? `Vacant Slot (${escapeHtml(p.role)})` : escapeHtml(p.name);
        let metaVal = p.isVacant ? 'Tap to draft' : `${escapeHtml(p.role)} · 🌍 ${escapeHtml(p.nat)}`;
        if (draftState.active && draftState.phase === 'PLAYER_DRAFT') {
          if (isCurrentActiveSlot) {
            metaVal = `⚡ Lock ${escapeHtml(p.role)} (Your Turn)`;
          } else if (p.isVacant) {
            metaVal = isMyTurn ? `Waiting (Slot ${idx + 1})` : `Opponent's Turn`;
          } else {
            metaVal = `🔒 Locked · ${escapeHtml(p.role)} (${escapeHtml(p.nat)})`;
          }
        }

        return `
          <div class="duel-squad-slot ${isCurrentActiveSlot ? 'is-active-slot' : ''} ${isSlotLocked ? 'is-locked-slot' : ''} ${isCaptain ? 'is-captain' : ''}" data-user="${userPrefix}" data-slot-index="${idx}">
            <span class="duel-slot-num">${idx === 0 ? 'GK' : idx + 1}</span>
            <div class="duel-slot-info">
              <strong>${nameVal}</strong>
              <span>${metaVal}</span>
            </div>
            <span class="duel-slot-ovr">${ovrVal}</span>
          </div>
        `;
      }).join('');
    };

    renderSquadSlots(user1Squad, '#duelU1SlotsGrid', 'u1');
    renderSquadSlots(user2Squad, '#duelU2SlotsGrid', 'u2');

    const u1Filled = user1Squad.filter(p => !p.isVacant);
    const u2Filled = user2Squad.filter(p => !p.isVacant);

    const u1Avg = u1Filled.length ? Math.round(u1Filled.reduce((a, b) => a + b.ovr, 0) / u1Filled.length) : 0;
    const u2Avg = u2Filled.length ? Math.round(u2Filled.reduce((a, b) => a + b.ovr, 0) / u2Filled.length) : 0;
    const u1Nats = new Set(u1Filled.map(p => p.nat)).size;
    const u2Nats = new Set(u2Filled.map(p => p.nat)).size;

    $('#duelU1Summary').textContent = `OVR: ${u1Avg || '--'} · ${u1Nats}/${count} Nations`;
    $('#duelU2Summary').textContent = `OVR: ${u2Avg || '--'} · ${u2Nats}/${count} Nations`;

    renderDraftTurnBanner();

    const isAllReady = draftState.phase === 'READY' || (!user1Squad.some(p => p.isVacant) && !user2Squad.some(p => p.isVacant));
    $('#startDuelBtn').textContent = isAllReady ? `▶ Kick Off ${count}v${count} Match` : `⏳ Draft in Progress (${u1Filled.length + u2Filled.length}/${count * 2})`;
    $('#startDuelBtn').disabled = !isAllReady;
    return;
  }

  // 1v1 Mode
  $('.duel-setup-grid').style.display = 'grid';
  $('#duelComparisonCard').style.display = 'block';
  $('#duelTeamBuilderCard').style.display = 'none';
  $('#startDuelBtn').textContent = '▶ Start Duel';

  if (!duelP1 || !duelP2) return;

  const renderCard = (p, elId) => {
    const el = $(elId);
    if (!el) return;
    el.innerHTML = `
      <div class="duel-player-ovr-circle">${p.ovr}</div>
      <div class="duel-player-meta">
        <h4>${escapeHtml(p.name)}</h4>
        <span>${escapeHtml(p.role)} · ${escapeHtml(p.club || p.teamName || 'Elite')} (${escapeHtml(p.nat || 'World')})</span>
      </div>
    `;
  };

  renderCard(duelP1, '#duelP1Preview');
  renderCard(duelP2, '#duelP2Preview');

  $('#duelMatchupHeadline').textContent = `${duelP1.name} vs ${duelP2.name}`;

  // Attribute Matrix
  const attrs = [
    { label: 'Overall (OVR)', k1: duelP1.ovr, k2: duelP2.ovr },
    { label: 'Pace (PAC)', k1: duelP1.pace, k2: duelP2.pace },
    { label: 'Shooting (SHO)', k1: duelP1.shooting, k2: duelP2.shooting },
    { label: 'Passing (PAS)', k1: duelP1.passing, k2: duelP2.passing },
    { label: 'Dribbling (DRI)', k1: duelP1.dribbling, k2: duelP2.dribbling },
    { label: 'Defending (DEF)', k1: duelP1.defending, k2: duelP2.defending },
    { label: 'Physicality (PHY)', k1: duelP1.physical, k2: duelP2.physical }
  ];

  if (duelP1.role === 'GK' || duelP2.role === 'GK') {
    attrs.push({ label: 'Goalkeeping (GKP)', k1: duelP1.keeping || 5, k2: duelP2.keeping || 5 });
  }

  $('#duelComparisonGrid').innerHTML = attrs.map(a => {
    const p1Lead = a.k1 > a.k2;
    const p2Lead = a.k2 > a.k1;
    return `
      <div class="duel-stat-row">
        <span class="duel-stat-val ${p1Lead ? 'is-lead' : ''}">${a.k1}</span>
        <div class="duel-stat-bars">
          <div class="duel-stat-bar-track left"><span style="width:${Math.min(100, a.k1)}%"></span></div>
          <span class="duel-stat-label">${a.label}</span>
          <div class="duel-stat-bar-track right"><span style="width:${Math.min(100, a.k2)}%"></span></div>
        </div>
        <span class="duel-stat-val ${p2Lead ? 'is-lead' : ''}">${a.k2}</span>
      </div>
    `;
  }).join('');
}

function startDuelMatch() {
  const duelType = $('#duelTypeSelect').value;

  if (duelType.startsWith('team_')) {
    deployUserTeamMatch(duelType);
    return;
  }

  const rounds = parseInt($('#duelRoundsSelect').value, 10) || 5;

  currentDuel = createPlayerDuel(duelP1, duelP2, duelType, rounds);
  duelRunning = true;
  duelAccumulator = 0;

  $('#duelArenaCard').style.display = 'block';
  $('#duelResultCard').style.display = 'none';
  $('#duelArenaP1Name').textContent = duelP1.name;
  $('#duelArenaP2Name').textContent = duelP2.name;
  $('#duelPlayPauseBtn').textContent = '⏸';

  updateDuelDisplay();
  scrollToSection('#duelArenaCard');
  toast(`⚔️ 1v1 Duel started! ${duelP1.name} vs ${duelP2.name} in ${duelType.replace('_', ' ').toUpperCase()} challenge!`);
}

function deployUserTeamMatch(duelType) {
  stop();
  const count = duelType === 'team_5aside' ? 5 : 11;
  const formation1 = user1Formation || (count === 5 ? '1-2-1' : '4-3-3');
  const formation2 = user2Formation || (count === 5 ? '1-2-1' : '4-3-3');

  // Strict validation: one player per nation
  const u1Nats = user1Squad.map(p => p.nat);
  const u2Nats = user2Squad.map(p => p.nat);

  if (new Set(u1Nats).size !== count) {
    toast(`User 1 must select exactly one player per nation (${new Set(u1Nats).size}/${count} unique).`);
    return;
  }
  if (new Set(u2Nats).size !== count) {
    toast(`User 2 must select exactly one player per nation (${new Set(u2Nats).size}/${count} unique).`);
    return;
  }

  // Cross-team uniqueness validation
  const allIds = [...user1Squad.map(p => p.id), ...user2Squad.map(p => p.id)];
  if (new Set(allIds).size !== count * 2) {
    toast(`No duplicate players allowed across teams! A player can only be selected in one squad.`);
    return;
  }

  // Captains default if not chosen
  const u1Cap = user1CaptainId || user1Squad[0].id;
  const u2Cap = user2CaptainId || user2Squad[0].id;

  const user1Team = {
    id: 'user1_xi',
    name: 'User 1 FC',
    short: 'U1',
    city: 'All-Nations',
    primary: '#d8ff69',
    secondary: '#17241e',
    crest: '1',
    captainId: u1Cap,
    isCustom: true,
    players: user1Squad.map((p, idx) => ({
      ...p,
      number: idx + 1,
      overall: p.ovr,
      ovr: p.ovr,
      isCaptain: p.id === u1Cap,
      keeping: p.role === 'GK' ? p.ovr : 5
    })),
    starting: user1Squad.map(p => p.id),
    substitutes: []
  };

  const user2Team = {
    id: 'user2_xi',
    name: 'User 2 FC',
    short: 'U2',
    city: 'All-Nations',
    primary: '#92C8F0',
    secondary: '#171B21',
    crest: '2',
    captainId: u2Cap,
    isCustom: true,
    players: user2Squad.map((p, idx) => ({
      ...p,
      number: idx + 1,
      overall: p.ovr,
      ovr: p.ovr,
      isCaptain: p.id === u2Cap,
      keeping: p.role === 'GK' ? p.ovr : 5
    })),
    starting: user2Squad.map(p => p.id),
    substitutes: []
  };

  registerCustomTeam(user1Team);
  registerCustomTeam(user2Team);

  match = createMatch({
    customHomeTeam: user1Team,
    homeId: user1Team.id,
    awayId: user2Team.id,
    customAwayTeam: user2Team,
    seed: `TEAM-VS-${count}-${Math.floor(Math.random() * 90000)}`,
    formation: formation1,
    awayFormation: formation2,
    homeLineup: user1Team.starting,
    awayLineup: user2Team.starting
  });

  renderSelects();
  persistPrefs();
  render();

  showPage('matchday');
  scrollToSection('#matchday');
  running = true;
  accumulator = 0;
  updatePlayButton();
  sound.playWhistle(0.25);
  toast(`⚔️ User 1 FC vs User 2 FC (${count}-a-side) kicked off! Formations: ${formation1} vs ${formation2}.`);
}

function updateDuelDisplay() {
  if (!currentDuel) return;
  $('#duelArenaScore').textContent = `${currentDuel.score[duelP1.id]} - ${currentDuel.score[duelP2.id]}`;
  $('#duelRoundText').textContent = `ROUND ${Math.min(currentDuel.currentRound + 1, currentDuel.totalRounds)} of ${currentDuel.totalRounds}`;
  $('#duelPhasePill').textContent = currentDuel.isComplete ? 'FULL TIME' : (currentDuel.state?.phase || 'LIVE').toUpperCase();
  
  const lastEvent = currentDuel.events.at(-1);
  if (lastEvent) {
    $('#duelTickerText').textContent = lastEvent.text;
  }

  const canvas = $('#duelPitchCanvas');
  if (canvas) renderDuelPitch(canvas, currentDuel);

  if (currentDuel.isComplete) {
    showDuelResults();
  }
}

function showDuelResults() {
  duelRunning = false;
  $('#duelPlayPauseBtn').textContent = '▶';
  $('#duelResultCard').style.display = 'block';

  const p1Score = currentDuel.score[duelP1.id];
  const p2Score = currentDuel.score[duelP2.id];
  const winner = currentDuel.winner;

  $('#duelWinnerHeadline').textContent = `${winner ? winner.name : 'Stalemate'} ${winner ? 'Triumphs!' : 'Draw!'}`;
  $('#duelResultSummary').textContent = `Final Score: ${duelP1.name} ${p1Score} - ${p2Score} ${duelP2.name} across ${currentDuel.roundHistory.length} simulated rounds`;

  const p1Stats = currentDuel.stats[duelP1.id];
  const p2Stats = currentDuel.stats[duelP2.id];

  $('#duelResultStatsTable').innerHTML = `
    <div class="duel-table-header">
      <span>${escapeHtml(duelP1.name)}</span>
      <span>METRIC</span>
      <span>${escapeHtml(duelP2.name)}</span>
    </div>
    <div class="duel-table-row"><b>${p1Score}</b><span>Points Won</span><b>${p2Score}</b></div>
    <div class="duel-table-row"><b>${p1Stats.goals}</b><span>Goals Scored</span><b>${p2Stats.goals}</b></div>
    <div class="duel-table-row"><b>${p1Stats.dribbles}</b><span>Successful Take-ons</span><b>${p2Stats.dribbles}</b></div>
    <div class="duel-table-row"><b>${p1Stats.tackles}</b><span>Defensive Stops</span><b>${p2Stats.tackles}</b></div>
    <div class="duel-table-row"><b>${p1Stats.shots}</b><span>Total Shots</span><b>${p2Stats.shots}</b></div>
  `;
}

function saveDuelToVault() {
  if (!currentDuel) return;
  const snapshot = JSON.parse(JSON.stringify(currentDuel));
  const id = `${snapshot.seed}-${Date.now()}`;
  const vaultItem = {
    id,
    savedAt: new Date().toISOString(),
    isDuel: true,
    duel: snapshot
  };
  vault = [vaultItem, ...vault].slice(0, 12);
  try {
    localStorage.setItem(STORAGE, JSON.stringify(vault));
    renderVault();
    toast('1v1 Player Duel recorded and saved to Vault!');
  } catch (err) {
    toast('Vault storage full.');
  }
}

// ==========================================
// 5. Core Matchday Engine & Replay
// ==========================================
let vault=loadVault();

function loadVault(){try{const v=JSON.parse(localStorage.getItem(STORAGE)||'[]');return Array.isArray(v)?v.filter(item=>item?.match?.frames && item?.id).slice(0,12):[]}catch{return []}}
function persistPrefs(){if(replay)return;try{localStorage.setItem(PREFS,JSON.stringify({homeId:match.homeId,awayId:match.awayId,seed:match.seed,formation:match.formations.home,tactics:match.tactics.home}))}catch{}}
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('visible'),2500)}
function showPage(pageId){
  const norm=pageId.startsWith('page-')?pageId:`page-${pageId}`;
  const targetPage=$('#'+norm)||$('#page-matchday');
  $$('.page').forEach(p=>p.classList.toggle('is-active',p===targetPage));
  const activeSection=norm.replace('page-','');
  $$('.nav-link').forEach(btn=>{
    btn.classList.toggle('is-active',btn.dataset.section===activeSection);
  });
  window.scrollTo({top:0,behavior:'instant'});
  try{
    if(history.replaceState){
      history.replaceState(null,'','#'+activeSection);
    }
  }catch{}
}
function scrollToSection(elemOrId){
  const el=typeof elemOrId==='string'?$(elemOrId.startsWith('#')?elemOrId:'#'+elemOrId):elemOrId;
  if(!el)return;
  const top=el.getBoundingClientRect().top+window.pageYOffset-84;
  window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
}
function stop(){running=false;accumulator=0;updatePlayButton()}
function updatePlayButton(){
  const isLast=replay?replay.index>=replay.source.frames.length-1:match.phase==='FULL_TIME';
  $('#playBtn').disabled=isLast;
  $('#stepBtn').disabled=isLast;
  $('#fullTimeBtn').disabled=isLast;
  $('#playText').textContent=isLast?'Full-time':running?'Pause':replay?'Play replay':match.minute?'Resume':'Kick off';
  $('#playGlyph').setAttribute('d',running?'M6 5h4v14H6zm8 0h4v14h-4z':'M8 5v14l11-7z');
}

function showPauseBanner(icon, title, sub, btnText) {
  const banner = $('#matchPauseBanner');
  if (!banner) return;
  const iconEl = $('#pauseBannerIcon');
  const titleEl = $('#pauseBannerTitle');
  const subEl = $('#pauseBannerSub');
  const btnEl = $('#pauseResumeBtn');
  if (iconEl) iconEl.textContent = icon;
  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = sub;
  if (btnEl) btnEl.textContent = btnText;
  banner.style.display = 'block';
}

function hidePauseBanner() {
  const banner = $('#matchPauseBanner');
  if (banner) banner.style.display = 'none';
}

function renderSelects(){
  const home=$('#homeSelect'),away=$('#awaySelect');
  if (!home || !away) return;
  home.innerHTML = buildTeamOptionsHtml(match.homeId, false, teamFilterQuery);
  away.innerHTML = buildTeamOptionsHtml(match.awayId, false, teamFilterQuery);
  home.value=match.homeId;
  away.value=match.awayId;
  $('#seedInput').value=match.seed;
}

function startMatch(){
  stop();replay=null;selectedStarter=null;
  hidePauseBanner();
  matchEffects.clear();
  matchEffects.resetSeen();
  const homeId=$('#homeSelect').value;
  let awayId=$('#awaySelect').value;
  if(homeId===awayId) awayId=TEAMS.find(t=>t.id!==homeId)?.id??'club_man_city';
  const seed=`MATCH-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random()*9000+1000)}`;
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
  $('#homeCrest').innerHTML=getTeamBadgeSvg(home, 66, 71);
  $('#awayCrest').innerHTML=getTeamBadgeSvg(away, 66, 71);
  $('#homeCrest').style.background='transparent';
  $('#awayCrest').style.background='transparent';
  $('#homeName').textContent=home.name || 'Home Team';
  $('#awayName').textContent=away.name || 'Away Team';
  $('#homeCity').textContent=(home.city || home.official_name || home.name || '').toUpperCase();
  $('#awayCity').textContent=(away.city || away.official_name || away.name || '').toUpperCase();
  $('#homeScore').textContent=match.score.home;
  $('#awayScore').textContent=match.score.away;

  $('#fixtureLabel').textContent=`${match.knockout ? 'KNOCKOUT CUP' : 'EXHIBITION'} / ${(home.short || 'HOM')} VS ${(away.short || 'AWY')}`;
  
  // Render Goalscorers under respective teams
  const goalEvents = (match.events || []).filter(e => e.type === 'goal');
  const homeGoals = goalEvents.filter(e => e.side === 'home');
  const awayGoals = goalEvents.filter(e => e.side === 'away');

  const formatScorer = e => {
    let name = 'Scorer';
    if (e.playerId) {
      const p = getPlayer(getTeam(e.side === 'home' ? match.homeId : match.awayId), e.playerId);
      if (p) name = p.name;
    }
    if (name === 'Scorer' && e.text) {
      const matchName = e.text.match(/^([^!]+?)\s+(?:finds the net|calmly converts)/i) || e.text.match(/⚽\s*(?:PENALTY!\s*)?([^!]+?)\s+(?:finds|calmly)/i);
      if (matchName) name = matchName[1].replace(/^⚽\s*/, '').trim();
      else name = e.text.split(' ')[0];
    }
    const pen = e.isPenalty ? ' (P)' : '';
    return `<div class="scorer-item"><span class="scorer-ball">⚽</span> <span>${escapeHtml(name)}</span><span class="scorer-min">${e.minute}′${pen}</span></div>`;
  };

  const homeScorersEl = $('#homeScorers');
  if (homeScorersEl) {
    homeScorersEl.innerHTML = homeGoals.map(formatScorer).join('');
  }
  const awayScorersEl = $('#awayScorers');
  if (awayScorersEl) {
    awayScorersEl.innerHTML = awayGoals.map(formatScorer).join('');
  }

  // Display clock minute with added injury time indicator if stoppage is active
  let minuteDisplay = String(match.minute).padStart(2,'0');
  let clockHalfText = match.minute<46?'FIRST HALF':match.minute<91?'SECOND HALF':match.minute<=105?'ET 1ST HALF':'ET 2ND HALF';

  const extra1 = match.injuryTime?.firstHalf || 2;
  const extra2 = match.injuryTime?.secondHalf || 4;

  if (match.minute === 44 || match.minute === 45) {
    minuteDisplay = `45+${match.minute === 44 ? 1 : extra1}`;
    clockHalfText = `1ST HALF (+${extra1}′ ET)`;
  } else if (match.minute >= 89 && match.minute <= 90 && !match.knockout) {
    minuteDisplay = `90+${match.minute === 89 ? 1 : extra2}`;
    clockHalfText = `2ND HALF (+${extra2}′ ET)`;
  }

  $('#matchMinute').textContent=minuteDisplay;
  $('#clockHalf').textContent=clockHalfText;
  $('#matchState').textContent=replay?'REPLAY':match.phase==='PRE_MATCH'?'PRE-MATCH':match.phase==='HALF_TIME'?'HALF-TIME':match.phase==='EXTRA_TIME'?'EXTRA-TIME':match.phase==='PENALTIES'?'PENALTIES':match.phase==='FULL_TIME'?'FULL-TIME':'LIVE';
  $('#liveIndicator').textContent=replay?'REPLAY':match.phase==='FULL_TIME'?'FINAL':running?'ON AIR':'READY';
  $('#liveIndicator').classList.toggle('is-live',running);
  $('#pitchStatus').textContent=`${home.short || 'HOM'} vs ${away.short || 'AWY'}`;
  $('#pitchPossession').textContent=`${(getTeam(match.possession==='home'?match.homeId:match.awayId).short || 'POS')} IN POSSESSION`;

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
  const indicator = $('#squadTeamIndicator');
  if (indicator) {
    indicator.textContent = `Tactical roster for ${team.name} · Inspect ratings, monitor stamina, and make substitutions.`;
  }

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
  $('#homeLegendDot').style.background='var(--color-accent)';$('#homeLegendDot').style.border='none';
  $('#awayLegendDot').style.background='#92C8F0';$('#awayLegendDot').style.border='none';
  $('#flowHomeName').textContent=(home.name || '').toUpperCase();$('#flowAwayName').textContent=(away.name || '').toUpperCase();
  const maxMins = (match.knockout || (replay && replay.source.knockout)) ? 120 : 90;
  const frames=match.frames.slice(0,match.minute+1);const w=640,h=139,x0=43,y0=17;
  const mx=Math.max(1,...frames.flatMap(f=>[f.stats.home.xg,f.stats.away.xg]));const yMax=Math.ceil(mx*2)/2;
  const px=m=>x0+(m/maxMins)*w,py=v=>y0+h-(v/yMax)*h;
  let svg='';
  for(let i=0;i<=4;i++){let val=yMax*i/4,y=py(val);svg+=`<line x1="43" y1="${y}" x2="683" y2="${y}" stroke="var(--color-border)" stroke-width="1" stroke-dasharray="3 5"/><text x="35" y="${y+3}" text-anchor="end" fill="var(--color-text-muted)" font-family="var(--font-interface)" font-size="9" font-weight="700">${val.toFixed(1)}</text>`;}
  const step = maxMins > 90 ? 20 : 15;
  for(let i=0;i<=maxMins;i+=step){svg+=`<text x="${px(i)}" y="179" text-anchor="middle" fill="var(--color-text-muted)" font-family="var(--font-interface)" font-size="9" font-weight="700">${i}′</text>`;}
  for(const [side,color] of [['home','var(--color-accent)'],['away','#92C8F0']]){
    const pts=frames.map(f=>`${px(f.minute)},${py(f.stats[side].xg)}`).join(' ');
    svg+=`<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    const last=frames.at(-1);if(last)svg+=`<circle cx="${px(last.minute)}" cy="${py(last.stats[side].xg)}" r="4" fill="${color}" stroke="var(--color-bg)" stroke-width="2"/>`;
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
  if(!vault.length){container.innerHTML='<div class="empty-vault">No saved fixtures yet. Play a match or 1v1 duel and hit “Save”.</div>';return;}
  container.innerHTML=vault.map(item=>{
    if (item.isDuel && item.duel) {
      const d = item.duel;
      return `<article class="vault-match"><div class="vault-match-top"><span>1v1 DUEL · ${escapeHtml(new Date(item.savedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase())}</span><span>${d.isComplete ? 'FULL TIME' : 'SAVED'}</span></div><div class="vault-score">${escapeHtml(d.p1.name.split(' ').pop())} ${d.score[d.p1.id]}<span>:</span>${d.score[d.p2.id]} ${escapeHtml(d.p2.name.split(' ').pop())}</div><div class="vault-sub">${escapeHtml(d.duelType.toUpperCase())} · ${d.frames.length} frames</div><div class="vault-match-actions"><button data-replay="${escapeHtml(item.id)}">↻ Replay</button><button data-export="${escapeHtml(item.id)}">↓ Export JSON</button><button data-delete="${escapeHtml(item.id)}">✕</button></div></article>`;
    }
    const m=item.match;
    if (!m) return '';
    const h=getTeam(m.homeId),a=getTeam(m.awayId);
    return `<article class="vault-match"><div class="vault-match-top"><span>${escapeHtml(new Date(item.savedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase())}</span><span>${m.minute===90?'FULL TIME':`${m.minute}′ SAVED`}</span></div><div class="vault-score">${h.short} ${m.score.home}<span>:</span>${m.score.away} ${a.short}</div><div class="vault-sub">${escapeHtml(m.seed)} · ${m.frames.length} frames</div><div class="vault-match-actions"><button data-replay="${escapeHtml(item.id)}">↻ Replay</button><button data-export="${escapeHtml(item.id)}">↓ Export JSON</button><button data-delete="${escapeHtml(item.id)}">✕</button></div></article>`;
  }).join('');
}

function renderLineupBoards(){
  const board=(side)=>{
    const team=getTeam(side==='home'?match.homeId:match.awayId);
    const lineup=match.lineups?.[side] || team.starting || [];
    const starterRows=lineup.map((id,i)=>{
      const p=getPlayer(team,id); if(!p)return '';
      const stamina=Math.round(match.stamina?.[id] ?? 100);
      return `<div class="lineup-row"><span class="lineup-number">${p.number || i+1}</span><span class="lineup-player" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span><span class="lineup-role">${escapeHtml(p.role || '')} · ${stamina}%</span></div>`;
    }).join('');
    const bench=(team.players||[]).filter(p=>!lineup.includes(p.id)).slice(0,5).map((p,i)=>`<div class="lineup-row is-bench"><span class="lineup-number">${p.number || i+12}</span><span class="lineup-player" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</span><span class="lineup-role">${escapeHtml(p.role || '')}</span></div>`).join('');
    return `<div class="lineup-board-head"><div><div class="lineup-board-kicker">${side==='home'?'USER XI':'OPPOSITION XI'}</div><h3>${escapeHtml(team.name)}</h3></div><span class="lineup-board-meta">${match.formations?.[side] || 'XI'}</span></div><div class="lineup-list">${starterRows}</div><div class="lineup-divider">SUBSTITUTES · ${Math.max(0,5-(match.substitutionsUsed||0))} CHANGES LEFT</div><div class="lineup-list">${bench}</div>`;
  };
  const homeBoard=$('#homeLineupBoard'),awayBoard=$('#awayLineupBoard');
  if(homeBoard)homeBoard.innerHTML=board('home');
  if(awayBoard)awayBoard.innerHTML=board('away');
  const alert=$('#quickSubAlert');
  if(alert){
    const tired=[];
    for(const side of ['home','away']) for(const id of (match.lineups?.[side]||[])) if((match.stamina?.[id]??100)<=42){const p=getPlayer(getTeam(side==='home'?match.homeId:match.awayId),id);if(p)tired.push({name:p.name,energy:Math.round(match.stamina?.[id]??42)})}
    const shouldShow=match.minute>0 && match.phase!=='FULL_TIME' && tired.length>0 && (match.substitutionsUsed||0)<5;
    alert.classList.toggle('is-visible',shouldShow);
    if(shouldShow) $('#quickSubText').textContent=`${tired[0].name} is at ${tired[0].energy}% energy. Open Squad Lab to make a change.`;
  }
}

function render(){
  renderScoreboard();
  renderStats();
  renderFeed();
  renderFlow();
  renderFormation();
  renderTactics();
  renderSquad();
  renderLineupBoards();
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
    const prior = match.events.length;
    replay.index++;
    match=matchFromFrame(replay.source,replay.index);
    if(replay.index>=replay.source.frames.length-1)stop();
    const nextEvents = match.events.slice(prior);
    matchEffects.processEvents(match, nextEvents, { speed, running, replay: true });
    render();
    return;
  }

  const prior=match.events.length;
  const priorScore = { home: match.score.home, away: match.score.away };
  advanceMinute(match);
  persistPrefs();
  const nextEvents=match.events.slice(prior);

  // Process cinematic broadcast graphics
  matchEffects.processEvents(match, nextEvents, { speed, running, replay: false });

  const goal=nextEvents.find(e=>e.type==='goal');
  if(goal){
    flashGoal(goal);
    const scorerName = goal.detail?.scorer || 'Goal';
    toast(`⚽ GOAL! ${scorerName} (${goal.minute}′)`);
  } else {
    const shot=nextEvents.find(e=>e.type==='shot'||e.type==='save');
    if(shot && !nextEvents.some(e => e.isPenalty || e.xg >= 0.22)) sound.playKick();
  }

  if(match.minute===45 && match.phase==='HALF_TIME'){
    toast('🗣️ Half-time reached! Tactical interval.');
  }

  if(match.phase==='FULL_TIME'){
    stop();
    saveVault(true);

    if (activeTournamentMatchId && currentTournament) {
      recordTournamentResult(currentTournament, activeTournamentMatchId, match);
      activeTournamentMatchId = null;
      renderTournament();
      toast('Tournament match completed and recorded into bracket');
    } else {
      toast('Full time. Match recorded in replay vault.');
    }
  }
  render();
}

function flashGoal(e){
  const el=$('#goalFlash');
  const scoringTeam = getTeam(e.side==='home'?match.homeId:match.awayId);
  $('#goalFlashWho').textContent=(scoringTeam.name || '').toUpperCase();
  el.classList.add('visible');
  clearTimeout(goalTimeout);
  goalTimeout=setTimeout(()=>el.classList.remove('visible'),1400);
}

function startReplay(item){
  stop();
  hidePauseBanner();
  matchEffects.clear();
  matchEffects.resetSeen();
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
    if(running) hidePauseBanner();
    if(running && match.minute===0) sound.playWhistle(0.25);
    accumulator=0;
    updatePlayButton();
  });

  $('#pauseResumeBtn')?.addEventListener('click', () => {
    hidePauseBanner();
    if (match.phase === 'FULL_TIME' && !replay) return;
    running = true;
    accumulator = 0;
    updatePlayButton();
  });

  $('#stepBtn').addEventListener('click',()=>{
    if(match.phase==='FULL_TIME'&&!replay) return;
    hidePauseBanner();
    stop();
    newTick();
  });

  $('#quickSubBtn')?.addEventListener('click',()=>{
    showPage('squad-lab');
    scrollToSection('#squad-lab');
    toast('Squad Lab opened — select a tired starter, then choose a substitute.');
  });

  $('#fullTimeBtn').addEventListener('click',()=>{
    hidePauseBanner();
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
      toast('Tournament match completed and recorded into bracket');
    }
    render();
    toast('Full time simulated. Result stored in vault.');
  });

  $('#newMatchBtn').addEventListener('click',startMatch);

  // Timeline scrub seeking for replays and match review
  $('#timelineTrack')?.addEventListener('click', e => {
    if (!replay && match.phase !== 'FULL_TIME') return;
    matchEffects.clear();
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

  $('#teamFilterInput')?.addEventListener('input', e => {
    teamFilterQuery = e.target.value.trim();
    const clearBtn = $('#teamFilterClearBtn');
    if (clearBtn) clearBtn.style.display = teamFilterQuery ? 'block' : 'none';
    renderSelects();
  });

  $('#teamFilterClearBtn')?.addEventListener('click', () => {
    teamFilterQuery = '';
    const input = $('#teamFilterInput');
    if (input) input.value = '';
    const clearBtn = $('#teamFilterClearBtn');
    if (clearBtn) clearBtn.style.display = 'none';
    renderSelects();
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
      toast(`Substitution: ${incoming ? incoming.name : 'Substitute'} enters the pitch!`);
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
    matchEffects.setSpeed(speed);
    $$('.speed-button').forEach(x=>x.classList.toggle('is-active',x===b));
  }));

  matchEffects.setContainer($('#broadcastGraphicsOverlay'));
  updatePresentationModeUi();

  $('#presentationModeBtn')?.addEventListener('click', () => {
    const next = matchEffects.toggleMode();
    updatePresentationModeUi();
    toast(next === 'broadcast' ? '📺 Broadcast Mode: Cinematic presentation & hold' : '⚡ Continuous Mode: Non-stop match flow');
  });

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

    // Security guard: Limit file size to 10MB to prevent browser lockup
    if (file.size > 10 * 1024 * 1024) {
      toast('File exceeds maximum replay size limit (10MB).');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const rawText = ev.target.result;
        // Security guard: Reject prototype pollution patterns in raw JSON string
        if (rawText.includes('__proto__') || rawText.includes('constructor') || rawText.includes('prototype')) {
          toast('Security violation: Replay file contains forbidden keys.');
          return;
        }

        const data = JSON.parse(rawText);
        const targetMatch = data.match || data;
        if (!targetMatch.frames || !Array.isArray(targetMatch.frames) || !targetMatch.score || !targetMatch.seed) {
          toast('Invalid replay format: missing frames, score, or seed.');
          return;
        }

        // Schema validation: Verify frames integrity and boundaries
        if (targetMatch.frames.length < 1 || targetMatch.frames.length > 250) {
          toast('Invalid replay: frame count out of allowable match bounds.');
          return;
        }

        const id = `${String(targetMatch.seed).replace(/[^a-zA-Z0-9_-]/g, '')}-${Date.now()}`;
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
      if (item.isDuel && item.duel) {
        currentDuel = JSON.parse(JSON.stringify(item.duel));
        duelP1 = currentDuel.p1;
        duelP2 = currentDuel.p2;
        showPage('duel');
        $('#duelArenaCard').style.display = 'block';
        $('#duelResultCard').style.display = 'block';
        updateDuelDisplay();
        showDuelResults();
        toast('Duel replay loaded from Vault!');
        return;
      }
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
      toast(isNowOn ? 'Stadium audio enabled' : 'Audio muted');
  });

  const musicPlayBtn = $('#musicPlayBtn');
  const musicTrackSelect = $('#musicTrackSelect');
  const musicVolume = $('#musicVolume');
  if (musicPlayBtn && musicTrackSelect && musicVolume) {
    musicTrackSelect.innerHTML = musicPlayer.tracks.map(([title], index) => `<option value="${index}">${escapeHtml(title)}</option>`).join('');
    musicTrackSelect.value = String(musicPlayer.index);
    musicVolume.value = String(Number(localStorage.getItem('touchline_music_volume') ?? 0.45));
    const updateMusicButton = () => {
      musicPlayBtn.textContent = musicPlayer.playing ? '⏸ Pause' : '▶ Play';
      musicPlayBtn.classList.toggle('is-playing', musicPlayer.playing);
    };
    musicPlayBtn.addEventListener('click', () => { musicPlayer.toggle(); updateMusicButton(); });
    musicTrackSelect.addEventListener('change', e => { musicPlayer.setTrack(e.target.value); updateMusicButton(); });
    musicVolume.addEventListener('input', e => musicPlayer.setVolume(e.target.value));
    updateMusicButton();
  }

  // Navigation Links & Multi-Page View Switcher
  $$('.nav-link').forEach(b => b.addEventListener('click', () => {
    const section = b.dataset.section;
    const targetPageId = b.dataset.page ? b.dataset.page.replace('page-', '') : section;
    showPage(targetPageId);
    $$('.nav-link').forEach(x => x.classList.toggle('is-active', x === b));
  }));

  $('.brand')?.addEventListener('click', (e) => {
    e.preventDefault();
    showPage('matchday');
  });

  // Cross-page shortcuts
  $('#openSquadLabBtn')?.addEventListener('click', () => {
    showPage('squad');
  });
  $('#squadGoToMatchBtn')?.addEventListener('click', () => {
    showPage('matchday');
  });
  $('#squadDeployBottomBtn')?.addEventListener('click', () => {
    showPage('matchday');
    toast('Tactics & squad applied to matchday pitch!');
  });

  window.addEventListener('hashchange', () => {
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    const targetNav = $(`[data-section="${hash}"]`);
    if (targetNav) targetNav.click();
    else showPage(hash);
  });

  const initialHash = location.hash.replace('#', '');
  if (initialHash) {
    const targetNav = $(`[data-section="${initialHash}"]`);
    if (targetNav) targetNav.click();
    else showPage(initialHash);
  }

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

  $('#dreamOpponentMode').addEventListener('click', e => {
    const button = e.target.closest('[data-opponent-mode]');
    if (!button) return;
    dreamConfig.opponentMode = button.dataset.opponentMode;
    renderDreamStudio();
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
  $('#scoutProvenanceFilter')?.addEventListener('change', resetAndScout);
  $('#scoutRoleFilter').addEventListener('change', resetAndScout);
  $('#scoutTierFilter').addEventListener('change', resetAndScout);
  $('#scoutTeamFilter').addEventListener('change', resetAndScout);
  $('#scoutSortFilter').addEventListener('change', resetAndScout);

  const resetAllScoutingFilters = () => {
    $('#scoutSearchInput').value = '';
    const provSelect = $('#scoutProvenanceFilter');
    if (provSelect) provSelect.value = 'ALL';
    $('#scoutRoleFilter').value = 'ALL';
    $('#scoutTierFilter').value = 'ALL';
    $('#scoutTeamFilter').value = 'ALL';
    $('#scoutSortFilter').value = 'ovr';
    scoutPage = 1;
    renderScoutingHub();
    toast('Scouting filters reset');
  };
  $('#scoutResetBtn')?.addEventListener('click', resetAllScoutingFilters);

  $('#scoutingPlayerGrid').addEventListener('click', e => {
    if (e.target.closest('#scoutEmptyResetBtn')) {
      resetAllScoutingFilters();
      return;
    }
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

  // 1v1 Player Duel & Team vs Team Bindings
  $$('.duel-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.duelMode;
      const sel = $('#duelTypeSelect');
      if (sel) {
        sel.value = mode;
        if (mode === 'team_5aside') {
          initDefaultUserSquads('5aside');
        } else if (mode === 'team_11aside') {
          initDefaultUserSquads('11aside');
        }
        renderDuelMode();
      }
    });
  });

  $('#duelTypeSelect')?.addEventListener('change', () => {
    const val = $('#duelTypeSelect').value;
    if (val === 'team_5aside') {
      initDefaultUserSquads('5aside');
    } else if (val === 'team_11aside') {
      initDefaultUserSquads('11aside');
    }
    renderDuelMode();
  });

  $('#duelAutoDraftTeamsBtn')?.addEventListener('click', () => {
    const val = $('#duelTypeSelect')?.value || 'team_5aside';
    initDefaultUserSquads(val === 'team_5aside' ? '5aside' : '11aside');
    renderDuelMode();
    toast('✨ Auto-drafted squads with 1 unique player per nation!');
  });

  $('#flipCoinBtn')?.addEventListener('click', handleCoinToss);

  $('#duelResetDraftBtn')?.addEventListener('click', () => {
    const val = $('#duelTypeSelect')?.value || 'team_5aside';
    resetTeamVsTeamDraft(val === 'team_5aside' ? '5aside' : '11aside');
    renderDuelMode();
    toast('↺ Draft reset. Pre-match coin toss ready!');
  });

  $('#draftTurnActions')?.addEventListener('click', (e) => {
    const formBtn = e.target.closest('[data-form]');
    if (formBtn && draftState.currentTurnUser) {
      handleFormationChosen(draftState.currentTurnUser, formBtn.dataset.form);
      return;
    }
    const capBtn = e.target.closest('[data-captain-id]');
    if (capBtn && draftState.currentTurnUser) {
      handleCaptainSelected(draftState.currentTurnUser, capBtn.dataset.captainId);
      return;
    }
    const openScoutBtn = e.target.closest('#draftOpenPickerBtn');
    if (openScoutBtn && draftState.currentTurnUser) {
      const u = draftState.currentTurnUser;
      const targetSquad = u === 'u1' ? user1Squad : user2Squad;
      const index = draftState.currentPickIndex;
      const slot = targetSquad[index];
      const role = slot ? slot.role : (index === 0 ? 'GK' : 'FWD');

      activeModalTarget = {
        type: u === 'u1' ? 'duelU1' : 'duelU2',
        index,
        role: index === 0 ? 'GK' : role
      };

      $('#modalSlotTitle').textContent = `Draft ${role} for ${u === 'u1' ? 'User 1' : 'User 2'} (Slot ${index + 1})`;
      $('#playerPickerModal').classList.add('is-open');
      $('#playerSearchInput').value = '';
      $('#modalRoleFilter').value = index === 0 ? 'GK' : 'ALL';
      renderModalPlayers();
      return;
    }
  });

  const handleSlotClick = (e) => {
    const slot = e.target.closest('.duel-squad-slot');
    if (!slot) return;
    const user = slot.dataset.user; // 'u1' or 'u2'
    const index = parseInt(slot.dataset.slotIndex, 10);
    const targetSquad = user === 'u1' ? user1Squad : user2Squad;
    const current = targetSquad[index];
    if (!current) return;

    // Strictly enforce 1 player lock per turn:
    // Only the active user can pick, and only their current turn slot can be clicked
    if (draftState.active && draftState.phase === 'PLAYER_DRAFT') {
      if (user !== draftState.currentTurnUser) {
        toast(`⚠️ It's ${draftState.currentTurnUser === 'u1' ? 'User 1' : 'User 2'}'s turn! Each user locks 1 player at a time for fair drafting.`);
        return;
      }
      if (index !== draftState.currentPickIndex) {
        toast(`⚠️ Please lock slot ${draftState.currentPickIndex + 1} (${targetSquad[draftState.currentPickIndex]?.role || 'current position'}) first!`);
        return;
      }
    }

    activeModalTarget = {
      type: user === 'u1' ? 'duelU1' : 'duelU2',
      index,
      role: index === 0 ? 'GK' : current.role
    };

    $('#modalSlotTitle').textContent = `Select ${index === 0 ? 'Goalkeeper' : 'Outfield'} for ${user === 'u1' ? 'User 1' : 'User 2'} (Slot ${index + 1}: ${current.name})`;
    $('#playerPickerModal').classList.add('is-open');
    $('#playerSearchInput').value = '';
    $('#modalRoleFilter').value = index === 0 ? 'GK' : 'ALL';
    renderModalPlayers();
  };

  $('#duelU1SlotsGrid')?.addEventListener('click', handleSlotClick);
  $('#duelU2SlotsGrid')?.addEventListener('click', handleSlotClick);

  $('#duelPickP1Btn')?.addEventListener('click', () => {
    activeModalTarget = { type: 'duelP1' };
    $('#modalSlotTitle').textContent = `Select Player 1 (Current: ${duelP1.name})`;
    $('#playerPickerModal').classList.add('is-open');
    $('#playerSearchInput').value = '';
    $('#modalRoleFilter').value = 'ALL';
    renderModalPlayers();
  });

  $('#duelPickP2Btn')?.addEventListener('click', () => {
    activeModalTarget = { type: 'duelP2' };
    $('#modalSlotTitle').textContent = `Select Player 2 (Current: ${duelP2.name})`;
    $('#playerPickerModal').classList.add('is-open');
    $('#playerSearchInput').value = '';
    $('#modalRoleFilter').value = 'ALL';
    renderModalPlayers();
  });

  $('#duelSwapPlayersBtn')?.addEventListener('click', () => {
    const temp = duelP1;
    duelP1 = duelP2;
    duelP2 = temp;
    renderDuelMode();
    toast('Players swapped sides!');
  });

  $('#startDuelBtn')?.addEventListener('click', startDuelMatch);
  $('#duelResultRematchBtn')?.addEventListener('click', startDuelMatch);
  $('#duelRematchBtn')?.addEventListener('click', startDuelMatch);
  $('#duelChangePlayersBtn')?.addEventListener('click', () => {
    $('#duelArenaCard').style.display = 'none';
    $('#duelResultCard').style.display = 'none';
    scrollToSection('#duel');
  });

  $('#duelPlayPauseBtn')?.addEventListener('click', () => {
    if (!currentDuel || currentDuel.isComplete) return;
    duelRunning = !duelRunning;
    $('#duelPlayPauseBtn').textContent = duelRunning ? '⏸' : '▶';
  });

  $('#duelRestartBtn')?.addEventListener('click', () => {
    if (!currentDuel) return;
    startDuelMatch();
  });

  $('#duelSaveReplayBtn')?.addEventListener('click', saveDuelToVault);

  // Tutorial & Onboarding Controller
  const tutorial = new TutorialController({
    onNavigate: (section) => {
      showPage(section);
      scrollToSection(`#${section}`);
    }
  });

  // Welcome & How to Play Pop-Out Modal
  const welcomeModal = $('#welcomeModal');
  if (welcomeModal) {
    let hideWelcome = false;
    try {
      hideWelcome = localStorage.getItem('touchline_hide_welcome') === 'true' ||
                    (tutorial.storage.status === 'completed' || tutorial.storage.status === 'skipped');
    } catch {}

    if (!hideWelcome) {
      welcomeModal.classList.add('is-open');
      welcomeModal.setAttribute('aria-hidden', 'false');
    }

    const closeWelcome = () => {
      welcomeModal.classList.remove('is-open');
      welcomeModal.setAttribute('aria-hidden', 'true');
      if ($('#dontShowWelcomeAgain')?.checked) {
        try { localStorage.setItem('touchline_hide_welcome', 'true'); } catch {}
      }
    };

    $('#closeWelcomeBtn')?.addEventListener('click', closeWelcome);
    $('#skipTutorialBtn')?.addEventListener('click', () => {
      closeWelcome();
      tutorial.markSkipped();
      toast('Tutorial skipped. Replay anytime from the Guide button in the topbar.');
    });

    $('#startGuidedTourBtn')?.addEventListener('click', () => {
      closeWelcome();
      tutorial.startTutorial();
    });

    $('#quickStartBtn')?.addEventListener('click', () => {
      closeWelcome();
      musicPlayer.play();
      if ($('#musicPlayBtn')) {
        $('#musicPlayBtn').textContent = '⏸ Pause';
        $('#musicPlayBtn').classList.add('is-playing');
      }
      toast('Welcome to the Touchline. Best of luck today!');
    });

    // Mode specific tutorial chips
    $$('.mode-tour-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.replayMode;
        closeWelcome();
        tutorial.startTutorial(mode);
      });
    });

    $('#startPlayingBtn')?.addEventListener('click', () => {
      closeWelcome();
      musicPlayer.play();
      if ($('#musicPlayBtn')) {
        $('#musicPlayBtn').textContent = '⏸ Pause';
        $('#musicPlayBtn').classList.add('is-playing');
      }
      toast('Welcome to the Touchline. Best of luck today');
    });

    welcomeModal.addEventListener('click', (e) => {
      if (e.target === welcomeModal) closeWelcome();
    });

    $('#helpModalBtn')?.addEventListener('click', () => {
      welcomeModal.classList.add('is-open');
      welcomeModal.setAttribute('aria-hidden', 'false');
    });
  }

  // Accessible keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      let closed = false;
      if ($('#futCardModal')?.classList.contains('is-open')) {
        $('#futCardModal').classList.remove('is-open');
        closed = true;
      }
      if ($('#playerPickerModal')?.classList.contains('is-open')) {
        $('#playerPickerModal').classList.remove('is-open');
        closed = true;
      }
      if (welcomeModal?.classList.contains('is-open')) {
        welcomeModal.classList.remove('is-open');
        welcomeModal.setAttribute('aria-hidden', 'true');
        closed = true;
      }
      if (matchEffects?.activeEffect) {
        matchEffects.dismiss(false);
        closed = true;
      }
      if (closed) return;
    }
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement || e.target instanceof HTMLSelectElement) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (matchEffects?.activeEffect && matchEffects.mode === 'broadcast') {
        matchEffects.dismiss(true);
        return;
      }
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

  // 1v1 Duel Tick & Render
  if(duelRunning && currentDuel && !currentDuel.isComplete){
    duelAccumulator += delta;
    const duelTickInterval = 120; // smooth 120ms tick
    while(duelAccumulator >= duelTickInterval){
      duelAccumulator -= duelTickInterval;
      advanceDuelTick(currentDuel, 0.25);
      updateDuelDisplay();
      if(!duelRunning || currentDuel.isComplete) break;
    }
  }

  if (match) match.speed = speed;
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
renderDuelMode();
renderVault();
requestAnimationFrame(frame);
