import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const strip = code => code
  .replace(/^import\s+[\s\S]*?;\s*/gm, '')
  .replace(/^export\s+(const|let|function|class)\s+/gm, '$1 ')
  .replace(/^export\s+\{[^}]*\};\s*/gm, '')
  .replace(/^export\s+default\s+.*?;/gm, '');

const nationalData = strip(read('src/data/national_teams.js'));
const clubsData = strip(read('src/data/clubs.js'));
const soundData = strip(read('src/sound.js'));
const badgesModule = strip(read('src/badges.js'));
const dataModule = strip(read('src/data.js'));
const engineModule = strip(read('src/engine.js'));
const tournamentModule = strip(read('src/tournament.js'));
const pitchModule = strip(read('src/pitch.js'));
const matchEffectsModule = strip(read('src/match-effects.js'));
const duelModule = strip(read('src/duel.js'));
const tutorialModule = strip(read('src/tutorial.js'));
const appModule = strip(read('src/app.js'));

const bundledJs = `
${nationalData}
${clubsData}

const Badges = (() => {
  ${badgesModule}
  return { getTeamBadgeSvg };
})();

const Data = (() => {
  ${dataModule}
  return { TEAMS, FORMATIONS, DEFAULT_TACTICS, PLAY_STYLES, getTeam, getPlayer, CLUBS, registerCustomTeam };
})();

const Sound = (() => {
  ${soundData}
  return { sound };
})();

const Engine = (({ getTeam, getPlayer, DEFAULT_TACTICS, FORMATIONS, TEAMS, registerCustomTeam }) => {
  ${engineModule}
  return {
    createMatch, advanceMinute, playFullMatch, matchFromFrame,
    applyTactic, changeFormation, swapPlayer, resetStartingXI,
    resultLabel, applyShout, applyTeamTalk, simulatePenaltyShootout
  };
})(Data);

const Tournament = (({ TEAMS, getTeam, getPlayer }, { createMatch, playFullMatch }) => {
  ${tournamentModule}
  return {
    createTournament, loadTournament, saveTournament, clearTournament,
    simulateAIMatch, recordTournamentResult, getLeaderboard, TOURNAMENT_PRESETS
  };
})(Data, Engine);

const Pitch = (({ getTeam, getPlayer, FORMATIONS }) => {
  ${pitchModule}
  return { renderPitch };
})(Data);

const MatchEffects = (({ getTeam, getPlayer }, { getTeamBadgeSvg }, { sound }) => {
  ${matchEffectsModule}
  return { MatchEffectsController, createMatchEffects };
})(Data, Badges, Sound);

const Duel = (({ getPlayer }) => {
  ${duelModule}
  return { createPlayerDuel, advanceDuelTick, playFullDuel, renderDuelPitch, DUEL_TYPES, DUEL_PITCH };
})(Data);

const Tutorial = (() => {
  ${tutorialModule}
  return { TutorialController, TUTORIAL_MODES, TUTORIAL_STEPS };
})();

((
  { TEAMS, FORMATIONS, DEFAULT_TACTICS, PLAY_STYLES, getTeam, getPlayer, CLUBS, registerCustomTeam },
  { createMatch, advanceMinute, playFullMatch, matchFromFrame, applyTactic, changeFormation, swapPlayer, resetStartingXI, resultLabel, applyShout, applyTeamTalk, simulatePenaltyShootout },
  { renderPitch },
  { sound },
  { createTournament, loadTournament, saveTournament, clearTournament, simulateAIMatch, recordTournamentResult, getLeaderboard, TOURNAMENT_PRESETS },
  { getTeamBadgeSvg },
  { MatchEffectsController, createMatchEffects },
  { createPlayerDuel, advanceDuelTick, playFullDuel, renderDuelPitch, DUEL_TYPES },
  { TutorialController, TUTORIAL_MODES, TUTORIAL_STEPS }
) => {
  ${appModule}
})(Data, Engine, Pitch, Sound, Tournament, Badges, MatchEffects, Duel, Tutorial);
`;

const template = read('index.template.html');
let css = read('styles.css');

// Inline self-hosted fonts into CSS for standalone offline execution
const fontFiles = [
  { path: 'assets/fonts/barlow-condensed-600.woff2', url: 'assets/fonts/barlow-condensed-600.woff2' },
  { path: 'assets/fonts/barlow-condensed-700.woff2', url: 'assets/fonts/barlow-condensed-700.woff2' },
  { path: 'assets/fonts/barlow-condensed-800.woff2', url: 'assets/fonts/barlow-condensed-800.woff2' },
  { path: 'assets/fonts/inter-variable.woff2', url: 'assets/fonts/inter-variable.woff2' }
];

for (const font of fontFiles) {
  const fullPath = path.join(root, font.path);
  if (fs.existsSync(fullPath)) {
    const base64Font = fs.readFileSync(fullPath).toString('base64');
    css = css.replaceAll(font.url, `data:font/woff2;base64,${base64Font}`);
  }
}

const logoSvg = read('assets/logo.svg');
const logoSvgDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;
const faviconSvg = fs.existsSync(path.join(root, 'assets/favicon.svg')) ? read('assets/favicon.svg') : logoSvg;
const faviconDataUri = `data:image/svg+xml;base64,${Buffer.from(faviconSvg).toString('base64')}`;

const standaloneHtml = template
  .replace('<link rel="stylesheet" href="styles.css" />', `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="src/app.js"></script>', '')
  .replaceAll('assets/logo.svg', logoSvgDataUri)
  .replaceAll('assets/logo.jpg', logoSvgDataUri)
  .replaceAll('assets/favicon.svg', faviconDataUri)
  .replace('</body>', () => `<script type="module">\n${bundledJs}\n</script>\n</body>`);

// Write both standalone and root index.html for zero-config GitHub Pages & Vercel
fs.writeFileSync(path.join(root, 'touchline-xi-standalone.html'), standaloneHtml);
fs.writeFileSync(path.join(root, 'index.html'), standaloneHtml);

// Also generate dist/ directory for Vercel static output
const distDir = path.join(root, 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'index.html'), standaloneHtml);
fs.writeFileSync(path.join(distDir, 'touchline-xi-standalone.html'), standaloneHtml);
if (fs.existsSync(path.join(root, 'styles.css'))) {
  fs.copyFileSync(path.join(root, 'styles.css'), path.join(distDir, 'styles.css'));
}

// Also generate public/ directory for universal zero-config host fallback
const publicDir = path.join(root, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'index.html'), standaloneHtml);
fs.writeFileSync(path.join(publicDir, 'touchline-xi-standalone.html'), standaloneHtml);
if (fs.existsSync(path.join(root, 'styles.css'))) {
  fs.copyFileSync(path.join(root, 'styles.css'), path.join(publicDir, 'styles.css'));
}

const copyAssets = (targetDir) => {
  const srcAssets = path.join(root, 'assets');
  if (!fs.existsSync(srcAssets)) return;
  const dest = path.join(targetDir, 'assets');
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(srcAssets, dest, { recursive: true });
};

const copyMusic = (targetDir) => {
  const srcMusic = path.join(root, 'music of the game');
  if (!fs.existsSync(srcMusic)) return;
  const dest = path.join(targetDir, 'music of the game');
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(srcMusic)) fs.copyFileSync(path.join(srcMusic, file), path.join(dest, file));
};

copyAssets(distDir);
copyAssets(publicDir);
copyMusic(distDir);
copyMusic(publicDir);

console.log(`✓ Standalone bundle generated: touchline-xi-standalone.html, index.html, dist/ & public/ (${Math.round(Buffer.byteLength(standaloneHtml)/1024)} KiB)`);
