from flask import Flask, request, send_from_directory
from flask_cors import CORS, cross_origin
from werkzeug.routing import BaseConverter

import os
import json
import shutil
import subprocess

FRONTEND_DIR = "static/frontend/dist"
ASSETS_DIR = "static/frontend/dist/assets"
SOURCE_DIR = "static/frontend/dist/assets/ann/h5/"
DESTINATION_DIR = "static/frontend/dist/assets/ann/json"
# set up Flask webservices
app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app)

app.config['SOURCE_DIR'] = SOURCE_DIR
app.config['DESTINATION_DIR'] = DESTINATION_DIR

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

@app.route("/assets/<regex('\w(\w*\/)*(\w*(.|-)\w*){1}'):path>")
def assets(path):
    print(path)
    return send_from_directory(ASSETS_DIR, path)

@app.route("/convert/<filename>", methods=["GET"])
@cross_origin()
def convert(filename):
    print("Converting...")

    if os.path.isdir(app.config['DESTINATION_DIR']):
        shutil.rmtree(app.config['DESTINATION_DIR'])
        os.mkdir(app.config['DESTINATION_DIR'])

    source = app.config["SOURCE_DIR"] + filename
    cmd = ["tensorflowjs_converter", "--input_format", "keras", source, app.config["DESTINATION_DIR"]]
    subprocess.run(cmd, shell=True)
    return "Conversion done."


@app.route("/nn/MLP", methods=["POST"])
@cross_origin()
def mlp():
    content = request.get_json()
    
    batchSize = content['batchSize']
    epoch = content['epoch']
    learningRate = content['learningRate']
    layerCount = content['layerCount']

    # firstUnits = content['layers'][0]["unitCount"]
    # firstActivation = content['layers'][0]["activation"]

    print(content)

    print(batchSize)
    print(epoch)
    print(learningRate)
    print(layerCount)
    # print(firstUnits)
    # print(firstActivation)

    return_obj = {"result": "test"}
    return_obj = content
    return json.dumps(content)
    
if __name__ == "__main__":
    app.run(debug=True, threaded=True)