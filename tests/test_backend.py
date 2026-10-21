"""HTTP boundary and worker lifecycle checks; inference is verified separately."""
import http.client
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from backend.server import make_server, save_json


class BackendTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.server = make_server(0, Path(cls.temp.name))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.jobs.close()
        cls.server.server_close()
        cls.temp.cleanup()

    def request(self, method, path, body=None, headers=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port)
        connection.request(method, path, body, headers or {})
        response = connection.getresponse()
        status, data = response.status, response.read()
        connection.close()
        return status, data

    def test_health_and_static_allowlist(self):
        self.assertEqual(self.request('GET', '/api/health')[0], 200)
        self.assertEqual(self.request('GET', '/')[0], 200)
        for path in ('/.git/config', '/backend/server.py', '/.gtab-data/model-cache', '/assets/samples/../../README.md'):
            self.assertEqual(self.request('GET', path)[0], 404)

    def test_origin_and_host_rejected(self):
        self.assertEqual(self.request('GET', '/api/health', headers={'Host':'evil.example'})[0], 403)
        self.assertEqual(self.request('POST', '/api/jobs', b'abc', {'Origin':'https://evil.example','X-GTab-Request':'1'})[0], 403)
        self.assertEqual(self.request('POST', '/api/jobs', b'abc')[0], 403)

    def test_upload_validation(self):
        headers = {'X-GTab-Request':'1','X-Audio-Extension':'.wav'}
        self.assertEqual(self.request('POST', '/api/jobs', b'', headers)[0], 413)
        self.assertEqual(self.request('POST', '/api/jobs', b'x', dict(headers, **{'Content-Length':str(101*1024*1024)}))[0], 413)
        self.assertEqual(self.request('POST', '/api/jobs', b'x', dict(headers, **{'X-Audio-Extension':'.exe'}))[0], 415)

    def test_queue_limit(self):
        slots = self.server.jobs.slots
        for _ in range(3): slots.acquire()
        try:
            self.assertEqual(self.request('POST', '/api/jobs', b'x', {'X-GTab-Request':'1','X-Audio-Extension':'.wav'})[0], 429)
        finally:
            for _ in range(3): slots.release()

    def test_cancel_and_expired_job(self):
        jid = 'a'*32
        folder = self.server.jobs.root / jid
        folder.mkdir(exist_ok=True)
        save_json(folder/'job.json', {'id':jid,'status':'queued'})
        self.assertEqual(self.request('DELETE', '/api/jobs/'+jid, headers={'X-GTab-Request':'1'})[0],200)
        self.assertEqual(json.loads(self.request('GET','/api/jobs/'+jid)[1])['status'],'cancelled')
        self.assertEqual(self.request('GET', '/api/jobs/'+jid+'/stems/guitar.wav')[0],409)
        self.request('DELETE','/api/jobs/'+jid,headers={'X-GTab-Request':'1'})
        self.assertEqual(self.request('GET','/api/jobs/'+jid)[0],404)

    def test_failed_worker_is_reported_and_releases_slot(self):
        jobs = self.server.jobs
        jid='b'*32
        folder=jobs.root/jid
        folder.mkdir()
        source=folder/'input.wav'
        source.write_bytes(b'not audio')
        save_json(folder/'job.json',{'id':jid,'status':'queued'})
        jobs.slots.acquire()
        with patch('backend.server.subprocess.Popen') as worker:
            worker.return_value.wait.return_value=1
            jobs.run(jid,source)
        self.assertEqual(jobs.get(jid)['status'],'failed')
        self.assertFalse(source.exists())
        self.assertTrue(jobs.slots.acquire(blocking=False))
        jobs.slots.release()

    def test_cleanup_preserves_model_cache(self):
        cache=self.server.jobs.root/'model-cache'
        cache.mkdir(exist_ok=True)
        (cache/'weights').write_text('retain')
        self.server.jobs.cleanup()
        self.assertTrue((cache/'weights').exists())


if __name__=='__main__': unittest.main()
