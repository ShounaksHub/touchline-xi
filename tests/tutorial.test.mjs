import test from 'node:test';
import assert from 'node:assert/strict';
import { TutorialController, TUTORIAL_STEPS, TUTORIAL_MODES } from '../src/tutorial.js';

test('Tutorial: initial state is pending for first launch', () => {
  const tut = new TutorialController();
  assert.equal(tut.isFirstLaunch(), true);
  assert.equal(tut.state, 'IDLE');
  assert.ok(TUTORIAL_STEPS.length >= 20);
});

test('Tutorial: covers every game mode', () => {
  const modes = new Set(TUTORIAL_STEPS.map(s => s.mode));
  assert.ok(modes.has(TUTORIAL_MODES.MATCHDAY));
  assert.ok(modes.has(TUTORIAL_MODES.SQUAD));
  assert.ok(modes.has(TUTORIAL_MODES.TOURNAMENT));
  assert.ok(modes.has(TUTORIAL_MODES.DREAMTEAM));
  assert.ok(modes.has(TUTORIAL_MODES.SCOUTING));
  assert.ok(modes.has(TUTORIAL_MODES.VAULT));
  assert.ok(modes.has(TUTORIAL_MODES.DUEL));
});

test('Tutorial: markCompleted persists completed modes', () => {
  const tut = new TutorialController();
  tut.markCompleted(TUTORIAL_MODES.MATCHDAY);
  assert.ok(tut.storage.completedModes.includes(TUTORIAL_MODES.MATCHDAY));
  assert.equal(tut.storage.status, 'pending');

  // Complete all modes
  for (const m of Object.values(TUTORIAL_MODES)) {
    tut.markCompleted(m);
  }
  assert.equal(tut.storage.status, 'completed');
  assert.ok(tut.storage.completedAt !== null);
});

test('Tutorial: markSkipped respects user dismissal', () => {
  const tut = new TutorialController();
  tut.markSkipped();
  assert.equal(tut.storage.status, 'skipped');
  assert.equal(tut.isFirstLaunch(), false);
});
