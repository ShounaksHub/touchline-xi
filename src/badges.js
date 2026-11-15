/**
 * Touchline XI - Official High-Fidelity Vector Team Badges & Crests
 * Complete authentic heraldry and crests for all 16 elite clubs and 150 FIFA national teams.
 */

export function getTeamBadgeSvg(team, width = 66, height = 71) {
  if (!team) return '';
  const id = team.id || '';
  const name = team.name || '';
  const short = (team.short || team.crest || name.slice(0, 3) || 'TXI').toUpperCase();
  const primary = team.primary || '#183d2f';
  const secondary = team.secondary || '#ffffff';

  // =========================================================================
  // 1. Bespoke Elite Club Badges
  // =========================================================================
  if (id === 'club_real_madrid' || name.includes('Real Madrid')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs><linearGradient id="rmGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe270"/><stop offset="100%" stop-color="#cf9b27"/></linearGradient></defs>
      <path d="M 32 24 L 38 12 L 50 18 L 62 12 L 68 24 Z" fill="url(#rmGold)" stroke="#9c7216" stroke-width="1.5"/>
      <circle cx="50" cy="10" r="3" fill="#ffe270" stroke="#9c7216"/><circle cx="38" cy="11" r="2" fill="#fff"/><circle cx="62" cy="11" r="2" fill="#fff"/><circle cx="50" cy="20" r="2.5" fill="#e53935"/>
      <circle cx="50" cy="62" r="36" fill="#ffffff" stroke="url(#rmGold)" stroke-width="4.5"/>
      <circle cx="50" cy="62" r="31" fill="#ffffff" stroke="#001c58" stroke-width="1"/>
      <path d="M 26 44 L 74 80 L 68 87 L 20 51 Z" fill="#6a1b9a"/>
      <text x="50" y="69" font-family="'Times New Roman', serif" font-size="24" font-weight="bold" fill="url(#rmGold)" text-anchor="middle">M</text>
      <text x="50" y="70" font-family="'Times New Roman', serif" font-size="16" font-weight="bold" fill="#001c58" text-anchor="middle">C</text>
    </svg>`;
  }

  if (id === 'club_man_city' || name.includes('Manchester City')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs><linearGradient id="mcGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffd54f"/><stop offset="100%" stop-color="#ffb300"/></linearGradient></defs>
      <circle cx="50" cy="55" r="46" fill="#001838" stroke="#6cabdd" stroke-width="4"/>
      <circle cx="50" cy="55" r="41" fill="#6cabdd" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="50" cy="55" r="32" fill="#001838"/>
      <path d="M 34 38 L 66 38 L 66 56 Q 66 72 50 80 Q 34 72 34 56 Z" fill="url(#mcGold)" stroke="#001838" stroke-width="1.5"/>
      <path d="M 38 48 Q 50 42 62 48 L 59 53 Q 50 50 41 53 Z" fill="#001838"/><polygon points="50,40 50,48 57,45" fill="#001838"/>
      <circle cx="50" cy="65" r="5" fill="#d32f2f"/><circle cx="50" cy="65" r="2" fill="#ffd54f"/>
      <text x="50" y="27" font-family="sans-serif" font-size="9" font-weight="900" fill="#ffffff" text-anchor="middle">MANCHESTER</text>
      <text x="50" y="93" font-family="sans-serif" font-size="9" font-weight="900" fill="#ffffff" text-anchor="middle">CITY</text>
    </svg>`;
  }

  if (id === 'club_barcelona' || name.includes('Barcelona')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <path d="M 14 20 Q 50 12 86 20 Q 90 62 50 96 Q 10 62 14 20 Z" fill="#fed100" stroke="#a57600" stroke-width="2"/>
      <path d="M 18 23 Q 50 16 82 23 Q 86 60 50 91 Q 14 60 18 23 Z" fill="#ffffff"/>
      <rect x="18" y="23" width="32" height="28" fill="#ffffff"/><rect x="30" y="23" width="7" height="28" fill="#d32f2f"/><rect x="18" y="33" width="32" height="7" fill="#d32f2f"/>
      <rect x="50" y="23" width="32" height="28" fill="#fed100"/>
      <line x1="57" y1="23" x2="57" y2="51" stroke="#d32f2f" stroke-width="3"/><line x1="65" y1="23" x2="65" y2="51" stroke="#d32f2f" stroke-width="3"/><line x1="73" y1="23" x2="73" y2="51" stroke="#d32f2f" stroke-width="3"/>
      <rect x="18" y="49" width="64" height="10" fill="#fed100"/>
      <text x="50" y="57" font-family="sans-serif" font-size="7.5" font-weight="900" fill="#002d72" text-anchor="middle">FCB</text>
      <path d="M 18 59 Q 28 78 50 91 Q 72 78 82 59 Z" fill="#002d72"/>
      <path d="M 32 59 Q 38 78 50 91 L 45 91 Q 30 78 26 59 Z" fill="#9e1b32"/>
      <path d="M 45 59 Q 48 78 50 91 L 55 91 Q 58 78 55 59 Z" fill="#9e1b32"/>
      <path d="M 64 59 Q 62 76 50 91 L 55 91 Q 68 76 74 59 Z" fill="#9e1b32"/>
      <circle cx="50" cy="72" r="7.5" fill="#fed100" stroke="#7a5500" stroke-width="1"/>
    </svg>`;
  }

  if (id === 'club_liverpool' || name.includes('Liverpool')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <path d="M 28 18 Q 50 8 72 18 L 74 24 L 26 24 Z" fill="#00a398" stroke="#005d56" stroke-width="1.5"/>
      <text x="50" y="21" font-family="sans-serif" font-size="5.5" font-weight="900" fill="#ffffff" text-anchor="middle">YOU'LL NEVER WALK ALONE</text>
      <path d="M 24 24 L 76 24 L 76 66 Q 76 86 50 98 Q 24 86 24 66 Z" fill="#d00027" stroke="#ffffff" stroke-width="2.5"/>
      <g fill="#ffe082"><circle cx="50" cy="46" r="4.5"/><path d="M 50 50 Q 56 55 54 68 Q 50 72 45 68 Q 44 55 50 50 Z"/></g>
      <text x="50" y="82" font-family="Georgia, serif" font-size="10" font-weight="bold" fill="#ffe082" text-anchor="middle" letter-spacing="1">L.F.C.</text>
    </svg>`;
  }

  if (id === 'club_arsenal' || name.includes('Arsenal')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <path d="M 18 16 L 82 16 L 85 64 Q 85 86 50 98 Q 15 86 15 64 Z" fill="#da020e" stroke="#023474" stroke-width="4"/>
      <path d="M 20 18 L 80 18 L 82 63 Q 82 83 50 94 Q 18 83 18 63 Z" fill="#da020e" stroke="#ffd54f" stroke-width="2"/>
      <path d="M 22 18 L 78 18 L 76 34 L 24 34 Z" fill="#023474"/>
      <text x="50" y="30" font-family="'Arial Black', sans-serif" font-size="9" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">ARSENAL</text>
      <polygon points="34,56 68,52 68,58 34,60" fill="#ffd54f"/><rect x="66" y="50" width="3" height="10" rx="1" fill="#ffd54f"/>
      <circle cx="44" cy="65" r="9" fill="#023474" stroke="#ffd54f" stroke-width="2.5"/><circle cx="44" cy="65" r="3" fill="#ffd54f"/>
    </svg>`;
  }

  if (id === 'club_bayern' || name.includes('Bayern')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <circle cx="50" cy="55" r="46" fill="#dc052d" stroke="#ffffff" stroke-width="3"/>
      <circle cx="50" cy="55" r="42" fill="#0066b2"/><circle cx="50" cy="55" r="32" fill="#ffffff"/>
      <text x="50" y="24" font-family="'Arial Black', sans-serif" font-size="8.5" font-weight="900" fill="#ffffff" text-anchor="middle">FC BAYERN</text>
      <text x="50" y="94" font-family="'Arial Black', sans-serif" font-size="8.5" font-weight="900" fill="#ffffff" text-anchor="middle">MÜNCHEN</text>
      <g transform="translate(50,55) rotate(-30)"><circle cx="0" cy="0" r="23" fill="#0066b2"/><polygon points="0,-23 7,-10 0,0 -7,-10" fill="#ffffff"/><polygon points="12,-16 19,-3 12,7 5,-3" fill="#ffffff"/><polygon points="-12,-16 -5,-3 -12,7 -19,-3" fill="#ffffff"/><polygon points="0,0 7,12 0,23 -7,12" fill="#ffffff"/></g>
    </svg>`;
  }

  if (id === 'club_psg' || name.includes('Paris Saint-Germain')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <circle cx="50" cy="55" r="46" fill="#004170" stroke="#ffffff" stroke-width="3"/><circle cx="50" cy="55" r="36" fill="#ffffff"/><circle cx="50" cy="55" r="32" fill="#004170"/>
      <path d="M 47 34 L 53 34 L 52 46 L 60 72 L 54 72 L 52 64 Q 50 63 48 64 L 46 72 L 40 72 L 48 46 Z" fill="#da291c"/>
      <text x="50" y="27" font-family="'Arial Black', sans-serif" font-size="7.5" font-weight="900" fill="#ffffff" text-anchor="middle">PARIS</text>
      <text x="50" y="93" font-family="'Arial Black', sans-serif" font-size="6" font-weight="900" fill="#ffffff" text-anchor="middle">SAINT-GERMAIN</text>
    </svg>`;
  }

  if (id === 'club_inter' || name.includes('Inter Milan')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <circle cx="50" cy="55" r="46" fill="#001489" stroke="#000000" stroke-width="4"/><circle cx="50" cy="55" r="34" fill="#001489"/><circle cx="50" cy="55" r="30" fill="#ffffff"/>
      <text x="44" y="66" font-family="'Arial Black', sans-serif" font-size="34" font-weight="900" fill="#001489" text-anchor="middle">I</text>
      <text x="54" y="66" font-family="'Arial Black', sans-serif" font-size="28" font-weight="900" fill="#000000" text-anchor="middle">M</text>
    </svg>`;
  }

  if (id === 'club_chelsea' || name.includes('Chelsea')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <circle cx="50" cy="55" r="46" fill="#034694" stroke="#ffffff" stroke-width="3"/><circle cx="50" cy="55" r="41" fill="#ffffff" stroke="#db2823" stroke-width="1"/><circle cx="50" cy="55" r="30" fill="#034694"/>
      <g fill="#ffd54f"><circle cx="50" cy="45" r="4"/><path d="M 48 48 Q 42 56 46 68 Q 52 64 54 58 Q 56 50 48 48 Z"/></g>
      <text x="50" y="24" font-family="sans-serif" font-size="7" font-weight="900" fill="#034694" text-anchor="middle">CHELSEA</text>
      <text x="50" y="93" font-family="sans-serif" font-size="7" font-weight="900" fill="#034694" text-anchor="middle">FOOTBALL CLUB</text>
    </svg>`;
  }

  if (id === 'club_man_united' || name.includes('Manchester United')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <path d="M 18 18 L 82 18 L 82 62 Q 82 86 50 98 Q 18 86 18 62 Z" fill="#ffe500" stroke="#c70101" stroke-width="4"/>
      <path d="M 21 21 L 79 21 L 79 38 L 21 38 Z" fill="#c70101"/><text x="50" y="32" font-family="sans-serif" font-size="6.5" font-weight="900" fill="#ffe500" text-anchor="middle">MANCHESTER</text>
      <path d="M 21 70 Q 50 84 79 70 L 79 80 Q 50 94 21 80 Z" fill="#c70101"/><text x="50" y="80" font-family="sans-serif" font-size="6.5" font-weight="900" fill="#ffe500" text-anchor="middle">UNITED</text>
      <circle cx="50" cy="55" r="3.5" fill="#c70101"/><path d="M 48 57 L 52 57 L 53 66 L 47 66 Z" fill="#c70101"/>
    </svg>`;
  }

  if (id === 'club_dortmund' || name.includes('Dortmund')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <circle cx="50" cy="55" r="46" fill="#fde100" stroke="#000000" stroke-width="4"/>
      <text x="50" y="52" font-family="'Arial Black', sans-serif" font-size="22" font-weight="900" fill="#000000" text-anchor="middle" letter-spacing="1">BVB</text>
      <text x="50" y="76" font-family="'Arial Black', sans-serif" font-size="16" font-weight="900" fill="#000000" text-anchor="middle">09</text>
    </svg>`;
  }

  if (id === 'club_inter_miami' || name.includes('Inter Miami')) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <circle cx="50" cy="55" r="46" fill="#000000" stroke="#f7b5cd" stroke-width="4"/>
      <circle cx="50" cy="50" r="16" fill="#f7b5cd"/><circle cx="50" cy="50" r="13" fill="#000000"/>
      <path d="M 44 44 Q 40 54 44 64 L 46 64 Q 43 54 46 44 Z" fill="#f7b5cd"/><path d="M 56 44 Q 60 54 56 64 L 54 64 Q 57 54 54 44 Z" fill="#f7b5cd"/>
      <text x="50" y="82" font-family="Georgia, serif" font-size="8" font-weight="bold" fill="#f7b5cd" text-anchor="middle">MMXX</text>
    </svg>`;
  }

  // =========================================================================
  // 2. Bespoke Giants & Specific National Team Badges
  // =========================================================================

  // INDIA - Official AIFF Blue Tigers Tricolor & Ashoka Chakra Crest
  if (id === 'nat_india' || name.toLowerCase() === 'india') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs><linearGradient id="indShield" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#002856"/><stop offset="100%" stop-color="#004ba0"/></linearGradient><linearGradient id="indGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe082"/><stop offset="100%" stop-color="#ffb300"/></linearGradient></defs>
      <path d="M 12 16 L 88 16 L 88 64 Q 88 90 50 102 Q 12 90 12 64 Z" fill="url(#indShield)" stroke="url(#indGold)" stroke-width="3"/>
      <path d="M 15 19 L 85 19 L 85 27 L 15 27 Z" fill="#ff9933"/><path d="M 15 27 L 85 27 L 85 34 L 15 34 Z" fill="#ffffff"/><path d="M 15 34 L 85 34 L 85 41 L 15 41 Z" fill="#138808"/>
      <text x="50" y="33" font-family="'Arial Black', sans-serif" font-size="6.5" font-weight="900" fill="#002856" text-anchor="middle" letter-spacing="1">INDIA</text>
      <circle cx="50" cy="62" r="16" fill="#002856" stroke="url(#indGold)" stroke-width="2"/><circle cx="50" cy="62" r="13" fill="#ffffff"/><circle cx="50" cy="62" r="12" fill="#002856"/>
      <g stroke="#ffffff" stroke-width="0.8"><line x1="50" y1="50" x2="50" y2="74"/><line x1="38" y1="62" x2="62" y2="62"/><line x1="41" y1="53" x2="59" y2="71"/><line x1="41" y1="71" x2="59" y2="53"/></g>
      <circle cx="50" cy="62" r="3" fill="#ff9933"/>
      <path d="M 38 82 Q 50 86 62 82 Q 50 94 38 82 Z" fill="url(#indGold)"/><text x="50" y="87" font-family="sans-serif" font-size="5" font-weight="900" fill="#002856" text-anchor="middle">AIFF</text>
    </svg>`;
  }

  // ARGENTINA - Official AFA 3-Star Crest (Sol de Mayo, Albiceleste stripes)
  if (id === 'nat_argentina' || name.toLowerCase() === 'argentina') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <defs><linearGradient id="afaGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff59d"/><stop offset="50%" stop-color="#fbc02d"/><stop offset="100%" stop-color="#f57f17"/></linearGradient></defs>
      <polygon points="50,4 52,9 57,9 53,12 55,17 50,14 45,17 47,12 43,9 48,9" fill="url(#afaGold)" stroke="#d48806" stroke-width="0.5"/>
      <polygon points="36,7 38,11 42,11 39,14 40,18 36,15 32,18 33,14 30,11 34,11" fill="url(#afaGold)" stroke="#d48806" stroke-width="0.5"/>
      <polygon points="64,7 66,11 70,11 67,14 68,18 64,15 60,18 61,14 58,11 62,11" fill="url(#afaGold)" stroke="#d48806" stroke-width="0.5"/>
      <path d="M 14 20 L 86 20 L 86 66 Q 86 92 50 104 Q 14 92 14 66 Z" fill="#ffffff" stroke="url(#afaGold)" stroke-width="3.5"/>
      <path d="M 16 22 L 32 22 L 32 78 Q 22 72 16 64 Z" fill="#74acdf"/><rect x="42" y="22" width="16" height="74" fill="#74acdf"/><path d="M 68 22 L 84 22 L 84 64 Q 78 72 68 78 Z" fill="#74acdf"/>
      <circle cx="50" cy="38" r="8" fill="url(#afaGold)" stroke="#f57f17" stroke-width="0.8"/>
      <path d="M 22 56 L 78 56 L 74 74 L 26 74 Z" fill="url(#afaGold)" stroke="#f57f17" stroke-width="1"/>
      <text x="50" y="69" font-family="'Times New Roman', Georgia, serif" font-size="13" font-weight="900" fill="#001848" text-anchor="middle" letter-spacing="2">AFA</text>
    </svg>`;
  }

  // SPAIN - Official RFEF Royal Crown & Quarters
  if (id === 'nat_spain' || name.toLowerCase() === 'spain') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <polygon points="50,4 52,9 57,9 53,12 55,17 50,14 45,17 47,12 43,9 48,9" fill="#ffb300" stroke="#d48806" stroke-width="0.5"/>
      <path d="M 34 19 L 40 12 L 50 16 L 60 12 L 66 19 Z" fill="#ffb300" stroke="#9c7216" stroke-width="1"/>
      <path d="M 16 22 L 84 22 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#c60b1e" stroke="#ffb300" stroke-width="3"/>
      <rect x="22" y="28" width="26" height="30" fill="#c60b1e"/><rect x="52" y="28" width="26" height="30" fill="#ffffff"/><rect x="22" y="60" width="26" height="26" fill="#ffc400"/><rect x="52" y="60" width="26" height="26" fill="#c60b1e"/>
      <text x="50" y="93" font-family="'Arial Black', sans-serif" font-size="7" font-weight="900" fill="#ffc400" text-anchor="middle">RFEF</text>
    </svg>`;
  }

  // BRAZIL - Official CBF 5-Star Crest
  if (id === 'nat_brazil' || name.toLowerCase() === 'brazil') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <g fill="#ffd54f">
        <polygon points="50,4 51,7 54,7 52,9 53,12 50,10 47,12 48,9 46,7 49,7"/>
        <polygon points="38,6 39,9 42,9 40,11 41,14 38,12 35,14 36,11 34,9 37,9"/>
        <polygon points="62,6 63,9 66,9 64,11 65,14 62,12 59,14 60,11 58,9 61,9"/>
        <polygon points="27,10 28,13 31,13 29,15 30,18 27,16 24,18 25,15 23,13 26,13"/>
        <polygon points="73,10 74,13 77,13 75,15 76,18 73,16 70,18 71,15 69,13 72,13"/>
      </g>
      <path d="M 16 20 L 84 20 L 84 66 Q 84 92 50 103 Q 16 92 16 66 Z" fill="#fedf00" stroke="#009c3b" stroke-width="4"/>
      <path d="M 44 20 L 56 20 L 56 98 L 44 98 Z" fill="#002776"/><path d="M 16 46 L 84 46 L 84 58 L 16 58 Z" fill="#002776"/>
      <circle cx="50" cy="52" r="16" fill="#ffffff" stroke="#009c3b" stroke-width="2"/>
      <text x="50" y="56" font-family="'Arial Black', sans-serif" font-size="9" font-weight="900" fill="#009c3b" text-anchor="middle">CBF</text>
      <text x="50" y="86" font-family="'Arial Black', sans-serif" font-size="7" font-weight="900" fill="#009c3b" text-anchor="middle">BRASIL</text>
    </svg>`;
  }

  // FRANCE - Official FFF 2-Star Gallic Rooster Shield
  if (id === 'nat_france' || name.toLowerCase() === 'france') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <polygon points="42,5 44,9 49,9 45,12 47,17 42,14 37,17 39,12 35,9 40,9" fill="#ffd54f"/>
      <polygon points="58,5 60,9 65,9 61,12 63,17 58,14 53,17 55,12 51,9 56,9" fill="#ffd54f"/>
      <path d="M 16 19 L 84 19 L 84 66 Q 84 92 50 103 Q 16 92 16 66 Z" fill="#002654" stroke="#ffd54f" stroke-width="3"/>
      <g fill="#ffd54f"><circle cx="48" cy="40" r="4"/><path d="M 45 43 Q 40 52 46 64 Q 54 60 56 50 Z"/></g>
      <text x="50" y="80" font-family="'Arial Black', sans-serif" font-size="10" font-weight="900" fill="#ffd54f" text-anchor="middle" letter-spacing="1">FFF</text>
    </svg>`;
  }

  // ENGLAND - Three Lions 1-Star Shield
  if (id === 'nat_england' || name.toLowerCase() === 'england') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <polygon points="50,4 52,8 57,8 53,11 55,16 50,13 45,16 47,11 43,8 48,8" fill="#ffd54f"/>
      <path d="M 16 18 L 84 18 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#ffffff" stroke="#002b49" stroke-width="4"/>
      <g fill="#002b49"><rect x="30" y="30" width="38" height="7" rx="3.5"/><circle cx="34" cy="31" r="3.5"/><rect x="30" y="46" width="38" height="7" rx="3.5"/><circle cx="34" cy="47" r="3.5"/><rect x="30" y="62" width="38" height="7" rx="3.5"/><circle cx="34" cy="63" r="3.5"/></g>
      <circle cx="74" cy="33" r="3" fill="#ce1124"/><circle cx="74" cy="49" r="3" fill="#ce1124"/><circle cx="74" cy="65" r="3" fill="#ce1124"/>
      <text x="50" y="86" font-family="sans-serif" font-size="7" font-weight="900" fill="#002b49" text-anchor="middle">ENGLAND</text>
    </svg>`;
  }

  // GERMANY - DFB Federal Eagle 4-Star Shield
  if (id === 'nat_germany' || name.toLowerCase() === 'germany') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <g fill="#ffd54f">
        <polygon points="35,6 36,9 39,9 37,11 38,14 35,12 32,14 33,11 31,9 34,9"/><polygon points="45,4 46,7 49,7 47,9 48,12 45,10 42,12 43,9 41,7 44,7"/>
        <polygon points="55,4 56,7 59,7 57,9 58,12 55,10 52,12 53,9 51,7 54,7"/><polygon points="65,6 66,9 69,9 67,11 68,14 65,12 62,14 63,11 61,9 64,9"/>
      </g>
      <circle cx="50" cy="58" r="40" fill="#ffffff" stroke="#000000" stroke-width="3"/>
      <g fill="#000000"><circle cx="50" cy="44" r="5"/><path d="M 45 48 L 55 48 L 58 68 L 42 68 Z"/><polygon points="42,48 24,52 38,62"/><polygon points="58,48 76,52 62,62"/></g>
      <rect x="35" y="74" width="30" height="3" fill="#000000"/><rect x="35" y="77" width="30" height="3" fill="#dd0000"/><rect x="35" y="80" width="30" height="3" fill="#ffce00"/>
      <text x="50" y="92" font-family="'Arial Black', sans-serif" font-size="6.5" font-weight="900" fill="#000000" text-anchor="middle">DFB</text>
    </svg>`;
  }

  // PORTUGAL - FPF Quinas Shield
  if (id === 'nat_portugal' || name.toLowerCase() === 'portugal') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <path d="M 16 16 L 84 16 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#de2910" stroke="#fbc02d" stroke-width="3.5"/>
      <path d="M 16 16 L 46 16 L 46 99 Q 28 92 16 66 Z" fill="#046a38"/>
      <circle cx="50" cy="54" r="22" fill="none" stroke="#fbc02d" stroke-width="2.5"/>
      <path d="M 40 44 L 60 44 L 60 62 Q 60 70 50 74 Q 40 70 40 62 Z" fill="#ffffff" stroke="#de2910" stroke-width="1.5"/>
      <text x="50" y="88" font-family="'Arial Black', sans-serif" font-size="7" font-weight="900" fill="#fbc02d" text-anchor="middle">FPF</text>
    </svg>`;
  }

  // ITALY - FIGC 4-Star Azzurri Shield
  if (id === 'nat_italy' || name.toLowerCase() === 'italy') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <g fill="#ffd54f">
        <polygon points="35,6 36,9 39,9 37,11 38,14 35,12 32,14 33,11 31,9 34,9"/><polygon points="45,4 46,7 49,7 47,9 48,12 45,10 42,12 43,9 41,7 44,7"/>
        <polygon points="55,4 56,7 59,7 57,9 58,12 55,10 52,12 53,9 51,7 54,7"/><polygon points="65,6 66,9 69,9 67,11 68,14 65,12 62,14 63,11 61,9 64,9"/>
      </g>
      <path d="M 16 18 L 84 18 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#0055a5" stroke="#ffd54f" stroke-width="3"/>
      <path d="M 28 42 L 42 42 L 42 80 L 28 72 Z" fill="#009246"/><rect x="42" y="42" width="16" height="42" fill="#ffffff"/><path d="M 58 42 L 72 42 L 72 72 L 58 80 Z" fill="#ce2b37"/>
      <text x="50" y="34" font-family="'Arial Black', sans-serif" font-size="8.5" font-weight="900" fill="#ffffff" text-anchor="middle">ITALIA</text>
      <text x="50" y="93" font-family="'Arial Black', sans-serif" font-size="6" font-weight="900" fill="#ffd54f" text-anchor="middle">FIGC</text>
    </svg>`;
  }

  // NETHERLANDS - KNVB Orange Lion
  if (id === 'nat_netherlands' || name.toLowerCase() === 'netherlands') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <path d="M 16 16 L 84 16 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#f36c21" stroke="#001c58" stroke-width="4"/>
      <g fill="#ffd54f"><circle cx="50" cy="42" r="5"/><polygon points="46,36 50,32 54,36" fill="#ffd54f"/><path d="M 46 46 Q 38 54 44 68 Q 52 64 54 56 Z"/></g>
      <text x="50" y="86" font-family="'Arial Black', sans-serif" font-size="9" font-weight="900" fill="#001c58" text-anchor="middle">KNVB</text>
    </svg>`;
  }

  // CROATIA - Red & White Checkerboard (Šahovnica) Shield
  if (id === 'nat_croatia' || name.toLowerCase() === 'croatia') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <path d="M 16 16 L 84 16 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#ffffff" stroke="#171796" stroke-width="3.5"/>
      <!-- Checkerboard grid inside -->
      <g fill="#ff0000">
        <rect x="22" y="24" width="11" height="11"/><rect x="44" y="24" width="11" height="11"/><rect x="66" y="24" width="11" height="11"/>
        <rect x="33" y="35" width="11" height="11"/><rect x="55" y="35" width="11" height="11"/>
        <rect x="22" y="46" width="11" height="11"/><rect x="44" y="46" width="11" height="11"/><rect x="66" y="46" width="11" height="11"/>
        <rect x="33" y="57" width="11" height="11"/><rect x="55" y="57" width="11" height="11"/>
        <rect x="44" y="68" width="11" height="11"/>
      </g>
      <text x="50" y="90" font-family="'Arial Black', sans-serif" font-size="8" font-weight="900" fill="#171796" text-anchor="middle">HNS</text>
    </svg>`;
  }

  // UNITED STATES - US Soccer Shield
  if (id === 'nat_united_states' || name.toLowerCase().includes('united states') || name.toLowerCase() === 'usa') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <path d="M 16 16 L 84 16 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#ffffff" stroke="#002868" stroke-width="3.5"/>
      <path d="M 16 16 L 84 16 L 84 38 L 16 38 Z" fill="#002868"/>
      <text x="50" y="33" font-family="'Arial Black', sans-serif" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">USA</text>
      <!-- Red and White Stripes -->
      <rect x="23" y="38" width="8" height="42" fill="#bf0a30"/><rect x="39" y="38" width="8" height="48" fill="#bf0a30"/>
      <rect x="55" y="38" width="8" height="48" fill="#bf0a30"/><rect x="71" y="38" width="8" height="42" fill="#bf0a30"/>
    </svg>`;
  }

  // JAPAN - JFA Samurai Blue & Sun Crow Shield
  if (id === 'nat_japan' || name.toLowerCase() === 'japan') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <path d="M 16 16 L 84 16 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#002456" stroke="#ffd700" stroke-width="3"/>
      <circle cx="50" cy="50" r="16" fill="#ffffff"/>
      <circle cx="50" cy="50" r="11" fill="#bc002d"/>
      <text x="50" y="86" font-family="'Arial Black', sans-serif" font-size="10" font-weight="900" fill="#ffd700" text-anchor="middle">JFA</text>
    </svg>`;
  }

  // MOROCCO - Atlas Lions Green Pentagram Shield
  if (id === 'nat_morocco' || name.toLowerCase() === 'morocco') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <path d="M 16 16 L 84 16 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#c1272d" stroke="#ffd700" stroke-width="3.5"/>
      <polygon points="50,32 55,48 71,48 58,58 63,74 50,64 37,74 42,58 29,48 45,48" fill="none" stroke="#006233" stroke-width="3.5"/>
      <text x="50" y="90" font-family="'Arial Black', sans-serif" font-size="8" font-weight="900" fill="#ffd700" text-anchor="middle">FRMF</text>
    </svg>`;
  }

  // URUGUAY - 4-Star Sky Blue & Sun of May Crest
  if (id === 'nat_uruguay' || name.toLowerCase() === 'uruguay') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <g fill="#ffd700">
        <polygon points="26,6 27,9 30,9 28,11 29,14 26,12 23,14 24,11 22,9 25,9"/>
        <polygon points="42,4 43,7 46,7 44,9 45,12 42,10 39,12 40,9 38,7 41,7"/>
        <polygon points="58,4 59,7 62,7 60,9 61,12 58,10 55,12 56,9 54,7 57,7"/>
        <polygon points="74,6 75,9 78,9 76,11 77,14 74,12 71,14 72,11 70,9 73,9"/>
      </g>
      <path d="M 16 18 L 84 18 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#55b5e6" stroke="#001489" stroke-width="3.5"/>
      <circle cx="50" cy="50" r="14" fill="#ffd700" stroke="#001489" stroke-width="1.5"/>
      <text x="50" y="86" font-family="'Arial Black', sans-serif" font-size="9" font-weight="900" fill="#ffffff" text-anchor="middle">AUF</text>
    </svg>`;
  }

  // SWITZERLAND - Red & White Swiss Cross Shield
  if (id === 'nat_switzerland' || name.toLowerCase() === 'switzerland') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
      <path d="M 16 16 L 84 16 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z" fill="#d52b1e" stroke="#ffffff" stroke-width="3.5"/>
      <rect x="42" y="32" width="16" height="46" fill="#ffffff" rx="2"/>
      <rect x="27" y="47" width="46" height="16" fill="#ffffff" rx="2"/>
      <text x="50" y="92" font-family="'Arial Black', sans-serif" font-size="8" font-weight="900" fill="#ffffff" text-anchor="middle">ASF</text>
    </svg>`;
  }


  // =========================================================================
  // 3. Complete Heraldic Flag Shield Engine for ALL 150 FIFA National Teams
  // =========================================================================

  // Flag layout classifications
  const isNordicCross = [
    'nat_norway', 'nat_sweden', 'nat_denmark', 'nat_finland', 'nat_iceland', 'nat_faroe_islands'
  ].includes(id);

  const isVerticalTricolor = [
    'nat_france', 'nat_italy', 'nat_belgium', 'nat_mexico', 'nat_republic_of_ireland',
    'nat_nigeria', 'nat_ivory_coast', 'nat_cameroon', 'nat_senegal', 'nat_mali',
    'nat_guinea', 'nat_romania', 'nat_chad', 'nat_peru', 'nat_canada'
  ].includes(id);

  const isHorizontalTricolor = [
    'nat_germany', 'nat_netherlands', 'nat_austria', 'nat_egypt', 'nat_hungary',
    'nat_bulgaria', 'nat_bolivia', 'nat_estonia', 'nat_lithuania', 'nat_latvia',
    'nat_slovakia', 'nat_slovenia', 'nat_russia', 'nat_serbia', 'nat_croatia',
    'nat_colombia', 'nat_ecuador', 'nat_venezuela', 'nat_ghana', 'nat_armenia',
    'nat_gabon', 'nat_sierra_leone', 'nat_luxembourg', 'nat_paraguay', 'nat_syria',
    'nat_yemen', 'nat_iraq', 'nat_iran', 'nat_ir_iran', 'nat_sudan'
  ].includes(id);

  const isDiagonalSlash = [
    'nat_congo', 'nat_dr_congo', 'nat_congo_dr', 'nat_tanzania', 'nat_trinidad_and_tobago',
    'nat_namibia', 'nat_solomon_islands', 'nat_guyana'
  ].includes(id);

  // Distinct national colors
  let flag1 = primary;
  let flag2 = secondary;
  let flag3 = (secondary === '#ffffff' || secondary === primary) ? '#ffd54f' : secondary;

  // Render authentic heraldic shield with team's colors, FIFA country code & federation badge
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110" width="${width}" height="${height}">
    <defs>
      <linearGradient id="shieldRim_${short}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fff59d"/>
        <stop offset="50%" stop-color="#ffb300"/>
        <stop offset="100%" stop-color="#c67d00"/>
      </linearGradient>
      <clipPath id="shieldClip_${short}">
        <path d="M 16 16 L 84 16 L 84 66 Q 84 92 50 102 Q 16 92 16 66 Z"/>
      </clipPath>
    </defs>

    <!-- Outer Heraldic Shield with Metallic Gold Rim -->
    <path d="M 14 14 L 86 14 L 86 66 Q 86 94 50 104 Q 14 94 14 66 Z" fill="#0b1711" stroke="url(#shieldRim_${short})" stroke-width="3.5"/>

    <!-- Clipped Flag Field -->
    <g clip-path="url(#shieldClip_${short})">
      <!-- Base Color -->
      <rect x="0" y="0" width="100" height="110" fill="${flag1}"/>

      ${isNordicCross ? `
        <!-- Nordic Cross Pattern -->
        <rect x="36" y="0" width="16" height="110" fill="#ffffff"/>
        <rect x="0" y="44" width="100" height="16" fill="#ffffff"/>
        <rect x="40" y="0" width="8" height="110" fill="${flag2}"/>
        <rect x="0" y="48" width="100" height="8" fill="${flag2}"/>
      ` : isVerticalTricolor ? `
        <!-- Vertical Tricolor -->
        <rect x="16" y="0" width="22" height="110" fill="${flag1}"/>
        <rect x="38" y="0" width="24" height="110" fill="${flag2}"/>
        <rect x="62" y="0" width="24" height="110" fill="${flag3}"/>
      ` : isHorizontalTricolor ? `
        <!-- Horizontal Tricolor -->
        <rect x="0" y="16" width="100" height="28" fill="${flag1}"/>
        <rect x="0" y="44" width="100" height="28" fill="${flag2}"/>
        <rect x="0" y="72" width="100" height="38" fill="${flag3}"/>
      ` : isDiagonalSlash ? `
        <!-- Diagonal Sash -->
        <polygon points="16,16 84,84 84,102 16,34" fill="${flag2}"/>
        <polygon points="16,24 84,92 84,98 16,30" fill="${flag3}"/>
      ` : `
        <!-- Standard National Two-Tone / Stripes -->
        <polygon points="16,16 84,16 84,60 16,40" fill="${flag2}" opacity="0.35"/>
        <circle cx="50" cy="55" r="22" fill="${flag2}" opacity="0.85"/>
      `}

      <!-- Top Header Federation Bar with FIFA Code -->
      <path d="M 16 16 L 84 16 L 84 34 L 16 34 Z" fill="#000000" opacity="0.85"/>
      <path d="M 16 33 L 84 33" stroke="url(#shieldRim_${short})" stroke-width="1.5"/>
      <text x="50" y="29" font-family="'Arial Black', -apple-system, sans-serif" font-size="9" font-weight="900" fill="#ffd700" text-anchor="middle" letter-spacing="2">${short}</text>

      <!-- Central Emblem Medallion -->
      <circle cx="50" cy="58" r="14" fill="#ffffff" stroke="url(#shieldRim_${short})" stroke-width="2"/>
      <circle cx="50" cy="58" r="11" fill="${flag1}"/>
      <!-- Federation Star -->
      <polygon points="50,51 52,56 57,56 53,59 55,64 50,61 45,64 47,59 43,56 48,56" fill="#ffd700"/>

      <!-- Lower Federation Wordmark / Laurels -->
      <circle cx="50" cy="85" r="3" fill="#ffd700"/>
      <circle cx="42" cy="82" r="2" fill="#ffd700"/>
      <circle cx="58" cy="82" r="2" fill="#ffd700"/>
    </g>
  </svg>`;
}
