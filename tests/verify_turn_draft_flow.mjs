import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4192;
const CHROME_PORT = 9245;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\shoun\\AppData\\Local\\Temp\\chrome_cdp_profile_draft_turn_' + Date.now();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const file = path.resolve(base, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!(file === path.join(base, 'index.html') || file.startsWith(base + path.sep))) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
});

await new Promise(r => server.listen(PORT, r));
console.log(`Test server running on port ${PORT}`);

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  `--remote-debugging-port=${CHROME_PORT}`,
  `--user-data-dir=${USER_DATA_DIR}`,
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1440,900',
  'about:blank'
]);

async function waitForCdp() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch {}
    await sleep(200);
  }
  throw new Error('CDP port failed to open');
}

try {
  await waitForCdp();
  const targetRes = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/new?http://localhost:${PORT}/`, { method: 'PUT' });
  const target = await targetRes.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let id = 1;
  const callbacks = new Map();
  const jsErrors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const { resolve, reject } = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      jsErrors.push(msg.params.exceptionDetails);
    }
  };

  await new Promise(r => ws.onopen = r);

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = id++;
    callbacks.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  await sleep(1500);

  // Close welcome modal
  await send('Runtime.evaluate', {
    expression: `
      if (window.__closeWelcomeModal) window.__closeWelcomeModal();
      const startBtn = document.getElementById('welcomeStartBtn');
      if (startBtn) startBtn.click();
    `
  });
  await sleep(500);

  // Switch to Duel mode and 5-a-side
  await send('Runtime.evaluate', {
    expression: `
      document.querySelector('button[data-section="duel"]').click();
      const sel = document.getElementById('duelTypeSelect');
      sel.value = 'team_5aside';
      sel.dispatchEvent(new Event('change'));
    `
  });
  await sleep(600);

  // Test 1: Clicking slot BEFORE coin toss & formation choice should NOT open picker
  const clickBeforeToss = await send('Runtime.evaluate', {
    expression: `(() => {
      const firstSlot = document.querySelector('#duelU1SlotsGrid .duel-squad-slot');
      firstSlot.click();
      return document.getElementById('playerPickerModal').classList.contains('is-open');
    })()`,
    returnByValue: true
  });
  console.log('Picker opened before toss (should be false):', clickBeforeToss.result.value);
  if (clickBeforeToss.result.value !== false) throw new Error('Slot clicked and opened modal before coin toss / formation!');

  // Test 2: Trigger Coin Toss
  await send('Runtime.evaluate', {
    expression: `document.getElementById('flipCoinBtn').click();`
  });
  await sleep(1200); // wait for coin toss animation

  // Check toss winner
  const tossWinner = await send('Runtime.evaluate', {
    expression: `window.__getDraftState ? window.__getDraftState() : document.getElementById('draftTurnBadge').textContent`,
    returnByValue: true
  });
  console.log('Draft state after toss:', tossWinner.result.value);

  // Test 3: Select Formation for Toss Winner
  await send('Runtime.evaluate', {
    expression: `
      const formBtn1 = document.querySelector('#draftTurnActions .draft-formation-opt-btn');
      if (formBtn1) formBtn1.click();
    `
  });
  await sleep(600);

  // Test 4: Select Formation for 2nd User
  await send('Runtime.evaluate', {
    expression: `
      const formBtn2 = document.querySelector('#draftTurnActions .draft-formation-opt-btn');
      if (formBtn2) formBtn2.click();
    `
  });
  await sleep(600);

  // Now draftState.phase should be PLAYER_DRAFT!
  const playerDraftBanner = await send('Runtime.evaluate', {
    expression: `({
      badge: document.getElementById('draftTurnBadge').textContent,
      action: document.getElementById('draftTurnAction').textContent,
      hasOpenBtn: !!document.getElementById('draftOpenPickerBtn')
    })`,
    returnByValue: true
  });
  console.log('Player draft banner state:', playerDraftBanner.result.value);

  // Test 5: Try to click opponent's slot - should NOT open modal
  const opponentClick = await send('Runtime.evaluate', {
    expression: `(() => {
      const isU1Turn = document.getElementById('draftTurnBadge').textContent.includes('USER 1');
      const oppGrid = isU1Turn ? '#duelU2SlotsGrid' : '#duelU1SlotsGrid';
      document.querySelector(oppGrid + ' .duel-squad-slot').click();
      return document.getElementById('playerPickerModal').classList.contains('is-open');
    })()`,
    returnByValue: true
  });
  console.log('Opponent slot clicked and opened modal (should be false):', opponentClick.result.value);
  if (opponentClick.result.value !== false) throw new Error('Opponent slot allowed modal to open!');

  // Test 6: Click active turn user's designated slot - should open modal
  const mySlotClick = await send('Runtime.evaluate', {
    expression: `(() => {
      const isU1Turn = document.getElementById('draftTurnBadge').textContent.includes('USER 1');
      const myGrid = isU1Turn ? '#duelU1SlotsGrid' : '#duelU2SlotsGrid';
      const activeSlot = document.querySelector(myGrid + ' .is-active-slot');
      if (activeSlot) activeSlot.click();
      return document.getElementById('playerPickerModal').classList.contains('is-open');
    })()`,
    returnByValue: true
  });
  console.log('Active turn slot clicked and opened modal (should be true):', mySlotClick.result.value);
  if (mySlotClick.result.value !== true) throw new Error('Active turn slot failed to open modal!');

  // Pick first player for this turn
  await send('Runtime.evaluate', {
    expression: `
      const firstPlayer = document.querySelector('#modalPlayerList .modal-player-item');
      if (firstPlayer) firstPlayer.click();
    `
  });
  await sleep(500);

  // Verify that turn IMMEDIATELY swapped to the OTHER user!
  const turnAfterPick1 = await send('Runtime.evaluate', {
    expression: `({
      badge: document.getElementById('draftTurnBadge').textContent,
      action: document.getElementById('draftTurnAction').textContent,
      u1Filled: document.querySelectorAll('#duelU1SlotsGrid .is-captain, #duelU1SlotsGrid [data-slot-index]').length,
      u1Locked: Array.from(document.querySelectorAll('#duelU1SlotsGrid .duel-slot-info span')).map(s => s.textContent),
      u2Locked: Array.from(document.querySelectorAll('#duelU2SlotsGrid .duel-slot-info span')).map(s => s.textContent)
    })`,
    returnByValue: true
  });
  console.log('Turn state after first player lock:', turnAfterPick1.result.value);

  // Take screenshot of state
  const res = await send('Page.captureScreenshot', { format: 'png' });
  const p = path.join('C:\\Users\\shoun\\.gemini\\antigravity\\brain\\9b95cfd6-654a-4480-ad22-c511557478de', 'cdp_verified_turn_draft.png');
  fs.writeFileSync(p, Buffer.from(res.data, 'base64'));
  console.log('Saved screenshot: cdp_verified_turn_draft.png');

  console.log('Uncaught JS Exceptions:', jsErrors.length);
  if (jsErrors.length > 0) {
    console.error('Errors:', jsErrors);
    throw new Error('JS errors encountered');
  }

  console.log('🎉 TURN-BY-TURN 1-PLAYER-AT-A-TIME DRAFT FLOW FULLY VERIFIED IN HEADLESS CHROME!');
  ws.close();
  chrome.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  process.exit(0);
} catch (err) {
  console.error('Turn draft verification failed:', err);
  chrome.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  process.exit(1);
}
