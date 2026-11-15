import urllib.request
import csv
import json
import re
import os
import sys

print("=== Downloading and Aggregating FIFA & Modern Player Records ===")

# Stream player dataset from public high-fidelity repository
url_csv = "https://raw.githubusercontent.com/davidcamilo0710/qatar_2022_prediction/master/data/players_22.csv"
req = urllib.request.Request(url_csv, headers={'User-Agent': 'Mozilla/5.0'})

print("Streaming player records...")
players_by_nation = {}
count = 0

with urllib.request.urlopen(req, timeout=40) as resp:
    # Read entire text stream
    lines = resp.read().decode('utf-8', errors='replace').splitlines()
    reader = csv.DictReader(lines)
    for row in reader:
        count += 1
        nat = (row.get('nationality_name') or '').strip()
        if not nat: continue
        
        # Parse key metrics
        try:
            ovr = int(row.get('overall') or 0)
        except:
            ovr = 50
        try:
            pace = int(float(row.get('pace') or 60))
        except: pace = 60
        try:
            shoot = int(float(row.get('shooting') or 50))
        except: shoot = 50
        try:
            pass_ = int(float(row.get('passing') or 55))
        except: pass_ = 55
        try:
            def_ = int(float(row.get('defending') or 50))
        except: def_ = 50
        try:
            phys = int(float(row.get('physic') or 60))
        except: phys = 60
        try:
            gk = int(float(row.get('goalkeeping_diving') or 10))
        except: gk = 10
        
        pos_raw = (row.get('player_positions') or 'CM').split(',')[0].strip()
        
        player_obj = {
            "name": row.get('short_name') or row.get('long_name'),
            "long_name": row.get('long_name'),
            "role": pos_raw,
            "nat": nat,
            "ovr": ovr,
            "pace": pace,
            "shoot": shoot,
            "pass": pass_,
            "def": def_,
            "phys": phys,
            "gk": gk,
            "club": row.get('club_name'),
            "age": row.get('age'),
            "dob": row.get('dob'),
            "card": f"Base Gold/Silver ({ovr} OVR)" if ovr < 85 else f"Elite Base ({ovr} OVR)"
        }
        players_by_nation.setdefault(nat, []).append(player_obj)

print(f"Processed {count} total players across {len(players_by_nation)} nationalities.")

# Save raw modern players
os.makedirs("src/data", exist_ok=True)
with open("src/data/players_raw.json", "w", encoding="utf-8") as f:
    json.dump({k: len(v) for k, v in players_by_nation.items()}, f, indent=2)

print("Saved player summary.")
