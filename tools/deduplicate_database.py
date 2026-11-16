import json
import re
import os
import sys
import unicodedata

# Ensure UTF-8
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')

print("Starting Touchline XI Player Deduplication & Database Cleanup...")

def normalize_name(name):
    if not name:
        return ''
    n = unicodedata.normalize('NFKD', str(name))
    n = ''.join(c for c in n if not unicodedata.combining(c))
    n = re.sub(r'[^a-zA-Z0-9\s]', '', n).lower()
    return ' '.join(n.split())

def normalize_nat(nat):
    n = normalize_name(nat)
    if not n or n == 'international':
        return ''
    return n

def make_identity_key(p):
    # Primary key: normalized name + normalized nationality
    nm = normalize_name(p.get('name', ''))
    nt = normalize_nat(p.get('nat', ''))
    return f"{nm}::{nt}"

def make_squad_key(p):
    # Intra-squad key: normalized name + positional type (GK vs Field)
    # A Goalkeeper is never merged with an outfield player of the same name!
    nm = normalize_name(p.get('name', ''))
    pos = 'GK' if p.get('role') == 'GK' else 'FIELD'
    return f"{nm}::{pos}"

# 1. Load Clubs
print("Loading clubs database...")
with open('src/data/clubs.js', 'r', encoding='utf-8') as f:
    content = f.read()

m = re.search(r'export\s+const\s+CLUBS\s*=\s*(\[[\s\S]*\]);?\s*$', content)
if not m:
    raise Exception("Could not parse clubs.js")

clubs = json.loads(m.group(1))

# 2. Load National Teams
print("Loading national teams database...")
with open('src/data/national_teams_db.json', 'r', encoding='utf-8') as f:
    national_teams = json.load(f)

teams = clubs + national_teams
total_records_before = sum(len(t['players']) for t in teams)
print(f"Total teams: {len(teams)}")
print(f"Total player records before cleanup: {total_records_before}")

# 3. Detect and remove intra-squad duplicates
intra_dupes_detected = 0
squads_with_intra_dupes = 0
intra_removed_records = []

for t in teams:
    original_len = len(t['players'])
    seen_in_squad = {}
    cleaned_players = []
    id_map = {}
    
    for p in t['players']:
        k = make_squad_key(p)
        ovr = p.get('ovr') or p.get('overall') or 75
        
        if k not in seen_in_squad:
            seen_in_squad[k] = p
            cleaned_players.append(p)
        else:
            intra_dupes_detected += 1
            prev = seen_in_squad[k]
            prev_ovr = prev.get('ovr') or prev.get('overall') or 75
            
            # Tie breaker:
            # 1. Higher OVR
            # 2. Verified real player over generated reserve
            # 3. Verified Legend over Verified Active
            # 4. Starting lineup member over reserve
            # 5. Deterministic lower ID
            p_in_start = p['id'] in t.get('starting', [])
            prev_in_start = prev['id'] in t.get('starting', [])
            
            replace = False
            if p_in_start and not prev_in_start:
                replace = True
            elif not p_in_start and prev_in_start:
                replace = False
            elif ovr > prev_ovr:
                replace = True
            elif ovr == prev_ovr:
                if not p.get('isGenerated', False) and prev.get('isGenerated', False):
                    replace = True
                elif p.get('playerType') == 'verified_legend' and prev.get('playerType') != 'verified_legend':
                    replace = True
                elif p.get('id', '') < prev.get('id', ''):
                    replace = True
            
            if replace:
                idx = cleaned_players.index(prev)
                cleaned_players[idx] = p
                seen_in_squad[k] = p
                id_map[prev['id']] = p['id']
                intra_removed_records.append((t['name'], prev['name'], prev['id'], prev_ovr, p['id'], ovr))
            else:
                id_map[p['id']] = prev['id']
                intra_removed_records.append((t['name'], p['name'], p['id'], ovr, prev['id'], prev_ovr))

    if len(cleaned_players) < original_len:
        squads_with_intra_dupes += 1
    t['players'] = cleaned_players
    
    # Remap starting and substitute lineup IDs
    t['starting'] = [id_map.get(pid, pid) for pid in t.get('starting', [])]
    t['substitutes'] = [id_map.get(pid, pid) for pid in t.get('substitutes', [])]

total_records_after_intra = sum(len(t['players']) for t in teams)
print(f"Intra-squad duplicates removed: {intra_dupes_detected}")
print(f"Squads affected by intra-squad duplicates: {squads_with_intra_dupes}")
print(f"Player records remaining across all squads: {total_records_after_intra}")

# 4. Build Canonical Identity & Peak Ratings for all unique footballers
canonical_profiles = {}

for t in teams:
    for p in t['players']:
        k = make_identity_key(p)
        ovr = p.get('ovr') or p.get('overall') or 75
        
        if k not in canonical_profiles:
            canonical_profiles[k] = dict(p)
        else:
            prev = canonical_profiles[k]
            prev_ovr = prev.get('ovr') or prev.get('overall') or 75
            
            update = False
            if ovr > prev_ovr:
                update = True
            elif ovr == prev_ovr:
                p_gen = p.get('isGenerated', False)
                prev_gen = prev.get('isGenerated', False)
                if not p_gen and prev_gen:
                    update = True
                elif p_gen == prev_gen:
                    p_leg = (p.get('playerType') == 'verified_legend')
                    prev_leg = (prev.get('playerType') == 'verified_legend')
                    if p_leg and not prev_leg:
                        update = True
                    elif p_leg == prev_leg:
                        if p.get('id', '') < prev.get('id', ''):
                            update = True
            if update:
                canonical_profiles[k] = dict(p)

total_unique_footballers = len(canonical_profiles)
verified_unique_count = sum(1 for p in canonical_profiles.values() if not p.get('isGenerated', False))
generated_unique_count = sum(1 for p in canonical_profiles.values() if p.get('isGenerated', False))

print(f"\n=======================================================")
print(f"CANONICAL DEDUPLICATION RESULTS:")
print(f"Total Unique Footballers: {total_unique_footballers:,}")
print(f"  - Verified Real Stars & Legends: {verified_unique_count:,}")
print(f"  - Generated Youth Reserves: {generated_unique_count:,}")
print(f"=======================================================\n")

# 5. Harmonize all squad player records to their peak canonical rating & attributes
records_updated_to_peak = 0
squads_updated_count = 0

for t in teams:
    team_updated = False
    for p in t['players']:
        k = make_identity_key(p)
        c = canonical_profiles[k]
        
        needs_update = (
            p.get('ovr') != c.get('ovr') or
            p.get('pace') != c.get('pace') or
            p.get('shooting') != c.get('shooting') or
            p.get('passing') != c.get('passing') or
            p.get('defending') != c.get('defending') or
            p.get('physical') != c.get('physical') or
            p.get('keeping') != c.get('keeping') or
            p.get('card') != c.get('card')
        )
        
        if needs_update:
            records_updated_to_peak += 1
            team_updated = True
            
        p['ovr'] = c['ovr']
        p['overall'] = c['ovr']
        p['pace'] = c['pace']
        p['shooting'] = c['shooting']
        p['passing'] = c['passing']
        p['defending'] = c['defending']
        p['physical'] = c['physical']
        p['keeping'] = c['keeping']
        p['card'] = c['card']
        
        # If player was verified in their canonical profile, ensure verified metadata
        if not c.get('isGenerated', False):
            p['playerType'] = c.get('playerType', 'verified_active')
            p['verificationStatus'] = 'verified'
            p['isGenerated'] = False
            p['rosterEra'] = c.get('rosterEra', 'Modern')
            
    if team_updated:
        squads_updated_count += 1

print(f"Total player instances across squads updated to peak canonical stats: {records_updated_to_peak:,}")
print(f"Total squads affected by stat harmonization: {squads_updated_count} / {len(teams)}")

# 6. Verify Lineup and Invariant Integrity
lineup_errors = 0
for t in teams:
    if len(t['starting']) != 11:
        print(f"ERROR: {t['name']} has {len(t['starting'])} starters!")
        lineup_errors += 1
    gk = next((p for p in t['players'] if p['id'] == t['starting'][0]), None)
    if not gk or gk.get('role') != 'GK':
        print(f"ERROR: {t['name']} starting[0] is not a Goalkeeper ({gk.get('role') if gk else 'None'})!")
        lineup_errors += 1
    if len(t['players']) < 36:
        print(f"ERROR: {t['name']} has only {len(t['players'])} players (< 36)!")
        lineup_errors += 1

if lineup_errors > 0:
    raise Exception(f"Validation failed with {lineup_errors} errors!")
print("✓ All 357 squads verified: 11 starters, valid starting[0] GK, and >= 36 squad depth.")

# 7. Flag Records Requiring Manual Identity Review
manual_review_records = []
names_map = {}
for t in teams:
    for p in t['players']:
        k = make_identity_key(p)
        if k not in names_map:
            names_map[k] = []
        names_map[k].append((t['name'], p))

for k, instances in names_map.items():
    if len(instances) > 1:
        has_gk = any(p['role'] == 'GK' for _, p in instances)
        has_outfield = any(p['role'] != 'GK' for _, p in instances)
        
        reasons = []
        if has_gk and has_outfield:
            reasons.append("GK vs Outfield positional collision within same nationality")
            
        if reasons:
            manual_review_records.append({
                'name': instances[0][1]['name'],
                'nationality': instances[0][1].get('nat'),
                'reasons': reasons,
                'count': len(instances),
                'instances': [f"{tname} ({p.get('role')}, {p.get('nat')}, {p.get('ovr')} OVR, gen={p.get('isGenerated')})" for tname, p in instances]
            })

print(f"Records / identities flagged for manual review: {len(manual_review_records)}")

# 8. Write Cleaned Databases
print("\nWriting src/data/clubs.js...")
with open('src/data/clubs.js', 'w', encoding='utf-8') as f:
    f.write("/** Touchline XI - Comprehensive Global Elite Football Clubs Database (200+ Clubs Across 5 Continents) */\n")
    f.write("export const CLUBS = " + json.dumps(clubs, indent=2, ensure_ascii=False) + ";\n")

print("Writing src/data/national_teams_db.json...")
with open('src/data/national_teams_db.json', 'w', encoding='utf-8') as f:
    json.dump(national_teams, f, indent=2, ensure_ascii=False)

print("Writing src/data/national_teams.js...")
lines = [
    "/** Touchline XI - Top 150 FIFA Senior National Teams Database */",
    "// Auto-generated high-fidelity database containing official FIFA rankings, peak cards, and deep rosters",
    "export const NATIONAL_TEAMS = " + json.dumps(national_teams, ensure_ascii=False) + ";\n"
]
with open('src/data/national_teams.js', 'w', encoding='utf-8') as f:
    f.write("\n".join(lines))

# 9. Save Audit Report JSON for verification & documentation
audit_report = {
    'total_player_records_before': total_records_before,
    'intra_squad_duplicates_removed': intra_dupes_detected,
    'total_player_records_after': total_records_after_intra,
    'total_unique_footballers': total_unique_footballers,
    'verified_real_footballers': verified_unique_count,
    'generated_reserve_footballers': generated_unique_count,
    'squads_with_intra_duplicates': squads_with_intra_dupes,
    'squads_with_harmonized_stats': squads_updated_count,
    'records_updated_to_peak_stats': records_updated_to_peak,
    'flagged_for_manual_review_count': len(manual_review_records),
    'flagged_samples': manual_review_records[:10]
}

with open('reports/player-deduplication-audit.json', 'w', encoding='utf-8') as f:
    json.dump(audit_report, f, indent=2, ensure_ascii=False)

print("✓ reports/player-deduplication-audit.json saved successfully!")
print("Deduplication and database cleanup complete.")
