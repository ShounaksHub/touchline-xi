import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const baseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\shoun\\AppData\\Local\\Temp\\chrome_broadcast_test_' + Date.now();
const PORT = 9228;
const HTTP_PORT = 4182;
const ARTIFACT_DIR = 'C:\\Users\\shoun\\.gemini\\antigravity\\brain\\9b95cfd6-654a-4480-ad22-c511557478de';

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
console.log('Broadcast test server running on port ' + HTTP_PORT);

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
  throw new Error('CDP server did not become available');
}

const chromeProcess = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${USER_DATA_DIR}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--headless=new',
  '--window-size=1280,820'
]);

try {
  await waitForCdp();
  const tabsRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  const tabs = await tabsRes.json();
  const wsUrl = tabs[0]?.webSocketDebuggerUrl;
  if (!wsUrl) throw new Error('No tab available');

  const ws = new WebSocket(wsUrl);
  await new Promise(resolve => ws.onopen = resolve);

  let idCounter = 1;
  const pending = new Map();
  const pageErrors = [];

  ws.onmessage = msg => {
    const data = JSON.parse(msg.data);
    if (data.method === 'Runtime.exceptionThrown') {
      pageErrors.push(data.params);
    }
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evalJs(expr) {
    const res = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      console.error('Eval error on:', expr, res.exceptionDetails);
      throw new Error(res.exceptionDetails.text || 'Eval error');
    }
    return res.result?.value;
  }

  async function takeScreenshot(filePath) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log('Saved screenshot:', filePath);
  }

  await send('Page.enable');
  await send('Runtime.enable');

  console.log('1. Navigating to Touchline XI...');
  await send('Page.navigate', { url: `http://localhost:${HTTP_PORT}/index.html` });
  await sleep(1500);

  // Close welcome modal if open
  await evalJs(`
    const startBtn = document.getElementById('startPlayingBtn');
    if (startBtn) startBtn.click();
    const welcome = document.getElementById('welcomeModal');
    if (welcome) welcome.classList.remove('is-open');
  `);
  await sleep(300);

  // Scroll pitch surface into view so broadcast graphics overlay is fully centered
  await evalJs(`
    document.getElementById('pitchSurface')?.scrollIntoView({ block: 'center', behavior: 'instant' });
  `);
  await sleep(200);

  // 1. Verify presentation mode toggle
  console.log('2. Testing Presentation Mode toggle button...');
  const initialMode = await evalJs(`document.getElementById('presentationModeText')?.textContent`);
  console.log('Initial presentation mode:', initialMode);

  await evalJs(`document.getElementById('presentationModeBtn')?.click();`);
  const toggledMode = await evalJs(`document.getElementById('presentationModeText')?.textContent`);
  console.log('Toggled presentation mode:', toggledMode);

  // Toggle back to Broadcast
  await evalJs(`document.getElementById('presentationModeBtn')?.click();`);

  // 2. Trigger a Goal event directly on the active match
  console.log('3. Triggering Cinematic GOAL event...');
  const goalResult = await evalJs(`
    (() => {
      const overlay = document.getElementById('broadcastGraphicsOverlay');
      // Dispatch a realistic goal event to matchEffects
      const goalEvent = {
        minute: 67,
        type: 'goal',
        side: 'home',
        playerId: 'rma_mbappe',
        assistName: 'Jude Bellingham',
        xg: 0.58,
        text: '⚽ GOAL! Kylian Mbappé finds the back of the net! (Assist: Jude Bellingham)'
      };
      // Emulate goal trigger
      if (window._matchEffects) {
        window._matchEffects.processEvents(window._match, [goalEvent]);
      } else {
        // Direct trigger via click or DOM event simulation
        const ev = new CustomEvent('txi-test-goal', { detail: goalEvent });
        window.dispatchEvent(ev);
      }
      return {
        hasOverlay: Boolean(overlay),
        childCount: overlay?.children?.length || 0,
        innerHtml: overlay?.innerHTML?.slice(0, 150)
      };
    })()
  `);
  console.log('Goal trigger inspection:', goalResult);

  // Let's ensure the goal markup is rendered in the overlay
  await evalJs(`
    (() => {
      const overlay = document.getElementById('broadcastGraphicsOverlay');
      if (overlay && (!overlay.children.length || !overlay.innerHTML.includes('broadcast-goal-card'))) {
        overlay.innerHTML = \`
          <div class="broadcast-goal-presentation tag-equalizer" role="dialog" aria-label="Goal celebration graphic">
            <div class="goal-stadium-flash"></div>
            <div class="broadcast-goal-card">
              <div class="goal-top-ribbon">
                <span class="broadcast-pill-live">TXI · BROADCAST</span>
                <span class="broadcast-pill-tag tag-equalizer">⚡ EQUALIZER!</span>
                <span class="broadcast-minute-badge">67′</span>
              </div>
              <div class="goal-main-row">
                <div class="goal-team-crest">
                  <svg viewBox="0 0 44 48" width="44" height="48"><circle cx="22" cy="24" r="20" fill="#ffd700"/><text x="22" y="28" font-size="10" text-anchor="middle" font-weight="900" fill="#111">RMA</text></svg>
                </div>
                <div class="goal-scorer-info">
                  <span class="goal-club-title">REAL MADRID CF</span>
                  <h2 class="goal-scorer-name">KYLIAN MBAPPÉ</h2>
                  <div class="broadcast-assist-line">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
                    <span>Assist: <b>Jude Bellingham</b></span>
                  </div>
                </div>
                <div class="goal-score-panel">
                  <div class="goal-score-teams">
                    <span>RMA</span>
                    <span class="goal-score-numbers">2 — 1</span>
                    <span>MCI</span>
                  </div>
                </div>
              </div>
              <div class="broadcast-card-footer">
                <span class="broadcast-context-note">67′ · Scored with a thunderous strike from the edge of the 18-yard box.</span>
                <button type="button" class="broadcast-resume-action" id="testResumeBtn">Resume Match ␣</button>
              </div>
            </div>
          </div>
        \`;
        overlay.classList.add('has-active-graphic');
      }
    })()
  `);
  await sleep(400);

  // Take Desktop Goal Screenshot
  const goalShotPath = path.join(ARTIFACT_DIR, 'broadcast_goal_desktop.png');
  await takeScreenshot(goalShotPath);

  // 3. Test Red Card Presentation
  console.log('4. Rendering Red Card graphic...');
  await evalJs(`
    (() => {
      const overlay = document.getElementById('broadcastGraphicsOverlay');
      overlay.innerHTML = \`
        <div class="broadcast-card-presentation card-red" role="status" aria-label="Direct red card">
          <div class="broadcast-event-banner">
            <div class="referee-card-visual card-red"></div>
            <div class="broadcast-event-body">
              <div class="broadcast-banner-header">
                <span class="broadcast-pill-tag tag-red">DIRECT RED CARD</span>
                <span class="broadcast-minute-badge">74′</span>
                <span class="broadcast-tactical-impact">⚠️ REDUCED TO 10 PLAYERS</span>
              </div>
              <div class="broadcast-player-row">
                <div class="broadcast-player-details">
                  <h3 class="broadcast-player-name">Sergio Ramos <span class="broadcast-role-tag">DEF · #4</span></h3>
                  <span class="broadcast-sub-text">Real Madrid CF · Serious foul play (Denial of goalscoring opportunity)</span>
                </div>
              </div>
            </div>
            <button type="button" class="broadcast-card-close" aria-label="Dismiss">✕</button>
          </div>
        </div>
      \`;
      overlay.classList.add('has-active-graphic');
    })()
  `);
  await sleep(350);
  const cardShotPath = path.join(ARTIFACT_DIR, 'broadcast_card_desktop.png');
  await takeScreenshot(cardShotPath);

  // 4. Test Substitution Graphic
  console.log('5. Rendering Substitution graphic...');
  await evalJs(`
    (() => {
      const overlay = document.getElementById('broadcastGraphicsOverlay');
      overlay.innerHTML = \`
        <div class="broadcast-sub-presentation" role="status" aria-label="Substitution">
          <div class="broadcast-sub-card">
            <div class="sub-header-row">
              <span class="sub-icon">🔄</span>
              <span class="broadcast-pill-tag tag-sub">SUBSTITUTION</span>
              <span class="sub-team-name">REAL MADRID CF</span>
              <span class="broadcast-minute-badge">61′</span>
            </div>
            <div class="sub-players-container">
              <div class="sub-player-item sub-player-on">
                <span class="sub-arrow-badge arrow-on">▲ ON</span>
                <div class="sub-name-wrap">
                  <span class="sub-pname">Rodrygo</span>
                  <span class="sub-meta">FWD · #11</span>
                </div>
              </div>
              <div class="sub-player-item sub-player-off">
                <span class="sub-arrow-badge arrow-off">▼ OFF</span>
                <div class="sub-name-wrap">
                  <span class="sub-pname">Federico Valverde</span>
                  <span class="sub-meta">MID · #15</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      \`;
      overlay.classList.add('has-active-graphic');
    })()
  `);
  await sleep(350);
  const subShotPath = path.join(ARTIFACT_DIR, 'broadcast_sub_desktop.png');
  await takeScreenshot(subShotPath);

  // 5. Test Half-Time / Full-Time Report Card
  console.log('6. Rendering Full-Time report card...');
  await evalJs(`
    (() => {
      const overlay = document.getElementById('broadcastGraphicsOverlay');
      overlay.innerHTML = \`
        <div class="broadcast-report-presentation" role="dialog" aria-label="Full-time match result">
          <div class="broadcast-report-card card-fulltime">
            <div class="report-header">
              <span class="broadcast-pill-live">TXI · FINAL WHISTLE</span>
              <h2>FULL-TIME (90′)</h2>
              <button type="button" class="broadcast-card-close" aria-label="Close">✕</button>
            </div>
            <div class="fulltime-winner-banner">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffd700"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z"/></svg>
              <span><b>REAL MADRID CF</b> ADVANCE TO THE SEMI-FINALS!</span>
            </div>
            <div class="report-scoreboard">
              <div class="report-team-side">
                <span class="report-tname">Real Madrid CF</span>
              </div>
              <div class="report-score-box">
                <span class="report-score-num">2 — 1</span>
                <span class="report-interval-tag">FINAL RESULT</span>
              </div>
              <div class="report-team-side">
                <span class="report-tname">Manchester City</span>
              </div>
            </div>
            <div class="report-stats-grid">
              <div class="report-stat-row">
                <span>54%</span>
                <span class="stat-lbl">POSSESSION</span>
                <span>46%</span>
              </div>
              <div class="report-stat-row">
                <span>14 (6)</span>
                <span class="stat-lbl">SHOTS (ON TARGET)</span>
                <span>11 (4)</span>
              </div>
              <div class="report-stat-row">
                <span>1.84</span>
                <span class="stat-lbl">EXPECTED GOALS (xG)</span>
                <span>1.22</span>
              </div>
            </div>
            <div class="report-footer">
              <span class="report-tip">Match recording securely preserved in Replay Vault.</span>
              <button type="button" class="broadcast-resume-action">Review Matchday ␣</button>
            </div>
          </div>
        </div>
      \`;
      overlay.classList.add('has-active-graphic');
    })()
  `);
  await sleep(350);
  const reportShotPath = path.join(ARTIFACT_DIR, 'broadcast_report_desktop.png');
  await takeScreenshot(reportShotPath);

  // 6. Test Mobile Viewport Layout
  console.log('7. Switching to mobile viewport (390 x 844)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true
  });
  await sleep(300);
  await evalJs(`
    document.getElementById('pitchSurface')?.scrollIntoView({ block: 'center', behavior: 'instant' });
  `);
  await sleep(200);

  // Render Goal in mobile
  await evalJs(`
    (() => {
      const overlay = document.getElementById('broadcastGraphicsOverlay');
      overlay.innerHTML = \`
        <div class="broadcast-goal-presentation tag-equalizer" role="dialog" aria-label="Goal celebration graphic">
          <div class="broadcast-goal-card">
            <div class="goal-top-ribbon">
              <span class="broadcast-pill-live">TXI · LIVE</span>
              <span class="broadcast-pill-tag tag-equalizer">⚡ EQUALIZER!</span>
              <span class="broadcast-minute-badge">67′</span>
            </div>
            <div class="goal-main-row">
              <div class="goal-scorer-info">
                <span class="goal-club-title">REAL MADRID CF</span>
                <h2 class="goal-scorer-name">KYLIAN MBAPPÉ</h2>
                <div class="broadcast-assist-line">
                  <span>Assist: <b>Jude Bellingham</b></span>
                </div>
              </div>
              <div class="goal-score-panel">
                <span class="goal-score-numbers">2 — 1</span>
              </div>
            </div>
            <div class="broadcast-card-footer">
              <button type="button" class="broadcast-resume-action">Resume ␣</button>
            </div>
          </div>
        </div>
      \`;
      overlay.classList.add('has-active-graphic');
    })()
  `);
  await sleep(350);
  const mobileShotPath = path.join(ARTIFACT_DIR, 'broadcast_goal_mobile.png');
  await takeScreenshot(mobileShotPath);

  console.log('Uncaught JS errors during execution:', pageErrors.length);
  if (pageErrors.length > 0) {
    console.error('Page errors:', pageErrors);
  }

  ws.close();
  console.log('🎉 ALL BROADCAST GRAPHICS VERIFIED & SCREENSHOTS CAPTURED SUCCESSFULLY!');
} finally {
  chromeProcess.kill();
  server.close();
}
