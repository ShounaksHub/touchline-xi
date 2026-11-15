import json, re, sys
sys.path.insert(0, '.')

from tools.build_all_clubs import build_players
from tools.data_europe import EUROPE_CLUBS
from tools.data_americas import AMERICAS_CLUBS
from tools.data_asia_africa import ASIA_AFRICA_CLUBS
from tools.data_expansion import EXPANSION_CLUBS

# 1. Load existing 16 clubs
with open('src/data/clubs.js', 'r', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'export\s+const\s+CLUBS\s*=\s*(\[[\s\S]*\]);?\s*$', content)
if not m:
    raise Exception("Could not parse existing clubs")

existing_clubs = json.loads(m.group(1))
print(f"Loaded {len(existing_clubs)} existing clubs.")

for c in existing_clubs:
    if c['id'] == 'club_inter_miami':
        c['continent'] = 'North America'
    else:
        c['continent'] = 'Europe'

# 2. Build new clubs
all_new = EUROPE_CLUBS + AMERICAS_CLUBS + ASIA_AFRICA_CLUBS + EXPANSION_CLUBS
print(f"Building {len(all_new)} new clubs...")

new_clubs = []
for spec in all_new:
    club_id = spec['id']
    name = spec['name']
    short = spec['short']
    city = spec['city']
    primary = spec['primary']
    secondary = spec['secondary']
    crest = spec['crest']
    continent = spec['continent']
    base_ovr = spec['baseOvr']
    default_nat = spec['defaultNat']
    roster = spec['roster']

    players = build_players(club_id, name, continent, base_ovr, roster, default_nat)
    starting = [p['id'] for p in players[:11]]
    substitutes = [p['id'] for p in players[11:]]

    club_obj = {
        "id": club_id,
        "name": name,
        "short": short,
        "city": city,
        "primary": primary,
        "secondary": secondary,
        "crest": crest,
        "isClub": True,
        "continent": continent,
        "players": players,
        "starting": starting,
        "substitutes": substitutes
    }
    new_clubs.append(club_obj)

all_clubs = existing_clubs + new_clubs
print(f"Total clubs combined: {len(all_clubs)}")

# 3. Validate invariants across entire combined database
all_ids = set()
for c in all_clubs:
    assert c['id'] not in all_ids, f"Duplicate club ID: {c['id']}"
    all_ids.add(c['id'])
    assert len(c['players']) == 16, f"Club {c['name']} does not have 16 players"
    assert len(c['starting']) == 11, f"Club {c['name']} does not have 11 starting"
    assert len(c['substitutes']) == 5, f"Club {c['name']} does not have 5 substitutes"
    assert c['players'][0]['role'] == 'GK', f"Club {c['name']} starter 0 is not GK"
    assert c['players'][11]['role'] == 'GK', f"Club {c['name']} sub 11 is not GK"
    assert c['continent'] in ['Europe', 'South America', 'North America', 'Asia & Oceania', 'Africa'], f"Unknown continent {c['continent']}"

    player_ids = set()
    for p in c['players']:
        assert p['id'] not in player_ids, f"Duplicate player ID in {c['name']}: {p['id']}"
        player_ids.add(p['id'])
        assert 'ovr' in p and 'overall' in p
        assert 'pace' in p and 'shooting' in p and 'passing' in p and 'defending' in p and 'physical' in p and 'keeping' in p
        assert 'number' in p and 'nat' in p and 'card' in p

print("All invariants strictly validated across all 207 clubs!")

# 4. Write src/data/clubs.js
header = "/** Touchline XI - Comprehensive Global Elite Football Clubs Database (200+ Clubs Across 5 Continents) */\n"
js_content = header + "export const CLUBS = " + json.dumps(all_clubs, indent=2, ensure_ascii=False) + ";\n"

with open('src/data/clubs.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print(f"Successfully wrote {len(all_clubs)} clubs to src/data/clubs.js")
