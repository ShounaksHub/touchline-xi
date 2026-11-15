import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const strip=filename=>read(`src/${filename}`).replace(/^import .*?;\s*/gm,'').replace(/\bexport\s+/g,'');
const nationalData = read('src/data/national_teams.js').replace(/^import .*?;\s*/gm,'').replace(/\bexport\s+/g,'');
const js=`
${nationalData}
const Data=(()=>{${strip('data.js')}\nreturn {TEAMS,FORMATIONS,DEFAULT_TACTICS,getTeam,getPlayer};})();
const Engine=(({getTeam,getPlayer,DEFAULT_TACTICS,FORMATIONS})=>{${strip('engine.js')}\nreturn {createMatch,advanceMinute,playFullMatch,matchFromFrame,applyTactic,changeFormation,swapPlayer,resetStartingXI,resultLabel};})(Data);
const Pitch=(({getTeam,getPlayer,FORMATIONS})=>{${strip('pitch.js')}\nreturn {renderPitch};})(Data);
(({TEAMS,FORMATIONS,DEFAULT_TACTICS,getTeam,getPlayer},{createMatch,advanceMinute,playFullMatch,matchFromFrame,applyTactic,changeFormation,swapPlayer,resetStartingXI,resultLabel},{renderPitch})=>{${strip('app.js')}\n})(Data,Engine,Pitch);
`;
const html=read('index.html')
  .replace('<link rel="stylesheet" href="styles.css" />',`<style>\n${read('styles.css')}\n</style>`)
  .replace('<script type="module" src="src/app.js"></script>','')
  .replace('<link rel="icon" href="assets/favicon.svg" type="image/svg+xml" />','')
  .replace('</body>',()=>`<script type="module">\n${js}\n</script>\n</body>`);
const destination=path.join(root,'touchline-xi-standalone.html');
fs.writeFileSync(destination,html);
console.log(`Standalone demo generated: ${destination} (${Math.round(Buffer.byteLength(html)/1024)} KiB)`);
