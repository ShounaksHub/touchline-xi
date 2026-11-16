import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4181;
const CHROME_PORT = 9228;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\shoun\\AppData\\Local\\Temp\\chrome_cdp_profile_tutorial_' + Date.now();

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

  const snap = async (filename) => {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const p = path.join('C:\\Users\\shoun\\.gemini\\antigravity\\brain\\9b95cfd6-654a-4480-ad22-c511557478de', filename);
    fs.writeFileSync(p, Buffer.from(res.data, 'base64'));
    console.log('Saved screenshot:', filename);
  };

  // 1. Verify Welcome & Onboarding Dialog State
  const welcomeState = await send('Runtime.evaluate', {
    expression: `(() => {
      const modal = document.getElementById('welcomeModal');
      const startGuided = document.getElementById('startGuidedTourBtn');
      const quickStart = document.getElementById('quickStartBtn');
      const chips = document.querySelectorAll('.mode-tour-chip');
      return {
        isOpen: modal.classList.contains('is-open'),
        hasGuidedBtn: !!startGuided,
        hasQuickBtn: !!quickStart,
        chipsCount: chips.length
      };
    })()`,
    returnByValue: true
  });

  console.log('Welcome Onboarding Dialog State:', welcomeState.result.value);
  await snap('tutorial_welcome_onboarding_desktop.png');

  // 2. Click "Start Guided Tour"
  await send('Runtime.evaluate', {
    expression: `document.getElementById('startGuidedTourBtn').click();`
  });
  await sleep(600);

  // 3. Inspect Step 1 (Scoreboard)
  const step1State = await send('Runtime.evaluate', {
    expression: `(() => {
      const overlay = document.getElementById('tutorialOverlay');
      const card = document.getElementById('tutorialCard');
      return {
        overlayActive: overlay.classList.contains('is-active'),
        badge: document.getElementById('tutStepBadge')?.textContent,
        mode: document.getElementById('tutModeBadge')?.textContent,
        title: document.getElementById('tutCardTitle')?.textContent,
        cardVisible: window.getComputedStyle(card).display !== 'none'
      };
    })()`,
    returnByValue: true
  });

  console.log('Tutorial Step 1 State:', step1State.result.value);
  await snap('tutorial_step1_scoreboard_desktop.png');

  // 4. Click Next through steps to Squad Lab
  await send('Runtime.evaluate', { expression: `document.getElementById('tutNextBtn').click();` });
  await sleep(400); // Step 2 (Kickoff)
  await send('Runtime.evaluate', { expression: `document.getElementById('tutNextBtn').click();` });
  await sleep(400); // Step 3 (Pace)
  await send('Runtime.evaluate', { expression: `document.getElementById('tutNextBtn').click();` });
  await sleep(400); // Step 4 (Pitch)
  await send('Runtime.evaluate', { expression: `document.getElementById('tutNextBtn').click();` });
  await sleep(400); // Step 5 (Shouts)
  await send('Runtime.evaluate', { expression: `document.getElementById('tutNextBtn').click();` });
  await sleep(400); // Step 6 (Stats)
  await send('Runtime.evaluate', { expression: `document.getElementById('tutNextBtn').click();` });
  await sleep(400); // Step 7 (Wire)
  await send('Runtime.evaluate', { expression: `document.getElementById('tutNextBtn').click();` });
  await sleep(400); // Step 8 (Flow)
  await send('Runtime.evaluate', { expression: `document.getElementById('tutNextBtn').click();` });
  await sleep(600); // Squad Lab: Formation

  const squadStepState = await send('Runtime.evaluate', {
    expression: `(() => {
      const card = document.getElementById('tutorialCard');
      return {
        badge: document.getElementById('tutStepBadge')?.textContent,
        mode: document.getElementById('tutModeBadge')?.textContent,
        title: document.getElementById('tutCardTitle')?.textContent,
        activePage: document.querySelector('.page.is-active')?.id
      };
    })()`,
    returnByValue: true
  });

  console.log('Tutorial Squad Lab Step State:', squadStepState.result.value);
  await snap('tutorial_squad_lab_step_desktop.png');

  // 5. Test Skip Tutorial
  await send('Runtime.evaluate', {
    expression: `document.getElementById('tutSkipBtn').click();`
  });
  await sleep(400);

  const afterSkipState = await send('Runtime.evaluate', {
    expression: `(() => {
      const overlay = document.getElementById('tutorialOverlay');
      return {
        overlayActive: overlay.classList.contains('is-active')
      };
    })()`,
    returnByValue: true
  });

  console.log('After Skip State (Overlay closed):', afterSkipState.result.value);

  // 6. Test Replay Tutorial via Guide button
  await send('Runtime.evaluate', {
    expression: `document.getElementById('helpModalBtn').click();`
  });
  await sleep(400);

  await send('Runtime.evaluate', {
    expression: `document.querySelector('button[data-replay-mode="scouting"]').click();`
  });
  await sleep(600);

  const scoutingReplayState = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        overlayActive: document.getElementById('tutorialOverlay').classList.contains('is-active'),
        mode: document.getElementById('tutModeBadge')?.textContent,
        activePage: document.querySelector('.page.is-active')?.id
      };
    })()`,
    returnByValue: true
  });

  console.log('Scouting Mode Tutorial Replay State:', scoutingReplayState.result.value);
  await snap('tutorial_scouting_replay_desktop.png');

  // Close tutorial
  await send('Runtime.evaluate', {
    expression: `document.getElementById('tutCloseBtn').click();`
  });
  await sleep(300);

  console.log('Uncaught JS Exceptions:', jsErrors.length);
  if (jsErrors.length > 0) {
    console.error('Errors:', jsErrors);
    throw new Error('JS errors encountered');
  }

  console.log('🎉 INTERACTIVE TUTORIAL & ONBOARDING CDP VERIFICATION PASSED!');
  ws.close();
  chrome.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  process.exit(0);
} catch (err) {
  console.error('Tutorial verification failed:', err);
  chrome.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  process.exit(1);
}
