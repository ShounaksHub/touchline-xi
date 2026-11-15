import urllib.request
import re
import csv
import json

# 1. Fetch FIFA top 150 nations from Wikipedia module
url_fifa = 'https://en.wikipedia.org/wiki/Module:SportsRankings/data/FIFA_World_Rankings?action=raw'
req = urllib.request.Request(url_fifa, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=15) as resp:
    raw = resp.read().decode('utf-8')

pattern = re.compile(r'\{\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*(-?\d+)\s*,\s*([\d\.]+)\s*\}')
all_nations = pattern.findall(raw)
top150 = all_nations[:150]

print(f"Top 150 nations loaded. #1: {top150[0][0]}, #150: {top150[-1][0]}")

# Map country names to common dataset variations
aliases = {
    "United States": "United States",
    "USA": "United States",
    "Korea Republic": "Korea Republic",
    "South Korea": "Korea Republic",
    "Iran": "IR Iran",
    "IR Iran": "IR Iran",
    "Côte d'Ivoire": "Ivory Coast",
    "Ivory Coast": "Ivory Coast",
    "Cabo Verde": "Cape Verde",
    "Cape Verde Islands": "Cape Verde",
    "DR Congo": "Congo DR",
    "Democratic Republic of the Congo": "Congo DR",
    "China PR": "China PR",
    "China": "China PR",
    "Chinese Taipei": "Chinese Taipei",
    "Curaçao": "Curacao",
    "São Tomé and Príncipe": "São Tomé & Príncipe",
}

nations_set = {n[0] for n in top150}
print(f"Sample top nations: {list(nations_set)[:10]}")
