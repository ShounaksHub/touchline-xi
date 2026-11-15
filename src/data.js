import { NATIONAL_TEAMS } from './data/national_teams.js';
import { CLUBS } from './data/clubs.js';

export { CLUBS };

/** Real World Elite Football Clubs + Domestic Clubs + Top 150 FIFA Senior National Teams */

const TEAM_DEFINITIONS = [
  {
    id: 'meridian', name: 'Meridian FC', short: 'MER', city: 'North London', primary: '#d8ff69', secondary: '#243b2d', crest: 'M',
    roster: [
      ['Theo Mercer','GK'],['Elias Rowan','LB'],['Callum Vale','CB'],['Marcus Flint','CB'],['Jonah Price','RB'],
      ['Rafiq Idris','CDM'],['Oscar Reed','CM'],['Adrian Silva','CM'],['Nico Varela','LW'],['Julian Cross','ST'],['Mateo Sanz','RW'],
      ['Benji Ward','GK'],['Kieran Moss','CB'],['Dario Leone','CM'],['Leo Archer','ST'],['Samir Haddad','RW']
    ]
  },
  {
    id: 'borough', name: 'Borough Athletic', short: 'BOR', city: 'South London', primary: '#f2a48b', secondary: '#612d27', crest: 'B',
    roster: [
      ['Milo Fletcher','GK'],['Ellis Hart','LB'],['Victor Haines','CB'],['Roman Clarke','CB'],['Finn Walker','RB'],
      ['Hugo Bennett','CDM'],['Tomas Ibarra','CM'],['Jamie Knox','CM'],['Isaac Bell','LW'],['Arthur Cole','ST'],['Enzo Duarte','RW'],
      ['Noah West','GK'],['Pavel Novak','CB'],['Kenji Mori','CM'],['Luka Marin','ST'],['Amir Khan','LW']
    ]
  },
  {
    id: 'northport', name: 'Northport City', short: 'NOR', city: 'Manchester', primary: '#97d6ff', secondary: '#193e5c', crest: 'N',
    roster: [
      ['Gabriel Finch','GK'],['Felix Grant','LB'],['Soren Dahl','CB'],['Aiden Brooks','CB'],['Ruben Costa','RB'],
      ['Ismael Torres','CDM'],['Emil Fischer','CM'],['Rory Blake','CM'],['Daniel Park','LW'],['Sebastian King','ST'],['Cruz Almeida','RW'],
      ['Will Hughes','GK'],['Liam Doyle','CB'],['Francesco Rizzo','CM'],['Youssef Farah','ST'],['Alex Wei','RW']
    ]
  },
  {
    id: 'eastvale', name: 'Eastvale Rovers', short: 'EAS', city: 'Brighton', primary: '#c6b6ff', secondary: '#3f315c', crest: 'E',
    roster: [
      ['Leon Bishop','GK'],['Quinn Ellis','LB'],['Damon Wright','CB'],['Oliver Stone','CB'],['David Chen','RB'],
      ['Pietro Rossi','CDM'],['Reece Tyler','CM'],['Alessio Romano','CM'],['Ishan Patel','LW'],['Santiago Vega','ST'],['Yuri Tanaka','RW'],
      ['Zac Moore','GK'],['Nils Berg','CB'],['Cameron Ford','CM'],['Javier Ruiz','ST'],['Harun Demir','LW']
    ]
  }
];

const BASE = {
  GK: {pace: 45,shooting: 18,passing: 70,defending: 34,physical: 76,keeping: 84},
  LB: {pace: 78,shooting: 45,passing: 72,defending: 78,physical: 72,keeping: 5},
  RB: {pace: 78,shooting: 45,passing: 72,defending: 78,physical: 72,keeping: 5},
  CB: {pace: 62,shooting: 28,passing: 66,defending: 86,physical: 84,keeping: 5},
  CDM: {pace: 69,shooting: 53,passing: 82,defending: 80,physical: 79,keeping: 5},
  CM: {pace: 74,shooting: 68,passing: 84,defending: 67,physical: 73,keeping: 5},
  LW: {pace: 88,shooting: 77,passing: 78,defending: 34,physical: 65,keeping: 5},
  RW: {pace: 88,shooting: 77,passing: 78,defending: 34,physical: 65,keeping: 5},
  ST: {pace: 79,shooting: 88,passing: 68,defending: 29,physical: 81,keeping: 5},
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function hash(str) {
  let h = 2166136261;
  for (let i=0; i<str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const BASE_TEAMS = TEAM_DEFINITIONS.map((team, teamIndex) => ({
  ...team,
  players: team.roster.map(([name,role], i) => {
    const base = BASE[role];
    const seed = hash(`${team.id}-${name}`);
    const variation = key => (hash(`${seed}-${key}`) % 17) - 8;
    const skill = Object.fromEntries(Object.entries(base).map(([k,v]) => [k,clamp(v + variation(k), 5, 96)]));
    const overall = role === 'GK' ? skill.keeping : Math.round((skill.pace+skill.shooting+skill.passing+skill.defending+skill.physical)/5);
    return { id:`${team.id}-${i}`, name, role, number: i<11 ? [1,3,4,5,2,6,8,10,11,9,7][i] : [13,15,16,19,21][i-11], overall:clamp(Math.round(overall+6),61,94), ...skill };
  }),
  starting: Array.from({length:11},(_,i) => `${team.id}-${i}`),
  substitutes: Array.from({length:5},(_,i) => `${team.id}-${i+11}`)
}));

// Export all world elite clubs, domestic clubs, and the Top 150 Senior National Teams
export const TEAMS = [...CLUBS, ...BASE_TEAMS, ...NATIONAL_TEAMS];

// Coordinates in a 100x100 tactical grid. Home attacks left to right.
export const FORMATIONS = {
  '4-3-3': [
    ['GK',7,50], ['LB',27,13], ['CB',24,38], ['CB',24,62], ['RB',27,87],
    ['CM',46,28], ['CDM',40,50], ['CM',46,72], ['LW',70,16], ['ST',75,50], ['RW',70,84]
  ],
  '4-2-3-1': [
    ['GK',7,50], ['LB',27,13], ['CB',24,38], ['CB',24,62], ['RB',27,87],
    ['CDM',41,37], ['CDM',41,63], ['CAM',61,50], ['LW',68,16], ['ST',80,50], ['RW',68,84]
  ],
  '4-4-2': [
    ['GK',7,50], ['LB',27,13], ['CB',24,38], ['CB',24,62], ['RB',27,87],
    ['LM',51,15], ['CM',46,38], ['CM',46,62], ['RM',51,85], ['ST',72,37], ['ST',72,63]
  ],
  '3-5-2': [
    ['GK',7,50], ['CB',24,21], ['CB',21,50], ['CB',24,79], ['RWB',45,88],
    ['CDM',39,51], ['CM',48,31], ['CM',48,70], ['LWB',45,12], ['ST',74,36], ['ST',74,64]
  ],
  '5-3-2': [
    ['GK',7,50], ['LWB',30,12], ['CB',24,28], ['CB',21,50], ['CB',24,72], ['RWB',30,88],
    ['CM',48,30], ['CDM',42,50], ['CM',48,70], ['ST',75,38], ['ST',75,62]
  ],
  '3-4-3': [
    ['GK',7,50], ['CB',24,22], ['CB',21,50], ['CB',24,78],
    ['LM',48,14], ['CM',46,38], ['CM',46,62], ['RM',48,86],
    ['LW',72,18], ['ST',78,50], ['RW',72,82]
  ],
};

export const PLAY_STYLES = {
  'Tiki-Taka': { pressing: 65, tempo: 42, width: 62, mentality: 'Attacking', description: 'Patient possession, short sharp passing, high defensive line.' },
  'Gegenpress': { pressing: 92, tempo: 82, width: 68, mentality: 'Attacking', description: 'Relentless high pressure upon losing possession and lightning transitions.' },
  'Counter-Attack': { pressing: 32, tempo: 88, width: 75, mentality: 'Defensive', description: 'Compact low block, soaking pressure and breaking with blistering pace.' },
  'Total Football': { pressing: 78, tempo: 68, width: 70, mentality: 'Attacking', description: 'Fluid spatial awareness, all-out attack, and dynamic player interchanging.' },
  'Park the Bus': { pressing: 20, tempo: 35, width: 40, mentality: 'Defensive', description: 'Ultra-disciplined defensive fortress prioritizing clean sheets above all.' },
  'Balanced': { pressing: 52, tempo: 55, width: 58, mentality: 'Balanced', description: 'Pragmatic structure with adaptable tempo based on game state.' }
};

export const DEFAULT_TACTICS = {pressing: 52, tempo: 55, width: 58, mentality: 'Balanced'};
export const getTeam = id => TEAMS.find(t => t.id === id) ?? TEAMS[0];
export const getPlayer = (team, id) => {
  if (!team) return null;
  const found = team.players?.find(p => p.id === id);
  if (found) return found;
  // Fallback search across all teams (especially for custom dream team player references)
  for (const t of TEAMS) {
    const p = t.players?.find(x => x.id === id);
    if (p) return p;
  }
  return null;
};

export const PLAYER_ROLES = { GK: 'Goalkeeper', LB:'Left back', RB:'Right back', CB:'Centre back', CDM:'Holding midfielder', CM:'Central midfielder', CAM:'Attacking midfielder', LM:'Left midfielder', RM:'Right midfielder', LW:'Left wing', RW:'Right wing', ST:'Striker', RWB:'Right wing-back', LWB:'Left wing-back' };
