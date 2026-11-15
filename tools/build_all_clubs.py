# Python script to build the complete 216 clubs database for Touchline XI
import json
import re

def hash_str(s: str) -> int:
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h

def clamp(v, a, b):
    return max(a, min(b, v))

ROLE_PROFILES = {
    'GK':  {'pace': 50, 'shooting': 20, 'passing': 70, 'defending': 40, 'physical': 77, 'keeping': 82},
    'LB':  {'pace': 80, 'shooting': 55, 'passing': 74, 'defending': 76, 'physical': 74, 'keeping': 5},
    'RB':  {'pace': 80, 'shooting': 55, 'passing': 74, 'defending': 76, 'physical': 74, 'keeping': 5},
    'CB':  {'pace': 68, 'shooting': 36, 'passing': 66, 'defending': 82, 'physical': 82, 'keeping': 5},
    'CDM': {'pace': 70, 'shooting': 60, 'passing': 79, 'defending': 79, 'physical': 80, 'keeping': 5},
    'CM':  {'pace': 74, 'shooting': 71, 'passing': 81, 'defending': 69, 'physical': 74, 'keeping': 5},
    'CAM': {'pace': 78, 'shooting': 78, 'passing': 83, 'defending': 50, 'physical': 68, 'keeping': 5},
    'LM':  {'pace': 84, 'shooting': 72, 'passing': 77, 'defending': 54, 'physical': 70, 'keeping': 5},
    'RM':  {'pace': 84, 'shooting': 72, 'passing': 77, 'defending': 54, 'physical': 70, 'keeping': 5},
    'LW':  {'pace': 86, 'shooting': 78, 'passing': 76, 'defending': 42, 'physical': 68, 'keeping': 5},
    'RW':  {'pace': 86, 'shooting': 78, 'passing': 76, 'defending': 42, 'physical': 68, 'keeping': 5},
    'ST':  {'pace': 82, 'shooting': 84, 'passing': 71, 'defending': 38, 'physical': 78, 'keeping': 5}
}

STANDARD_ROLES = [
    'GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'ST', 'RW',
    'GK', 'CB', 'CM', 'ST', 'RW'
]
STANDARD_NUMBERS = [1, 3, 4, 5, 2, 6, 8, 10, 11, 9, 7, 12, 14, 16, 18, 19]

def build_players(club_id, club_name, continent, base_ovr, roster, default_nat):
    players = []
    for idx, item in enumerate(roster):
        name = item if isinstance(item, str) else item[0]
        role = STANDARD_ROLES[idx]
        nat = default_nat
        num = STANDARD_NUMBERS[idx]
        if isinstance(item, list):
            if len(item) > 1 and item[1]: role = item[1]
            if len(item) > 2 and item[2]: nat = item[2]
            if len(item) > 3 and item[3]: num = item[3]

        h = hash_str(f"{club_id}-{name}-{idx}")
        jitter = (h % 7) - 3
        ovr = clamp(base_ovr + jitter + ((2 if (idx == 9 or idx == 7) else 0) if idx < 11 else -2), 65, 93)
        base_stats = ROLE_PROFILES.get(role, ROLE_PROFILES['CM'])
        stat_mod = (ovr - 78) * 0.7

        pace = clamp(round(base_stats['pace'] + stat_mod + (((h >> 2) % 7) - 3)), 45, 96)
        shooting = clamp(round(base_stats['shooting'] + stat_mod + (((h >> 4) % 7) - 3)), 20, 95)
        passing = clamp(round(base_stats['passing'] + stat_mod + (((h >> 6) % 7) - 3)), 35, 96)
        defending = clamp(round(base_stats['defending'] + stat_mod + (((h >> 8) % 7) - 3)), 25, 95)
        physical = clamp(round(base_stats['physical'] + stat_mod + (((h >> 10) % 7) - 3)), 45, 95)
        keeping = clamp(round(ovr + (((h >> 12) % 5) - 2)), 65, 95) if role == 'GK' else 5

        if ovr >= 88: card = 'Elite Master (88+ OVR)'
        elif ovr >= 84: card = 'Top Tier Gold Rare'
        elif ovr >= 80: card = 'Gold Rare'
        elif ovr >= 75: card = 'Gold Common'
        else: card = 'Silver Star'

        players.append({
            'id': f"{club_id}_{idx}",
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
            'card': card
        })
    return players

print("Builder helper functions initialized successfully.")
