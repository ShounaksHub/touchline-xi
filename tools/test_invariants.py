import sys
sys.path.insert(0, '.')
from tools.data_europe import EUROPE_CLUBS
from tools.data_americas import AMERICAS_CLUBS
from tools.data_asia_africa import ASIA_AFRICA_CLUBS
from tools.data_expansion import EXPANSION_CLUBS

all_new = EUROPE_CLUBS + AMERICAS_CLUBS + ASIA_AFRICA_CLUBS + EXPANSION_CLUBS

for c in all_new:
    assert len(c['roster']) == 16, f"{c['name']} roster length is {len(c['roster'])}"
    names = [p[0] for p in c['roster']]
    assert len(names) == len(set(names)), f"{c['name']} has duplicate player names: {names}"
    assert c['roster'][0][1] == 'GK', f"{c['name']} starter 0 is not GK ({c['roster'][0]})"
    assert c['roster'][11][1] == 'GK', f"{c['name']} sub 11 is not GK ({c['roster'][11]})"

print("All 191 clubs passed strict roster and goalkeeper invariants!")
