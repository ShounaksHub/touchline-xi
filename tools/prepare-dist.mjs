import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'public');

fs.mkdirSync(dist, { recursive: true });

// Copy all static files into public/
const copyRecursive = (src, dest) => {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
};

// Copy core assets
copyRecursive(path.join(root, 'index.html'), path.join(dist, 'index.html'));
copyRecursive(path.join(root, 'styles.css'), path.join(dist, 'styles.css'));
copyRecursive(path.join(root, 'assets'), path.join(dist, 'assets'));
copyRecursive(path.join(root, 'src'), path.join(dist, 'src'));
copyRecursive(path.join(root, 'touchline-xi-standalone.html'), path.join(dist, 'touchline-xi-standalone.html'));

console.log('Successfully prepared public directory for Vercel static serving.');
