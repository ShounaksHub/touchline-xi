import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\shoun\\AppData\\Local\\Temp\\chrome_cdp_dream_' + Date.now();
const PORT = 9224;
const APP_PORT = 4175;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let pathname = req.url.split('?')[0];
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.resolve('.' + pathname);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

async function run() {
  await new Promise(r => server.listen(APP_PORT, r));
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

  await new Promise(r => setTimeout(r, 1500));
  const targetRes = await fetch(`http://127.0.0.1:${PORT}/json/new?http://localhost:${APP_PORT}/#dreamteam`, { method: 'PUT' });
  const target = await targetRes.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let id = 1;
  const callbacks = new Map();
  const errors = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const { resolve, reject } = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails);
    }
  };
  await new Promise(r => ws.onopen = r);
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const curId = id++;
    callbacks.set(curId, { resolve, reject });
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 1200));

  console.log('Testing Dream Team Studio deploy with AI Dream Team opposition...');
  // Click AI Dream Team opposition mode button
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[data-opponent-mode="ai-dream"]');
      if (btn) btn.click();
    })()`,
    returnByValue: true
  });

  // Click Deploy button
  const res = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('#deployDreamBtn');
      if (!btn) return { ok: false, error: 'no deploy btn' };
      btn.click();
      return {
        ok: true,
        activePage: document.querySelector('.page.is-active')?.id,
        playText: document.querySelector('#playText')?.textContent,
        homeName: document.querySelector('#homeName')?.textContent,
        awayName: document.querySelector('#awayName')?.textContent
      };
    })()`,
    returnByValue: true
  });
  console.log('Deploy click result (AI Dream Team):', res.result.value);

  // Wait 3 seconds to see match simulate
  await new Promise(r => setTimeout(r, 3000));

  const matchState = await send('Runtime.evaluate', {
    expression: `(() => {
      const minute = document.querySelector('#matchMinute')?.textContent;
      const homeScore = document.querySelector('#homeScore')?.textContent;
      const awayScore = document.querySelector('#awayScore')?.textContent;
      const playText = document.querySelector('#playText')?.textContent;
      return { minute, homeScore, awayScore, playText };
    })()`,
    returnByValue: true
  });
  console.log('Match state after 3s:', matchState.result.value);

  // Test Play/Pause toggle
  console.log('Testing play button toggle...');
  const toggleRes = await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('#playBtn');
      btn.click();
      return { playText: document.querySelector('#playText')?.textContent };
    })()`,
    returnByValue: true
  });
  console.log('Play button toggle result:', toggleRes.result.value);

  await new Promise(r => setTimeout(r, 1000));

  // Resume
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('#playBtn');
      btn.click();
      return { playText: document.querySelector('#playText')?.textContent };
    })()`,
    returnByValue: true
  });

  await new Promise(r => setTimeout(r, 2000));

  const afterResume = await send('Runtime.evaluate', {
    expression: `(() => {
      const minute = document.querySelector('#matchMinute')?.textContent;
      const homeScore = document.querySelector('#homeScore')?.textContent;
      const awayScore = document.querySelector('#awayScore')?.textContent;
      return { minute, homeScore, awayScore };
    })()`,
    returnByValue: true
  });
  console.log('After resume:', afterResume.result.value);

  if (errors.length) {
    console.error('JS Errors encountered:', JSON.stringify(errors, null, 2));
  } else {
    console.log('✓ 0 JS Errors encountered!');
  }

  ws.close();
  chrome.kill();
  server.close();
}
run().catch(e => { console.error(e); process.exit(1); });
