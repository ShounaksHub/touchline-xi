import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.template.html', 'utf8');
const appJs = fs.readFileSync('src/app.js', 'utf8');

const idMatches = [...appJs.matchAll(/\$\(['"]#([a-zA-Z0-9_-]+)['"]\)/g)].map(m => m[1]);
const uniqueIds = [...new Set(idMatches)];

console.log('Total unique IDs queried in app.js:', uniqueIds.length);
const missing = [];
for (const id of uniqueIds) {
  if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
    missing.push(id);
  }
}

if (missing.length) {
  console.log('MISSING IDs in HTML template:', missing);
} else {
  console.log('All queried IDs exist in HTML template!');
}
