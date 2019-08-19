from flask import Flask, request
from flask_cors import CORS, cross_origin

import json
import uuid
import os
import pickle

import static.backend.MLP as MLP

TOPOLOGY_DIR = "static/data/topologies/"
WEIGHTS_DIR = "static/data/weights/"

app = Flask(__name__)
CORS(app)

@app.route("/", methods=["GET"])
@cross_origin()
def test():
    return json.dumps("OK")

# Create a new network.
@app.route("/createNetwork", methods=["POST", "OPTIONS"])
@cross_origin()
def createNetwork():
    nnSettings = request.get_json()

    filename = saveNetwork(nnSettings)

    batch_size_train = nnSettings['configurations']['batchTrain']
    batch_size_test = nnSettings['configurations']['batchTest']
    num_epochs = nnSettings['configurations']['epoch']
    learning_rate = nnSettings['configurations']['learningRate']

    convLayers = nnSettings["convLayers"]
    conv_layers = list(map(lambda x: {
        'kernelSize': x['kernelSize'],
        'stride': x['stride'],
        'padding': x['padding'],
        'inChannel': x['inChannel']['value'],
        'outChannel': x['outChannel']['value']
        }, convLayers))
    denseLayers = nnSettings['denseLayers']
    layers = list(map(lambda x: x['size'], denseLayers))

    MLP.mlp(filename, batch_size_train, batch_size_test, num_epochs, learning_rate, conv_layers, layers)

    return json.dumps("MLP_" + filename + ".json")

# Save network's settings
def saveNetwork(nnSettings):
    filename = str(uuid.uuid4())

    with open(TOPOLOGY_DIR + "MLP_" + filename + ".json", "w") as f:
        json.dump(nnSettings, f)

    return filename

# Load network's settings
@app.route("/loadNetwork", methods=["POST"])
@cross_origin()
def loadNetwork():
    params = request.get_json()
    filename = params['filename']

    nnSettings = json.load(open(TOPOLOGY_DIR + filename))

    return json.dumps(nnSettings)

# Load network's weights.
@app.route("/loadWeights", methods=["POST"])
@cross_origin()
def loadWeights():
    params = request.get_json()
    filename = params['filename']

    nnWeights = json.load(open(WEIGHTS_DIR + filename))

    return json.dumps(nnWeights)

# Get list of saved networks.
@app.route("/getSavedNetworks", methods=["GET", "OPTIONS"])
@cross_origin()
def getSavedNetworks():
    validFiles = []

    for subdir, dirs, files in os.walk(WEIGHTS_DIR):
        for currFile in files:
            untrainedFile = currFile.replace('.json', '_untrained.json')

            if not 'untrained' in currFile and \
            os.path.exists(WEIGHTS_DIR + untrainedFile) and \
            os.path.exists(TOPOLOGY_DIR + currFile):
                nnSettings = json.load(open(TOPOLOGY_DIR + currFile))
                indexedObj = {'fileName': currFile, 'nnSettings': nnSettings}
                validFiles.append(indexedObj)
    
    return json.dumps(validFiles)

# Test trained network.
@app.route("/testNetwork", methods=["POST", "OPTIONS"])
@cross_origin()
def testNetwork():
    params = request.get_json()

    convLayers = params['nnSettings']["convLayers"]
    conv_layers = list(map(lambda x: {
        'kernelSize': x['kernelSize'],
        'stride': x['stride'],
        'padding': x['padding'],
        'inChannel': x['inChannel']['value'],
        'outChannel': x['outChannel']['value']
        }, convLayers))
    denseLayers = params['nnSettings']['denseLayers']
    layers = list(map(lambda x: x['size'], denseLayers))

    topology = {
        'conv_layers': conv_layers,
        'layers': layers
    }
    filename = params['filename']
    ko_layers = params['koLayers']
    ko_units = params['koUnits']

    acc, correct_labels, acc_class, class_labels = MLP.mlp_ablation(topology, filename, ko_layers, ko_units)

    result = {
        "labels": ['All', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
        "classLabels": class_labels.tolist(),
        "averageAccuracy": acc,
        "classSpecificAccuracy": acc_class.tolist(),
        "colorLabels": correct_labels.tolist()
    }

    return json.dumps(result)

@app.route("/getTSNECoordinate", methods=["GET"])
@cross_origin()
def getTSNECoordinate():
    result = pickle.load(open("static/data/tSNE/X_tSNE_10000.p", "rb"))
    return json.dumps(result.tolist())

if __name__ == "__main__":
    app.run(debug=True)