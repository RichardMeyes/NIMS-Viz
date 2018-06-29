from flask import Flask, request, send_from_directory
from flask_cors import CORS, cross_origin
from werkzeug.routing import BaseConverter

import os
import json
import shutil
import subprocess

import static.backend.MLP as MLP

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


@app.route("/nn/MLP", methods=["GET"])
@cross_origin()
def mlp():
    """

    :return:
    """

    # parse arguments from POST body
    layers = request.form.get('layers')
    learning_rate = request.form.get('learning_rate')
    num_batches = request.form.get('num_batches')
    batch_size = request.form.get('batch_size')
    num_epochs = request.form.get('num_epochs')

    return_obj = {"result": MLP.mlp(layers, learning_rate, num_batches, batch_size, num_epochs)}

    weights = dict()
    weights["weights"] = {"l1": [[1,2], [2,3]],
                          "l2": [[1,2,5], [123,2,4], [1,3,4,5,6,3]]}

    return json.dumps(return_obj)


if __name__ == "__main__":
    app.run(debug=True, threaded=True)