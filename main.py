from flask import Flask, request, send_from_directory
from flask_socketio import SocketIO, emit, send
import eventlet
from flask_cors import CORS, cross_origin
from werkzeug.routing import BaseConverter

import os
import json
import shutil
import subprocess

import static.backend.utility as utility
import static.backend.MLP as MLP
import static.backend.HEATMAP as HEATMAP

FRONTEND_DIR = "static/frontend/dist"
ASSETS_DIR = "static/frontend/dist/assets"
SOURCE_DIR = "static/frontend/dist/assets/ann/h5/"
DESTINATION_DIR = "static/frontend/dist/assets/ann/json"
# set up Flask webservices
app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app)

app.config['SECRET_KEY'] = 'braindead'
app.config['SOURCE_DIR'] = SOURCE_DIR
app.config['DESTINATION_DIR'] = DESTINATION_DIR
# keep socketio alive for x minutes (60s*x)
socketio = SocketIO(app, ping_timeout=(60*60))


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
    cmd = [
        "tensorflowjs_converter", "--input_format", "keras", source,
        app.config["DESTINATION_DIR"]
    ]
    subprocess.run(cmd, shell=True)
    return "Conversion done."


@app.route("/nn/MLP", methods=["POST", "OPTIONS"])
@cross_origin()
def mlp():

    params = request.get_json(force=True)
    print(params)

    # parse arguments from POST body
    layers = params["layers"]
    learning_rate = params["learning_rate"]
    batch_size_train = params['batch_size_train']
    batch_size_test = params['batch_size_test']
    num_epochs = params['num_epochs']

    acc, weights = MLP.mlp(layers, learning_rate, batch_size_train, batch_size_test, num_epochs)

    return json.dumps(weights)

@app.route("/calc/heatmapfromfile", methods=["POST", "OPTIONS"])
@cross_origin()
def calcHeatmapFromFile():
    params = request.get_json()
    # print('params')
    # print(params)
    try:
        newNodeStruct = params['newFile']
    except KeyError:
        print('newNodeStruct was not found in params, setting to false')
        newNodeStruct = False

    try:
        weights = params['weights']
    except KeyError:
        print('weights was not found in params, using filepath and epoch')
        weights = utility.loadWeightsFromFile(params['filePath'],params['epoch'])

    # print('weights')
    # print(weights)
    drawFully = params['drawFully']
    weightMinMax = params['weightMinMax']
    print('weightMinMax in app route: ',weightMinMax)
    
    density = params['density']
    heatmapObj = HEATMAP.Heatmap()

    return json.dumps(heatmapObj.heatmapFromWeights(weights, weightMinMax, drawFully, newNodeStruct, density))

@app.route("/setup/filesearch", methods=["GET", "OPTIONS"])
@cross_origin()
def indexFolders():
    """go through folders and scan for heatmaps"""
    path = "./static/data/weights"
    validFiles = []
    for subdir, dirs, files in os.walk(path):
        for currFile in files:
            pathName = os.path.join(subdir, currFile)
            print('Name of File: ' + pathName)
            # try parsing name , example name: MLP[20, 15, 10].json
            fileNameValues = []
            idxStart = currFile.find('[')
            idxEnd = currFile.find(']')
            if (idxStart != -1 and idxEnd != -1):
                fileNameValues = currFile[idxStart+1:idxEnd].split(',')
                epochMinMax, weightMinMax = utility.getEpochAndWeightLimitsFromFile(pathName)
            else:
                continue

            indexedObj = {'fileName': currFile, 'values': fileNameValues, 'pathName': pathName, 'epochMinMax':epochMinMax, 'weightMinMax':weightMinMax}
            validFiles.append(indexedObj)
    
    return json.dumps({'result':validFiles})

@socketio.on('mlp')
def mlpSocketIO(params):
    # print(params)

    # parse arguments from POST body
    layers = params["layers"]
    learning_rate = params["learning_rate"]
    batch_size_train = params['batch_size_train']
    batch_size_test = params['batch_size_test']
    num_epochs = params['num_epochs']

    acc, weights = MLP.mlp(layers, learning_rate, batch_size_train, batch_size_test, num_epochs)
    print('final json send')

@socketio.on_error_default  # handles all namespaces without an explicit error handler
def default_error_handler(e):
    print(e)

if __name__ == "__main__":
    # app.run(debug=True, threaded=True)
    socketio.run(app,debug=True)
