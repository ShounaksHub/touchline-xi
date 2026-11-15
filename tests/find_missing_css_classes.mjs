import fs from 'node:fs';

const html = fs.readFileSync('index.template.html', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

// Extract all class attributes from html
const classMatches = [...html.matchAll(/class=["']([^"']+)["']/g)];
const htmlClasses = new Set();
for (const m of classMatches) {
  for (const c of m[1].trim().split(/\s+/)) {
    if (c) htmlClasses.add(c);
  }
}

const missing = [];
for (const cls of htmlClasses) {
  // Search for .cls in css
  const regex = new RegExp(`\\.${cls}\\b`);
  if (!regex.test(css)) {
    missing.push(cls);
  }
}

console.log('Total classes in HTML:', htmlClasses.size);
console.log('Classes MISSING from styles.css (' + missing.length + '):', missing);
