import fs from 'node:fs';

const html = fs.readFileSync('index.template.html', 'utf8');
const testIds = [
  'playBtn', 'stepBtn', 'fullTimeBtn', 'pitchCanvas', 'managerShoutsPanel', 'statistics', 'eventFeed', 'flowPlot',
  'homeSelect', 'awaySelect', 'formationButtons', 'pressingRange', 'tempoRange', 'widthRange', 'mentalityButtons', 'squadList', 'benchList',
  'tournamentPresetSelect', 'tournamentBracketWrapper', 'activeTournamentFixture',
  'dreamFormationButtons', 'dreamStartersGrid', 'dreamBenchGrid', 'deployDreamBtn',
  'scoutSearchInput', 'scoutRoleFilter', 'scoutTierFilter', 'scoutingPlayerGrid',
  'vaultList', 'saveVaultBtn',
  'duelTypeSelect', 'duelP1Card', 'duelP2Card', 'startDuelBtn'
];

testIds.forEach(id => {
  const found = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  console.log(id, found ? 'FOUND' : 'MISSING');
});
