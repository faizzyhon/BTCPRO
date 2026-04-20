#!/usr/bin/env python3
"""
MarketPulse AI — Books Knowledge HTTP Server
Serves books knowledge + probability analysis to the dashboard.
Run: python books_server.py
Port: 5001
"""

import json
import sys
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

try:
    from books_knowledge import (
        BOOKS, TOPICS, calculate_probability,
        get_all_books_summary, get_book_principles,
        get_topic_summary, build_ai_context,
    )
except ImportError:
    print("Error: books_knowledge.py not found in same directory.")
    sys.exit(1)

PORT = 5001
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}


class BooksHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[books-server] {fmt % args}")

    def send_json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length:
            return json.loads(self.rfile.read(length))
        return {}

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path.rstrip("/")

        if path == "/health":
            self.send_json(200, {"status": "ok", "port": PORT})

        elif path == "/books":
            self.send_json(200, {"books": get_all_books_summary()})

        elif path.startswith("/book/"):
            key = path.split("/book/")[-1]
            data = get_book_principles(key)
            if data["title"]:
                self.send_json(200, data)
            else:
                self.send_json(404, {"error": "Book not found"})

        elif path == "/books/full":
            self.send_json(200, {"books": BOOKS, "topics": TOPICS})

        elif path.startswith("/topic/"):
            topic = path.split("/topic/")[-1]
            rules = get_topic_summary(topic)
            self.send_json(200, {"topic": topic, "rules": rules})

        elif path == "/topics":
            self.send_json(200, {"topics": list(TOPICS.keys())})

        else:
            self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        path = urlparse(self.path).path.rstrip("/")

        if path == "/probability":
            try:
                data = self.read_body()
                result = calculate_probability(data)
                self.send_json(200, result)
            except Exception as e:
                self.send_json(500, {"error": str(e)})

        elif path == "/ai-context":
            try:
                data = self.read_body()
                context = build_ai_context(data)
                self.send_json(200, {"context": context})
            except Exception as e:
                self.send_json(500, {"error": str(e)})

        elif path == "/open-cli":
            try:
                if sys.platform == "win32":
                    subprocess.Popen(
                        ["cmd", "/c", "start", "cmd", "/k", "python books_knowledge.py"],
                        cwd=".",
                    )
                else:
                    subprocess.Popen(["python3", "books_knowledge.py"])
                self.send_json(200, {"status": "opened"})
            except Exception as e:
                self.send_json(500, {"error": str(e)})

        else:
            self.send_json(404, {"error": "Not found"})


def main():
    server = HTTPServer(("127.0.0.1", PORT), BooksHandler)
    print(f"Books Knowledge Server running on http://127.0.0.1:{PORT}")
    print("Endpoints:")
    print("  GET  /health         — status check")
    print("  GET  /books          — all books summary")
    print("  GET  /book/<key>     — single book principles")
    print("  GET  /books/full     — full knowledge base")
    print("  GET  /topics         — topic list")
    print("  GET  /topic/<name>   — topic rules")
    print("  POST /probability    — calculate trade probability")
    print("  POST /ai-context     — build Ollama context string")
    print("  POST /open-cli       — open interactive CLI in terminal")
    print("\nPress Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
