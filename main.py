from flask import Flask, request, send_from_directory
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
    num_batches = params['num_batches']
    batch_size = params['batch_size']
    num_epochs = params['num_epochs']

    return_obj = {
        "result":
        MLP.mlp(layers, learning_rate, num_batches, batch_size, num_epochs)
    }

    return json.dumps(return_obj)


@app.route("/calc/heatmap", methods=["POST", "OPTIONS"])
@cross_origin()
def calcHeatmap():
    """layers, layerObjs"""
    params = request.get_json()
    #print(params)
    print('after params')


    return json.dumps(HEATMAP.heatmap(params['layers'], params['layerObjs']))

@app.route("/setup/filesearch", methods=["GET", "OPTIONS"])
@cross_origin()
def indexFolders():
    """go through folders and scan for heatmaps"""

    print('SERVER DEBUG: indexFolders...')

    path = "./static/data"
    validFiles = []

    print('os.walk(path) ',os.walk(path))

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
                epochMinMax = getEpochsFromFile(pathName)
            else:
                continue

            indexedObj = {'fileName': currFile, 'values': fileNameValues, 'pathName': pathName, 'epochMinMax':epochMinMax}
            validFiles.append(indexedObj)
    
    return json.dumps({'result':validFiles})

def getEpochsFromFile(filePath):
    epochMinMax = [0,0]
    epochNumbers = []
    with open(filePath) as json_data:
        d = json.load(json_data)
        for key in d:
            if(key.find('epoch') != -1):
                epochNumbers.append(key[6:])
            print('key:')
            print(key)
    if(len(epochNumbers)>0):
        epochMinMax = [min(epochNumbers),max(epochNumbers)]
    return epochMinMax

if __name__ == "__main__":
    app.run(debug=True, threaded=True)
