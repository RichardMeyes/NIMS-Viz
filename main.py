from flask import Flask, request, send_from_directory
from werkzeug.routing import BaseConverter

FRONTEND_DIR = "static/frontend/dist"
app = Flask(__name__, static_folder=FRONTEND_DIR)

class RegexConverter(BaseConverter):
    def __init__(self, url_map, *items):
        super(RegexConverter, self).__init__(url_map)
        self.regex = items[0]

app.url_map.converters['regex'] = RegexConverter

@app.route("/")
def angular():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/<regex('(\w*\.)*(css|js)'):path>")
def angular_src(path):
    return send_from_directory(FRONTEND_DIR, path)

if __name__ == "__main__":
    app.run()