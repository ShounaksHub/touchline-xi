import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4178;
const CHROME_PORT = 9225;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\shoun\\AppData\\Local\\Temp\\chrome_cdp_profile_duel_' + Date.now();

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

  // Navigate to 1v1 Player Duel page
  await send('Runtime.evaluate', {
    expression: `document.querySelector('button[data-section="duel"]').click();`
  });
  await sleep(600);

  // Verify page is active
  const duelPageState = await send('Runtime.evaluate', {
    expression: `(() => {
      const p = document.getElementById('page-duel');
      const cs = window.getComputedStyle(p);
      return {
        isActive: p.classList.contains('is-active'),
        display: cs.display,
        p1Name: document.querySelector('#duelP1Preview h4')?.textContent,
        p2Name: document.querySelector('#duelP2Preview h4')?.textContent,
        matchup: document.getElementById('duelMatchupHeadline')?.textContent
      };
    })()`,
    returnByValue: true
  });

  console.log('Duel Page Initial State:', duelPageState.result.value);

  const snap = async (filename) => {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const p = path.join('C:\\Users\\shoun\\.gemini\\antigravity\\brain\\9b95cfd6-654a-4480-ad22-c511557478de', filename);
    fs.writeFileSync(p, Buffer.from(res.data, 'base64'));
    console.log('Saved screenshot:', filename);
  };

  await snap('duel_mode_selection_desktop.png');

  // Click start duel button
  await send('Runtime.evaluate', {
    expression: `document.getElementById('startDuelBtn').click();`
  });
  await sleep(2500); // Wait 2.5s for live ticks and spatial animation

  const duelLiveState = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        arenaDisplay: document.getElementById('duelArenaCard').style.display,
        score: document.getElementById('duelArenaScore').textContent,
        roundText: document.getElementById('duelRoundText').textContent,
        phase: document.getElementById('duelPhasePill').textContent,
        ticker: document.getElementById('duelTickerText').textContent
      };
    })()`,
    returnByValue: true
  });

  console.log('Duel Live Simulation State:', duelLiveState.result.value);
  await snap('duel_mode_live_arena_desktop.png');

  console.log('Uncaught JS Exceptions:', jsErrors.length);
  if (jsErrors.length > 0) {
    console.error('Errors:', jsErrors);
    throw new Error('JS errors encountered');
  }

  console.log('🎉 1V1 PLAYER DUEL BROWSER VERIFICATION PASSED!');
  ws.close();
  chrome.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  process.exit(0);
} catch (err) {
  console.error('Duel verification failed:', err);
  chrome.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  process.exit(1);
}
