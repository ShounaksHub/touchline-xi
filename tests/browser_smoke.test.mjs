import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('browser smoke: app shell and critical match controls are served', async t => {
  const html = await readFile(new URL('../index.template.html', import.meta.url), 'utf8');
  for (const id of ['playBtn','pitchCanvas','homeLineupBoard','awayLineupBoard','quickSubAlert','musicPlayBtn']) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} should exist in the app shell`);
  }
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /match-stage/);
  assert.match(css, /min-width:\s*0/);
});
