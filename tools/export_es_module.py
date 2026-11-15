import json

with open("src/data/national_teams_db.json", "r", encoding="utf-8") as f:
    db = json.load(f)

lines = []
lines.append("/** Touchline XI - Top 150 FIFA Senior National Teams Database */")
lines.append("// Auto-generated high-fidelity database containing official FIFA rankings, peak cards, and full 16-player rosters")
lines.append("export const NATIONAL_TEAMS = " + json.dumps(db, ensure_ascii=False) + ";\n")

with open("src/data/national_teams.js", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("Created src/data/national_teams.js successfully.")
