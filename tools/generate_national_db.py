import urllib.request
import csv
import json
import re
import os
import math

print("=== Building Comprehensive Touchline XI National Database ===")

# 1. Fetch Top 150 FIFA Member Nations from official Wikipedia sports module
fifa_url = 'https://en.wikipedia.org/wiki/Module:SportsRankings/data/FIFA_World_Rankings?action=raw'
req = urllib.request.Request(fifa_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
with urllib.request.urlopen(req, timeout=15) as resp:
    raw = resp.read().decode('utf-8')

pattern = re.compile(r'\{\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*(-?\d+)\s*,\s*([\d\.]+)\s*\}')
fifa_matches = pattern.findall(raw)
top150_raw = fifa_matches[:150]

NATION_MAP = {
    "United States": "United States",
    "USA": "United States",
    "Korea Republic": "Korea Republic",
    "South Korea": "Korea Republic",
    "Korea DPR": "Korea DPR",
    "North Korea": "Korea DPR",
    "IR Iran": "IR Iran",
    "Iran": "IR Iran",
    "Côte d'Ivoire": "Ivory Coast",
    "Ivory Coast": "Ivory Coast",
    "Cabo Verde": "Cape Verde",
    "Cape Verde": "Cape Verde",
    "Congo DR": "Congo DR",
    "Democratic Republic of the Congo": "Congo DR",
    "DR Congo": "Congo DR",
    "Congo": "Congo",
    "Republic of the Congo": "Congo",
    "China PR": "China PR",
    "China": "China PR",
    "Chinese Taipei": "Chinese Taipei",
    "Curaçao": "Curaçao",
    "Curacao": "Curaçao",
    "São Tomé and Príncipe": "São Tomé & Príncipe",
    "Trinidad and Tobago": "Trinidad and Tobago",
    "Trinidad & Tobago": "Trinidad and Tobago",
    "Bosnia and Herzegovina": "Bosnia and Herzegovina",
    "Bosnia & Herzegovina": "Bosnia and Herzegovina",
    "Antigua and Barbuda": "Antigua and Barbuda",
    "Saint Kitts and Nevis": "Saint Kitts and Nevis",
    "Saint Lucia": "Saint Lucia",
    "Saint Vincent and the Grenadines": "Saint Vincent and the Grenadines",
}

def normalize_nat(name):
    clean = name.strip()
    return NATION_MAP.get(clean, clean)

# 2. Load Peak / Icon cards
with open("src/data/icons_peak.json", "r", encoding="utf-8") as f:
    icons_list = json.load(f)

# Normalize icon nation names
for icon in icons_list:
    icon['nat'] = normalize_nat(icon['nat'])

# 3. Stream and Aggregate All Players from CSV
url_csv = "https://raw.githubusercontent.com/davidcamilo0710/qatar_2022_prediction/master/data/players_22.csv"
req = urllib.request.Request(url_csv, headers={'User-Agent': 'Mozilla/5.0'})

players_by_nation = {}
with urllib.request.urlopen(req, timeout=40) as resp:
    lines = resp.read().decode('utf-8', errors='replace').splitlines()
    reader = csv.DictReader(lines)
    for row in reader:
        raw_nat = (row.get('nationality_name') or '').strip()
        if not raw_nat: continue
        nat = normalize_nat(raw_nat)
        
        try: ovr = int(row.get('overall') or 50)
        except: ovr = 50
        try: pace = int(float(row.get('pace') or 60))
        except: pace = 60
        try: shoot = int(float(row.get('shooting') or 50))
        except: shoot = 50
        try: pass_ = int(float(row.get('passing') or 55))
        except: pass_ = 55
        try: def_ = int(float(row.get('defending') or 50))
        except: def_ = 50
        try: phys = int(float(row.get('physic') or 60))
        except: phys = 60
        try: gk = int(float(row.get('goalkeeping_diving') or 10))
        except: gk = 10
        
        pos_raw = (row.get('player_positions') or 'CM').split(',')[0].strip()
        # standard role simplifier
        role = pos_raw if pos_raw in ['GK','LB','RB','CB','CDM','CM','CAM','LM','RM','LW','RW','ST','CF'] else 'CM'
        if role == 'CF': role = 'ST'
        if role in ['LM','RM']: role = 'LW' if role == 'LM' else 'RW'
        
        name = row.get('short_name') or row.get('long_name')
        
        # Calculate maximum peak card rating upgrade for modern top performers
        # e.g. If player has high overall or potential, their maximum promo card (TOTY/TOTS/Special) peaks higher
        pot = int(row.get('potential') or ovr)
        peak_ovr = ovr
        peak_card = f"Base ({ovr} OVR)"
        if ovr >= 90:
            peak_ovr = min(99, ovr + 6)
            peak_card = f"Peak TOTY / Special ({peak_ovr} OVR)"
        elif ovr >= 85:
            peak_ovr = min(96, ovr + 7)
            peak_card = f"Peak TOTS / Promo ({peak_ovr} OVR)"
        elif ovr >= 80:
            peak_ovr = min(92, ovr + 6)
            peak_card = f"Team of the Season ({peak_ovr} OVR)"
        elif ovr >= 75:
            peak_ovr = min(88, ovr + 5)
            peak_card = f"In-Form / Special ({peak_ovr} OVR)"
        elif ovr >= 70:
            peak_ovr = min(84, ovr + 4)
            peak_card = f"Special Silver/Gold Star ({peak_ovr} OVR)"
        
        # Scale stats up to peak rating
        stat_boost = peak_ovr - ovr
        
        player_obj = {
            "name": name,
            "role": role,
            "nat": nat,
            "ovr": peak_ovr,
            "base_ovr": ovr,
            "pace": min(99, pace + int(stat_boost * 0.8)),
            "shooting": min(99, shoot + int(stat_boost * 0.9)),
            "passing": min(99, pass_ + int(stat_boost * 0.85)),
            "defending": min(99, def_ + int(stat_boost * 0.85)),
            "physical": min(99, phys + int(stat_boost * 0.8)),
            "keeping": min(99, gk + int(stat_boost * 0.95)) if role == 'GK' else 5,
            "card": peak_card,
            "club": row.get('club_name'),
            "dob": row.get('dob')
        }
        players_by_nation.setdefault(nat, []).append(player_obj)

print("Integrating Peak Icons & Legends into squads...")
for icon in icons_list:
    nat = icon['nat']
    # If icon not already present or higher than existing, add to front
    existing_idx = -1
    if nat in players_by_nation:
        for idx, p in enumerate(players_by_nation[nat]):
            if p['name'].lower() == icon['name'].lower() or icon['name'].lower() in p['name'].lower():
                existing_idx = idx
                break
    
    formatted_icon = {
        "name": icon["name"],
        "role": icon["role"],
        "nat": nat,
        "ovr": icon["ovr"],
        "base_ovr": icon["ovr"],
        "pace": icon["pace"],
        "shooting": icon["shoot"],
        "passing": icon["pass"],
        "defending": icon["def"],
        "physical": icon["phys"],
        "keeping": icon["gk"] if icon["role"] == "GK" else 5,
        "card": icon["card"],
        "club": "National Legend (Icon / Hero)",
        "dob": icon.get("dob", "")
    }
    
    if existing_idx >= 0:
        # replace with maximum peak card
        players_by_nation[nat][existing_idx] = formatted_icon
    else:
        players_by_nation.setdefault(nat, []).append(formatted_icon)

# 4. Generate Balanced Squads for every one of the Top 150 FIFA Nations
# For any nation in the Top 150 that might have fewer than 16 players in the European club DB,
# synthesize high-fidelity realistic national team roster using regional name generator & FIFA ranking tier stats
FIRST_NAMES = {
    "Africa": ["Kwame","Moussa","Amadou","Sadio","Emmanuel","Joseph","Samuel","Idrissa","Keita","Bakary","Chidi","Tariq","Moses","Didier","Cheick"],
    "Asia": ["Kenji","Daiki","Min-jun","Ji-hoon","Wei","Jun","Thiraphat","Anand","Farhad","Alireza","Ali","Nguyen","Mohammad","Sultan","Bambang"],
    "Europe": ["Lukas","Jan","Matej","Marko","Filip","Tomas","David","Alexandru","Nikola","Stefan","Artem","Mikkel","Elias","Oliver","Sami"],
    "Americas": ["Mateo","Santiago","Diego","Carlos","Lucas","Gabriel","Rafael","Emiliano","Sebastian","Javier","Alonso","Keylor","Bryan","Christian","Marcos"]
}
LAST_NAMES = {
    "Africa": ["Traoré","Diallo","Touré","Kamara","Cissé","Mensah","Okafor","Ndlovu","Diop","Kouassi","Ba","Kone","Banda","Mwangi","Sow"],
    "Asia": ["Tanaka","Suzuki","Kim","Park","Lee","Wong","Sharma","Singh","Rezaei","Azizi","Sato","Al-Dawsari","Prasad","Yamamoto","Chen"],
    "Europe": ["Novak","Horvat","Popov","Petrov","Kowalski","Nielsen","Hansen","Schmidt","Rossi","García","Silva","Ivanov","Dimitrov","Melnyk","Varga"],
    "Americas": ["Rodríguez","González","Hernández","López","Martínez","Pérez","Gómez","Fernández","Díaz","Alvarez","Silva","Santos","Morales","Reyes","Castillo"]
}

def get_region(country):
    african = ["Morocco","Senegal","Egypt","Nigeria","Algeria","Ivory Coast","Cameroon","Mali","South Africa","Congo DR","Ghana","Cape Verde","Burkina Faso","Guinea","Angola","Benin","Uganda","Zambia","Equatorial Guinea","Congo","Mauritania","Madagascar","Namibia","Kenya","Tanzania","Mozambique","Gambia","Togo","Comoros","Sierra Leone","Malawi","Central African Republic","Niger","Zimbabwe","Rwanda","Burundi","Botswana","Ethiopia","Liberia","Lesotho","Sudan","Guinea-Bissau"]
    asian = ["Japan","IR Iran","Korea Republic","Australia","Qatar","Saudi Arabia","Uzbekistan","Iraq","Jordan","United Arab Emirates","Bahrain","Oman","China PR","Syria","Palestine","Thailand","Tajikistan","Kyrgyzstan","Vietnam","Lebanon","India","Kuwait","Indonesia","Malaysia","Turkmenistan","Philippines","Yemen","Singapore","North Korea"]
    americas = ["Argentina","Brazil","Colombia","Uruguay","United States","Mexico","Ecuador","Peru","Panama","Venezuela","Costa Rica","Chile","Paraguay","Canada","Jamaica","Honduras","El Salvador","Haiti","Curacao","Trinidad and Tobago","Guatemala","Nicaragua","Suriname","Antigua and Barbuda","Guyana","Dominican Republic","Puerto Rico"]
    if country in african: return "Africa"
    if country in asian: return "Asia"
    if country in americas: return "Americas"
    return "Europe"

national_database = []

for rank_idx, (raw_nat_name, rank_str, change_str, pts_str) in enumerate(top150_raw):
    normed = normalize_nat(raw_nat_name)
    rank = int(rank_str)
    points = float(pts_str)
    
    # Existing players for this nation
    existing = players_by_nation.get(normed, [])
    # Sort existing by overall descending
    existing.sort(key=lambda p: p['ovr'], reverse=True)
    
    # Ensure minimum 16 players (11 starters + 5 bench) with at least 2 goalkeepers
    squad = list(existing)
    
    # Base overall calibrated to FIFA ranking tier
    # Rank 1-10: 88-99
    # Rank 11-30: 82-94
    # Rank 31-60: 76-88
    # Rank 61-100: 70-82
    # Rank 101-150: 64-77
    tier_base = max(62, min(92, int(92 - (rank / 150.0) * 26)))
    
    region = get_region(normed)
    fnames = FIRST_NAMES[region]
    lnames = LAST_NAMES[region]
    
    required_roles = ['GK','LB','CB','CB','RB','CDM','CM','CAM','LW','RW','ST','GK','CB','CM','ST','RW']
    
    # Fill missing spots to guarantee a robust 16-player tournament roster
    while len(squad) < 16:
        missing_idx = len(squad)
        role = required_roles[missing_idx]
        fn = fnames[(missing_idx * 7 + rank * 3) % len(fnames)]
        ln = lnames[(missing_idx * 11 + rank * 5) % len(lnames)]
        synth_name = f"{fn[0]}. {ln}"
        
        stat_var = ((rank * 17 + missing_idx * 13) % 9) - 4
        ovr = max(60, min(90, tier_base + stat_var - (missing_idx // 3)))
        
        is_gk = role == 'GK'
        squad.append({
            "name": synth_name,
            "role": role,
            "nat": normed,
            "ovr": ovr,
            "base_ovr": ovr,
            "pace": 50 if is_gk else max(55, min(95, ovr + 4)),
            "shooting": 20 if is_gk else max(40, min(95, ovr - 2)),
            "passing": max(50, min(95, ovr + 1)),
            "defending": 35 if is_gk else (max(65, min(95, ovr + 5)) if role in ['CB','LB','RB','CDM'] else max(30, min(75, ovr - 15))),
            "physical": max(55, min(95, ovr + 2)),
            "keeping": max(60, min(95, ovr + 4)) if is_gk else 5,
            "card": f"National Senior Team ({ovr} OVR)",
            "club": f"{normed} National Pool",
            "dob": f"{1990 + (missing_idx % 12)}-0{1 + (missing_idx % 8)}-15"
        })
    
    # Ensure at least 2 goalkeepers
    gks = [p for p in squad if p['role'] == 'GK']
    if len(gks) < 2:
        # turn last player into GK
        squad[-1]['role'] = 'GK'
        squad[-1]['keeping'] = squad[-1]['ovr']
    
    # Assign jersey numbers 1-16
    for i, p in enumerate(squad[:16]):
        if i == 0: p['number'] = 1
        elif p['role'] == 'GK' and i >= 11: p['number'] = 12
        else: p['number'] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16][i]
    
    top_card_player = max(squad, key=lambda p: p['ovr'])
    
    # Generate team kit colors deterministically by nation
    h = 0
    for ch in normed: h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    palettes = [
        ("#e63946", "#1d3557"), ("#ffd166", "#06d6a0"), ("#118ab2", "#073b4c"),
        ("#2a9d8f", "#e76f51"), ("#f4a261", "#264653"), ("#3a86ff", "#ff006e"),
        ("#ffbe0b", "#fb5607"), ("#8338ec", "#3a86ff"), ("#00b4d8", "#0077b6")
    ]
    primary_color, secondary_color = palettes[h % len(palettes)]
    
    # Specific colors for famous teams
    FAMOUS_COLORS = {
        "Argentina": ("#75aadb", "#ffffff"),
        "Brazil": ("#ffdf00", "#009c3b"),
        "France": ("#002654", "#ffffff"),
        "Spain": ("#c60b1e", "#ffc400"),
        "England": ("#ffffff", "#ce1124"),
        "Portugal": ("#da291c", "#046a38"),
        "Germany": ("#ffffff", "#000000"),
        "Italy": ("#0064aa", "#ffffff"),
        "Netherlands": ("#f36c21", "#ffffff"),
        "Croatia": ("#ff0000", "#ffffff"),
        "Uruguay": ("#5ca5d5", "#000000"),
        "Belgium": ("#ed2939", "#000000"),
        "India": ("#004ba0", "#ff9933"),
        "Japan": ("#002b7f", "#ffffff"),
        "United States": ("#002868", "#bf0a30"),
    }
    if normed in FAMOUS_COLORS:
        primary_color, secondary_color = FAMOUS_COLORS[normed]

    team_entry = {
        "id": f"nat_{normed.lower().replace(' ', '_').replace('&', 'and')}",
        "name": normed,
        "official_name": raw_nat_name,
        "short": normed[:3].upper(),
        "fifa_rank": rank,
        "fifa_points": points,
        "primary": primary_color,
        "secondary": secondary_color,
        "crest": normed[0],
        "max_card_player": {
            "name": top_card_player["name"],
            "ovr": top_card_player["ovr"],
            "role": top_card_player["role"],
            "card": top_card_player["card"]
        },
        "roster_count": len(squad),
        "players": squad[:16],
        "starting": [f"{normed.lower().replace(' ', '_')}_{i}" for i in range(11)],
        "substitutes": [f"{normed.lower().replace(' ', '_')}_{i}" for i in range(11, 16)]
    }
    
    # Give player unique ids
    for i, p in enumerate(team_entry["players"]):
        p["id"] = f"{normed.lower().replace(' ', '_')}_{i}"

    national_database.append(team_entry)

print(f"Successfully generated database for {len(national_database)} Top 150 FIFA Senior National Teams!")
print(f"Top 5 nations:")
for t in national_database[:5]:
    print(f"  #{t['fifa_rank']} {t['name']}: Top Card -> {t['max_card_player']['name']} ({t['max_card_player']['ovr']} OVR - {t['max_card_player']['card']})")

print(f"145-150 sample:")
for t in national_database[144:150]:
    print(f"  #{t['fifa_rank']} {t['name']}: Top Card -> {t['max_card_player']['name']} ({t['max_card_player']['ovr']} OVR - {t['max_card_player']['card']})")

# Write out JSON database
output_file = "src/data/national_teams_db.json"
with open(output_file, "w", encoding="utf-8") as f:
    json.dump(national_database, f, indent=2, ensure_ascii=False)

print(f"Saved complete national database to {output_file} (Size: {os.path.getsize(output_file) / 1024:.1f} KB)")
