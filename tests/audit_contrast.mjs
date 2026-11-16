import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4175;
const CHROME_PORT = 9224;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\shoun\\AppData\\Local\\Temp\\chrome_cdp_profile_audit_' + Date.now();

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
  await sleep(600);

  // Audit computed colors across key components
  const auditColors = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const results = [];
        const targets = [
          { sel: '.analysis-card', name: 'Analysis Card' },
          { sel: '.small-panel-heading', name: 'Analysis Header' },
          { sel: '.stats-head', name: 'Stats Header' },
          { sel: '.stat-row-head', name: 'Stat Row Label' },
          { sel: '.stat-row-head b', name: 'Stat Row Value' },
          { sel: '.manager-shouts-panel', name: 'Shouts Panel' },
          { sel: '.shout-btn', name: 'Shout Button' },
          { sel: '.flow-panel', name: 'Flow Panel' },
          { sel: '.flow-insights b', name: 'Flow Insight Value' },
          { sel: '.vault', name: 'Vault Panel' },
          { sel: '.vault-match', name: 'Vault Match Card' },
          { sel: '.bracket-match-card', name: 'Bracket Card' },
          { sel: '.golden-boot-card', name: 'Golden Boot Card' },
          { sel: '.wizard-card', name: 'Dream Team Wizard Card' },
          { sel: '.formation-button', name: 'Formation Button' },
          { sel: '.style-card', name: 'Style Card' },
          { sel: '.field select', name: 'Field Select' }
        ];

        targets.forEach(t => {
          const el = document.querySelector(t.sel);
          if (el) {
            const cs = window.getComputedStyle(el);
            results.push({
              name: t.name,
              bg: cs.backgroundColor,
              color: cs.color,
              border: cs.borderColor
            });
          } else {
            results.push({ name: t.name, missing: true });
          }
        });
        return results;
      })()
    `,
    returnByValue: true
  });

  console.log('--- COMPUTED CONTRAST & COLOR AUDIT ---');
  console.table(auditColors.result.value);

  const snap = async (filename) => {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const p = path.join('C:\\Users\\shoun\\.gemini\\antigravity\\brain\\9b95cfd6-654a-4480-ad22-c511557478de', filename);
    fs.writeFileSync(p, Buffer.from(res.data, 'base64'));
    console.log('Saved screenshot:', filename);
  };

  // 1. Matchday screenshot
  await snap('repaired_contrast_matchday.png');

  // 2. Tournament screenshot
  await send('Runtime.evaluate', { expression: `document.querySelector('a[data-view="tournament"]').click();` });
  await sleep(600);
  await snap('repaired_contrast_tournament.png');

  // 3. Dream Team screenshot
  await send('Runtime.evaluate', { expression: `document.querySelector('a[data-view="dreamteam"]').click();` });
  await sleep(600);
  await snap('repaired_contrast_dreamteam.png');

  // 4. Vault screenshot
  await send('Runtime.evaluate', { expression: `document.querySelector('a[data-view="vault"]').click();` });
  await sleep(600);
  await snap('repaired_contrast_vault.png');

  ws.close();
  chrome.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  process.exit(0);
} catch (err) {
  console.error('Audit failed:', err);
  chrome.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  process.exit(1);
}
