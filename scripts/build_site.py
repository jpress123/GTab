"""Build a static HTTPS-ready frontend without backend or user data."""
from pathlib import Path
import shutil
import hashlib
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'site-dist'
FILES = ['index.html','studio.css','audio-engine.js','stem-client.js','guitar-notation.js','practice-patterns.js','practice-ui.js','performance.js','levels.js','routine.js','dashboard.js','session-data.js','practice-focus.js','daily-practice.js','weekly-path.js']
def build():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for name in FILES:
        shutil.copy2(ROOT/name, OUT/name)
    # Version public scripts/styles so tablet browsers cannot mix old and new releases.
    html = (OUT/'index.html').read_text()
    for name in FILES:
        if name.endswith(('.js', '.css')):
            version = hashlib.sha256((OUT/name).read_bytes()).hexdigest()[:12]
            html = html.replace(f'"{name}"', f'"{name}?v={version}"')
    (OUT/'index.html').write_text(html)
    shutil.copytree(ROOT/'assets'/'samples', OUT/'assets'/'samples', dirs_exist_ok=True)
    (OUT/'.nojekyll').touch()
    print(f'Static frontend ready: {OUT}')
if __name__ == '__main__':
    build()
