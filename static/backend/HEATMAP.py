"""

"""

heatmapNormalData = []
heatmapNodeData = []
density = 5

def heatmap(layers, layerObjs):
    """
    notes: layerobjs vllt im backend erzeugen und nur die config in separater config zum server schicken
    dann würde methode "divideIntoLayerAreas" im backend ausgeführt
    """
    print("calculating heatmap")
    heatmapdata = {}
    for i in range(0,len(layerObjs)-1):
        currLN = layerObjs[i].heatmapNodes
        nextLN = layerObjs[i + 1].heatmapNodes
        # repeat connectionCount times -> amount of connections per layer
        for j in range(0,len(currLN)):
            # print('Progress: ' + (j * 100.0 / len(currLN) + '%')
            for k in range(0,len(nextLN)):
                weightValue = layers[i * 2]['weights'][0][j][k]
                createConnectionBetweenCurrLayers(currLN[j], nextLN[k], weightValue)
    
    heatmapdata['heatmapNormalData'] = heatmapNormalData
    heatmapdata['heatmapNodeData'] = heatmapNodeData
    return heatmapdata


def createConnectionBetweenCurrLayers(firstNode, secondNode, weightValue):
    heatmapNormalConnections = highlightConnection(firstNode, secondNode, weightValue)
    heatmapNormalData.append(heatmapNormalConnections)
    heatmapNodeConnections = highlightNode(firstNode, weightValue)
    heatmapNodeData.append(heatmapNodeConnections)


def highlightConnection(currNode, nextNode, value):
        tempHeatmapEdges = []
        # ignore the first and last point because those are in the nodes itself
        for i in range(1,density):
            tempx = currNode[0] + i / density * (nextNode[0] - currNode[0])
            tempy = currNode[1] + i / density * (nextNode[1] - currNode[1])
            # value should change here
            tempHeatmapEdges.append([tempx, tempy, value])

        return tempHeatmapEdges

def highlightNode(currNode, value):
        tempHeatmapEdges = []
        tempx = currNode[0]
        tempy = currNode[1]
        tempHeatmapEdges.append([tempx, tempy, value])
        return tempHeatmapEdges


if __name__ == "__main__":
    pass