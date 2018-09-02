from flask import Flask, request, send_from_directory
from flask_socketio import SocketIO, emit, send
from flask_cors import CORS, cross_origin
from werkzeug.routing import BaseConverter

import os
import json
import shutil
import subprocess

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
socketio = SocketIO(app)


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
    weights = loadWeightsFromFile(params['filePath'],params['epoch'])
    drawFully = params['drawFully']
    weightMinMax = params['weightMinMax']
    newFile = params['newFile']
    density = params['density']
    heatmapObj = HEATMAP.Heatmap()

    return json.dumps(heatmapObj.heatmapFromWeights(weights, weightMinMax, drawFully, newFile, density))

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
                epochMinMax, weightMinMax = getEpochAndWeightLimitsFromFile(pathName)
            else:
                continue

            indexedObj = {'fileName': currFile, 'values': fileNameValues, 'pathName': pathName, 'epochMinMax':epochMinMax, 'weightMinMax':weightMinMax}
            validFiles.append(indexedObj)
    
    return json.dumps({'result':validFiles})

@socketio.on('mlp')
def mlpSocketIO(params):
    print(params)

    # parse arguments from POST body
    layers = params["layers"]
    learning_rate = params["learning_rate"]
    batch_size_train = params['batch_size_train']
    batch_size_test = params['batch_size_test']
    num_epochs = params['num_epochs']

    acc, weights = MLP.mlp(layers, learning_rate, batch_size_train, batch_size_test, num_epochs)
    emit('json', weights)
    print('final json send')
    # socketio.sleep(0)

    # job_done = False
    # results = None
    # while not job_done:
    #     job_done, acc, weights = MLP.mlp(layers, learning_rate, batch_size_train, batch_size_test, num_epochs, continue_from=results)
    #     emit('json', weights)
    # emit('json', {'done': True})
    # send(json, json=True) 

    

    # return json.dumps(weights)

@socketio.on('heatmap')
def calcHeatmapSocketIO(json):
    weights = loadWeightsFromFile(json['filePath'],json['epoch'])
    drawFully = json['drawFully']
    weightMinMax = json['weightMinMax']
    newFile = json['newFile']
    density = json['density']
    heatmapObj = HEATMAP.Heatmap()
    job_done = False
    results = None
    while not job_done:
        job_done, results = heatmapObj.heatmapFromWeights(weights, weightMinMax, drawFully, newFile, density, continue_from=results)
        emit('json', results)
    emit('json', {'done': True})
    # send(json, json=True) 

@socketio.on_error_default  # handles all namespaces without an explicit error handler
def default_error_handler(e):
    print(e)

def getEpochAndWeightLimitsFromFile(filePath):
    epochMinMax = [0,0]
    epochNumbers = []
    weightMinMax = [0,0]
    with open(filePath) as json_data:
        d = json.load(json_data)
        for key in d:
            if(key.find('epoch') != -1):
                epochNumbers.append(int(key[6:]))
                for hiddenlayerkey in d[key]:
                    # min and max used twice because of nested values
                    currMin = min(min(d[key][hiddenlayerkey]))
                    currMax = max(max(d[key][hiddenlayerkey]))
                    if(currMin < weightMinMax[0]):
                        weightMinMax[0] = currMin
                    if(currMax > weightMinMax[1]):
                        weightMinMax[1] = currMax
    if(len(epochNumbers)>0):
        epochMinMax = [min(epochNumbers),max(epochNumbers)]
    # round values
    weightMinMax[0] = float("{0:.4f}".format(weightMinMax[0]))
    weightMinMax[1] = float("{0:.4f}".format(weightMinMax[1]))
    return epochMinMax,weightMinMax

def loadWeightsFromFile(filePath,epoch):
    with open(filePath) as json_data:
        d = json.load(json_data)
        epochKey = 'epoch_'+str(epoch)
        return d[epochKey]

if __name__ == "__main__":
    # app.run(debug=True, threaded=True)
    socketio.run(app)
