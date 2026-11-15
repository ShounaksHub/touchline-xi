/**
 * Touchline XI - Official High-Fidelity Vector Team Badges & Crests
 * Generates authentic SVG heraldic shields and club emblems for all 170 clubs & FIFA nations.
 */

export function getTeamBadgeSvg(team, width = 66, height = 71) {
  if (!team) return '';
  const id = team.id || '';
  const name = team.name || '';
  const short = (team.short || team.crest || name.slice(0, 3) || 'TXI').toUpperCase();
  const primary = team.primary || '#183d2f';
  const secondary = team.secondary || '#ffffff';

  // 1. Bespoke Elite Club Badges
  if (id === 'club_real_madrid' || name.includes('Real Madrid')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs>
        <linearGradient id="rmGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe270"/><stop offset="100%" stop-color="#cf9b27"/></linearGradient>
      </defs>
      <!-- Royal Crown -->
      <path d="M 32 24 L 38 12 L 50 18 L 62 12 L 68 24 Z" fill="url(#rmGold)" stroke="#9c7216" stroke-width="1.5"/>
      <circle cx="50" cy="10" r="3" fill="#ffe270" stroke="#9c7216"/>
      <circle cx="38" cy="11" r="2" fill="#fff"/>
      <circle cx="62" cy="11" r="2" fill="#fff"/>
      <circle cx="50" cy="20" r="2.5" fill="#e53935"/>
      <!-- Main Shield / Roundel -->
      <circle cx="50" cy="62" r="36" fill="#ffffff" stroke="url(#rmGold)" stroke-width="4.5"/>
      <circle cx="50" cy="62" r="31" fill="#ffffff" stroke="#001c58" stroke-width="1"/>
      <!-- Diagonal Purple Sash -->
      <path d="M 26 44 L 74 80 L 68 87 L 20 51 Z" fill="#6a1b9a"/>
      <!-- Monogram MCF -->
      <text x="50" y="69" font-family="'Times New Roman', serif" font-size="24" font-weight="bold" fill="url(#rmGold)" text-anchor="middle">M</text>
      <text x="50" y="70" font-family="'Times New Roman', serif" font-size="16" font-weight="bold" fill="#001c58" text-anchor="middle">C</text>
    </svg>`;
  }

  if (id === 'club_man_city' || name.includes('Manchester City')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs>
        <linearGradient id="mcGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffd54f"/><stop offset="100%" stop-color="#ffb300"/></linearGradient>
      </defs>
      <!-- Circular Outer Badge -->
      <circle cx="50" cy="55" r="46" fill="#001838" stroke="#6cabdd" stroke-width="4"/>
      <circle cx="50" cy="55" r="41" fill="#6cabdd" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="50" cy="55" r="32" fill="#001838"/>
      <!-- Central Shield -->
      <path d="M 34 38 L 66 38 L 66 56 Q 66 72 50 80 Q 34 72 34 56 Z" fill="url(#mcGold)" stroke="#001838" stroke-width="1.5"/>
      <!-- Golden Sailing Ship -->
      <path d="M 38 48 Q 50 42 62 48 L 59 53 Q 50 50 41 53 Z" fill="#001838"/>
      <polygon points="50,40 50,48 57,45" fill="#001838"/>
      <!-- Red Rose of Lancashire -->
      <circle cx="50" cy="65" r="5" fill="#d32f2f"/>
      <circle cx="50" cy="65" r="2" fill="#ffd54f"/>
      <!-- Letters -->
      <text x="50" y="27" font-family="sans-serif" font-size="9" font-weight="900" fill="#ffffff" text-anchor="middle">MANCHESTER</text>
      <text x="50" y="93" font-family="sans-serif" font-size="9" font-weight="900" fill="#ffffff" text-anchor="middle">CITY</text>
    </svg>`;
  }

  if (id === 'club_barcelona' || name.includes('Barcelona')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs>
        <linearGradient id="fcbGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fed100"/><stop offset="100%" stop-color="#c49000"/></linearGradient>
      </defs>
      <!-- Traditional FCB Shield -->
      <path d="M 14 20 Q 50 12 86 20 Q 90 62 50 96 Q 10 62 14 20 Z" fill="#fed100" stroke="#a57600" stroke-width="2"/>
      <path d="M 18 23 Q 50 16 82 23 Q 86 60 50 91 Q 14 60 18 23 Z" fill="#ffffff"/>
      <!-- Top Left: St George Cross -->
      <rect x="18" y="23" width="32" height="28" fill="#ffffff"/>
      <rect x="30" y="23" width="7" height="28" fill="#d32f2f"/>
      <rect x="18" y="33" width="32" height="7" fill="#d32f2f"/>
      <!-- Top Right: Catalan Senyera Stripes -->
      <rect x="50" y="23" width="32" height="28" fill="#fed100"/>
      <line x1="57" y1="23" x2="57" y2="51" stroke="#d32f2f" stroke-width="3"/>
      <line x1="65" y1="23" x2="65" y2="51" stroke="#d32f2f" stroke-width="3"/>
      <line x1="73" y1="23" x2="73" y2="51" stroke="#d32f2f" stroke-width="3"/>
      <!-- Middle Band -->
      <rect x="18" y="49" width="64" height="10" fill="#fed100"/>
      <text x="50" y="57" font-family="sans-serif" font-size="7.5" font-weight="900" fill="#002d72" text-anchor="middle">FCB</text>
      <!-- Bottom Blaugrana Stripes -->
      <g>
        <path d="M 18 59 Q 28 78 50 91 Q 72 78 82 59 Z" fill="#002d72"/>
        <path d="M 32 59 Q 38 78 50 91 L 45 91 Q 30 78 26 59 Z" fill="#9e1b32"/>
        <path d="M 45 59 Q 48 78 50 91 L 55 91 Q 58 78 55 59 Z" fill="#9e1b32"/>
        <path d="M 64 59 Q 62 76 50 91 L 55 91 Q 68 76 74 59 Z" fill="#9e1b32"/>
      </g>
      <!-- Golden Football in Center -->
      <circle cx="50" cy="72" r="7.5" fill="#fed100" stroke="#7a5500" stroke-width="1"/>
      <polygon points="50,68 53,70 52,74 48,74 47,70" fill="#7a5500"/>
    </svg>`;
  }

  if (id === 'club_liverpool' || name.includes('Liverpool')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs>
        <linearGradient id="lfcGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe082"/><stop offset="100%" stop-color="#ffd54f"/></linearGradient>
      </defs>
      <!-- Shankly Gates Top -->
      <path d="M 28 18 Q 50 8 72 18 L 74 24 L 26 24 Z" fill="#00a398" stroke="#005d56" stroke-width="1.5"/>
      <text x="50" y="21" font-family="sans-serif" font-size="5.5" font-weight="900" fill="#ffffff" text-anchor="middle">YOU'LL NEVER WALK ALONE</text>
      <!-- Main Shield -->
      <path d="M 24 24 L 76 24 L 76 66 Q 76 86 50 98 Q 24 86 24 66 Z" fill="#d00027" stroke="#ffffff" stroke-width="2.5"/>
      <!-- Inner Green Border -->
      <path d="M 27 27 L 73 27 L 73 65 Q 73 83 50 94 Q 27 83 27 65 Z" fill="#d00027" stroke="#00a398" stroke-width="1"/>
      <!-- Liverbird Silhouette -->
      <g fill="url(#lfcGold)" stroke="#ffd54f" stroke-width="0.5">
        <circle cx="50" cy="46" r="4.5"/>
        <path d="M 50 50 Q 56 55 54 68 Q 50 72 45 68 Q 44 55 50 50 Z"/>
        <!-- Wings & Seaweed -->
        <path d="M 46 54 Q 38 52 38 60 Q 42 62 48 58 Z"/>
        <path d="M 54 54 Q 62 52 62 60 Q 58 62 52 58 Z"/>
        <line x1="53" y1="46" x2="59" y2="44" stroke="#ffe082" stroke-width="1.5"/>
      </g>
      <!-- L.F.C. text -->
      <text x="50" y="82" font-family="Georgia, serif" font-size="10" font-weight="bold" fill="url(#lfcGold)" text-anchor="middle" letter-spacing="1">L.F.C.</text>
    </svg>`;
  }

  if (id === 'club_arsenal' || name.includes('Arsenal')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs>
        <linearGradient id="gunnerGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f9d056"/><stop offset="100%" stop-color="#c99718"/></linearGradient>
      </defs>
      <!-- Hexagonal Shield -->
      <path d="M 18 16 L 82 16 L 85 64 Q 85 86 50 98 Q 15 86 15 64 Z" fill="#da020e" stroke="#023474" stroke-width="4"/>
      <path d="M 20 18 L 80 18 L 82 63 Q 82 83 50 94 Q 18 83 18 63 Z" fill="#da020e" stroke="url(#gunnerGold)" stroke-width="2"/>
      <!-- ARSENAL Banner -->
      <path d="M 22 18 L 78 18 L 76 34 L 24 34 Z" fill="#023474"/>
      <text x="50" y="30" font-family="'Arial Black', sans-serif" font-size="9" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">ARSENAL</text>
      <!-- Iconic Cannon -->
      <g fill="url(#gunnerGold)" stroke="#6d5108" stroke-width="0.8">
        <!-- Barrel pointing right -->
        <polygon points="34,56 68,52 68,58 34,60"/>
        <rect x="66" y="50" width="3" height="10" rx="1"/>
        <!-- Large Wheel -->
        <circle cx="44" cy="65" r="9" fill="#023474" stroke="url(#gunnerGold)" stroke-width="2.5"/>
        <circle cx="44" cy="65" r="3" fill="url(#gunnerGold)"/>
        <!-- Carriage -->
        <path d="M 38 68 L 30 74 L 34 76 L 44 68 Z"/>
      </g>
    </svg>`;
  }

  if (id === 'club_bayern' || name.includes('Bayern')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <!-- Red Circular Base -->
      <circle cx="50" cy="55" r="46" fill="#dc052d" stroke="#ffffff" stroke-width="3"/>
      <circle cx="50" cy="55" r="42" fill="#0066b2"/>
      <circle cx="50" cy="55" r="32" fill="#ffffff"/>
      <!-- Text around ring -->
      <text x="50" y="24" font-family="'Arial Black', sans-serif" font-size="8.5" font-weight="900" fill="#ffffff" text-anchor="middle">FC BAYERN</text>
      <text x="50" y="94" font-family="'Arial Black', sans-serif" font-size="8.5" font-weight="900" fill="#ffffff" text-anchor="middle">MÜNCHEN</text>
      <!-- Central Bavarian Diamonds -->
      <g transform="translate(50,55) rotate(-30)">
        <circle cx="0" cy="0" r="23" fill="#0066b2"/>
        <polygon points="0,-23 7,-10 0,0 -7,-10" fill="#ffffff"/>
        <polygon points="12,-16 19,-3 12,7 5,-3" fill="#ffffff"/>
        <polygon points="-12,-16 -5,-3 -12,7 -19,-3" fill="#ffffff"/>
        <polygon points="0,0 7,12 0,23 -7,12" fill="#ffffff"/>
        <polygon points="-12,7 -5,19 -12,25 -19,19" fill="#ffffff"/>
        <polygon points="12,7 19,19 12,25 5,19" fill="#ffffff"/>
      </g>
    </svg>`;
  }

  if (id === 'club_psg' || name.includes('Paris Saint-Germain')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <circle cx="50" cy="55" r="46" fill="#004170" stroke="#ffffff" stroke-width="3"/>
      <circle cx="50" cy="55" r="36" fill="#ffffff"/>
      <circle cx="50" cy="55" r="32" fill="#004170"/>
      <!-- Red Eiffel Tower in Center -->
      <path d="M 47 34 L 53 34 L 52 46 L 60 72 L 54 72 L 52 64 Q 50 63 48 64 L 46 72 L 40 72 L 48 46 Z" fill="#da291c"/>
      <circle cx="50" cy="33" r="2.5" fill="#da291c"/>
      <line x1="45" y1="52" x2="55" y2="52" stroke="#ffffff" stroke-width="1.5"/>
      <!-- Golden Fleur-de-lis -->
      <path d="M 50 71 Q 48 76 50 78 Q 52 76 50 71 Z" fill="#e5c158"/>
      <!-- Letters -->
      <text x="50" y="27" font-family="'Arial Black', sans-serif" font-size="7.5" font-weight="900" fill="#ffffff" text-anchor="middle">PARIS</text>
      <text x="50" y="93" font-family="'Arial Black', sans-serif" font-size="6" font-weight="900" fill="#ffffff" text-anchor="middle">SAINT-GERMAIN</text>
    </svg>`;
  }

  if (id === 'club_inter' || name.includes('Inter Milan')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <circle cx="50" cy="55" r="46" fill="#001489" stroke="#000000" stroke-width="4"/>
      <circle cx="50" cy="55" r="38" fill="#000000"/>
      <circle cx="50" cy="55" r="34" fill="#001489"/>
      <circle cx="50" cy="55" r="30" fill="#ffffff"/>
      <!-- Intertwined IM Letters -->
      <text x="44" y="66" font-family="'Arial Black', sans-serif" font-size="34" font-weight="900" fill="#001489" text-anchor="middle">I</text>
      <text x="54" y="66" font-family="'Arial Black', sans-serif" font-size="28" font-weight="900" fill="#000000" text-anchor="middle">M</text>
    </svg>`;
  }

  if (id === 'club_chelsea' || name.includes('Chelsea')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <circle cx="50" cy="55" r="46" fill="#034694" stroke="#ffffff" stroke-width="3"/>
      <circle cx="50" cy="55" r="41" fill="#ffffff" stroke="#db2823" stroke-width="1"/>
      <circle cx="50" cy="55" r="30" fill="#034694"/>
      <!-- Ceremonial Lion Rampant in Gold -->
      <g fill="#ffd54f" stroke="#b78103" stroke-width="0.5">
        <circle cx="50" cy="45" r="4"/>
        <path d="M 48 48 Q 42 56 46 68 Q 52 64 54 58 Q 56 50 48 48 Z"/>
        <path d="M 44 54 L 38 50"/>
        <path d="M 45 66 L 39 74"/>
        <path d="M 52 66 L 58 74"/>
        <!-- Staff -->
        <line x1="56" y1="42" x2="56" y2="70" stroke="#db2823" stroke-width="2"/>
        <circle cx="56" cy="42" r="2.5" fill="#db2823"/>
      </g>
      <text x="50" y="24" font-family="sans-serif" font-size="7" font-weight="900" fill="#034694" text-anchor="middle">CHELSEA</text>
      <text x="50" y="93" font-family="sans-serif" font-size="7" font-weight="900" fill="#034694" text-anchor="middle">FOOTBALL CLUB</text>
    </svg>`;
  }

  if (id === 'club_man_united' || name.includes('Manchester United')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <!-- Shield shape -->
      <path d="M 18 18 L 82 18 L 82 62 Q 82 86 50 98 Q 18 86 18 62 Z" fill="#ffe500" stroke="#c70101" stroke-width="4"/>
      <!-- Red Bands Top and Bottom -->
      <path d="M 21 21 L 79 21 L 79 38 L 21 38 Z" fill="#c70101"/>
      <text x="50" y="32" font-family="sans-serif" font-size="6.5" font-weight="900" fill="#ffe500" text-anchor="middle">MANCHESTER</text>
      <path d="M 21 70 Q 50 84 79 70 L 79 80 Q 50 94 21 80 Z" fill="#c70101"/>
      <text x="50" y="80" font-family="sans-serif" font-size="6.5" font-weight="900" fill="#ffe500" text-anchor="middle">UNITED</text>
      <!-- Ship Top -->
      <path d="M 38 46 Q 50 42 62 46 L 58 50 Q 50 48 42 50 Z" fill="#c70101"/>
      <!-- The Red Devil with Trident in Center -->
      <g fill="#c70101">
        <circle cx="50" cy="55" r="3.5"/>
        <path d="M 48 57 L 52 57 L 53 66 L 47 66 Z"/>
        <!-- Trident -->
        <line x1="56" y1="50" x2="56" y2="68" stroke="#c70101" stroke-width="1.5"/>
        <path d="M 54 50 L 56 47 L 58 50 Z"/>
      </g>
    </svg>`;
  }

  if (id === 'club_dortmund' || name.includes('Dortmund')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <circle cx="50" cy="55" r="46" fill="#fde100" stroke="#000000" stroke-width="4"/>
      <circle cx="50" cy="55" r="41" fill="#fde100" stroke="#000000" stroke-width="1"/>
      <!-- BVB 09 text -->
      <text x="50" y="52" font-family="'Arial Black', sans-serif" font-size="22" font-weight="900" fill="#000000" text-anchor="middle" letter-spacing="1">BVB</text>
      <text x="50" y="76" font-family="'Arial Black', sans-serif" font-size="16" font-weight="900" fill="#000000" text-anchor="middle">09</text>
    </svg>`;
  }

  if (id === 'club_inter_miami' || name.includes('Inter Miami')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <circle cx="50" cy="55" r="46" fill="#000000" stroke="#f7b5cd" stroke-width="4"/>
      <!-- Twin Pink Herons and Sun -->
      <circle cx="50" cy="50" r="16" fill="#f7b5cd"/>
      <circle cx="50" cy="50" r="13" fill="#000000"/>
      <!-- Herons -->
      <path d="M 44 44 Q 40 54 44 64 L 46 64 Q 43 54 46 44 Z" fill="#f7b5cd"/>
      <path d="M 56 44 Q 60 54 56 64 L 54 64 Q 57 54 54 44 Z" fill="#f7b5cd"/>
      <text x="50" y="82" font-family="Georgia, serif" font-size="8" font-weight="bold" fill="#f7b5cd" text-anchor="middle">MMXX</text>
    </svg>`;
  }


  // 2. Bespoke Official National Team Badges
  // INDIA - Official AIFF Tricolor & Blue Tigers Shield
  if (id === 'nat_india' || name.toLowerCase() === 'india') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs>
        <linearGradient id="indShield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#002856"/><stop offset="100%" stop-color="#004ba0"/>
        </linearGradient>
        <linearGradient id="indGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffe082"/><stop offset="100%" stop-color="#ffb300"/>
        </linearGradient>
      </defs>
      <!-- Outer Heraldic Shield with Gold Border -->
      <path d="M 12 16 L 88 16 L 88 64 Q 88 90 50 102 Q 12 90 12 64 Z" fill="url(#indShield)" stroke="url(#indGold)" stroke-width="3"/>
      <!-- Indian Tricolor Header Arc -->
      <path d="M 15 19 L 85 19 L 85 27 L 15 27 Z" fill="#ff9933"/>
      <path d="M 15 27 L 85 27 L 85 34 L 15 34 Z" fill="#ffffff"/>
      <path d="M 15 34 L 85 34 L 85 41 L 15 41 Z" fill="#138808"/>
      <!-- Blue Tigers Wordmark -->
      <text x="50" y="33" font-family="'Arial Black', sans-serif" font-size="6.5" font-weight="900" fill="#002856" text-anchor="middle" letter-spacing="1">INDIA</text>
      <!-- Central Ashoka Chakra Wheel -->
      <circle cx="50" cy="62" r="16" fill="#002856" stroke="url(#indGold)" stroke-width="2"/>
      <circle cx="50" cy="62" r="13" fill="#ffffff"/>
      <circle cx="50" cy="62" r="12" fill="#002856"/>
      <!-- Ashoka 24 Spokes (Vector approximation) -->
      <g stroke="#ffffff" stroke-width="0.8">
        <line x1="50" y1="50" x2="50" y2="74"/>
        <line x1="38" y1="62" x2="62" y2="62"/>
        <line x1="41" y1="53" x2="59" y2="71"/>
        <line x1="41" y1="71" x2="59" y2="53"/>
      </g>
      <circle cx="50" cy="62" r="3" fill="#ff9933"/>
      <!-- Golden Tiger Claws / Emblem Accent -->
      <path d="M 38 82 Q 50 86 62 82 Q 50 94 38 82 Z" fill="url(#indGold)"/>
      <text x="50" y="87" font-family="sans-serif" font-size="5" font-weight="900" fill="#002856" text-anchor="middle">AIFF</text>
    </svg>`;
  }

  // ARGENTINA - Official AFA 3-Star Sky Blue & White Stripes Crest
  if (id === 'nat_argentina' || name.toLowerCase() === 'argentina') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs>
        <linearGradient id="afaGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fff59d"/><stop offset="50%" stop-color="#fbc02d"/><stop offset="100%" stop-color="#f57f17"/>
        </linearGradient>
      </defs>
      <!-- 3 World Cup Champion Gold Stars on Top -->
      <polygon points="50,4 52,9 57,9 53,12 55,17 50,14 45,17 47,12 43,9 48,9" fill="url(#afaGold)" stroke="#d48806" stroke-width="0.5"/>
      <polygon points="36,7 38,11 42,11 39,14 40,18 36,15 32,18 33,14 30,11 34,11" fill="url(#afaGold)" stroke="#d48806" stroke-width="0.5"/>
      <polygon points="64,7 66,11 70,11 67,14 68,18 64,15 60,18 61,14 58,11 62,11" fill="url(#afaGold)" stroke="#d48806" stroke-width="0.5"/>
      <!-- AFA Curved Shield -->
      <path d="M 14 20 L 86 20 L 86 66 Q 86 92 50 104 Q 14 92 14 66 Z" fill="#ffffff" stroke="url(#afaGold)" stroke-width="3.5"/>
      <!-- Sky Blue Vertical Stripes (Albiceleste) -->
      <g>
        <path d="M 16 22 L 32 22 L 32 78 Q 22 72 16 64 Z" fill="#74acdf"/>
        <rect x="42" y="22" width="16" height="74" fill="#74acdf"/>
        <path d="M 68 22 L 84 22 L 84 64 Q 78 72 68 78 Z" fill="#74acdf"/>
      </g>
      <!-- Radiant Sol de Mayo (Sun of May) -->
      <circle cx="50" cy="38" r="8" fill="url(#afaGold)" stroke="#f57f17" stroke-width="0.8"/>
      <!-- Golden AFA Monogram Ribbon -->
      <path d="M 22 56 L 78 56 L 74 74 L 26 74 Z" fill="url(#afaGold)" stroke="#f57f17" stroke-width="1"/>
      <text x="50" y="69" font-family="'Times New Roman', Georgia, serif" font-size="13" font-weight="900" fill="#001848" text-anchor="middle" letter-spacing="2">AFA</text>
    </svg>`;
  }

  // SPAIN - Official RFEF Royal Crown & Quarters Crest
  if (id === 'nat_spain' || name.toLowerCase() === 'spain') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs>
        <linearGradient id="espGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe082"/><stop offset="100%" stop-color="#ffb300"/></linearGradient>
      </defs>
      <!-- Gold World Cup Star -->
      <polygon points="50,4 52,9 57,9 53,12 55,17 50,14 45,17 47,12 43,9 48,9" fill="url(#espGold)" stroke="#d48806" stroke-width="0.5"/>
      <!-- Royal Crown -->
      <path d="M 34 19 L 40 12 L 50 16 L 60 12 L 66 19 Z" fill="url(#espGold)" stroke="#9c7216" stroke-width="1"/>
      <!-- RFEF Shield -->
      <path d="M 16 22 L 84 22 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#c60b1e" stroke="url(#espGold)" stroke-width="3"/>
      <!-- Inner Quarters -->
      <rect x="22" y="28" width="26" height="30" fill="#c60b1e"/>
      <rect x="52" y="28" width="26" height="30" fill="#ffffff"/>
      <rect x="22" y="60" width="26" height="26" fill="#ffc400"/>
      <rect x="52" y="60" width="26" height="26" fill="#c60b1e"/>
      <!-- Royal Castle & Lion -->
      <rect x="30" y="36" width="10" height="14" fill="#ffc400"/>
      <circle cx="65" cy="43" r="5" fill="#7b1fa2"/>
      <text x="50" y="93" font-family="'Arial Black', sans-serif" font-size="7" font-weight="900" fill="#ffc400" text-anchor="middle">ESP</text>
    </svg>`;
  }

  // BRAZIL - Official CBF 5-Star Crest
  if (id === 'nat_brazil' || name.toLowerCase() === 'brazil') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs>
        <linearGradient id="brGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff176"/><stop offset="100%" stop-color="#fbc02d"/></linearGradient>
      </defs>
      <!-- 5 World Cup Stars -->
      <g fill="url(#brGold)">
        <polygon points="50,4 51,7 54,7 52,9 53,12 50,10 47,12 48,9 46,7 49,7"/>
        <polygon points="38,6 39,9 42,9 40,11 41,14 38,12 35,14 36,11 34,9 37,9"/>
        <polygon points="62,6 63,9 66,9 64,11 65,14 62,12 59,14 60,11 58,9 61,9"/>
        <polygon points="27,10 28,13 31,13 29,15 30,18 27,16 24,18 25,15 23,13 26,13"/>
        <polygon points="73,10 74,13 77,13 75,15 76,18 73,16 70,18 71,15 69,13 72,13"/>
      </g>
      <!-- Canary Yellow Shield -->
      <path d="M 16 20 L 84 20 L 84 66 Q 84 92 50 103 Q 16 92 16 66 Z" fill="#fedf00" stroke="#009c3b" stroke-width="4"/>
      <!-- Blue Cross -->
      <path d="M 44 20 L 56 20 L 56 98 L 44 98 Z" fill="#002776"/>
      <path d="M 16 46 L 84 46 L 84 58 L 16 58 Z" fill="#002776"/>
      <!-- Central Roundel -->
      <circle cx="50" cy="52" r="16" fill="#ffffff" stroke="#009c3b" stroke-width="2"/>
      <text x="50" y="56" font-family="'Arial Black', sans-serif" font-size="9" font-weight="900" fill="#009c3b" text-anchor="middle">CBF</text>
      <text x="50" y="86" font-family="'Arial Black', sans-serif" font-size="7" font-weight="900" fill="#009c3b" text-anchor="middle">BRASIL</text>
    </svg>`;
  }

  // FRANCE - Official FFF 2-Star Gallic Rooster Shield
  if (id === 'nat_france' || name.toLowerCase() === 'france') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs>
        <linearGradient id="frGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff176"/><stop offset="100%" stop-color="#e5a912"/></linearGradient>
      </defs>
      <!-- 2 World Cup Stars -->
      <polygon points="42,5 44,9 49,9 45,12 47,17 42,14 37,17 39,12 35,9 40,9" fill="url(#frGold)"/>
      <polygon points="58,5 60,9 65,9 61,12 63,17 58,14 53,17 55,12 51,9 56,9" fill="url(#frGold)"/>
      <!-- Royal French Navy Shield -->
      <path d="M 16 19 L 84 19 L 84 66 Q 84 92 50 103 Q 16 92 16 66 Z" fill="#002654" stroke="url(#frGold)" stroke-width="3"/>
      <!-- Golden Gallic Rooster (Coq Gaulois) -->
      <g fill="url(#frGold)">
        <circle cx="48" cy="40" r="4"/>
        <path d="M 45 43 Q 40 52 46 64 Q 54 60 56 50 Z"/>
        <!-- Comb & Beak -->
        <polygon points="47,35 49,32 51,35" fill="#ed2939"/>
        <polygon points="52,39 56,41 52,43" fill="#ffe082"/>
        <!-- Tail feathers -->
        <path d="M 42 48 Q 33 46 32 58 Q 38 56 42 53 Z"/>
      </g>
      <!-- FFF text -->
      <text x="50" y="80" font-family="'Arial Black', sans-serif" font-size="10" font-weight="900" fill="url(#frGold)" text-anchor="middle" letter-spacing="1">FFF</text>
    </svg>`;
  }

  // ENGLAND - Official Three Lions 1-Star Shield
  if (id === 'nat_england' || name.toLowerCase() === 'england') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <polygon points="50,4 52,8 57,8 53,11 55,16 50,13 45,16 47,11 43,8 48,8" fill="#ffd54f"/>
      <!-- Silver/White Shield with Navy Border -->
      <path d="M 16 18 L 84 18 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#ffffff" stroke="#002b49" stroke-width="4"/>
      <!-- Three Navy Lions Passant Guardant -->
      <g fill="#002b49">
        <!-- Lion 1 -->
        <rect x="30" y="30" width="38" height="7" rx="3.5"/>
        <circle cx="34" cy="31" r="3.5"/>
        <!-- Lion 2 -->
        <rect x="30" y="46" width="38" height="7" rx="3.5"/>
        <circle cx="34" cy="47" r="3.5"/>
        <!-- Lion 3 -->
        <rect x="30" y="62" width="38" height="7" rx="3.5"/>
        <circle cx="34" cy="63" r="3.5"/>
      </g>
      <!-- Red Tudor Roses -->
      <circle cx="74" cy="33" r="3" fill="#ce1124"/>
      <circle cx="74" cy="49" r="3" fill="#ce1124"/>
      <circle cx="74" cy="65" r="3" fill="#ce1124"/>
      <text x="50" y="86" font-family="sans-serif" font-size="7" font-weight="900" fill="#002b49" text-anchor="middle">ENGLAND</text>
    </svg>`;
  }

  // GERMANY - Official DFB Eagle 4-Star Shield
  if (id === 'nat_germany' || name.toLowerCase() === 'germany') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <g fill="#ffd54f">
        <polygon points="35,6 36,9 39,9 37,11 38,14 35,12 32,14 33,11 31,9 34,9"/>
        <polygon points="45,4 46,7 49,7 47,9 48,12 45,10 42,12 43,9 41,7 44,7"/>
        <polygon points="55,4 56,7 59,7 57,9 58,12 55,10 52,12 53,9 51,7 54,7"/>
        <polygon points="65,6 66,9 69,9 67,11 68,14 65,12 62,14 63,11 61,9 64,9"/>
      </g>
      <!-- Circular Silver Badge -->
      <circle cx="50" cy="58" r="40" fill="#ffffff" stroke="#000000" stroke-width="3"/>
      <!-- Bundesadler (Federal Eagle) -->
      <g fill="#000000">
        <circle cx="50" cy="44" r="5"/>
        <path d="M 45 48 L 55 48 L 58 68 L 42 68 Z"/>
        <!-- Wings -->
        <polygon points="42,48 24,52 38,62"/>
        <polygon points="58,48 76,52 62,62"/>
        <polygon points="50,42 54,44 50,46" fill="#ffd54f"/>
      </g>
      <!-- German Flag Strip (Black Red Gold) -->
      <rect x="35" y="74" width="30" height="3" fill="#000000"/>
      <rect x="35" y="77" width="30" height="3" fill="#dd0000"/>
      <rect x="35" y="80" width="30" height="3" fill="#ffce00"/>
      <text x="50" y="92" font-family="'Arial Black', sans-serif" font-size="6.5" font-weight="900" fill="#000000" text-anchor="middle">DFB</text>
    </svg>`;
  }

  // PORTUGAL - Official FPF Quinas Shield
  if (id === 'nat_portugal' || name.toLowerCase() === 'portugal') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs>
        <linearGradient id="ptGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff176"/><stop offset="100%" stop-color="#fbc02d"/></linearGradient>
      </defs>
      <!-- Green and Red Halved Shield -->
      <path d="M 16 16 L 84 16 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#de2910" stroke="url(#ptGold)" stroke-width="3.5"/>
      <path d="M 16 16 L 46 16 L 46 99 Q 28 92 16 66 Z" fill="#046a38"/>
      <!-- Golden Armillary Sphere -->
      <circle cx="50" cy="54" r="22" fill="none" stroke="url(#ptGold)" stroke-width="2.5"/>
      <circle cx="50" cy="54" r="14" fill="none" stroke="url(#ptGold)" stroke-width="1.5"/>
      <!-- Central White Quinas Shield -->
      <path d="M 40 44 L 60 44 L 60 62 Q 60 70 50 74 Q 40 70 40 62 Z" fill="#ffffff" stroke="#de2910" stroke-width="1.5"/>
      <!-- Blue Quinas Crosses -->
      <circle cx="50" cy="51" r="2" fill="#002776"/>
      <circle cx="45" cy="56" r="2" fill="#002776"/>
      <circle cx="55" cy="56" r="2" fill="#002776"/>
      <circle cx="50" cy="62" r="2" fill="#002776"/>
      <text x="50" y="88" font-family="'Arial Black', sans-serif" font-size="7" font-weight="900" fill="url(#ptGold)" text-anchor="middle">FPF</text>
    </svg>`;
  }

  // ITALY - Official FIGC 4-Star Azzurri Shield
  if (id === 'nat_italy' || name.toLowerCase() === 'italy') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <g fill="#ffd54f">
        <polygon points="35,6 36,9 39,9 37,11 38,14 35,12 32,14 33,11 31,9 34,9"/>
        <polygon points="45,4 46,7 49,7 47,9 48,12 45,10 42,12 43,9 41,7 44,7"/>
        <polygon points="55,4 56,7 59,7 57,9 58,12 55,10 52,12 53,9 51,7 54,7"/>
        <polygon points="65,6 66,9 69,9 67,11 68,14 65,12 62,14 63,11 61,9 64,9"/>
      </g>
      <path d="M 16 18 L 84 18 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#0055a5" stroke="#ffd54f" stroke-width="3"/>
      <!-- Italian Tricolore in Center -->
      <path d="M 28 42 L 42 42 L 42 80 L 28 72 Z" fill="#009246"/>
      <rect x="42" y="42" width="16" height="42" fill="#ffffff"/>
      <path d="M 58 42 L 72 42 L 72 72 L 58 80 Z" fill="#ce2b37"/>
      <text x="50" y="34" font-family="'Arial Black', sans-serif" font-size="8.5" font-weight="900" fill="#ffffff" text-anchor="middle">ITALIA</text>
      <text x="50" y="93" font-family="'Arial Black', sans-serif" font-size="6" font-weight="900" fill="#ffd54f" text-anchor="middle">FIGC</text>
    </svg>`;
  }

  // NETHERLANDS - Official KNVB Orange Lion Shield
  if (id === 'nat_netherlands' || name.toLowerCase() === 'netherlands') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <path d="M 16 16 L 84 16 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#f36c21" stroke="#001c58" stroke-width="4"/>
      <!-- Golden Lion Rampant -->
      <g fill="#ffd54f" stroke="#b26a00" stroke-width="0.5">
        <circle cx="50" cy="42" r="5"/>
        <!-- Crown on Lion -->
        <polygon points="46,36 50,32 54,36" fill="#ffd54f"/>
        <path d="M 46 46 Q 38 54 44 68 Q 52 64 54 56 Z"/>
        <path d="M 42 52 L 34 46"/>
        <path d="M 42 66 L 36 74"/>
        <path d="M 54 64 L 62 72"/>
      </g>
      <text x="50" y="86" font-family="'Arial Black', sans-serif" font-size="9" font-weight="900" fill="#001c58" text-anchor="middle">KNVB</text>
    </svg>`;
  }

  // 3. Procedural Authentic Heraldic Shield for All Other National Teams & Clubs
  // Creates high-fidelity federation heraldic crests based on official flag colors and FIFA country code
  const isNational = id.startsWith('nat_') || team.isNational;
  const isDarkPrimary = ['#000000', '#001c58', '#002856', '#112233', '#162a1e', '#1a3023'].includes(primary.toLowerCase());
  const textColor = isDarkPrimary ? '#ffffff' : secondary;
  const accentColor = (secondary === '#ffffff' || secondary === primary) ? '#ffd54f' : secondary;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
    <defs>
      <linearGradient id="shieldGrad_${short}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${primary}"/>
        <stop offset="100%" stop-color="${primary}dd"/>
      </linearGradient>
      <linearGradient id="goldRim_${short}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffe082"/>
        <stop offset="50%" stop-color="#ffb300"/>
        <stop offset="100%" stop-color="#ffa000"/>
      </linearGradient>
    </defs>
    <!-- Heraldic Shield Body -->
    <path d="M 14 16 L 86 16 L 86 66 Q 86 92 50 104 Q 14 92 14 66 Z" fill="url(#shieldGrad_${short})" stroke="url(#goldRim_${short})" stroke-width="3.5"/>
    
    <!-- Top Federation Header Bar -->
    <path d="M 16 18 L 84 18 L 84 34 L 16 34 Z" fill="${accentColor}" opacity="0.95"/>
    <text x="50" y="30" font-family="'Arial Black', -apple-system, sans-serif" font-size="8.5" font-weight="900" fill="${primary}" text-anchor="middle" letter-spacing="1.5">${short}</text>
    
    <!-- Diagonal Dynamic Accent Stripe -->
    <path d="M 16 48 L 84 66 L 84 76 L 16 58 Z" fill="${accentColor}" opacity="0.4"/>
    <path d="M 16 58 L 84 76 L 84 84 L 16 66 Z" fill="#ffffff" opacity="0.25"/>

    <!-- Central Heraldic Star / Emblem -->
    <circle cx="50" cy="56" r="14" fill="#ffffff" stroke="url(#goldRim_${short})" stroke-width="1.5" opacity="0.95"/>
    <polygon points="50,47 52,53 58,53 54,57 56,63 50,59 44,63 46,57 42,53 48,53" fill="${primary}"/>
    
    <!-- Bottom Laurel Arc or Mini Star -->
    <circle cx="50" cy="88" r="2.5" fill="url(#goldRim_${short})"/>
    <circle cx="43" cy="85" r="2" fill="url(#goldRim_${short})"/>
    <circle cx="57" cy="85" r="2" fill="url(#goldRim_${short})"/>
  </svg>`;
}
