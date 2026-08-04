import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

from auth_service import authenticate_user, init_db


class AuthHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != '/login':
            self._send_json({'success': False, 'message': 'Ruta no encontrada'}, 404)
            return

        content_length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(content_length).decode('utf-8')
        data = parse_qs(body)
        username = data.get('username', [''])[0].strip()
        password = data.get('password', [''])[0].strip()

        result = authenticate_user(username, password)
        self._send_json(result)


if __name__ == '__main__':
    init_db()
    server = HTTPServer(('127.0.0.1', 8000), AuthHandler)
    print('Servidor corriendo en http://127.0.0.1:8000')
    server.serve_forever()
