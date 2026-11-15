import urllib.request
import csv
import json
import re
import os
import sys

print("=== Touchline XI Comprehensive National Player Database Builder ===")

# 1. Fetch Top 150 FIFA Member Nations
fifa_url = 'https://en.wikipedia.org/wiki/Module:SportsRankings/data/FIFA_World_Rankings?action=raw'
req = urllib.request.Request(fifa_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
with urllib.request.urlopen(req, timeout=15) as resp:
    raw = resp.read().decode('utf-8')

pattern = re.compile(r'\{\s*"([^"]+)"\s*,\s*(\d+)\s*,\s*(-?\d+)\s*,\s*([\d\.]+)\s*\}')
fifa_matches = pattern.findall(raw)
top150_raw = fifa_matches[:150]

print(f"Loaded {len(top150_raw)} FIFA nations (Top 150). Rank 1: {top150_raw[0][0]}, Rank 150: {top150_raw[-1][0]}")

# Normalization map for country names between FIFA rankings and player datasets
NATION_NORM = {
    "United States": "United States",
    "USA": "United States",
    "Korea Republic": "South Korea",
    "South Korea": "South Korea",
    "Korea DPR": "North Korea",
    "North Korea": "North Korea",
    "IR Iran": "Iran",
    "Iran": "Iran",
    "Côte d'Ivoire": "Ivory Coast",
    "Ivory Coast": "Ivory Coast",
    "Cabo Verde": "Cape Verde",
    "Cape Verde": "Cape Verde",
    "Congo DR": "DR Congo",
    "Democratic Republic of the Congo": "DR Congo",
    "DR Congo": "DR Congo",
    "Congo": "Congo",
    "Republic of the Congo": "Congo",
    "China PR": "China",
    "China": "China",
    "Chinese Taipei": "Taiwan",
    "Curaçao": "Curacao",
    "Curacao": "Curacao",
    "São Tomé and Príncipe": "Sao Tome and Principe",
    "Trinidad and Tobago": "Trinidad & Tobago",
    "Trinidad & Tobago": "Trinidad & Tobago",
    "Bosnia and Herzegovina": "Bosnia & Herzegovina",
    "Bosnia & Herzegovina": "Bosnia & Herzegovina",
    "Antigua and Barbuda": "Antigua & Barbuda",
    "Saint Kitts and Nevis": "St Kitts and Nevis",
    "Saint Lucia": "St Lucia",
    "Saint Vincent and the Grenadines": "St Vincent",
}

def norm_nation(name):
    clean = name.strip()
    return NATION_NORM.get(clean, clean)

fifa_nations_dict = {}
for name, rank, change, points in top150_raw:
    normed = norm_nation(name)
    fifa_nations_dict[normed] = {
        "official_name": name,
        "fifa_rank": int(rank),
        "rank_change": int(change),
        "fifa_points": float(points)
    }

print(f"Mapped {len(fifa_nations_dict)} normalized FIFA nations.")

# 2. Curated High-Peak Ultimate Team / Historical Icons & Heroes (Post-2000 Peak Era)
# All with their historical maximum special cards (TOTY, TOTS, Futties, Prime Icon / Icon Moments)
PEAK_ICONS = [
    # Argentina
    {"name": "Lionel Messi", "role": "RW", "nat": "Argentina", "ovr": 99, "pace": 98, "shoot": 99, "pass": 99, "def": 45, "phys": 82, "gk": 10, "era": "2004-2026", "card": "99 Futties / TOTY Peak", "dob": "1987-06-24"},
    {"name": "Diego Maradona", "role": "CAM", "nat": "Argentina", "ovr": 98, "pace": 93, "shoot": 94, "pass": 98, "def": 42, "phys": 78, "gk": 10, "era": "1977-1997", "card": "98 Prime Icon", "dob": "1960-10-30"},
    {"name": "Sergio Agüero", "role": "ST", "nat": "Argentina", "ovr": 96, "pace": 94, "shoot": 97, "pass": 88, "def": 40, "phys": 88, "gk": 10, "era": "2006-2021", "card": "96 End of an Era", "dob": "1988-06-02"},
    {"name": "Carlos Tevez", "role": "ST", "nat": "Argentina", "ovr": 95, "pace": 93, "shoot": 96, "pass": 87, "def": 55, "phys": 94, "gk": 10, "era": "2004-2021", "card": "95 Hero / Flashback", "dob": "1984-02-05"},
    {"name": "Javier Zanetti", "role": "RB", "nat": "Argentina", "ovr": 94, "pace": 88, "shoot": 65, "pass": 89, "def": 95, "phys": 87, "gk": 10, "era": "1994-2011", "card": "94 Icon Moments", "dob": "1973-08-10"},
    {"name": "Ángel Di María", "role": "RW", "nat": "Argentina", "ovr": 97, "pace": 96, "shoot": 94, "pass": 97, "def": 55, "phys": 80, "gk": 10, "era": "2008-2024", "card": "97 TOTS / Futties", "dob": "1988-02-14"},
    {"name": "Emiliano Martínez", "role": "GK", "nat": "Argentina", "ovr": 95, "pace": 55, "shoot": 25, "pass": 85, "def": 45, "phys": 86, "gk": 96, "era": "2021-2026", "card": "95 Yashin Trophy / TOTY HM", "dob": "1992-09-02"},
    
    # Portugal
    {"name": "Cristiano Ronaldo", "role": "ST", "nat": "Portugal", "ovr": 99, "pace": 99, "shoot": 99, "pass": 90, "def": 45, "phys": 92, "gk": 10, "era": "2003-2026", "card": "99 Futties / TOTY Peak", "dob": "1985-02-05"},
    {"name": "Eusébio", "role": "ST", "nat": "Portugal", "ovr": 94, "pace": 95, "shoot": 94, "pass": 88, "def": 45, "phys": 82, "gk": 10, "era": "1961-1973", "card": "94 Prime Icon", "dob": "1942-01-25"},
    {"name": "Luís Figo", "role": "RW", "nat": "Portugal", "ovr": 93, "pace": 92, "shoot": 88, "pass": 92, "def": 44, "phys": 83, "gk": 10, "era": "1991-2006", "card": "93 Icon Moments", "dob": "1972-11-04"},
    {"name": "Pepe", "role": "CB", "nat": "Portugal", "ovr": 95, "pace": 88, "shoot": 60, "pass": 80, "def": 97, "phys": 96, "gk": 10, "era": "2007-2024", "card": "95 End of an Era", "dob": "1983-02-26"},
    {"name": "Bruno Fernandes", "role": "CAM", "nat": "Portugal", "ovr": 97, "pace": 88, "shoot": 95, "pass": 98, "def": 78, "phys": 86, "gk": 10, "era": "2017-2026", "card": "97 TOTY Peak", "dob": "1994-09-08"},
    {"name": "Bernardo Silva", "role": "CM", "nat": "Portugal", "ovr": 96, "pace": 89, "shoot": 91, "pass": 97, "def": 78, "phys": 84, "gk": 10, "era": "2015-2026", "card": "96 TOTS / TOTY", "dob": "1994-08-10"},
    {"name": "Rui Costa", "role": "CAM", "nat": "Portugal", "ovr": 91, "pace": 86, "shoot": 85, "pass": 91, "def": 48, "phys": 81, "gk": 10, "era": "1993-2004", "card": "91 Prime Icon", "dob": "1972-03-29"},

    # Brazil
    {"name": "Pelé", "role": "CAM", "nat": "Brazil", "ovr": 99, "pace": 97, "shoot": 98, "pass": 95, "def": 60, "phys": 80, "gk": 10, "era": "1957-1971", "card": "99 Icon Moments", "dob": "1940-10-23"},
    {"name": "Ronaldo Nazário", "role": "ST", "nat": "Brazil", "ovr": 97, "pace": 98, "shoot": 96, "pass": 82, "def": 45, "phys": 82, "gk": 10, "era": "1994-2011", "card": "97 Icon Moments", "dob": "1976-09-18"},
    {"name": "Ronaldinho", "role": "LW", "nat": "Brazil", "ovr": 95, "pace": 93, "shoot": 91, "pass": 93, "def": 40, "phys": 83, "gk": 10, "era": "1999-2013", "card": "95 Prime Icon", "dob": "1980-03-21"},
    {"name": "Neymar Jr", "role": "LW", "nat": "Brazil", "ovr": 99, "pace": 99, "shoot": 98, "pass": 98, "def": 45, "phys": 80, "gk": 10, "era": "2010-2026", "card": "99 Futties / TOTY Peak", "dob": "1992-02-05"},
    {"name": "Kaká", "role": "CAM", "nat": "Brazil", "ovr": 93, "pace": 93, "shoot": 88, "pass": 90, "def": 46, "phys": 77, "gk": 10, "era": "2002-2016", "card": "93 Icon Moments", "dob": "1982-04-22"},
    {"name": "Roberto Carlos", "role": "LB", "nat": "Brazil", "ovr": 93, "pace": 94, "shoot": 89, "pass": 88, "def": 89, "phys": 88, "gk": 10, "era": "1992-2006", "card": "93 Icon Moments", "dob": "1973-04-10"},
    {"name": "Cafu", "role": "RB", "nat": "Brazil", "ovr": 94, "pace": 93, "shoot": 76, "pass": 88, "def": 92, "phys": 90, "gk": 10, "era": "1990-2006", "card": "94 Icon Moments", "dob": "1970-06-07"},
    {"name": "Thiago Silva", "role": "CB", "nat": "Brazil", "ovr": 95, "pace": 84, "shoot": 65, "pass": 85, "def": 97, "phys": 90, "gk": 10, "era": "2008-2024", "card": "95 Flashback / End of Era", "dob": "1984-09-22"},
    {"name": "Alisson", "role": "GK", "nat": "Brazil", "ovr": 97, "pace": 55, "shoot": 25, "pass": 90, "def": 45, "phys": 88, "gk": 97, "era": "2015-2026", "card": "97 TOTY Peak", "dob": "1992-10-02"},

    # France
    {"name": "Zinedine Zidane", "role": "CAM", "nat": "France", "ovr": 97, "pace": 86, "shoot": 93, "pass": 97, "def": 76, "phys": 87, "gk": 10, "era": "1994-2006", "card": "97 Icon Moments", "dob": "1972-06-23"},
    {"name": "Kylian Mbappé", "role": "ST", "nat": "France", "ovr": 99, "pace": 99, "shoot": 99, "pass": 93, "def": 46, "phys": 90, "gk": 10, "era": "2017-2026", "card": "99 TOTY / Futties Peak", "dob": "1998-12-20"},
    {"name": "Thierry Henry", "role": "ST", "nat": "France", "ovr": 94, "pace": 95, "shoot": 92, "pass": 85, "def": 53, "phys": 81, "gk": 10, "era": "1997-2010", "card": "94 Icon Moments", "dob": "1977-08-17"},
    {"name": "Karim Benzema", "role": "ST", "nat": "France", "ovr": 98, "pace": 92, "shoot": 98, "pass": 94, "def": 48, "phys": 92, "gk": 10, "era": "2007-2022", "card": "98 Ballon d'Or / TOTY", "dob": "1987-12-19"},
    {"name": "N'Golo Kanté", "role": "CDM", "nat": "France", "ovr": 97, "pace": 90, "shoot": 82, "pass": 90, "def": 98, "phys": 95, "gk": 10, "era": "2016-2026", "card": "97 TOTY Peak", "dob": "1991-03-29"},
    {"name": "Patrick Vieira", "role": "CDM", "nat": "France", "ovr": 93, "pace": 88, "shoot": 82, "pass": 88, "def": 92, "phys": 94, "gk": 10, "era": "1997-2009", "card": "93 Icon Moments", "dob": "1976-06-23"},
    {"name": "Franck Ribéry", "role": "LW", "nat": "France", "ovr": 95, "pace": 96, "shoot": 92, "pass": 94, "def": 45, "phys": 78, "gk": 10, "era": "2006-2014", "card": "95 Hero / Flashback", "dob": "1983-04-07"},
    {"name": "Hugo Lloris", "role": "GK", "nat": "France", "ovr": 92, "pace": 55, "shoot": 25, "pass": 78, "def": 45, "phys": 82, "gk": 93, "era": "2008-2022", "card": "92 World Cup Winner / Flashback", "dob": "1986-12-26"},

    # Spain
    {"name": "Andrés Iniesta", "role": "CM", "nat": "Spain", "ovr": 96, "pace": 85, "shoot": 87, "pass": 98, "def": 70, "phys": 75, "gk": 10, "era": "2006-2018", "card": "96 Flashback / End of Era", "dob": "1984-05-11"},
    {"name": "Xavi", "role": "CM", "nat": "Spain", "ovr": 94, "pace": 82, "shoot": 83, "pass": 97, "def": 76, "phys": 75, "gk": 10, "era": "2000-2014", "card": "94 Icon Moments", "dob": "1980-01-25"},
    {"name": "Sergio Ramos", "role": "CB", "nat": "Spain", "ovr": 98, "pace": 90, "shoot": 80, "pass": 88, "def": 98, "phys": 96, "gk": 10, "era": "2005-2021", "card": "98 TOTY Peak", "dob": "1986-03-30"},
    {"name": "Iker Casillas", "role": "GK", "nat": "Spain", "ovr": 94, "pace": 55, "shoot": 25, "pass": 80, "def": 45, "phys": 82, "gk": 95, "era": "2000-2016", "card": "94 Icon Moments", "dob": "1981-05-20"},
    {"name": "David Silva", "role": "CAM", "nat": "Spain", "ovr": 95, "pace": 86, "shoot": 89, "pass": 96, "def": 55, "phys": 75, "gk": 10, "era": "2006-2018", "card": "95 End of an Era", "dob": "1986-01-08"},
    {"name": "Fernando Torres", "role": "ST", "nat": "Spain", "ovr": 92, "pace": 94, "shoot": 91, "pass": 82, "def": 45, "phys": 83, "gk": 10, "era": "2003-2014", "card": "92 Icon Moments", "dob": "1984-03-20"},
    {"name": "Rodri", "role": "CDM", "nat": "Spain", "ovr": 96, "pace": 78, "shoot": 88, "pass": 94, "def": 96, "phys": 94, "gk": 10, "era": "2018-2026", "card": "96 Ballon d'Or / TOTY", "dob": "1996-06-22"},

    # England
    {"name": "Wayne Rooney", "role": "ST", "nat": "England", "ovr": 93, "pace": 90, "shoot": 94, "pass": 88, "def": 60, "phys": 92, "gk": 10, "era": "2003-2018", "card": "93 Icon Moments", "dob": "1985-10-24"},
    {"name": "Harry Kane", "role": "ST", "nat": "England", "ovr": 97, "pace": 88, "shoot": 98, "pass": 93, "def": 50, "phys": 90, "gk": 10, "era": "2015-2026", "card": "97 TOTY / TOTS Peak", "dob": "1993-07-28"},
    {"name": "David Beckham", "role": "RM", "nat": "England", "ovr": 93, "pace": 84, "shoot": 89, "pass": 96, "def": 76, "phys": 84, "gk": 10, "era": "1996-2009", "card": "93 Icon Moments", "dob": "1975-05-02"},
    {"name": "Steven Gerrard", "role": "CM", "nat": "England", "ovr": 93, "pace": 86, "shoot": 93, "pass": 92, "def": 84, "phys": 90, "gk": 10, "era": "2000-2014", "card": "93 Icon Moments", "dob": "1980-05-30"},
    {"name": "Frank Lampard", "role": "CM", "nat": "England", "ovr": 92, "pace": 82, "shoot": 93, "pass": 91, "def": 78, "phys": 86, "gk": 10, "era": "1999-2014", "card": "92 Icon Moments", "dob": "1978-06-20"},
    {"name": "Jude Bellingham", "role": "CAM", "nat": "England", "ovr": 97, "pace": 90, "shoot": 94, "pass": 95, "def": 88, "phys": 94, "gk": 10, "era": "2020-2026", "card": "97 TOTY Peak", "dob": "2003-06-29"},
    {"name": "Rio Ferdinand", "role": "CB", "nat": "England", "ovr": 92, "pace": 88, "shoot": 50, "pass": 75, "def": 93, "phys": 89, "gk": 10, "era": "1997-2011", "card": "92 Icon Moments", "dob": "1978-11-07"},
    {"name": "Ashley Cole", "role": "LB", "nat": "England", "ovr": 91, "pace": 92, "shoot": 65, "pass": 84, "def": 91, "phys": 84, "gk": 10, "era": "2001-2014", "card": "91 Icon Moments", "dob": "1980-12-20"},

    # Germany
    {"name": "Manuel Neuer", "role": "GK", "nat": "Germany", "ovr": 96, "pace": 60, "shoot": 30, "pass": 92, "def": 48, "phys": 90, "gk": 97, "era": "2009-2024", "card": "96 TOTY Peak", "dob": "1986-03-27"},
    {"name": "Toni Kroos", "role": "CM", "nat": "Germany", "ovr": 97, "pace": 78, "shoot": 91, "pass": 99, "def": 82, "phys": 84, "gk": 10, "era": "2010-2024", "card": "97 End of an Era / TOTS", "dob": "1990-01-04"},
    {"name": "Thomas Müller", "role": "CAM", "nat": "Germany", "ovr": 95, "pace": 85, "shoot": 94, "pass": 92, "def": 65, "phys": 85, "gk": 10, "era": "2010-2024", "card": "95 TOTS / Flashback", "dob": "1989-09-13"},
    {"name": "Bastian Schweinsteiger", "role": "CM", "nat": "Germany", "ovr": 92, "pace": 81, "shoot": 87, "pass": 92, "def": 86, "phys": 88, "gk": 10, "era": "2004-2016", "card": "92 Icon Moments", "dob": "1984-08-01"},
    {"name": "Philipp Lahm", "role": "RB", "nat": "Germany", "ovr": 93, "pace": 88, "shoot": 74, "pass": 91, "def": 94, "phys": 82, "gk": 10, "era": "2004-2014", "card": "93 Icon Moments", "dob": "1983-11-11"},
    {"name": "Miroslav Klose", "role": "ST", "nat": "Germany", "ovr": 92, "pace": 88, "shoot": 92, "pass": 78, "def": 45, "phys": 86, "gk": 10, "era": "2001-2014", "card": "92 World Cup All-Time Top Scorer", "dob": "1978-06-09"},

    # Netherlands
    {"name": "Virgil van Dijk", "role": "CB", "nat": "Netherlands", "ovr": 99, "pace": 92, "shoot": 70, "pass": 88, "def": 99, "phys": 98, "gk": 10, "era": "2015-2026", "card": "99 TOTY / Futties Peak", "dob": "1991-07-08"},
    {"name": "Arjen Robben", "role": "RW", "nat": "Netherlands", "ovr": 96, "pace": 98, "shoot": 94, "pass": 90, "def": 42, "phys": 76, "gk": 10, "era": "2003-2017", "card": "96 Flashback / End of Era", "dob": "1984-01-23"},
    {"name": "Robin van Persie", "role": "ST", "nat": "Netherlands", "ovr": 92, "pace": 89, "shoot": 94, "pass": 86, "def": 45, "phys": 80, "gk": 10, "era": "2005-2017", "card": "92 Icon Moments", "dob": "1983-08-06"},
    {"name": "Wesley Sneijder", "role": "CAM", "nat": "Netherlands", "ovr": 94, "pace": 86, "shoot": 93, "pass": 96, "def": 60, "phys": 80, "gk": 10, "era": "2003-2018", "card": "94 Hero / Icon", "dob": "1984-06-09"},
    {"name": "Edwin van der Sar", "role": "GK", "nat": "Netherlands", "ovr": 93, "pace": 55, "shoot": 25, "pass": 88, "def": 45, "phys": 84, "gk": 94, "era": "1995-2008", "card": "93 Icon Moments", "dob": "1970-10-29"},

    # Italy
    {"name": "Gianluigi Buffon", "role": "GK", "nat": "Italy", "ovr": 96, "pace": 55, "shoot": 25, "pass": 78, "def": 45, "phys": 86, "gk": 97, "era": "1997-2018", "card": "96 End of an Era / Prime Icon", "dob": "1978-01-28"},
    {"name": "Andrea Pirlo", "role": "CM", "nat": "Italy", "ovr": 94, "pace": 78, "shoot": 85, "pass": 98, "def": 75, "phys": 74, "gk": 10, "era": "2002-2015", "card": "94 Icon Moments", "dob": "1979-05-19"},
    {"name": "Paolo Maldini", "role": "CB", "nat": "Italy", "ovr": 95, "pace": 88, "shoot": 58, "pass": 78, "def": 97, "phys": 86, "gk": 10, "era": "1988-2002", "card": "95 Icon Moments", "dob": "1968-06-26"},
    {"name": "Fabio Cannavaro", "role": "CB", "nat": "Italy", "ovr": 93, "pace": 85, "shoot": 45, "pass": 70, "def": 96, "phys": 88, "gk": 10, "era": "1997-2010", "card": "93 Ballon d'Or / Icon Moments", "dob": "1973-09-13"},
    {"name": "Francesco Totti", "role": "CF", "nat": "Italy", "ovr": 95, "pace": 86, "shoot": 95, "pass": 94, "def": 50, "phys": 86, "gk": 10, "era": "1998-2006", "card": "95 End of an Era", "dob": "1976-09-27"},

    # Belgium
    {"name": "Kevin De Bruyne", "role": "CM", "nat": "Belgium", "ovr": 99, "pace": 88, "shoot": 96, "pass": 99, "def": 82, "phys": 88, "gk": 10, "era": "2010-2026", "card": "99 TOTY / TOTS Peak", "dob": "1991-06-28"},
    {"name": "Eden Hazard", "role": "LW", "nat": "Belgium", "ovr": 98, "pace": 98, "shoot": 95, "pass": 96, "def": 45, "phys": 82, "gk": 10, "era": "2008-2022", "card": "98 End of Era / Futties", "dob": "1991-01-07"},
    {"name": "Romelu Lukaku", "role": "ST", "nat": "Belgium", "ovr": 95, "pace": 94, "shoot": 96, "pass": 82, "def": 45, "phys": 98, "gk": 10, "era": "2010-2026", "card": "95 TOTS / Summer Stars", "dob": "1993-05-13"},
    {"name": "Thibaut Courtois", "role": "GK", "nat": "Belgium", "ovr": 96, "pace": 55, "shoot": 25, "pass": 78, "def": 45, "phys": 88, "gk": 97, "era": "2011-2026", "card": "96 TOTY Peak", "dob": "1992-05-11"},
    {"name": "Vincent Kompany", "role": "CB", "nat": "Belgium", "ovr": 94, "pace": 84, "shoot": 65, "pass": 80, "def": 95, "phys": 93, "gk": 10, "era": "2004-2019", "card": "94 Hero / End of Era", "dob": "1986-04-10"},

    # Croatia
    {"name": "Luka Modrić", "role": "CM", "nat": "Croatia", "ovr": 99, "pace": 88, "shoot": 94, "pass": 99, "def": 85, "phys": 84, "gk": 10, "era": "2006-2026", "card": "99 Ballon d'Or / TOTY Peak", "dob": "1985-09-09"},
    {"name": "Ivan Rakitić", "role": "CM", "nat": "Croatia", "ovr": 94, "pace": 80, "shoot": 90, "pass": 95, "def": 80, "phys": 82, "gk": 10, "era": "2007-2019", "card": "94 TOTS / Flashback", "dob": "1988-03-10"},
    {"name": "Mario Mandžukić", "role": "ST", "nat": "Croatia", "ovr": 92, "pace": 85, "shoot": 92, "pass": 80, "def": 55, "phys": 94, "gk": 10, "era": "2007-2018", "card": "92 Hero / Flashback", "dob": "1986-05-21"},

    # Uruguay
    {"name": "Luis Suárez", "role": "ST", "nat": "Uruguay", "ovr": 98, "pace": 92, "shoot": 98, "pass": 90, "def": 55, "phys": 92, "gk": 10, "era": "2007-2024", "card": "98 TOTS / Futties Peak", "dob": "1987-01-24"},
    {"name": "Edinson Cavani", "role": "ST", "nat": "Uruguay", "ovr": 96, "pace": 92, "shoot": 97, "pass": 84, "def": 58, "phys": 92, "gk": 10, "era": "2008-2022", "card": "96 Flashback / TOTS", "dob": "1987-02-14"},
    {"name": "Diego Godín", "role": "CB", "nat": "Uruguay", "ovr": 95, "pace": 82, "shoot": 55, "pass": 75, "def": 97, "phys": 93, "gk": 10, "era": "2005-2022", "card": "95 End of an Era / TOTS", "dob": "1986-02-16"},
    {"name": "Diego Forlán", "role": "ST", "nat": "Uruguay", "ovr": 92, "pace": 90, "shoot": 94, "pass": 86, "def": 48, "phys": 84, "gk": 10, "era": "2002-2014", "card": "92 World Cup Golden Ball Hero", "dob": "1979-05-19"},

    # Poland
    {"name": "Robert Lewandowski", "role": "ST", "nat": "Poland", "ovr": 99, "pace": 93, "shoot": 99, "pass": 90, "def": 50, "phys": 94, "gk": 10, "era": "2008-2026", "card": "99 TOTY / TOTS Peak", "dob": "1988-08-21"},
    {"name": "Wojciech Szczęsny", "role": "GK", "nat": "Poland", "ovr": 93, "pace": 55, "shoot": 25, "pass": 78, "def": 45, "phys": 85, "gk": 94, "era": "2009-2024", "card": "93 TOTS / Flashback", "dob": "1990-04-18"},

    # Egypt
    {"name": "Mohamed Salah", "role": "RW", "nat": "Egypt", "ovr": 99, "pace": 99, "shoot": 98, "pass": 95, "def": 55, "phys": 88, "gk": 10, "era": "2011-2026", "card": "99 TOTS / Futties Peak", "dob": "1992-06-15"},

    # Norway
    {"name": "Erling Haaland", "role": "ST", "nat": "Norway", "ovr": 99, "pace": 99, "shoot": 99, "pass": 86, "def": 55, "phys": 99, "gk": 10, "era": "2019-2026", "card": "99 TOTY / Futties Peak", "dob": "2000-07-21"},
    {"name": "Martin Ødegaard", "role": "CAM", "nat": "Norway", "ovr": 95, "pace": 88, "shoot": 90, "pass": 97, "def": 70, "phys": 78, "gk": 10, "era": "2014-2026", "card": "95 TOTS Peak", "dob": "1998-12-17"},

    # Korea Republic / South Korea
    {"name": "Son Heung-min", "role": "LW", "nat": "South Korea", "ovr": 97, "pace": 98, "shoot": 97, "pass": 93, "def": 52, "phys": 84, "gk": 10, "era": "2010-2026", "card": "97 TOTS / Futties Peak", "dob": "1992-07-08"},
    {"name": "Park Ji-sung", "role": "CM", "nat": "South Korea", "ovr": 91, "pace": 90, "shoot": 82, "pass": 87, "def": 84, "phys": 92, "gk": 10, "era": "2000-2011", "card": "91 World Cup Hero", "dob": "1981-02-25"},
    {"name": "Kim Min-jae", "role": "CB", "nat": "South Korea", "ovr": 93, "pace": 88, "shoot": 45, "pass": 78, "def": 95, "phys": 94, "gk": 10, "era": "2017-2026", "card": "93 TOTS Peak", "dob": "1996-11-15"},

    # Japan
    {"name": "Hidetoshi Nakata", "role": "CAM", "nat": "Japan", "ovr": 90, "pace": 86, "shoot": 85, "pass": 90, "def": 65, "phys": 85, "gk": 10, "era": "1997-2006", "card": "90 Prime Icon", "dob": "1977-01-22"},
    {"name": "Kaoru Mitoma", "role": "LW", "nat": "Japan", "ovr": 92, "pace": 96, "shoot": 88, "pass": 89, "def": 55, "phys": 78, "gk": 10, "era": "2021-2026", "card": "92 TOTS Peak", "dob": "1997-05-20"},
    {"name": "Takefusa Kubo", "role": "RW", "nat": "Japan", "ovr": 92, "pace": 95, "shoot": 88, "pass": 91, "def": 55, "phys": 75, "gk": 10, "era": "2019-2026", "card": "92 TOTS Peak", "dob": "2001-06-04"},
    {"name": "Wataru Endo", "role": "CDM", "nat": "Japan", "ovr": 90, "pace": 78, "shoot": 76, "pass": 86, "def": 92, "phys": 90, "gk": 10, "era": "2015-2026", "card": "90 Showdown / TOTS", "dob": "1993-02-09"},

    # Senegal
    {"name": "Sadio Mané", "role": "LW", "nat": "Senegal", "ovr": 98, "pace": 99, "shoot": 96, "pass": 92, "def": 55, "phys": 89, "gk": 10, "era": "2012-2026", "card": "98 TOTY / TOTS Peak", "dob": "1992-04-10"},
    {"name": "Kalidou Koulibaly", "role": "CB", "nat": "Senegal", "ovr": 95, "pace": 88, "shoot": 45, "pass": 78, "def": 97, "phys": 96, "gk": 10, "era": "2015-2026", "card": "95 TOTS Peak", "dob": "1991-06-20"},
    {"name": "Édouard Mendy", "role": "GK", "nat": "Senegal", "ovr": 93, "pace": 55, "shoot": 25, "pass": 80, "def": 45, "phys": 85, "gk": 94, "era": "2018-2026", "card": "93 Champions League / TOTY HM", "dob": "1992-03-01"},

    # Morocco
    {"name": "Achraf Hakimi", "role": "RB", "nat": "Morocco", "ovr": 95, "pace": 99, "shoot": 84, "pass": 90, "def": 89, "phys": 88, "gk": 10, "era": "2016-2026", "card": "95 TOTY Peak", "dob": "1998-11-04"},
    {"name": "Yassine Bounou", "role": "GK", "nat": "Morocco", "ovr": 93, "pace": 55, "shoot": 25, "pass": 80, "def": 45, "phys": 85, "gk": 94, "era": "2013-2026", "card": "93 World Cup Hero / TOTS", "dob": "1991-04-05"},
    {"name": "Hakim Ziyech", "role": "RW", "nat": "Morocco", "ovr": 93, "pace": 91, "shoot": 91, "pass": 95, "def": 55, "phys": 78, "gk": 10, "era": "2015-2026", "card": "93 Flashback / TOTS", "dob": "1993-03-19"},

    # Côte d'Ivoire / Ivory Coast
    {"name": "Didier Drogba", "role": "ST", "nat": "Ivory Coast", "ovr": 93, "pace": 91, "shoot": 94, "pass": 82, "def": 50, "phys": 93, "gk": 10, "era": "2002-2014", "card": "93 Icon Moments", "dob": "1978-03-11"},
    {"name": "Yaya Touré", "role": "CM", "nat": "Ivory Coast", "ovr": 94, "pace": 88, "shoot": 91, "pass": 93, "def": 88, "phys": 95, "gk": 10, "era": "2004-2015", "card": "94 Hero World Cup Peak", "dob": "1983-05-13"},

    # Cameroon
    {"name": "Samuel Eto'o", "role": "ST", "nat": "Cameroon", "ovr": 93, "pace": 96, "shoot": 93, "pass": 84, "def": 48, "phys": 84, "gk": 10, "era": "1997-2014", "card": "93 Icon Moments", "dob": "1981-03-10"},

    # Sweden
    {"name": "Zlatan Ibrahimović", "role": "ST", "nat": "Sweden", "ovr": 98, "pace": 94, "shoot": 99, "pass": 93, "def": 48, "phys": 96, "gk": 10, "era": "2001-2023", "card": "98 Futties / Flashback Peak", "dob": "1981-10-03"},
    {"name": "Henrik Larsson", "role": "ST", "nat": "Sweden", "ovr": 91, "pace": 90, "shoot": 91, "pass": 82, "def": 45, "phys": 81, "gk": 10, "era": "1993-2009", "card": "91 Icon Moments", "dob": "1971-09-20"},

    # Wales
    {"name": "Gareth Bale", "role": "RW", "nat": "Wales", "ovr": 98, "pace": 99, "shoot": 98, "pass": 94, "def": 75, "phys": 92, "gk": 10, "era": "2006-2022", "card": "98 End of Era / Futties", "dob": "1989-07-16"},

    # Colombia
    {"name": "Radamel Falcao", "role": "ST", "nat": "Colombia", "ovr": 95, "pace": 91, "shoot": 96, "pass": 82, "def": 48, "phys": 89, "gk": 10, "era": "2007-2024", "card": "95 Flashback / TOTS", "dob": "1986-02-10"},
    {"name": "James Rodríguez", "role": "CAM", "nat": "Colombia", "ovr": 95, "pace": 88, "shoot": 95, "pass": 96, "def": 55, "phys": 80, "gk": 10, "era": "2011-2026", "card": "95 Copa America Best Player / TOTS", "dob": "1991-07-12"},

    # Chile
    {"name": "Alexis Sánchez", "role": "LW", "nat": "Chile", "ovr": 95, "pace": 95, "shoot": 94, "pass": 91, "def": 55, "phys": 87, "gk": 10, "era": "2006-2026", "card": "95 Flashback / Futties", "dob": "1988-12-19"},
    {"name": "Arturo Vidal", "role": "CM", "nat": "Chile", "ovr": 95, "pace": 88, "shoot": 91, "pass": 92, "def": 94, "phys": 96, "gk": 10, "era": "2007-2024", "card": "95 Flashback / Summer Stars", "dob": "1987-05-22"},

    # Mexico
    {"name": "Hugo Sánchez", "role": "ST", "nat": "Mexico", "ovr": 93, "pace": 92, "shoot": 94, "pass": 82, "def": 45, "phys": 79, "gk": 10, "era": "1977-1998", "card": "93 Icon Moments", "dob": "1958-07-11"},
    {"name": "Rafael Márquez", "role": "CB", "nat": "Mexico", "ovr": 92, "pace": 82, "shoot": 70, "pass": 86, "def": 94, "phys": 89, "gk": 10, "era": "1997-2018", "card": "92 World Cup Hero", "dob": "1979-02-13"},
    {"name": "Javier Hernández", "role": "ST", "nat": "Mexico", "ovr": 91, "pace": 91, "shoot": 91, "pass": 78, "def": 40, "phys": 80, "gk": 10, "era": "2009-2019", "card": "91 Flashback Peak", "dob": "1988-06-01"},

    # United States
    {"name": "Christian Pulisic", "role": "LW", "nat": "United States", "ovr": 94, "pace": 98, "shoot": 92, "pass": 90, "def": 52, "phys": 80, "gk": 10, "era": "2016-2026", "card": "94 Summer Stars / TOTS", "dob": "1998-09-18"},
    {"name": "Clint Dempsey", "role": "CAM", "nat": "United States", "ovr": 91, "pace": 87, "shoot": 91, "pass": 86, "def": 65, "phys": 88, "gk": 10, "era": "2004-2017", "card": "91 World Cup Hero", "dob": "1983-03-09"},
    {"name": "Landon Donovan", "role": "CAM", "nat": "United States", "ovr": 91, "pace": 92, "shoot": 89, "pass": 89, "def": 55, "phys": 79, "gk": 10, "era": "2000-2014", "card": "91 World Cup Hero", "dob": "1982-03-04"},
    {"name": "Tim Howard", "role": "GK", "nat": "United States", "ovr": 91, "pace": 55, "shoot": 25, "pass": 78, "def": 45, "phys": 85, "gk": 92, "era": "2002-2017", "card": "91 Hero / Flashback", "dob": "1979-03-06"},

    # Ghana
    {"name": "Michael Essien", "role": "CDM", "nat": "Ghana", "ovr": 91, "pace": 86, "shoot": 84, "pass": 85, "def": 91, "phys": 92, "gk": 10, "era": "2002-2014", "card": "91 Icon Moments", "dob": "1982-12-03"},
    {"name": "Thomas Partey", "role": "CDM", "nat": "Ghana", "ovr": 91, "pace": 80, "shoot": 82, "pass": 88, "def": 90, "phys": 91, "gk": 10, "era": "2016-2026", "card": "91 TOTS Peak", "dob": "1993-06-13"},

    # Algeria
    {"name": "Riyad Mahrez", "role": "RW", "nat": "Algeria", "ovr": 95, "pace": 94, "shoot": 93, "pass": 95, "def": 48, "phys": 76, "gk": 10, "era": "2014-2026", "card": "95 TOTS / Flashback", "dob": "1991-02-21"},

    # Nigeria
    {"name": "Jay-Jay Okocha", "role": "CAM", "nat": "Nigeria", "ovr": 91, "pace": 89, "shoot": 85, "pass": 90, "def": 42, "phys": 75, "gk": 10, "era": "1993-2006", "card": "91 World Cup Hero / Icon", "dob": "1973-08-14"},
    {"name": "Victor Osimhen", "role": "ST", "nat": "Nigeria", "ovr": 95, "pace": 97, "shoot": 95, "pass": 80, "def": 45, "phys": 92, "gk": 10, "era": "2017-2026", "card": "95 TOTS Serie A Capocannoniere", "dob": "1998-12-29"},

    # Ukraine
    {"name": "Andriy Shevchenko", "role": "ST", "nat": "Ukraine", "ovr": 92, "pace": 91, "shoot": 93, "pass": 80, "def": 45, "phys": 82, "gk": 10, "era": "1995-2012", "card": "92 Ballon d'Or / Icon Moments", "dob": "1976-09-29"},

    # Czech Republic
    {"name": "Pavel Nedvěd", "role": "LM", "nat": "Czech Republic", "ovr": 92, "pace": 89, "shoot": 91, "pass": 91, "def": 75, "phys": 88, "gk": 10, "era": "1994-2006", "card": "92 Ballon d'Or / Icon Moments", "dob": "1972-08-30"},
    {"name": "Petr Čech", "role": "GK", "nat": "Czech Republic", "ovr": 93, "pace": 55, "shoot": 25, "pass": 80, "def": 45, "phys": 85, "gk": 94, "era": "2002-2016", "card": "93 Icon Moments", "dob": "1982-05-20"},

    # Switzerland
    {"name": "Granit Xhaka", "role": "CM", "nat": "Switzerland", "ovr": 93, "pace": 78, "shoot": 88, "pass": 95, "def": 89, "phys": 91, "gk": 10, "era": "2011-2026", "card": "93 TOTS Invincible / Euro Hero", "dob": "1992-09-27"},
    {"name": "Yann Sommer", "role": "GK", "nat": "Switzerland", "ovr": 93, "pace": 55, "shoot": 25, "pass": 85, "def": 45, "phys": 84, "gk": 94, "era": "2012-2026", "card": "93 TOTS Serie A Winner", "dob": "1988-12-17"},

    # Austria
    {"name": "David Alaba", "role": "CB", "nat": "Austria", "ovr": 94, "pace": 88, "shoot": 80, "pass": 90, "def": 95, "phys": 88, "gk": 10, "era": "2009-2026", "card": "94 TOTS / Flashback", "dob": "1992-06-24"},

    # Serbia
    {"name": "Nemanja Vidić", "role": "CB", "nat": "Serbia", "ovr": 92, "pace": 82, "shoot": 45, "pass": 65, "def": 95, "phys": 94, "gk": 10, "era": "2002-2011", "card": "92 Icon Moments", "dob": "1981-10-21"},

    # Costa Rica
    {"name": "Keylor Navas", "role": "GK", "nat": "Costa Rica", "ovr": 94, "pace": 55, "shoot": 25, "pass": 80, "def": 45, "phys": 85, "gk": 95, "era": "2008-2024", "card": "94 3x UCL Winner / TOTS", "dob": "1986-12-15"},

    # India
    {"name": "Sunil Chhetri", "role": "ST", "nat": "India", "ovr": 86, "pace": 85, "shoot": 88, "pass": 78, "def": 45, "phys": 76, "gk": 10, "era": "2005-2024", "card": "86 AFC & International Hero / Top Scorer", "dob": "1984-08-03"},
    {"name": "Bhaichung Bhutia", "role": "ST", "nat": "India", "ovr": 83, "pace": 84, "shoot": 83, "pass": 72, "def": 40, "phys": 75, "gk": 10, "era": "1995-2011", "card": "83 Indian Football Icon", "dob": "1976-12-15"},
    {"name": "Gurpreet Singh Sandhu", "role": "GK", "nat": "India", "ovr": 80, "pace": 45, "shoot": 20, "pass": 65, "def": 35, "phys": 82, "gk": 82, "era": "2011-2026", "card": "80 Asian Cup Hero", "dob": "1992-02-03"},

    # Canada
    {"name": "Alphonso Davies", "role": "LB", "nat": "Canada", "ovr": 95, "pace": 99, "shoot": 82, "pass": 89, "def": 89, "phys": 88, "gk": 10, "era": "2017-2026", "card": "95 TOTY / TOTS Peak", "dob": "2000-11-02"},
]

print(f"Loaded {len(PEAK_ICONS)} hand-curated maximum-peak historical cards/icons.")

output_dir = "src/data"
os.makedirs(output_dir, exist_ok=True)
with open(os.path.join(output_dir, "icons_peak.json"), "w", encoding="utf-8") as f:
    json.dump(PEAK_ICONS, f, indent=2, ensure_ascii=False)
print("Saved peak icons data.")
