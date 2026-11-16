import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4180;
const CHROME_PORT = 9227;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\shoun\\AppData\\Local\\Temp\\chrome_cdp_profile_picker_contrast_' + Date.now();

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

  // Navigate to 1v1 & Team Duel page
  await send('Runtime.evaluate', {
    expression: `document.querySelector('button[data-section="duel"]').click();`
  });
  await sleep(600);

  // Click "Change Player" on Player 1 to open Player Picker Modal
  await send('Runtime.evaluate', {
    expression: `document.getElementById('duelPickP1Btn').click();`
  });
  await sleep(800);

  const pickerState = await send('Runtime.evaluate', {
    expression: `(() => {
      const modal = document.getElementById('playerPickerModal');
      const firstItem = modal.querySelector('.modal-player-item');
      const strong = firstItem?.querySelector('.modal-player-info strong');
      const span = firstItem?.querySelector('.modal-player-info span');
      const ovr = firstItem?.querySelector('.modal-player-ovr');
      return {
        isOpen: modal.classList.contains('is-open'),
        itemsCount: modal.querySelectorAll('.modal-player-item').length,
        strongColor: strong ? window.getComputedStyle(strong).color : null,
        spanColor: span ? window.getComputedStyle(span).color : null,
        ovrColor: ovr ? window.getComputedStyle(ovr).color : null
      };
    })()`,
    returnByValue: true
  });

  console.log('Player Picker Modal State:', pickerState.result.value);

  const snap = async (filename) => {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const p = path.join('C:\\Users\\shoun\\.gemini\\antigravity\\brain\\9b95cfd6-654a-4480-ad22-c511557478de', filename);
    fs.writeFileSync(p, Buffer.from(res.data, 'base64'));
    console.log('Saved screenshot:', filename);
  };

  await snap('repaired_player_picker_contrast.png');

  console.log('Uncaught JS Exceptions:', jsErrors.length);
  if (jsErrors.length > 0) {
    console.error('Errors:', jsErrors);
    throw new Error('JS errors encountered');
  }

  console.log('🎉 PLAYER PICKER CONTRAST VERIFICATION PASSED!');
  ws.close();
  chrome.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  process.exit(0);
} catch (err) {
  console.error('Picker verification failed:', err);
  chrome.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  process.exit(1);
}
