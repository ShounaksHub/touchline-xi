import fs from 'node:fs';
import path from 'node:path';

async function fetchFonts() {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const url = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap';
  const res = await fetch(url, { headers: { 'User-Agent': userAgent } });
  const css = await res.text();
  
  const blocks = css.split('@font-face').slice(1).map(b => '@font-face' + b);
  const targetDir = path.resolve('assets/fonts');
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const savedFonts = [];
  
  for (const block of blocks) {
    if (!block.includes('/* latin */')) continue;
    
    const familyMatch = block.match(/font-family:\s*['"]?([^'";]+)['"]?/);
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    const styleMatch = block.match(/font-style:\s*(\w+)/);
    const urlMatch = block.match(/src:\s*url\((https:\/\/[^)]+\.woff2)\)/);
    
    if (familyMatch && weightMatch && urlMatch) {
      const family = familyMatch[1].trim();
      const weight = weightMatch[1].trim();
      const style = styleMatch ? styleMatch[1].trim() : 'normal';
      const fontUrl = urlMatch[1];
      
      const safeName = family.toLowerCase().replace(/\s+/g, '-') + '-' + weight + '.woff2';
      const filePath = path.join(targetDir, safeName);
      
      console.log('Downloading', safeName, 'from', fontUrl);
      const fontRes = await fetch(fontUrl);
      const buffer = Buffer.from(await fontRes.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      
      savedFonts.push({
        family,
        weight,
        style,
        file: safeName,
        size: buffer.length
      });
    }
  }
  
  console.log('Saved fonts count:', savedFonts.length);
  for (const f of savedFonts) {
    console.log(`- ${f.family} (${f.weight}): ${f.file} (${f.size} bytes)`);
  }
}

fetchFonts().catch(err => {
  console.error(err);
  process.exit(1);
});
