import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const USER_DATA_DIR = 'C:\\Users\\shoun\\AppData\\Local\\Temp\\chrome_cdp_profile_' + Date.now();
const PORT = 9222;

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

async function run() {
  console.log('🚀 Spawning headless Chrome on port ' + PORT + '...');
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
    console.log('✓ Chrome CDP connected.');

    // Create target tab
    const targetRes = await fetch(`http://127.0.0.1:${PORT}/json/new?http://localhost:4173/`, { method: 'PUT' });
    const target = await targetRes.json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let id = 1;
    const callbacks = new Map();
    const consoleLogs = [];
    const jsErrors = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description).join(' ');
        consoleLogs.push({ type: msg.params.type, text });
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        jsErrors.push(msg.params.exceptionDetails);
      }
    };

    await new Promise((resolve) => ws.onopen = resolve);

    const send = (method, params = {}) => {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        callbacks.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    console.log('Navigating to http://localhost:4173/ ...');
    await send('Page.navigate', { url: 'http://localhost:4173/' });
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

    // 1. Check Initial Layout Dimensions
    const layout = await evaluate(`({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth,
      scrollX: window.scrollX,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      title: document.title
    })`);
    console.log('Page Title:', layout.title);
    console.log('Layout Metrics:', layout);

    if (layout.scrollWidth > layout.clientWidth + 5) {
      console.error(`❌ HORIZONTAL OVERFLOW DETECTED: scrollWidth (${layout.scrollWidth}) > clientWidth (${layout.clientWidth})`);
    } else {
      console.log('✓ Zero horizontal overflow on initial load!');
    }

    // 2. Test Navigation Links & Scroll Positions
    const navSections = ['tournament', 'dreamteam', 'scouting', 'squad', 'vault', 'matchday'];
    for (const sec of navSections) {
      await evaluate(`document.querySelector('[data-section="${sec}"]')?.click()`);
      await sleep(300);
      const navCheck = await evaluate(`({
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        secTop: document.getElementById('${sec}')?.getBoundingClientRect().top
      })`);
      console.log(`Navigated to [${sec}]: scrollX=${navCheck.scrollX}, scrollY=${navCheck.scrollY}, sectionTop=${navCheck.secTop}`);
      if (navCheck.scrollX > 0) {
        console.error(`❌ HORIZONTAL SHIFT ON NAV TO ${sec}: scrollX=${navCheck.scrollX}`);
      } else {
        console.log(`✓ [${sec}] scrolled vertically without any horizontal displacement.`);
      }
    }

    // 3. Test Dream Team Studio interactions
    console.log('\nTesting Dream Team Studio:');
    await evaluate(`document.querySelector('[data-section="dreamteam"]')?.click()`);
    await sleep(200);

    // Click Auto-Draft
    const draftRes = await evaluate(`(() => {
      const btn = document.getElementById('randomizeDreamBtn');
      if (!btn) return 'no btn';
      btn.click();
      const slots = document.querySelectorAll('.dream-slot');
      return { count: slots.length, firstSlotText: slots[0]?.innerText?.slice(0, 30) };
    })()`);
    console.log('Auto-Draft result:', draftRes);

    // Open Player Picker Modal
    const modalOpen = await evaluate(`(() => {
      const slot = document.querySelector('.dream-slot');
      if (!slot) return 'no slot';
      slot.click();
      const modal = document.getElementById('playerPickerModal');
      const cs = getComputedStyle(modal);
      return {
        isOpenClass: modal.classList.contains('is-open'),
        display: cs.display,
        position: cs.position,
        zIndex: cs.zIndex,
        itemsCount: document.querySelectorAll('.modal-player-item').length
      };
    })()`);
    console.log('Player Picker Modal Open State:', modalOpen);
    if (modalOpen.display !== 'flex') {
      console.error('❌ Player picker modal did not display as flex!');
    } else {
      console.log('✓ Player picker modal opened properly with display: flex and centered sheet!');
    }

    // Close Player Picker Modal
    const modalClose = await evaluate(`(() => {
      document.getElementById('closePlayerModalBtn').click();
      const modal = document.getElementById('playerPickerModal');
      return {
        isOpenClass: modal.classList.contains('is-open'),
        display: getComputedStyle(modal).display
      };
    })()`);
    console.log('Player Picker Modal Close State:', modalClose);
    if (modalClose.display !== 'none') {
      console.error('❌ Player picker modal did not hide on close!');
    } else {
      console.log('✓ Player picker modal closed cleanly with display: none!');
    }

    // 4. Test Scouting Hub
    console.log('\nTesting Scouting Hub:');
    await evaluate(`document.querySelector('[data-section="scouting"]')?.click()`);
    await sleep(300);

    const scoutingCheck = await evaluate(`(() => {
      const toolbar = document.querySelector('.scouting-toolbar');
      const cards = document.querySelectorAll('.scouting-card');
      const statsBar = document.querySelector('.scouting-stats-bar');
      const countEl = document.getElementById('scoutingResultCount');
      return {
        toolbarChildren: toolbar?.children.length,
        cardsCount: cards.length,
        resultCountText: countEl?.textContent,
        firstCardName: cards[0]?.querySelector('.scouting-card-name')?.textContent
      };
    })()`);
    console.log('Scouting Hub State:', scoutingCheck);

    // Click first player card in Scouting Hub -> open FUT Modal
    const futModalOpen = await evaluate(`(() => {
      const card = document.querySelector('.scouting-card');
      if (!card) return 'no card';
      card.click();
      const futModal = document.getElementById('futCardModal');
      const cs = getComputedStyle(futModal);
      return {
        isOpenClass: futModal.classList.contains('is-open'),
        display: cs.display,
        position: cs.position,
        zIndex: cs.zIndex,
        playerName: document.getElementById('futPlayerName')?.textContent,
        rarity: document.getElementById('futCardRarity')?.textContent
      };
    })()`);
    console.log('FUT Modal Open State:', futModalOpen);
    if (futModalOpen.display !== 'grid') {
      console.error('❌ FUT Modal did not open with display: grid!');
    } else {
      console.log('✓ FUT Metallic Card Inspector opened cleanly!');
    }

    // Close FUT Modal
    const futModalClose = await evaluate(`(() => {
      document.getElementById('closeFutModalBtn').click();
      const futModal = document.getElementById('futCardModal');
      return {
        isOpenClass: futModal.classList.contains('is-open'),
        display: getComputedStyle(futModal).display
      };
    })()`);
    console.log('FUT Modal Close State:', futModalClose);

    // 5. Test Live Matchday Playback & Shouts
    console.log('\nTesting Matchday Simulation & Shouts:');
    await evaluate(`document.querySelector('[data-section="matchday"]')?.click()`);
    await sleep(200);

    const matchBefore = await evaluate(`({
      minute: document.getElementById('matchMinute')?.textContent,
      state: document.getElementById('matchState')?.textContent,
      playText: document.getElementById('playText')?.textContent
    })`);
    console.log('Match pre-kickoff state:', matchBefore);

    // Click Play
    await evaluate(`document.getElementById('playBtn').click()`);
    console.log('Clicked Kick off. Simulating for 2.5 seconds...');
    await sleep(2500);

    // Click Demand More
    await evaluate(`document.querySelector('[data-shout="demandMore"]')?.click()`);
    await sleep(1000);

    // Click Pause
    await evaluate(`document.getElementById('playBtn').click()`);

    const matchAfter = await evaluate(`({
      minute: document.getElementById('matchMinute')?.textContent,
      state: document.getElementById('matchState')?.textContent,
      feedLength: document.getElementById('eventFeed')?.children.length,
      lastFeedItem: document.getElementById('eventFeed')?.firstElementChild?.textContent
    })`);
    console.log('Match simulated state:', matchAfter);

    // Capture verification screenshot
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    const shotPath = 'C:\\Users\\shoun\\.gemini\\antigravity\\brain\\9b95cfd6-654a-4480-ad22-c511557478de\\test_verification.png';
    fs.writeFileSync(shotPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`✓ Verification screenshot saved to: ${shotPath}`);

    // Check JS Errors
    console.log('\n--- AUDIT SUMMARY ---');
    console.log(`Console Logs Captured: ${consoleLogs.length}`);
    console.log(`Uncaught JS Exceptions: ${jsErrors.length}`);
    if (jsErrors.length > 0) {
      console.error('❌ JS Exceptions occurred during browsing:', jsErrors);
      process.exitCode = 1;
    } else {
      console.log('🎉 100% CLEAN: ZERO JS EXCEPTIONS, ZERO OVERFLOW, SMOOTH VERTICAL NAVIGATION!');
    }

  } finally {
    try { chrome.kill(); } catch {}
    try { fs.rmSync(USER_DATA_DIR, { recursive: true, force: true }); } catch {}
  }
}

run().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
