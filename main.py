from flask import Flask, request, send_from_directory
from flask_socketio import SocketIO, emit, send
import eventlet
from flask_cors import CORS, cross_origin
from werkzeug.routing import BaseConverter
from werkzeug.utils import secure_filename

import os
import json
import shutil
import subprocess
import pickle

import static.backend.utility as utility
import static.backend.MLP as MLP
import static.backend.HEATMAP as HEATMAP

FRONTEND_DIR = "static/frontend/dist"
ASSETS_DIR = "static/frontend/dist/assets"
SOURCE_DIR = "static/frontend/dist/assets/ann/h5/"
DESTINATION_DIR = "static/frontend/dist/assets/ann/json"
DIGIT_DIR = "static/data/digit"
# set up Flask webservices
app = Flask(__name__, static_folder=FRONTEND_DIR)
CORS(app)

app.config['SECRET_KEY'] = 'braindead'
app.config['SOURCE_DIR'] = SOURCE_DIR
app.config['DESTINATION_DIR'] = DESTINATION_DIR
app.config['DIGIT_DIR'] = DIGIT_DIR
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


# @app.route("/nn/MLP", methods=["POST", "OPTIONS"])
# @cross_origin()
# def mlp():

#     params = request.get_json(force=True)
#     print(params)

#     # parse arguments from POST body
#     layers = params["layers"]
#     learning_rate = params["learning_rate"]
#     batch_size_train = params['batch_size_train']
#     batch_size_test = params['batch_size_test']
#     num_epochs = params['num_epochs']

#     net, acc, weights = MLP.mlp(layers, learning_rate, batch_size_train, batch_size_test, num_epochs)

#     return json.dumps(weights)


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


@app.route("/getTopology", methods=["POST", "OPTIONS"])
@cross_origin()
def getTopology():
    params = request.get_json(force=True)

    with open(params['selectedFile']) as f:
        data = json.load(f)
    
    return json.dumps(data)


@app.route("/getWeights", methods=["POST", "OPTIONS"])
@cross_origin()
def getWeights():
    params = request.get_json(force=True)

    with open(params['selectedFile']) as f:
        data = json.load(f)
    returnEpoch = 'epoch_' + str(params['currEpoch'])
    
    return json.dumps(data[returnEpoch])

@app.route("/getUntrainedWeights", methods=["POST", "OPTIONS"])
@cross_origin()
def getUntrainedWeights():
    params = request.get_json(force=True)

    with open(params['selectedFile']) as f:
        data = json.load(f)
    
    return json.dumps(data)


@app.route("/setup/filesearch", methods=["GET", "OPTIONS"])
@cross_origin()
def indexFolders():
    """go through folders and scan for heatmaps"""
    path = "./static/data/weights"
    validFiles = []
    for subdir, dirs, files in os.walk(path):
        for currFile in files:
            if not 'untrained' in currFile:
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


@app.route("/ablationTest", methods=["POST", "OPTIONS"])
@cross_origin()
def ablationTest():
    params = request.get_json()

    topology = params['topology']
    filename = params['filename']
    layers = params['layers']
    units = params['units']

    acc, correct_labels, acc_class, class_labels = MLP.mlp_ablation(topology, filename, layers, units)

    result = {
        "labels": ['All', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
        "class labels": class_labels.tolist(),
        "averaged accuracy": acc,
        "class specific accuracy": acc_class.tolist(),
        "color labels": correct_labels.tolist()
    }

    return json.dumps(result)


@socketio.on('mlp')
def mlpSocketIO(params):
    # print(params)

    # parse arguments from POST body
    batch_size_train = params['batch_size_train']
    batch_size_test = params['batch_size_test']
    num_epochs = params['num_epochs']
    learning_rate = params["learning_rate"]

    conv_layers = params["conv_layers"]
    layers = params["layers"]

    # net, acc, weights = MLP.mlp(batch_size_train, batch_size_test, num_epochs, learning_rate, conv_layers, layers)
    MLP.mlp(batch_size_train, batch_size_test, num_epochs, learning_rate, conv_layers, layers)
    print('final json send')


@app.route("/getTSNECoordinate", methods=["GET"])
@cross_origin()
def getTSNECoordinate():
    result = pickle.load(open("static/data/tSNE/X_tSNE_10000.p", "rb"))
    return json.dumps(result.tolist())

@socketio.on_error_default  # handles all namespaces without an explicit error handler
def default_error_handler(e):
    print(e)


@app.errorhandler(404)
def page_not_found(e):
    return angular()


@app.route("/saveDigit", methods=["POST", "OPTIONS"])
@cross_origin()
def saveDigit():
    digit = request.files['digit']

    if digit:
        if not(os.path.exists(app.config['DIGIT_DIR'])):
            os.mkdir(app.config['DIGIT_DIR'])

        filename = secure_filename(digit.filename)
        digit.save(os.path.join(app.config['DIGIT_DIR'], filename))

        MLP.preprocess_digit()

    return json.dumps({})

@app.route("/testDigit", methods=["POST", "OPTIONS"])
@cross_origin()
def testDigit():
    params = request.get_json()
    filename = params['filename']

    MLP.test_digit(filename)
    result = {}
    
    return json.dumps(result)


if __name__ == "__main__":
    # app.run(debug=True, threaded=True)
    socketio.run(app,debug=True)
