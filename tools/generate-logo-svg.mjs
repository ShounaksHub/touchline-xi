import fs from 'node:fs';

const imgBase64 = fs.readFileSync('assets/logo.jpg').toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <clipPath id="roundedLogo">
      <rect x="0" y="0" width="512" height="512" rx="115" ry="115" />
    </clipPath>
  </defs>
  <image href="data:image/jpeg;base64,${imgBase64}" x="0" y="0" width="512" height="512" clip-path="url(#roundedLogo)" preserveAspectRatio="xMidYMid slice" />
</svg>`;

fs.writeFileSync('assets/favicon.svg', svg);
fs.writeFileSync('assets/logo.svg', svg);
console.log('Successfully generated assets/favicon.svg and assets/logo.svg');
