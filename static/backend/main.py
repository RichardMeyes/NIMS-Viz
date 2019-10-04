from flask import Flask, request
from flask_cors import CORS, cross_origin
from werkzeug.utils import secure_filename

import json
import uuid
import os
import pickle

import neural_network_module as neural_network

import mongo_module as mongo

import ablation


# creates a communication channel with mongoDB
# DB_CONNECTION = mongo.Mongo("mongodb://database:27017/", "networkDB", "networks")
DB_CONNECTION = mongo.Mongo("mongodb://localhost:27017/", "networkDB", "networks")
# if gpu with cuda is available set it to it.
DEVICE = neural_network.get_device()

# Model and information about it for not loading everytime the weights from db
################################################################################
MODEL = neural_network.Net()
MODEL_DICT = {}
ABLATED_MODEL = neural_network.Net()
TEST_ABLATED_MODEL = False
################################################################################

def change_model(uuid):
    '''
    Changes the Model if the id isn't the same.

    :Parameters:
        uuid: (String) id of the network.
    '''
    if len(MODEL_DICT) > 0:
        if uuid != MODEL_DICT["_id"]:
            MODEL_DICT = DB_CONNECTION.get_item_by_id(uuid)
            MODEL = neural_network.load_model_from_weights(MODEL_DICT, MODEL_DICT["input_dim"])


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

    network_name = nnSettings['name']
    input_size = [
        nnSettings['inputSize']["x"], 
        nnSettings['inputSize']["y"], 
        nnSettings['inputSize']["z"]["value"]
        ]
    layers = []

    for convLayer in nnSettings["convLayers"]:
        if "Pool" in convLayer["type"]:
            layers.append({
                "type": convLayer["type"],
                "kernelSize": convLayer["kernelSize"],
                "stride": convLayer["stride"],
                "activation": convLayer["activation"]
            })
        else:
            layers.append({
                "type": convLayer["type"],
                "inChannel": convLayer['inChannel']['value'],
                "outChannel": convLayer['outChannel']['value'],
                "kernelSize": convLayer["kernelSize"],
                "stride": convLayer["stride"],
                "padding": convLayer["padding"],
                "activation": convLayer["activation"]
            })
    
    for denseLayer in nnSettings["denseLayers"]:
        layers.append({
            "type": denseLayer["type"],
            "outChannel": denseLayer["size"],
            "activation": denseLayer["activation"]
        })
    
    MODEL = neural_network.create_model(input_size, layers)
    init_weights = neural_network.get_weights(MODEL)

    model_dict = {
        "name": network_name,
        "epochs": 0,
        "input_dim": input_size,
        "epoch_0": init_weights
    }

    item_id = DB_CONNECTION.post_item(model_dict)[0]
    MODEL_DICT = DB_CONNECTION.get_item_by_id(str(item_id))
    return json.dumps(MODEL_DICT)

@app.route("/trainNetwork", methods=["POST", "OPTIONS"])
@cross_origin()
def trainNetwork():
    # have to be changed!!! trainset has to be variable
    import torchvision
    import torchvision.transforms as transforms

    transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize((0.5,), (0.5,))])
    trainset = torchvision.datasets.MNIST(root='../data', train=True, download=True, transform=transform)
    # #################################################
    req = request.get_json()
    trainSettings = req["setup"]
    uuid = req["id"]
    
    #load model with id if its necessary
    change_model(uuid)

    train_history = neural_network.train_model(
        MODEL,
        trainSettings["epochs"],
        trainSettings["loss"],
        trainSettings["optimizer"],
        trainset,
        trainSettings["batchSize"],
        trainSettings["learningrate"],
        DEVICE
    )

    epoch_counter = MODEL_DICT["epochs"]
    epoch_dict = {}
    for ep in train_history:
        epoch_counter += 1
        epoch_dict["epoch_" + str(epoch_counter)] = ep
        
    
    epoch_dict.update({"epochs": epoch_counter})

    epoch_dict.update({"loss_function": trainSettings["loss"]})
    
    DB_CONNECTION.update_item(uuid, epoch_dict)
    MODEL_DICT = DB_CONNECTION.get_item_by_id(uuid)
    return json.dumps(MODEL_DICT)


# # Load network's settings
@app.route("/loadNetwork", methods=["POST"])
@cross_origin()
def loadNetwork():
    req = request.get_json()
    uuid = req["uuid"]

    #load model with id if its necessary
    change_model(uuid)

    return json.dumps(MODEL_DICT)

# Get list of saved networks.
@app.route("/getSavedNetworks", methods=["GET", "OPTIONS"])
@cross_origin()
def getSavedNetworks():
    item = DB_CONNECTION.get_all_attributes(["id", "name"])
    
    return json.dumps(item)

# Test trained network.
@app.route("/testNetwork", methods=["POST", "OPTIONS"])
@cross_origin()
def testNetwork():
    
    params = request.get_json()
    print(params)
    return json.dumps("OK")

# Ablates layers from a network
@app.route("/ablateNetwork", methods=["POST", "OPTIONS"])
@cross_origin()
def ablateNetwork():
    
    req = request.get_json()

    uuid = req["networkID"]
    nodes = req["nodes"]
    
    #load model with id if its necessary
    change_model(uuid)
    ABLATED_MODEL = neural_network.load_model_from_weights(MODEL_DICT, MODEL_DICT["input_dim"])

    for node in nodes:
        layer_number = "layer_" + node['layerNumber']
        layer_type = MODEL_DICT["epoch_0"][layer_number]["settings"]["type"]
        for unit in node['ablatedWeights']:
            ablation.ablate_unit(ABLATED_MODEL, layer_type, unit)
    
    TEST_ABLATED_MODEL = True

    return json.dumps("OK")

#     convLayers = params['nnSettings']["convLayers"]
#     conv_layers = list(map(lambda x: {
#         'kernelSize': x['kernelSize'],
#         'stride': x['stride'],
#         'padding': x['padding'],
#         'inChannel': x['inChannel']['value'],
#         'outChannel': x['outChannel']['value']
#         }, convLayers))
#     denseLayers = params['nnSettings']['denseLayers']
#     layers = list(map(lambda x: x['size'], denseLayers))

#     topology = {
#         'conv_layers': conv_layers,
#         'layers': layers
#     }
#     filename = params['filename']
#     ko_layers = params['koLayers']
#     ko_units = params['koUnits']

#     acc, correct_labels, acc_class, class_labels = MLP.mlp_ablation(topology, filename, ko_layers, ko_units)

#     result = {
#         "labels": ['All', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
#         "classLabels": class_labels.tolist(),
#         "averageAccuracy": acc,
#         "classSpecificAccuracy": acc_class.tolist(),
#         "colorLabels": correct_labels.tolist()
#     }

#     return json.dumps(result)

# Get TSNE Coordinate
@app.route("/getTSNECoordinate", methods=["GET"])
@cross_origin()
def getTSNECoordinate():
    result = pickle.load(open("../data/tSNE/X_tSNE_10000.p", "rb"))
    return json.dumps(result.tolist())

# # Save the free-drawing drawing.
# @app.route("/saveDigit", methods=["POST", "OPTIONS"])
# @cross_origin()
# def saveDigit():
#     digit = request.files['digit']

#     if digit:
#         if not(os.path.exists(DIGIT_DIR)):
#             os.mkdir(DIGIT_DIR)

#         filename = secure_filename(digit.filename)
#         digit.save(os.path.join(DIGIT_DIR, filename))

#     return json.dumps("Digit saved.")

# # Save the free-drawing drawing.
# @app.route("/testDigit", methods=["POST", "OPTIONS"])
# @cross_origin()
# def testDigit():
#     params = request.get_json()

#     convLayers = params['nnSettings']["convLayers"]
#     conv_layers = list(map(lambda x: {
#         'kernelSize': x['kernelSize'],
#         'stride': x['stride'],
#         'padding': x['padding'],
#         'inChannel': x['inChannel']['value'],
#         'outChannel': x['outChannel']['value']
#         }, convLayers))
#     denseLayers = params['nnSettings']['denseLayers']
#     layers = list(map(lambda x: x['size'], denseLayers))

#     topology = {
#         'conv_layers': conv_layers,
#         'layers': layers
#     }
#     filename = params['filename']
#     ko_layers = params['koLayers']
#     ko_units = params['koUnits']

#     net_out, nodes_dict = MLP.test_digit(topology, filename, ko_layers, ko_units)
#     result = {
#         "netOut": net_out,
#         "nodesDict": nodes_dict
#     }
    
#     return json.dumps(result)

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=3000)
