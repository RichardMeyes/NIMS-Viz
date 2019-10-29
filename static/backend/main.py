from flask import Flask, request
from flask_cors import CORS, cross_origin
from werkzeug.utils import secure_filename

import json
import uuid
import os
import pickle
import datetime

import cv2
import torch
import collections

import neural_network_module as neural_network

import mongo_module as mongo

import ablation

import dataset_loader


# creates a communication channel with mongoDB
DB_CONNECTION = mongo.Mongo("mongodb://localhost:27017/", "networkDB", "networks")
# if gpu with cuda is available set it to it.
DEVICE = neural_network.get_device()

# Model and information about it for not loading everytime the weights from db
################################################################################
MODEL = neural_network.Sequential_Net()
MODEL_DICT = {}
ABLATED_MODEL = neural_network.Sequential_Net()
TEST_ABLATED_MODEL = False
################################################################################

DIGIT_DIR = "../data/digit/"

def change_model(uuid):
    '''
    Changes the Model if the id isn't the same.

    :Parameters:
        uuid: (String) id of the network.
    '''
    global MODEL
    global MODEL_DICT
    if len(MODEL_DICT) > 0:
        if uuid != MODEL_DICT["_id"]:
            MODEL_DICT = DB_CONNECTION.get_item_by_id(uuid)
            MODEL = neural_network.load_model_from_weights(MODEL_DICT, MODEL_DICT["input_dim"])
    else:
        MODEL_DICT = DB_CONNECTION.get_item_by_id(uuid)
        MODEL = neural_network.load_model_from_weights(MODEL_DICT, MODEL_DICT["input_dim"])

# Updates the mongoDB communication channel if production.
def create_db_connection():
    global DB_CONNECTION

    if "env" in os.environ and os.environ["env"] == "prod":
        DB_CONNECTION = mongo.Mongo("mongodb://database:27017/", "networkDB", "networks")


app = Flask(__name__)
CORS(app)

@app.route("/", methods=["GET"])
@cross_origin()
def test():
    create_db_connection()
    return json.dumps("OK")

# Create a new network.
@app.route("/createNetwork", methods=["POST", "OPTIONS"])
@cross_origin()
def createNetwork():
    global MODEL
    global MODEL_DICT
    nnSettings = request.get_json()

    network_name = nnSettings['name']
    input_size = [
        nnSettings['inputSize']["x"], 
        nnSettings['inputSize']["y"], 
        nnSettings['inputSize']["z"]["value"]
        ]

    layers = collections.OrderedDict()
    layers["features"] = []
    layers["classifier"] = []

    for convLayer in nnSettings["convLayers"]:
        if "Pool" in convLayer["type"]:
            layers["features"].append({
                "type": convLayer["type"],
                "kernelSize": convLayer["kernelSize"],
                "stride": convLayer["stride"],
                "activation": convLayer["activation"]
            })
        else:
            layers["features"].append({
                "type": convLayer["type"],
                "inChannel": convLayer['inChannel']['value'],
                "outChannel": convLayer['outChannel']['value'],
                "kernelSize": convLayer["kernelSize"],
                "stride": convLayer["stride"],
                "padding": convLayer["padding"],
                "activation": convLayer["activation"]
            })
    
    for denseLayer in nnSettings["denseLayers"]:
        layers["classifier"].append({
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
        "epoch_0": init_weights,
        "last_modified": datetime.datetime.utcnow().strftime("%Y/%m/%d, %H:%M:%S")
    }

    item_id = DB_CONNECTION.post_item(model_dict)[0]
    MODEL_DICT = DB_CONNECTION.get_item_by_id(str(item_id))
    return json.dumps(MODEL_DICT)

@app.route("/trainNetwork", methods=["POST", "OPTIONS"])
@cross_origin()
def trainNetwork():
    global MODEL
    global MODEL_DICT

    req = request.get_json()
    trainSettings = req["setup"]
    uuid = req["id"]
    
    trainset = dataset_loader.get_dataset_from_torch(trainSettings["dataset"])
    
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
        
    
    epoch_dict.update({
        "epochs": epoch_counter,
        "loss_function": trainSettings["loss"],
        "dataset": trainSettings["dataset"],
        "last_modified": datetime.datetime.utcnow().strftime("%Y/%m/%d, %H:%M:%S")
    })
    
    DB_CONNECTION.update_item(uuid, epoch_dict)
    MODEL_DICT = DB_CONNECTION.get_item_by_id(uuid)
    return json.dumps(MODEL_DICT)


# # Load network's settings
@app.route("/loadNetwork", methods=["POST"])
@cross_origin()
def loadNetwork():
    global MODEL
    global MODEL_DICT
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
    global MODEL
    global MODEL_DICT
    global ABLATED_MODEL 
    global TEST_ABLATED_MODEL 
    
    req = request.get_json()
    uuid = req["networkID"]

    #load model with id if its necessary
    change_model(uuid)

    nn_model = MODEL

    if TEST_ABLATED_MODEL:
        nn_model = ABLATED_MODEL
    
    testset = dataset_loader.get_dataset_from_torch(MODEL_DICT["dataset"], False) #False because we want to use the testdataset
    labels = dataset_loader.get_dataset_classes(testset)
    test_results = neural_network.test_model(nn_model, MODEL_DICT["loss_function"], testset, 64, DEVICE) 

    results = {
        "labels": ["all"] + labels,
        "accuracy": test_results[0],
        "correct_labels": test_results[1].tolist(),
        "accuracy_class": test_results[2].tolist(),
        "class_labels": test_results[3].tolist() }

    return json.dumps(results)

# Ablates layers from a network
@app.route("/ablateNetwork", methods=["POST", "OPTIONS"])
@cross_origin()
def ablateNetwork():
    global MODEL
    global MODEL_DICT
    global ABLATED_MODEL 
    global TEST_ABLATED_MODEL 
    
    req = request.get_json()

    uuid = req["networkID"]
    nodes = req["nodes"]
    
    print(nodes)
    #load model with id if its necessary
    change_model(uuid)
    ABLATED_MODEL = neural_network.load_model_from_weights(MODEL_DICT, MODEL_DICT["input_dim"])

    for node in nodes:
        layer_number = "layer_" + str(node['layerNumber'])
        container = node["containerName"]
        layer_name = MODEL_DICT["epoch_0"][container][layer_number]["settings"]["type"] + str(node['layerNumber'])
        layer_key = container + "." + layer_name
        # the key in the model.state_dict ist container.layer.weight/bias
        for unit in node['ablatedWeights']:
            ablation.ablate_unit(ABLATED_MODEL, layer_key, unit)
    
    TEST_ABLATED_MODEL = True

    return json.dumps("OK")

# Ablates layers from a network
@app.route("/resetAblation", methods=["POST", "OPTIONS"])
@cross_origin()
def resetAblation():
    global TEST_ABLATED_MODEL
    TEST_ABLATED_MODEL = False
    return json.dumps("OK")

# Get TSNE Coordinate
@app.route("/getTSNECoordinate", methods=["GET"])
@cross_origin()
def getTSNECoordinate():
    result = pickle.load(open("../data/tSNE/X_tSNE_10000.p", "rb"))
    return json.dumps(result.tolist())

# Save the free-drawing drawing.
@app.route("/saveDigit", methods=["POST", "OPTIONS"])
@cross_origin()
def saveDigit():
    digit = request.files['digit']

    if digit:
        if not(os.path.exists(DIGIT_DIR)):
            os.mkdir(DIGIT_DIR)

        filename = secure_filename(digit.filename)
        digit.save(os.path.join(DIGIT_DIR, filename))

    return json.dumps("Digit saved.")

# Save the free-drawing drawing.
@app.route("/testDigit", methods=["POST", "OPTIONS"])
@cross_origin()
def testDigit():
    digit = cv2.imread("../data/digit/digit.png", cv2.IMREAD_GRAYSCALE)
    digit = cv2.resize(digit, (28, 28))

    digit = digit / 255.0
    digit[digit == 0] = -1
    digit = torch.from_numpy(digit).float()
    digit = digit.view(-1, 1, 28, 28)

    model = MODEL

    if TEST_ABLATED_MODEL:
        model = ABLATED_MODEL
        
    prediction = model.predict(digit)
    feature_dict = model.visualize_input(digit)
    result = {
        "netOut": prediction,
        "nodesDict": feature_dict
    }
    return json.dumps(result)

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=3000)
