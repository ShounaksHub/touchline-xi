import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('touchline-xi-standalone.html', 'utf8');
const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);

if (!scriptMatch) {
  console.error('ERROR: No script tag found in touchline-xi-standalone.html');
  process.exit(1);
}

const js = scriptMatch[1];
console.log('Script length (chars):', js.length);

try {
  // Test parsing
  new vm.Script(js);
  console.log('SUCCESS: Script parsed with 0 syntax errors!');
} catch (err) {
  console.error('SYNTAX ERROR:', err);
  process.exit(1);
}
