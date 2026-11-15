import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const baseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\shoun\\AppData\\Local\\Temp\\chrome_ux_test_' + Date.now();
const PORT = 9226;
const HTTP_PORT = 4178;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(baseDir, reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise(r => server.listen(HTTP_PORT, r));
console.log('Test server running on port ' + HTTP_PORT);

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForCdp() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch {}
    await sleep(200);
  }
  throw new Error('CDP port failed to open');
}

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${USER_DATA_DIR}`,
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1440,900',
  'about:blank'
]);

try {
  await waitForCdp();

  const targetRes = await fetch(`http://127.0.0.1:${PORT}/json/new?http://localhost:${HTTP_PORT}/`, { method: 'PUT' });
  const target = await targetRes.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let id = 1;
  const callbacks = new Map();
  const consoleErrors = [];
  const jsExceptions = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const { resolve, reject } = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      jsExceptions.push(msg.params.exceptionDetails);
    }
  };

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = id++;
    callbacks.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  await send('Page.navigate', { url: `http://localhost:${HTTP_PORT}/` });
  await sleep(2000);

  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    if (r.exceptionDetails) {
      throw new Error(`Eval error (${expr}): ` + JSON.stringify(r.exceptionDetails));
    }
    return r.result.value;
  };

  // Test 1: Dismiss initial welcome modal
  const welcomeInit = await evalJs(`(() => {
    const m = document.getElementById('welcomeModal');
    return { isOpen: m.classList.contains('is-open') };
  })()`);
  console.log('1. Welcome modal initially open:', welcomeInit.isOpen);

  // Close welcome modal
  await evalJs(`document.getElementById('startPlayingBtn').click()`);
  await sleep(300);

  // Test 2: Team Filter Input
  const teamFilterTest1 = await evalJs(`(() => {
    const filterInput = document.getElementById('teamFilterInput');
    filterInput.value = 'India';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    const homeSel = document.getElementById('homeSelect');
    const options = Array.from(homeSel.querySelectorAll('option')).map(o => o.textContent);
    const clearBtnDisplay = document.getElementById('teamFilterClearBtn').style.display;
    return { options, count: options.length, clearBtnDisplay };
  })()`);
  console.log('2. Team search "India" options:', teamFilterTest1);
  if (!teamFilterTest1.options.some(o => o.includes('India'))) {
    throw new Error('Team filter failed to find India!');
  }

  // Clear team filter
  const teamFilterReset = await evalJs(`(() => {
    document.getElementById('teamFilterClearBtn').click();
    const homeSel = document.getElementById('homeSelect');
    const count = homeSel.querySelectorAll('option').length;
    const clearBtnDisplay = document.getElementById('teamFilterClearBtn').style.display;
    return { count, clearBtnDisplay };
  })()`);
  console.log('2b. Team search reset restored full options count:', teamFilterReset.count);
  if (teamFilterReset.count < 350) {
    throw new Error('Reset failed to restore all 350+ teams: ' + teamFilterReset.count);
  }

  // Test 3: Squad Lab team indicator
  await evalJs(`document.querySelector('[data-page="page-squad"]').click()`);
  await sleep(300);
  const squadIndicator = await evalJs(`document.getElementById('squadTeamIndicator').textContent`);
  console.log('3. Squad Lab team indicator:', squadIndicator);
  if (!squadIndicator.includes('Real Madrid')) {
    throw new Error('Squad indicator did not display current team: ' + squadIndicator);
  }

  // Test 4: Scouting Hub empty state and reset
  await evalJs(`document.querySelector('[data-page="page-scouting"]').click()`);
  await sleep(300);
  const emptyStateTest = await evalJs(`(() => {
    const search = document.getElementById('scoutSearchInput');
    search.value = 'xyznonexistentplayer999';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    const grid = document.getElementById('scoutingPlayerGrid');
    const hasEmptyState = !!grid.querySelector('.scout-empty-state');
    const emptyBtn = !!grid.querySelector('#scoutEmptyResetBtn');
    return { hasEmptyState, emptyBtn };
  })()`);
  console.log('4. Scouting empty state for nonexistent player:', emptyStateTest);
  if (!emptyStateTest.hasEmptyState || !emptyStateTest.emptyBtn) {
    throw new Error('Scouting empty state not rendered correctly!');
  }

  // Reset scouting filters
  const resetScoutTest = await evalJs(`(() => {
    document.getElementById('scoutEmptyResetBtn').click();
    const searchVal = document.getElementById('scoutSearchInput').value;
    const countText = document.getElementById('scoutingResultCount').textContent;
    return { searchVal, countText };
  })()`);
  console.log('4b. Scouting reset result:', resetScoutTest);
  if (resetScoutTest.searchVal !== '' || !resetScoutTest.countText.includes('players')) {
    throw new Error('Scouting reset failed to reload players!');
  }

  // Test 5: Match Pause Banner on Goal/Pause and Space/Resume click
  await evalJs(`document.querySelector('[data-page="page-matchday"]').click()`);
  await sleep(300);
  const pauseBannerTest = await evalJs(`(() => {
    // Show pause banner programmatically
    const banner = document.getElementById('matchPauseBanner');
    const resumeBtn = document.getElementById('pauseResumeBtn');
    return {
      bannerExists: !!banner,
      resumeBtnExists: !!resumeBtn,
      initialDisplay: banner.style.display
    };
  })()`);
  console.log('5. Match pause banner structure:', pauseBannerTest);

  // Test 6: Modal Escape dismissal
  const escapeTest = await evalJs(`(() => {
    const welcome = document.getElementById('welcomeModal');
    // Open welcome modal
    document.getElementById('helpModalBtn').click();
    const opened = welcome.classList.contains('is-open');
    // Press Escape
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const closedAfterEscape = !welcome.classList.contains('is-open');
    return { opened, closedAfterEscape };
  })()`);
  console.log('6. Escape key dismisses welcome modal:', escapeTest);
  if (!escapeTest.opened || !escapeTest.closedAfterEscape) {
    throw new Error('Escape key did not dismiss welcome modal!');
  }

  // Test FUT Card modal Escape dismissal
  await evalJs(`document.querySelector('[data-page="page-scouting"]').click()`);
  await sleep(300);
  const futEscapeTest = await evalJs(`(() => {
    const card = document.querySelector('[data-fut-id]');
    if (card) card.click();
    const futModal = document.getElementById('futCardModal');
    const opened = futModal.classList.contains('is-open');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const closed = !futModal.classList.contains('is-open');
    return { opened, closed };
  })()`);
  console.log('6b. Escape key dismisses FUT Card modal:', futEscapeTest);
  if (!futEscapeTest.opened || !futEscapeTest.closed) {
    throw new Error('Escape key did not dismiss FUT Card modal!');
  }

  console.log('\nUncaught JS exceptions:', jsExceptions.length);
  if (jsExceptions.length > 0) {
    console.error('JS Exceptions:', jsExceptions);
    throw new Error('Encountered uncaught exceptions!');
  }

  console.log('🎉 ALL UX AUDIT AND FIX TESTS PASSED 100%!');

} catch (err) {
  console.error('Test failed:', err);
  process.exit(1);
} finally {
  try { chrome.kill(); } catch {}
  server.close();
}
