import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const baseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\shoun\\AppData\\Local\\Temp\\chrome_clubs_test_' + Date.now();
const PORT = 9223;

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
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise(r => server.listen(4175, r));
console.log('Test server running on port 4175');

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
  '--window-size=1280,800',
  'about:blank'
]);

try {
  await waitForCdp();
  const targetRes = await fetch(`http://127.0.0.1:${PORT}/json/new?http://localhost:4175/`, { method: 'PUT' });
  const target = await targetRes.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let id = 1;
  const callbacks = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const { resolve, reject } = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
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

  await send('Page.navigate', { url: 'http://localhost:4175/' });
  await sleep(1500);

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error('JS Eval error: ' + JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : null;
  };

  // Close welcome modal if open
  await evaluate(`
    (() => {
      const btn = document.getElementById('welcomeStartBtn');
      if (btn) btn.click();
    })()
  `);
  await sleep(300);

  const optgroupsInfo = await evaluate(`
    (() => {
      const homeSelect = document.getElementById('homeSelect');
      const homeGroups = Array.from(homeSelect.querySelectorAll('optgroup')).map(g => ({
        label: g.label,
        count: g.children.length
      }));
      const totalHomeOptions = homeSelect.querySelectorAll('option').length;

      // Switch to scouting page to test scoutTeamFilter
      const scoutNav = document.querySelector('[data-page="scouting"]');
      if (scoutNav) scoutNav.click();

      const scoutFilter = document.getElementById('scoutTeamFilter');
      const scoutGroups = Array.from(scoutFilter.querySelectorAll('optgroup')).map(g => ({
        label: g.label,
        count: g.children.length
      }));

      return {
        homeGroups,
        totalHomeOptions,
        scoutGroups
      };
    })()
  `);

  console.log('Optgroups in #homeSelect & #scoutTeamFilter:');
  console.log(JSON.stringify(optgroupsInfo, null, 2));

  // Switch back to matchday and take screenshot of fixture dropdowns
  await evaluate(`
    (() => {
      const matchNav = document.querySelector('[data-page="matchday"]');
      if (matchNav) matchNav.click();
    })()
  `);
  await sleep(400);

  const shotRes = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(baseDir, 'clubs_dropdown_test.png'), Buffer.from(shotRes.data, 'base64'));
  console.log('✓ Screenshot saved to clubs_dropdown_test.png');

  ws.close();
} finally {
  chrome.kill();
  server.close();
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
}
