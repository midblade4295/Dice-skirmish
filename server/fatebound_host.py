#!/usr/bin/env python3
"""Serve Fatebound and store saves on this machine."""
import argparse
import json
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

SAFE_ID = re.compile(r"^[A-Za-z0-9._-]{3,64}$")
INJECT = (
    '<script>window.FATEBOUND_SERVER='
    'window.location.pathname.startsWith("/fatebound")'
    '?window.location.origin+"/fatebound":window.location.origin;'
    '</script><script src="fatebound-client.js"></script>'
)

class Handler(SimpleHTTPRequestHandler):
    saves_dir = "saves"

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/api/save", "/api/save/"):
            qs = parse_qs(parsed.query or "")
            pid = (qs.get("playerId") or [""])[0]
            path = self._save_path(pid)
            if not path:
                return self._json(400, {"ok": False, "error": "bad playerId"})
            if not os.path.isfile(path):
                return self._json(404, {"ok": False, "error": "no save"})
            with open(path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
            return self._json(200, {"ok": True, "save": data.get("save"), "playerId": pid})

        if parsed.path in ("/", "/index.html", "/fatebound.html"):
            return self._game_html()

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path not in ("/api/save", "/api/save/"):
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length > 2_000_000:
            return self._json(413, {"ok": False, "error": "too large"})
        raw = self.rfile.read(length)
        try:
            body = json.loads(raw.decode("utf-8"))
        except Exception:
            return self._json(400, {"ok": False, "error": "bad json"})
        pid = str(body.get("playerId") or "")
        path = self._save_path(pid)
        if not path:
            return self._json(400, {"ok": False, "error": "bad playerId"})
        os.makedirs(self.saves_dir, exist_ok=True)
        payload = {"playerId": pid, "game": "fatebound", "save": body.get("save")}
        tmp = path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as handle:
            json.dump(payload, handle)
        os.replace(tmp, path)
        return self._json(200, {"ok": True})

    def _game_html(self):
        path = os.path.join(os.getcwd(), "fatebound.html")
        with open(path, "r", encoding="utf-8") as handle:
            text = handle.read()
        if "fatebound-client.js" not in text:
            marker = "</head>"
            text = text.replace(marker, INJECT + marker, 1) if marker in text else INJECT + text
        blob = text.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(blob)))
        self.end_headers()
        self.wfile.write(blob)

    def _save_path(self, pid):
        if not SAFE_ID.match(pid or ""):
            return None
        return os.path.join(self.saves_dir, pid + ".json")

    def _json(self, code, obj):
        blob = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(blob)))
        self.end_headers()
        self.wfile.write(blob)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", default=".")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--saves", default="saves")
    args = parser.parse_args()
    os.chdir(args.dir)
    Handler.saves_dir = os.path.abspath(args.saves)
    os.makedirs(Handler.saves_dir, exist_ok=True)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print("Fatebound + saves on port %s dir=%s saves=%s" %
          (args.port, os.getcwd(), Handler.saves_dir), flush=True)
    server.serve_forever()

if __name__ == "__main__":
    main()