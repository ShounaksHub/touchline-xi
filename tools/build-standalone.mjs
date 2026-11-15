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
  return { TEAMS, FORMATIONS, DEFAULT_TACTICS, PLAY_STYLES, getTeam, getPlayer, CLUBS };
})();

const Sound = (() => {
  ${soundData}
  return { sound };
})();

const Engine = (({ getTeam, getPlayer, DEFAULT_TACTICS, FORMATIONS, TEAMS }) => {
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

((
  { TEAMS, FORMATIONS, DEFAULT_TACTICS, PLAY_STYLES, getTeam, getPlayer, CLUBS },
  { createMatch, advanceMinute, playFullMatch, matchFromFrame, applyTactic, changeFormation, swapPlayer, resetStartingXI, resultLabel, applyShout, applyTeamTalk, simulatePenaltyShootout },
  { renderPitch },
  { sound },
  { createTournament, loadTournament, saveTournament, clearTournament, simulateAIMatch, recordTournamentResult, getLeaderboard, TOURNAMENT_PRESETS },
  { getTeamBadgeSvg }
) => {
  ${appModule}
})(Data, Engine, Pitch, Sound, Tournament, Badges);
`;

const template = read('index.template.html');
const css = read('styles.css');

const logoBase64 = fs.readFileSync(path.join(root, 'assets/logo.jpg')).toString('base64');
const logoDataUri = `data:image/jpeg;base64,${logoBase64}`;

const standaloneHtml = template
  .replace('<link rel="stylesheet" href="styles.css" />', `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="src/app.js"></script>', '')
  .replace('assets/logo.jpg', logoDataUri)
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
  for (const file of fs.readdirSync(srcAssets)) {
    fs.copyFileSync(path.join(srcAssets, file), path.join(dest, file));
  }
};

copyAssets(distDir);
copyAssets(publicDir);

console.log(`✓ Standalone bundle generated: touchline-xi-standalone.html, index.html, dist/ & public/ (${Math.round(Buffer.byteLength(standaloneHtml)/1024)} KiB)`);
