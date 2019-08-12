from flask import Flask, request
from flask_cors import CORS, cross_origin

import json
import uuid

import static.backend.MLP as MLP

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

    with open("static/data/topologies/MLP_" + filename + ".json", "w") as f:
        json.dump(nnSettings, f)

    return filename

# Load network's settings
@app.route("/loadNetwork", methods=["POST"])
@cross_origin()
def loadNetwork():
    params = request.get_json()
    filename = params['filename']

    nnSettings = json.load(open("static/data/topologies/" + filename))

    return json.dumps(nnSettings)

if __name__ == "__main__":
    app.run(debug=True)