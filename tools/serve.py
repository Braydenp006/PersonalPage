# Serves this folder for local testing, like `python3 -m http.server`, but tells the browser to check for a newer copy of
# every file each time. Plain http.server sends no cache rules, so Firefox keeps reusing old pages and scripts after edits.
# Run:  python3 tools/serve.py        (port 3000; or  python3 tools/serve.py 8000). Serves the repo root wherever it's run from.
import http.server, os, sys

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')   # may keep a copy, but must ask first (a 304 if unchanged, so still fast)
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        if code != 404 or not os.path.exists('404.html'):
            return super().send_error(code, message, explain)
        body = open('404.html', 'rb').read()   # same page nginx will serve via error_page 404
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

http.server.ThreadingHTTPServer(('', int(sys.argv[1]) if len(sys.argv) > 1 else 3000), NoCache).serve_forever()
