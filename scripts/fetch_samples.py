"""Fetch the CC BY 3.0 sample subset, retaining upstream attribution."""
from pathlib import Path
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor
ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'samples'
BASE = 'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/'
FILES = [('guitar-acoustic', n) for n in ['E2','A2','C3','E3','G3','A3','C4','E4','G4','A4','C5','D5']]
FILES += [('bass-electric', n) for n in ['E1','G1','Cs2','E2','G2','As2','Cs3','E3']]
def fetch(pair):
    instrument, note = pair
    path = ROOT / instrument / (note + '.mp3')
    path.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(BASE + 'samples/' + instrument + '/' + note + '.mp3', timeout=60) as response:
        path.write_bytes(response.read())
    return str(path.relative_to(ROOT))
if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=4) as pool:
        for path in pool.map(fetch, FILES): print(path, flush=True)
