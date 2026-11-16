import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4179;
const CHROME_PORT = 9226;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\shoun\\AppData\\Local\\Temp\\chrome_cdp_profile_team_duel_' + Date.now();

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

  // Switch to 5-a-side Match (1 Player / Nation)
  await send('Runtime.evaluate', {
    expression: `
      const sel = document.getElementById('duelTypeSelect');
      sel.value = 'team_5aside';
      sel.dispatchEvent(new Event('change'));
    `
  });
  await sleep(600);

  const snap = async (filename) => {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const p = path.join('C:\\Users\\shoun\\.gemini\\antigravity\\brain\\9b95cfd6-654a-4480-ad22-c511557478de', filename);
    fs.writeFileSync(p, Buffer.from(res.data, 'base64'));
    console.log('Saved screenshot:', filename);
  };

  // Inspect 5-a-side drafting view
  const team5State = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        cardVisible: document.getElementById('duelTeamBuilderCard').style.display !== 'none',
        badge: document.getElementById('duelTeamModeBadge').textContent,
        u1Slots: document.querySelectorAll('#duelU1SlotsGrid .duel-squad-slot').length,
        u2Slots: document.querySelectorAll('#duelU2SlotsGrid .duel-squad-slot').length,
        u1Summary: document.getElementById('duelU1Summary').textContent,
        u2Summary: document.getElementById('duelU2Summary').textContent,
        startBtnText: document.getElementById('startDuelBtn').textContent
      };
    })()`,
    returnByValue: true
  });

  console.log('5-a-side Setup State:', team5State.result.value);
  await snap('team_5aside_builder_desktop.png');

  // Kick off 5-a-side match
  await send('Runtime.evaluate', {
    expression: `document.getElementById('startDuelBtn').click();`
  });
  await sleep(2500);

  const match5State = await send('Runtime.evaluate', {
    expression: `(() => {
      const p = document.getElementById('page-matchday');
      return {
        isMatchdayActive: p.classList.contains('is-active'),
        homeName: document.getElementById('homeName')?.textContent,
        awayName: document.getElementById('awayName')?.textContent,
        fixtureLabel: document.getElementById('fixtureLabel')?.textContent
      };
    })()`,
    returnByValue: true
  });

  console.log('5-a-side Live Matchday State:', match5State.result.value);
  await snap('team_5aside_matchday_desktop.png');

  // Now test 11-a-side mode
  await send('Runtime.evaluate', {
    expression: `
      document.querySelector('button[data-section="duel"]').click();
    `
  });
  await sleep(600);

  const beforeChange = await send('Runtime.evaluate', {
    expression: `(() => {
      const sel = document.getElementById('duelTypeSelect');
      const valBefore = sel.value;
      sel.value = 'team_11aside';
      sel.dispatchEvent(new Event('change'));
      return { valBefore, valAfter: sel.value, options: [...sel.options].map(o => o.value) };
    })()`,
    returnByValue: true
  });
  console.log('Select Change Debug:', beforeChange.result.value);
  await sleep(1000);

  const team11State = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        badge: document.getElementById('duelTeamModeBadge').textContent,
        u1Slots: document.querySelectorAll('#duelU1SlotsGrid .duel-squad-slot').length,
        u2Slots: document.querySelectorAll('#duelU2SlotsGrid .duel-squad-slot').length,
        u1Summary: document.getElementById('duelU1Summary').textContent,
        u2Summary: document.getElementById('duelU2Summary').textContent,
        startBtnText: document.getElementById('startDuelBtn').textContent
      };
    })()`,
    returnByValue: true
  });

  console.log('11-a-side Setup State:', team11State.result.value);
  await snap('team_11aside_builder_desktop.png');

  // Kick off 11-a-side match
  await send('Runtime.evaluate', {
    expression: `document.getElementById('startDuelBtn').click();`
  });
  await sleep(2500);

  const match11State = await send('Runtime.evaluate', {
    expression: `(() => {
      const p = document.getElementById('page-matchday');
      return {
        isMatchdayActive: p.classList.contains('is-active'),
        homeName: document.getElementById('homeName')?.textContent,
        awayName: document.getElementById('awayName')?.textContent,
        fixtureLabel: document.getElementById('fixtureLabel')?.textContent
      };
    })()`,
    returnByValue: true
  });

  console.log('11-a-side Live Matchday State:', match11State.result.value);
  await snap('team_11aside_matchday_desktop.png');

  console.log('Uncaught JS Exceptions:', jsErrors.length);
  if (jsErrors.length > 0) {
    console.error('Errors:', jsErrors);
    throw new Error('JS errors encountered');
  }

  console.log('🎉 5-A-SIDE & 11-A-SIDE TEAM VS TEAM CDP VERIFICATION PASSED!');
  ws.close();
  chrome.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  process.exit(0);
} catch (err) {
  console.error('Team vs Team verification failed:', err);
  chrome.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  process.exit(1);
}
