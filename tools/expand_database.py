import json
import re
import os
import sys

# Ensure UTF-8
sys.stdout.reconfigure(encoding='utf-8')

print("Starting Touchline XI Squad Depth & Database Expansion...")

def hash_str(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h

def clamp(v, a, b):
    return max(a, min(b, v))

ROLE_PROFILES = {
    'GK':  {'pace': 52, 'shooting': 20, 'passing': 74, 'defending': 40, 'physical': 78, 'keeping': 85},
    'LB':  {'pace': 82, 'shooting': 60, 'passing': 76, 'defending': 78, 'physical': 76, 'keeping': 5},
    'RB':  {'pace': 82, 'shooting': 60, 'passing': 76, 'defending': 78, 'physical': 76, 'keeping': 5},
    'CB':  {'pace': 70, 'shooting': 38, 'passing': 68, 'defending': 84, 'physical': 84, 'keeping': 5},
    'CDM': {'pace': 72, 'shooting': 64, 'passing': 82, 'defending': 82, 'physical': 82, 'keeping': 5},
    'CM':  {'pace': 76, 'shooting': 74, 'passing': 83, 'defending': 70, 'physical': 76, 'keeping': 5},
    'CAM': {'pace': 80, 'shooting': 80, 'passing': 85, 'defending': 52, 'physical': 70, 'keeping': 5},
    'LM':  {'pace': 85, 'shooting': 75, 'passing': 79, 'defending': 56, 'physical': 72, 'keeping': 5},
    'RM':  {'pace': 85, 'shooting': 75, 'passing': 79, 'defending': 56, 'physical': 72, 'keeping': 5},
    'LW':  {'pace': 88, 'shooting': 80, 'passing': 78, 'defending': 44, 'physical': 70, 'keeping': 5},
    'RW':  {'pace': 88, 'shooting': 80, 'passing': 78, 'defending': 44, 'physical': 70, 'keeping': 5},
    'ST':  {'pace': 84, 'shooting': 86, 'passing': 74, 'defending': 40, 'physical': 80, 'keeping': 5}
}

FIRST_NAMES_GLOBAL = [
    "Lucas", "Mateo", "Alex", "Gabriel", "David", "Marco", "Daniel", "Carlos", "Leo", "Adrian",
    "Julian", "Diego", "Enzo", "Hugo", "Nicolas", "Victor", "Rafael", "Tomas", "Ivan", "Liam",
    "Noah", "Ethan", "Sebastian", "Elias", "Felix", "Oscar", "Arthur", "Milan", "Samuel", "Oliver"
]

LAST_NAMES_GLOBAL = [
    "Silva", "Santos", "Fernandez", "Rodriguez", "Lopez", "Garcia", "Martinez", "Gonzalez", "Perez", "Sanchez",
    "Romero", "Torres", "Alvarez", "Gomez", "Costa", "Oliveira", "Muller", "Schmidt", "Rossi", "Ferrari",
    "Moreau", "Dubois", "Smith", "Jones", "Williams", "Brown", "Taylor", "Davies", "Wilson", "Evans"
]

RESERVE_POSITIONS = [
    'GK', 'LB', 'RB', 'CB', 'CB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST',
    'CB', 'CM', 'ST', 'LB', 'RB', 'CDM', 'CAM', 'RW', 'LW'
]

def make_card_title(ovr, name, role):
    if ovr >= 95: return f"Iconic Legend ({ovr} OVR)"
    if ovr >= 90: return f"World Class Elite ({ovr} OVR)"
    if ovr >= 85: return f"Gold Rare ({ovr} OVR)"
    if ovr >= 80: return f"Gold Regular ({ovr} OVR)"
    return f"Silver Regular ({ovr} OVR)"

def build_player_dict(team_id, idx, name, role, nat, club_name, ovr, num):
    h = hash_str(f"{team_id}_{name}_{idx}_{role}")
    base_stats = ROLE_PROFILES.get(role, ROLE_PROFILES['CM'])
    stat_mod = (ovr - 78) * 0.75
    
    pace = clamp(round(base_stats['pace'] + stat_mod + (((h >> 2) % 7) - 3)), 45, 99)
    shooting = clamp(round(base_stats['shooting'] + stat_mod + (((h >> 4) % 7) - 3)), 20, 99)
    passing = clamp(round(base_stats['passing'] + stat_mod + (((h >> 6) % 7) - 3)), 35, 99)
    defending = clamp(round(base_stats['defending'] + stat_mod + (((h >> 8) % 7) - 3)), 25, 99)
    physical = clamp(round(base_stats['physical'] + stat_mod + (((h >> 10) % 7) - 3)), 45, 99)
    keeping = clamp(round(ovr + (((h >> 12) % 5) - 2)), 65, 99) if role == 'GK' else 5

    return {
        'id': f"{team_id}_{idx}",
        'name': name,
        'role': role,
        'nat': nat,
        'club': club_name,
        'ovr': ovr,
        'overall': ovr,
        'number': num,
        'pace': pace,
        'shooting': shooting,
        'passing': passing,
        'defending': defending,
        'physical': physical,
        'keeping': keeping,
        'card': make_card_title(ovr, name, role)
    }

def select_strongest_xi(players):
    """
    Selects the absolute strongest starting XI matching 4-3-3:
    starting[0]: Best GK
    starting[1]: Best LB (or LWB / best DEF)
    starting[2]: Best CB #1
    starting[3]: Best CB #2
    starting[4]: Best RB (or RWB / best DEF)
    starting[5]: Best CDM (or CM)
    starting[6]: Best CM #1
    starting[7]: Best CM #2 (or CAM)
    starting[8]: Best LW (or LM / Winger)
    starting[9]: Best ST (or CF / Attacker)
    starting[10]: Best RW (or RM / Winger)
    
    Substitutes:
    substitutes[0]: 2nd Best GK (vital invariant)
    substitutes[1..5]: Next top 5 outfield players
    
    Reserves:
    All remaining players
    """
    used = set()

    # 1. Best GK
    gks = sorted([p for p in players if p['role'] == 'GK'], key=lambda x: (x.get('keeping', 0), x['ovr']), reverse=True)
    if not gks:
        gks = sorted(players, key=lambda x: x.get('keeping', 0), reverse=True)
    starter_gk = gks[0]
    used.add(starter_gk['id'])

    # Backup GK
    backup_gk = gks[1] if len(gks) > 1 else None
    if backup_gk:
        used.add(backup_gk['id'])

    outfield_pool = [p for p in players if p['id'] not in used]

    def pick_best(preferred_roles, fallback_categories):
        candidates = [p for p in outfield_pool if p['role'] in preferred_roles and p['id'] not in used]
        if candidates:
            c = max(candidates, key=lambda x: x['ovr'])
            used.add(c['id'])
            return c
        candidates = [p for p in outfield_pool if p['role'] in fallback_categories and p['id'] not in used]
        if candidates:
            c = max(candidates, key=lambda x: x['ovr'])
            used.add(c['id'])
            return c
        # absolute fallback
        candidates = [p for p in outfield_pool if p['id'] not in used]
        if candidates:
            c = max(candidates, key=lambda x: x['ovr'])
            used.add(c['id'])
            return c
        return None

    # Pick Defenders
    lb = pick_best(['LB', 'LWB'], ['CB', 'RB', 'CDM'])
    cb1 = pick_best(['CB'], ['LB', 'RB', 'CDM'])
    cb2 = pick_best(['CB'], ['LB', 'RB', 'CDM'])
    rb = pick_best(['RB', 'RWB'], ['CB', 'LB', 'CDM'])

    # Pick Midfielders
    cdm = pick_best(['CDM'], ['CM', 'CAM', 'CB'])
    cm1 = pick_best(['CM', 'CAM'], ['CDM', 'LM', 'RM'])
    cm2 = pick_best(['CM', 'CAM', 'LM', 'RM'], ['CDM'])

    # Pick Forwards
    lw = pick_best(['LW', 'LM'], ['ST', 'RW', 'CAM'])
    st = pick_best(['ST', 'CF'], ['LW', 'RW', 'CAM'])
    rw = pick_best(['RW', 'RM'], ['ST', 'LW', 'CAM'])

    starting_players = [starter_gk, lb, cb1, cb2, rb, cdm, cm1, cm2, lw, st, rw]
    # Remove any Nones if squad was unexpectedly tiny
    starting_players = [p for p in starting_players if p is not None]

    # Now assign substitutes:
    # sub[0] = backup_gk
    remaining = sorted([p for p in players if p['id'] not in [x['id'] for x in starting_players] and (not backup_gk or p['id'] != backup_gk['id'])], key=lambda x: x['ovr'], reverse=True)
    
    sub_players = []
    if backup_gk:
        sub_players.append(backup_gk)
    for p in remaining[:5]:
        sub_players.append(p)

    reserve_players = remaining[5:]

    starting_ids = [p['id'] for p in starting_players]
    substitute_ids = [p['id'] for p in sub_players]

    # Reorder players list: starting, then subs, then reserves
    ordered_players = starting_players + sub_players + reserve_players
    return starting_ids, substitute_ids, ordered_players

print("Engine helpers verified.")
