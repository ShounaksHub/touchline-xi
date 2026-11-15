import json
import re
import os
import sys

# Ensure UTF-8
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')

print("Starting Touchline XI Squad Depth & Database Expansion...")

from tools.expand_database import (
    hash_str, clamp, ROLE_PROFILES, make_card_title,
    build_player_dict, select_strongest_xi, RESERVE_POSITIONS,
    FIRST_NAMES_GLOBAL, LAST_NAMES_GLOBAL
)
from tools.legendary_rosters import CURATED_CLUBS, CURATED_NATIONS

# Country name pools for authentic names
NAMES_BY_COUNTRY = {
    "Spain": {
        "first": ["Pablo", "Iker", "Alvaro", "Alejandro", "Sergio", "Hugo", "Lucas", "Mateo", "Manuel", "Adrian", "Raul", "Marcos", "Carlos", "Javier", "David", "Ivan", "Ruben", "Diego", "Jorge", "Gonzalo"],
        "last": ["Garcia", "Rodriguez", "Gonzalez", "Fernandez", "Lopez", "Martinez", "Sanchez", "Perez", "Gomez", "Martin", "Jimenez", "Ruiz", "Hernandez", "Diaz", "Moreno", "Alvarez", "Munoz", "Romero", "Alonso", "Gutierrez"]
    },
    "England": {
        "first": ["Harry", "Jack", "Oliver", "George", "Charlie", "James", "William", "Thomas", "Mason", "Ethan", "Callum", "Connor", "Lewis", "Daniel", "Luke", "Alex", "Ben", "Sam", "Joe", "Archie"],
        "last": ["Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Johnson", "Davies", "Robinson", "Wright", "Thompson", "Evans", "Walker", "White", "Roberts", "Green", "Hall", "Wood", "Jackson", "Clarke"]
    },
    "Brazil": {
        "first": ["Gabriel", "Lucas", "Matheus", "Gustavo", "Felipe", "Vinicius", "Leonardo", "Rodrigo", "Guilherme", "Thiago", "Arthur", "Rafael", "Enzo", "Bruno", "Eduardo", "Danilo", "Caio", "Igor", "Renan", "Murilo"],
        "last": ["Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes", "Soares", "Fernandes", "Vieira", "Barbosa"]
    },
    "Germany": {
        "first": ["Lukas", "Maximilian", "Paul", "Jonas", "Felix", "Leon", "Finn", "Noah", "Elias", "Niklas", "Tim", "Jan", "Julian", "Florian", "Moritz", "Philipp", "Simon", "David", "Nico", "Alexander"],
        "last": ["Muller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Schafer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schroder", "Neumann", "Schwarz", "Zimmermann"]
    },
    "Italy": {
        "first": ["Lorenzo", "Leonardo", "Francesco", "Alessandro", "Mattia", "Andrea", "Gabriele", "Matteo", "Tommaso", "Riccardo", "Edoardo", "Federico", "Marco", "Giuseppe", "Antonio", "Davide", "Christian", "Samuele", "Giovanni", "Pietro"],
        "last": ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo", "Conti", "De Luca", "Mancini", "Costa", "Giordano", "Rizzo", "Lombardi", "Moretti"]
    },
    "France": {
        "first": ["Gabriel", "Leo", "Raphael", "Arthur", "Louis", "Lucas", "Adam", "Jules", "Hugo", "Mael", "Liam", "Noah", "Paul", "Ethan", "Sacha", "Tom", "Gabin", "Mohamed", "Aaron", "Theo"],
        "last": ["Martin", "Bernard", "Thomas", "Petit", "Robert", "Richard", "Durand", "Dubois", "Moreau", "Laurent", "Simon", "Michel", "Lefebvre", "Leroy", "Roux", "David", "Bertrand", "Morel", "Fournier", "Girard"]
    },
    "Argentina": {
        "first": ["Santiago", "Mateo", "Joaquin", "Valentin", "Santino", "Bautista", "Thiago", "Lautaro", "Ignacio", "Tomas", "Franco", "Nicolas", "Facundo", "Maximo", "Martin", "Lucas", "Agustin", "Julian", "Nahuel", "Gonzalo"],
        "last": ["Gonzalez", "Rodriguez", "Gomez", "Fernandez", "Lopez", "Diaz", "Martinez", "Perez", "Garcia", "Sanchez", "Romero", "Sosa", "Torres", "Alvarez", "Ruiz", "Ramirez", "Flores", "Benitez", "Acosta", "Medina"]
    },
    "India": {
        "first": ["Aman", "Rohan", "Vikram", "Rahul", "Aditya", "Sameer", "Nikhil", "Arjun", "Karan", "Suraj", "Manish", "Deepak", "Akash", "Vishal", "Gaurav", "Siddharth", "Pradeep", "Harsh", "Kunal", "Rajesh"],
        "last": ["Singh", "Kumar", "Sharma", "Verma", "Patel", "Das", "Banerjee", "Bose", "Ghosh", "Mukherjee", "Chatterjee", "Mondal", "Ali", "Khan", "Chhetri", "Fernandes", "D'Souza", "Naik", "Rao", "Reddy"]
    }
}

def get_country_names(country_name):
    for k, v in NAMES_BY_COUNTRY.items():
        if k.lower() in country_name.lower():
            return v
    return {"first": FIRST_NAMES_GLOBAL, "last": LAST_NAMES_GLOBAL}

# 1. Expand Clubs
print("Loading clubs...")
with open('src/data/clubs.js', 'r', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'export\s+const\s+CLUBS\s*=\s*(\[[\s\S]*\]);?\s*$', content)
if not m:
    raise Exception("Could not parse clubs.js")

clubs = json.loads(m.group(1))
print(f"Loaded {len(clubs)} clubs.")

expanded_clubs = []
total_club_players = 0

for club in clubs:
    club_id = club['id']
    club_name = club['name']
    continent = club.get('continent', 'Europe')
    existing_players = club.get('players', [])

    new_players = []

    # Check if this club has curated legend/squad roster
    if club_id in CURATED_CLUBS:
        curated = CURATED_CLUBS[club_id]
        print(f"Applying curated legend roster to {club_name} ({len(curated)} players)")
        for idx, (pname, role, nat, ovr, num) in enumerate(curated):
            p = build_player_dict(club_id, idx, pname, role, nat, club_name, ovr, num)
            new_players.append(p)
    else:
        # Keep existing 16 players
        for p in existing_players:
            new_players.append(dict(p))

        # Add 20 reserve players!
        target_reserves = 20
        start_idx = len(new_players)
        country_guess = club.get('city', '').split(',')[-1].strip() if ',' in club.get('city', '') else club.get('name', '')
        name_pool = get_country_names(country_guess)

        # Base rating estimation from existing starters
        avg_ovr = sum(p.get('ovr', 75) for p in existing_players[:11]) / max(1, min(11, len(existing_players)))
        reserve_base_ovr = clamp(round(avg_ovr - 4), 62, 88)

        for r_i in range(target_reserves):
            idx = start_idx + r_i
            h = hash_str(f"{club_id}_reserve_{idx}")
            fn = name_pool['first'][(h >> 2) % len(name_pool['first'])]
            ln = name_pool['last'][(h >> 5) % len(name_pool['last'])]
            name = f"{fn} {ln}"
            role = RESERVE_POSITIONS[r_i % len(RESERVE_POSITIONS)]
            nat = existing_players[0].get('nat', 'International') if existing_players else 'International'
            jitter = (h % 7) - 3
            ovr = clamp(reserve_base_ovr + jitter, 60, 91)
            num = 20 + r_i

            p = build_player_dict(club_id, idx, name, role, nat, club_name, ovr, num)
            new_players.append(p)

    # Now select strongest XI and order squad
    starting_ids, substitute_ids, ordered_players = select_strongest_xi(new_players)

    club['starting'] = starting_ids
    club['substitutes'] = substitute_ids
    club['players'] = ordered_players

    total_club_players += len(ordered_players)
    expanded_clubs.append(club)

print(f"Expanded {len(expanded_clubs)} clubs: Total {total_club_players} players (avg {total_club_players/len(expanded_clubs):.1f} per club).")

# 2. Expand National Teams
print("\nLoading national teams database...")
with open('src/data/national_teams_db.json', 'r', encoding='utf-8') as f:
    national_teams = json.load(f)

print(f"Loaded {len(national_teams)} national teams.")

expanded_national_teams = []
total_nat_players = 0

for team in national_teams:
    team_id = team['id']
    team_name = team['name']
    existing_players = team.get('players', [])

    new_players = []

    team_p_prefix = team_id.replace('nat_', '')
    if team_id in CURATED_NATIONS:
        curated = CURATED_NATIONS[team_id]
        print(f"Applying curated legend roster to {team_name} ({len(curated)} players)")
        for idx, (pname, role, nat, ovr, num) in enumerate(curated):
            p = build_player_dict(team_p_prefix, idx, pname, role, nat, team_name, ovr, num)
            new_players.append(p)
    else:
        # Keep existing 16 players
        for p in existing_players:
            new_players.append(dict(p))

        # Add 20 reserve players!
        target_reserves = 20
        start_idx = len(new_players)
        name_pool = get_country_names(team_name)

        avg_ovr = sum(p.get('ovr', 75) for p in existing_players[:11]) / max(1, min(11, len(existing_players)))
        reserve_base_ovr = clamp(round(avg_ovr - 4), 60, 88)

        for r_i in range(target_reserves):
            idx = start_idx + r_i
            h = hash_str(f"{team_id}_reserve_{idx}")
            fn = name_pool['first'][(h >> 2) % len(name_pool['first'])]
            ln = name_pool['last'][(h >> 5) % len(name_pool['last'])]
            name = f"{fn} {ln}"
            role = RESERVE_POSITIONS[r_i % len(RESERVE_POSITIONS)]
            nat = team_name
            jitter = (h % 7) - 3
            ovr = clamp(reserve_base_ovr + jitter, 58, 90)
            num = 20 + r_i

            p = build_player_dict(team_p_prefix, idx, name, role, nat, team_name, ovr, num)
            new_players.append(p)

    # Select strongest XI
    starting_ids, substitute_ids, ordered_players = select_strongest_xi(new_players)

    team['starting'] = starting_ids
    team['substitutes'] = substitute_ids
    team['players'] = ordered_players

    total_nat_players += len(ordered_players)
    expanded_national_teams.append(team)

print(f"Expanded {len(expanded_national_teams)} national teams: Total {total_nat_players} players (avg {total_nat_players/len(expanded_national_teams):.1f} per team).")

total_all_players = total_club_players + total_nat_players
print(f"\n=======================================================")
print(f"TOTAL PLAYER DATABASE: {total_all_players:,} PLAYERS ACROSS {len(expanded_clubs) + len(expanded_national_teams)} TEAMS!")
print(f"=======================================================")

# 3. Write clubs.js
print("\nWriting src/data/clubs.js...")
with open('src/data/clubs.js', 'w', encoding='utf-8') as f:
    f.write("/** Touchline XI - Comprehensive Global Elite Football Clubs Database (200+ Clubs Across 5 Continents) */\n")
    f.write("export const CLUBS = " + json.dumps(expanded_clubs, indent=2, ensure_ascii=False) + ";\n")

# 4. Write national_teams_db.json
print("Writing src/data/national_teams_db.json...")
with open('src/data/national_teams_db.json', 'w', encoding='utf-8') as f:
    json.dump(expanded_national_teams, f, indent=2, ensure_ascii=False)

# 5. Write national_teams.js
print("Writing src/data/national_teams.js...")
lines = [
    "/** Touchline XI - Top 150 FIFA Senior National Teams Database */",
    "// Auto-generated high-fidelity database containing official FIFA rankings, peak cards, and deep rosters",
    "export const NATIONAL_TEAMS = " + json.dumps(expanded_national_teams, ensure_ascii=False) + ";\n"
]
with open('src/data/national_teams.js', 'w', encoding='utf-8') as f:
    f.write("\n".join(lines))

print("All database files updated successfully!")
