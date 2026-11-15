import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4174;
const CHROME_PORT = 9223;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\shoun\\AppData\\Local\\Temp\\chrome_cdp_profile_' + Date.now();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// 1. Start test server
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

// 2. Start Chrome
const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  `--remote-debugging-port=${CHROME_PORT}`,
  `--user-data-dir=${USER_DATA_DIR}`,
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1280,800',
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

  await send('Page.navigate', { url: `http://localhost:${PORT}/` });
  await sleep(1500);

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error('Eval failed: ' + JSON.stringify(res.exceptionDetails));
    }
    return res.result.value;
  };

  // Test 1: Check initial page state
  const initial = await evaluate(`(() => {
    const pages = Array.from(document.querySelectorAll('.page')).map(p => ({
      id: p.id,
      isActive: p.classList.contains('is-active'),
      display: getComputedStyle(p).display
    }));
    return {
      pages,
      hash: location.hash,
      title: document.title
    };
  })()`);
  console.log('Initial page state:', JSON.stringify(initial, null, 2));

  if (!initial.pages.find(p => p.id === 'page-matchday' && p.isActive && p.display === 'block')) {
    throw new Error('page-matchday is not active on initial load!');
  }
  const inactiveInitially = initial.pages.filter(p => p.id !== 'page-matchday');
  if (inactiveInitially.some(p => p.isActive || p.display !== 'none')) {
    throw new Error('Non-matchday pages are not hidden on initial load!');
  }
  console.log('✓ Initial page is page-matchday and all other pages are hidden (display: none)');

  // Test 2: Click each nav link and test page switching
  const testNavs = [
    { section: 'tournament', expectedPageId: 'page-tournament' },
    { section: 'dreamteam', expectedPageId: 'page-dreamteam' },
    { section: 'scouting', expectedPageId: 'page-scouting' },
    { section: 'vault', expectedPageId: 'page-vault' },
    { section: 'squad', expectedPageId: 'page-squad' },
    { section: 'matchday', expectedPageId: 'page-matchday' }
  ];

  for (const t of testNavs) {
    await evaluate(`document.querySelector('[data-section="${t.section}"]')?.click()`);
    await sleep(250);

    const state = await evaluate(`(() => {
      const activePages = Array.from(document.querySelectorAll('.page.is-active')).map(p => ({
        id: p.id,
        display: getComputedStyle(p).display
      }));
      const hiddenPages = Array.from(document.querySelectorAll('.page:not(.is-active)')).map(p => ({
        id: p.id,
        display: getComputedStyle(p).display
      }));
      const activeNav = document.querySelector('.nav-link.is-active')?.dataset.section;
      return {
        activePages,
        hiddenPages,
        activeNav,
        hash: location.hash,
        scrollY: window.scrollY
      };
    })()`);

    console.log(`After clicking [${t.section}]:`, JSON.stringify(state, null, 2));

    if (state.activePages.length !== 1 || state.activePages[0].id !== t.expectedPageId) {
      throw new Error(`Expected exactly 1 active page [${t.expectedPageId}], got: ${JSON.stringify(state.activePages)}`);
    }
    if (state.activePages[0].display !== 'block') {
      throw new Error(`Active page [${t.expectedPageId}] does not have display: block!`);
    }
    if (state.hiddenPages.some(p => p.display !== 'none')) {
      throw new Error(`Hidden page has non-none display!`);
    }
    if (state.activeNav !== t.section) {
      throw new Error(`Nav button [${t.section}] is not active!`);
    }
    console.log(`✓ Navigated to [${t.section}]: only ${t.expectedPageId} is visible, nav is highlighted, hash is #${state.hash}`);
  }

  // Test 3: Test hash routing directly (e.g. reload or change hash to #tournament)
  await evaluate(`location.hash = '#tournament'`);
  await sleep(250);
  const hashNavState = await evaluate(`(() => {
    return {
      activePage: document.querySelector('.page.is-active')?.id,
      activeNav: document.querySelector('.nav-link.is-active')?.dataset.section
    };
  })()`);
  console.log('After setting hash to #tournament:', hashNavState);
  if (hashNavState.activePage !== 'page-tournament' || hashNavState.activeNav !== 'tournament') {
    throw new Error('Hash routing failed for #tournament!');
  }
  console.log('✓ Hash routing works seamlessly!');

  // Check JS Exceptions
  console.log(`\nUncaught JS Exceptions: ${jsErrors.length}`);
  if (jsErrors.length > 0) {
    console.error('JS Errors:', jsErrors);
    throw new Error('JS errors detected');
  }
  console.log('🎉 ALL MULTI-PAGE VIEW SWITCHING TESTS PASSED PERFECTLY!');

} finally {
  try { chrome.kill(); } catch {}
  try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  server.close();
}
