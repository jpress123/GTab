"""Loopback-only GTab HTTP server and bounded background separation queue."""
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse
import importlib.util
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
DATA = Path(os.environ.get('GTAB_DATA_DIR', ROOT / '.gtab-data')).resolve()
MAX_UPLOAD = 100 * 1024 * 1024
MAX_JOBS = 3
MAX_RETAINED = 8
STEMS = ('guitar', 'bass', 'drums', 'vocals', 'piano', 'other')
SUFFIXES = {'.mp3', '.wav', '.m4a', '.flac', '.ogg'}
JOB_ID = r'[a-f0-9]{32}'


def save_json(path, data):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data))
    tmp.replace(path)


class Jobs:
    def __init__(self, root=DATA):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.lock = threading.RLock()
        self.pool = ThreadPoolExecutor(max_workers=1)
        self.slots = threading.BoundedSemaphore(MAX_JOBS)
        self.active = {}
        for path in self.root.glob('*/job.json'):
            try:
                job = json.loads(path.read_text())
                if job['status'] in ('queued', 'running', 'uploading'):
                    job.update(status='failed', message='Server restarted. Please separate this track again.')
                    save_json(path, job)
            except (ValueError, KeyError):
                pass
        self.cleanup()

    def cleanup(self):
        with self.lock:
            completed = []
            for folder in self.root.iterdir():
                if not folder.is_dir() or not re.fullmatch(JOB_ID, folder.name) or folder.name in self.active:
                    continue
                completed.append(folder)
            completed.sort(key=lambda p: p.stat().st_mtime, reverse=True)
            for i, folder in enumerate(completed):
                if i >= MAX_RETAINED or time.time() - folder.stat().st_mtime > 86400:
                    shutil.rmtree(folder)

    def get(self, jid):
        if not re.fullmatch(JOB_ID, jid):
            raise FileNotFoundError
        with self.lock:
            job = json.loads((self.root / jid / 'job.json').read_text())
            if job['status'] == 'running':
                try:
                    stage = json.loads((self.root / jid / 'stage.json').read_text())
                    job.update(stage)
                except (FileNotFoundError, ValueError):
                    pass
            if job['status'] == 'complete':
                job['stems'] = {s: f'/api/jobs/{jid}/stems/{s}.wav' for s in STEMS}
                job['download'] = f'/api/jobs/{jid}/download'
            return job

    def update(self, jid, **fields):
        with self.lock:
            path = self.root / jid / 'job.json'
            job = json.loads(path.read_text())
            job.update(fields)
            save_json(path, job)

    def run(self, jid, source):
        folder = self.root / jid
        try:
            with self.lock:
                if self.get(jid)['status'] == 'cancelled':
                    return
                self.update(jid, status='running', message='Starting separation worker…')
                log = (folder / 'worker.log').open('w')
                env = dict(os.environ, TORCH_HOME=str(self.root / 'model-cache'), OMP_NUM_THREADS='4')
                process = subprocess.Popen([sys.executable, str(ROOT / 'backend' / 'separate.py'), str(source), str(folder)],
                                           stdout=log, stderr=subprocess.STDOUT, env=env)
                self.active[jid] = process
            try:
                code = process.wait(timeout=3600)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
                raise RuntimeError('Separation exceeded one hour. Try a shorter track.')
            finally:
                log.close()
            if self.get(jid)['status'] == 'cancelled':
                return
            if code != 0:
                error = folder / 'error.json'
                message = json.loads(error.read_text())['message'] if error.exists() else 'Separation failed. See the local worker log and retry.'
                raise RuntimeError(message)
            if not all((folder / 'stems' / f'{s}.wav').is_file() for s in STEMS):
                raise RuntimeError('The worker did not produce all six stems.')
            self.update(jid, status='complete', message='Six stems ready.', stage='complete')
        except Exception as exc:
            if self.get(jid)['status'] != 'cancelled':
                self.update(jid, status='failed', message=str(exc))
        finally:
            with self.lock:
                self.active.pop(jid, None)
                if self.get(jid)['status'] in ('cancelled', 'failed'):
                    shutil.rmtree(folder / 'stems', ignore_errors=True)
                source.unlink(missing_ok=True)
            self.slots.release()
            self.cleanup()

    def cancel(self, jid):
        with self.lock:
            job = self.get(jid)
            if job['status'] in ('queued', 'running'):
                self.update(jid, status='cancelled', message='Separation cancelled.')
                process = self.active.get(jid)
                if process is not None:
                    process.terminate()
            else:
                shutil.rmtree(self.root / jid)

    def close(self):
        with self.lock:
            for jid in list(self.active):
                self.cancel(jid)
        self.pool.shutdown(wait=True)


class Handler(BaseHTTPRequestHandler):
    server_version = 'GTab/1.0'

    def allowed(self):
        host = self.headers.get('Host', '')
        valid = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
        origin = self.headers.get('Origin')
        return host in valid and (not origin or origin == 'http://' + host)

    def reply(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path, download=False):
        if not path.is_file():
            return self.reply(404, {'error': 'File not found.'})
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(str(path))[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(path.stat().st_size))
        self.send_header('X-Content-Type-Options', 'nosniff')
        if download:
            self.send_header('Content-Disposition', f'attachment; filename="{path.name}"')
        self.end_headers()
        with path.open('rb') as f:
            shutil.copyfileobj(f, self.wfile)

    def do_GET(self):
        if not self.allowed():
            return self.reply(403, {'error': 'Local same-origin access only.'})
        path = urlsplit(self.path).path
        if path == '/api/health':
            ready = all(importlib.util.find_spec(x) is not None for x in ('demucs', 'torch', 'soundfile', 'imageio_ffmpeg'))
            return self.reply(200, {'ready': ready, 'model': 'htdemucs_6s', 'max_upload_bytes': MAX_UPLOAD})
        match = re.fullmatch(f'/api/jobs/({JOB_ID})(?:/(download|stems/(guitar|bass|drums|vocals|piano|other)\\.wav))?', path)
        if match:
            jid, asset, stem = match.groups()
            try:
                job = self.server.jobs.get(jid)
            except FileNotFoundError:
                return self.reply(404, {'error': 'Job not found or expired.'})
            if not asset:
                return self.reply(200, job)
            if job['status'] != 'complete':
                return self.reply(409, {'error': 'Stems are not ready.'})
            file = self.server.jobs.root / jid / ('stems.zip' if asset == 'download' else f'stems/{stem}.wav')
            return self.send_file(file, download=asset == 'download')
        # Explicit public allowlist: never expose uploads, model cache, source, or .git.
        if path == '/':
            path = '/index.html'
        if path in ('/index.html', '/studio.css', '/audio-engine.js', '/stem-client.js', '/guitar-notation.js', '/practice-patterns.js', '/practice-ui.js', '/routine.js', '/performance.js', '/dashboard.js') or re.fullmatch(r'/assets/samples/(?:guitar-acoustic|bass-electric)/[A-G][s]?[1-5]\.mp3', path) or path in ('/assets/samples/LICENSE.md','/assets/samples/ATTRIBUTION.md'):
            return self.send_file(ROOT / path.lstrip('/'))
        self.reply(404, {'error': 'Not found.'})

    def do_POST(self):
        if not self.allowed() or self.headers.get('X-GTab-Request') != '1':
            return self.reply(403, {'error': 'Local same-origin request required.'})
        if urlsplit(self.path).path != '/api/jobs':
            return self.reply(404, {'error': 'Not found.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_UPLOAD:
            return self.reply(413, {'error': 'Choose an audio file between 1 byte and 100 MB.'})
        suffix = self.headers.get('X-Audio-Extension', '').lower()
        if suffix not in SUFFIXES:
            return self.reply(415, {'error': 'Unsupported audio format.'})
        jobs = self.server.jobs
        if not jobs.slots.acquire(blocking=False):
            return self.reply(429, {'error': 'The separation queue is full. Try again shortly.'})
        jid = uuid.uuid4().hex
        folder = jobs.root / jid
        try:
            with jobs.lock:
                folder.mkdir()
                jobs.active[jid] = None
                save_json(folder / 'job.json', {'id': jid, 'status': 'uploading', 'message': 'Receiving audio.', 'created': time.time()})
            source = folder / ('input' + suffix)
            self.connection.settimeout(60)
            with source.open('wb') as f:
                remaining = length
                while remaining:
                    chunk = self.rfile.read(min(1024 * 1024, remaining))
                    if not chunk:
                        raise ValueError('Incomplete upload.')
                    f.write(chunk)
                    remaining -= len(chunk)
            jobs.update(jid, status='queued', message='Queued for local separation.')
            jobs.pool.submit(jobs.run, jid, source)
        except Exception:
            with jobs.lock:
                jobs.active.pop(jid, None)
                shutil.rmtree(folder, ignore_errors=True)
            jobs.slots.release()
            return self.reply(400, {'error': 'Upload interrupted. Please retry.'})
        self.reply(202, {'id': jid, 'status': 'queued'})

    def do_DELETE(self):
        if not self.allowed() or self.headers.get('X-GTab-Request') != '1':
            return self.reply(403, {'error': 'Local same-origin request required.'})
        match = re.fullmatch(f'/api/jobs/({JOB_ID})', urlsplit(self.path).path)
        if not match:
            return self.reply(404, {'error': 'Not found.'})
        try:
            self.server.jobs.cancel(match[1])
        except FileNotFoundError:
            return self.reply(404, {'error': 'Job not found.'})
        self.reply(200, {'status': 'cancelled'})


def make_server(port=8765, data=DATA):
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.jobs = Jobs(data)
    return server


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    server = make_server(args.port)
    print(f'GTab: http://127.0.0.1:{server.server_port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.jobs.close()
        server.server_close()
