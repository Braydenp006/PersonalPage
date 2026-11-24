# Serves this folder for local testing, like `python3 -m http.server`, but tells the browser to check for a newer copy of
# every file each time. Plain http.server sends no cache rules, so Firefox keeps reusing old pages and scripts after edits.
# Run:  python3 tools/serve.py        (port 3000; or  python3 tools/serve.py 8000). Serves the repo root wherever it's run from.
import http.server, os, sys

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')   # may keep a copy, but must ask first (a 304 if unchanged, so still fast)
        super().end_headers()

http.server.ThreadingHTTPServer(('', int(sys.argv[1]) if len(sys.argv) > 1 else 3000), NoCache).serve_forever()
