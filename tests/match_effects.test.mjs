import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatchEffects, MatchEffectsController } from '../src/match-effects.js';
import { createMatch, advanceMinute, playFullMatch } from '../src/engine.js';
import { TEAMS, getTeam } from '../src/data.js';

class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.innerHTML = '';
    this.classList = new Set();
    this.classList.add = cls => this.classList.addRaw(cls);
    this.classList.remove = cls => this.classList.delete(cls);
    this.classList.contains = cls => this.classList.has(cls);
    this.classList.addRaw = cls => Set.prototype.add.call(this.classList, cls);
    this.listeners = {};
  }
  addEventListener(event, fn) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(fn);
  }
  querySelector(selector) {
    if (selector === '.broadcast-resume-action' && this.innerHTML.includes('broadcast-resume-action')) {
      const mockBtn = new MockElement('button');
      return mockBtn;
    }
    if (selector === '.broadcast-card-close' && this.innerHTML.includes('broadcast-card-close')) {
      const mockBtn = new MockElement('button');
      return mockBtn;
    }
    return null;
  }
}

test('MatchEffectsController: instantiates with defaults and toggles mode', () => {
  const fx = createMatchEffects();
  assert.equal(fx.mode, 'broadcast');
  assert.equal(fx.speed, 1);
  assert.equal(fx.queue.length, 0);

  const next = fx.toggleMode();
  assert.equal(next, 'continuous');
  assert.equal(fx.mode, 'continuous');

  fx.toggleMode();
  assert.equal(fx.mode, 'broadcast');
});

test('MatchEffectsController: Goal animation triggered on valid goal event with context', () => {
  const container = new MockElement();
  let paused = false;
  const fx = createMatchEffects({
    container,
    onPause: () => { paused = true; }
  });

  const match = createMatch({ seed: 'GOAL-TEST-1', homeId: 'club_real_madrid', awayId: 'club_barcelona' });
  match.score.home = 1;
  match.score.away = 0;
  match.minute = 23;

  const goalEvent = {
    minute: 23,
    type: 'goal',
    side: 'home',
    text: '⚽ GOAL! Vinícius Jr finds the back of the net! (Assist: Jude Bellingham)',
    playerId: 'rma_vinicius',
    assistName: 'Jude Bellingham',
    xg: 0.42
  };

  fx.processEvents(match, [goalEvent]);
  assert.equal(paused, true, 'Broadcast mode pauses on goal for cinematic presentation');
  assert.ok(container.innerHTML.includes('broadcast-goal-card'), 'Contains goal card markup');
  assert.ok(container.innerHTML.includes('Vinícius Jr') || container.innerHTML.includes('GOAL'), 'Shows scorer or goal info');
  assert.ok(container.innerHTML.includes('Jude Bellingham'), 'Shows assist provider');
  assert.ok(container.innerHTML.includes('1 — 0'), 'Displays updated scoreline');
  assert.ok(container.innerHTML.includes('OPENING GOAL'), 'Correctly identifies opening goal context');
});

test('MatchEffectsController: Goal animation is ABSENT when a shot misses or is saved', () => {
  const container = new MockElement();
  const fx = createMatchEffects({ container });
  const match = createMatch({ seed: 'MISS-TEST-1' });

  const missEvent = {
    minute: 31,
    type: 'shot',
    side: 'home',
    text: 'Kylian Mbappé sends the effort wide of the post.'
  };

  fx.processEvents(match, [missEvent]);
  assert.ok(!container.innerHTML.includes('broadcast-goal-card'), 'No goal card on normal missed shot');
});

test('MatchEffectsController: Yellow Card presentation records booking without pause', () => {
  const container = new MockElement();
  let paused = false;
  const fx = createMatchEffects({
    container,
    onPause: () => { paused = true; }
  });
  const match = createMatch({ seed: 'CARD-TEST-1' });

  const yellowEvent = {
    minute: 41,
    type: 'card',
    side: 'away',
    card: 'yellow',
    text: '🟨 BOOKING: Rodri goes into the referee\'s notebook.'
  };

  fx.processEvents(match, [yellowEvent]);
  assert.equal(paused, false, 'Yellow card is non-blocking');
  assert.ok(container.innerHTML.includes('card-yellow'), 'Renders yellow card graphic');
  assert.ok(container.innerHTML.includes('BOOKING'), 'Mentions booking');
});

test('MatchEffectsController: Straight Red card triggers dramatic visual emphasis & pause', () => {
  const container = new MockElement();
  let paused = false;
  const fx = createMatchEffects({
    container,
    onPause: () => { paused = true; }
  });
  const match = createMatch({ seed: 'RED-TEST-1' });

  const redEvent = {
    minute: 68,
    type: 'card',
    side: 'away',
    card: 'red',
    text: '🔴 DIRECT RED CARD! Dangerous foul by Sergio Ramos — straight dismissal!'
  };

  fx.processEvents(match, [redEvent]);
  assert.equal(paused, true, 'Red card pauses for dramatic emphasis');
  assert.ok(container.innerHTML.includes('card-red'), 'Renders red card graphic');
  assert.ok(container.innerHTML.includes('REDUCED TO 10 PLAYERS'), 'Displays tactical 10-men impact warning');
});

test('MatchEffectsController: Second Yellow dismissal combines 2nd yellow + red card sequence', () => {
  const container = new MockElement();
  const fx = createMatchEffects({ container });
  const match = createMatch({ seed: '2ND-YELLOW-TEST' });

  const secondYellowEvent = {
    minute: 74,
    type: 'card',
    side: 'home',
    card: 'second_yellow',
    text: '🔴 SECOND YELLOW CARD! Casemiro receives his marching orders and is sent off!'
  };

  fx.processEvents(match, [secondYellowEvent]);
  assert.ok(container.innerHTML.includes('card-second-yellow'), 'Renders second yellow dismissal');
  assert.ok(container.innerHTML.includes('referee-cards-flipper'), 'Renders two-card flipper');
  assert.ok(container.innerHTML.includes('SENT OFF'), 'Displays sent off notice');
  assert.ok(container.innerHTML.includes('REDUCED TO 10 PLAYERS'), 'Displays tactical 10-men impact warning');
});

test('MatchEffectsController: Penalty Saved presentation highlights goalkeeper heroics', () => {
  const container = new MockElement();
  const fx = createMatchEffects({ container });
  const match = createMatch({ seed: 'PEN-SAVE-TEST' });

  const penSavedEvent = {
    minute: 85,
    type: 'save',
    side: 'home',
    isPenalty: true,
    text: '🧤 PENALTY SAVED! Thibaut Courtois dives full length to deny Erling Haaland from the spot!'
  };

  fx.processEvents(match, [penSavedEvent]);
  assert.ok(container.innerHTML.includes('PENALTY SAVED!'), 'Mentions penalty saved');
  assert.ok(container.innerHTML.includes('denies'), 'Highlights goalkeeper denial');
});

test('MatchEffectsController: Substitution graphic shows opposing directional IN/OUT players', () => {
  const container = new MockElement();
  const fx = createMatchEffects({ container });
  const match = createMatch({ seed: 'SUB-TEST' });

  const subEvent = {
    minute: 61,
    type: 'sub',
    side: 'home',
    text: 'Rodrygo replaces Federico Valverde.',
    incomingName: 'Rodrygo',
    outgoingName: 'Federico Valverde',
    incomingRole: 'FWD',
    outgoingRole: 'MID',
    incomingNumber: 11,
    outgoingNumber: 15
  };

  fx.processEvents(match, [subEvent]);
  assert.ok(container.innerHTML.includes('broadcast-sub-card'), 'Contains sub card');
  assert.ok(container.innerHTML.includes('▲ ON'), 'Features green ON badge');
  assert.ok(container.innerHTML.includes('▼ OFF'), 'Features red OFF badge');
  assert.ok(container.innerHTML.includes('Rodrygo'), 'Includes incoming player name');
  assert.ok(container.innerHTML.includes('Federico Valverde'), 'Includes outgoing player name');
});

test('MatchEffectsController: Event deduplication ensures seeking or replays do not trigger duplicates', () => {
  const container = new MockElement();
  const fx = createMatchEffects({ container });
  const match = createMatch({ seed: 'DEDUP-TEST' });

  const goalEvent = {
    minute: 10,
    type: 'goal',
    side: 'home',
    text: '⚽ GOAL! Bellingham scores!'
  };

  fx.processEvents(match, [goalEvent]);
  const firstHtml = container.innerHTML;
  assert.ok(firstHtml.length > 0, 'First call generates markup');

  // Clear active effect using fx.clear()
  fx.clear();
  // Re-process identical event without resetSeen
  fx.processEvents(match, [goalEvent]);
  assert.equal(container.innerHTML, '', 'Duplicate event is skipped');

  // Reset seen
  fx.resetSeen();
  fx.processEvents(match, [goalEvent]);
  assert.ok(container.innerHTML.length > 0, 'Re-generates after resetSeen()');
});

test('MatchEffectsController: Priority queue supersedes lower priority events with higher priority goals', () => {
  const container = new MockElement();
  const fx = createMatchEffects({ container });
  const match = createMatch({ seed: 'PRIORITY-TEST' });

  const offsideEvent = {
    minute: 50,
    type: 'offside',
    side: 'away',
    text: 'Flag raised! Offside.'
  };

  const goalEvent = {
    minute: 50,
    type: 'goal',
    side: 'home',
    text: '⚽ GOAL! Screamer!'
  };

  fx.processEvents(match, [offsideEvent]);
  assert.ok(container.innerHTML.includes('OFFSIDE'), 'Shows offside first');

  fx.processEvents(match, [goalEvent]);
  assert.ok(container.innerHTML.includes('broadcast-goal-card'), 'High priority GOAL supersedes OFFSIDE immediately');
});

test('MatchEffectsController: Event graphics NEVER modify authoritative simulation engine scores or statistics', () => {
  const container = new MockElement();
  const fx = createMatchEffects({ container });
  const match = createMatch({ seed: 'IMMUTABLE-TEST', homeId: 'club_real_madrid', awayId: 'club_man_city' });

  const initialScore = { ...match.score };
  const initialStats = JSON.parse(JSON.stringify(match.stats));

  const goalEvent = {
    minute: 40,
    type: 'goal',
    side: 'home',
    text: '⚽ GOAL! Modrić strikes!'
  };

  fx.processEvents(match, [goalEvent]);
  // Verify match state is untouched by graphics controller
  assert.deepEqual(match.score, initialScore);
  assert.deepEqual(match.stats, initialStats);
});
