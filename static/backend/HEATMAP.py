"""

"""

import math
import random

density = 5
angle = 130.0
radiusInner = 100
radiusOuter = 230
radiusRange = radiusOuter - radiusInner
pointcenter = [438.669, 650.677]
heatmapCanvasResolution = 1.0 # 8.0;
heatmapCanvasHeight = 1024 * heatmapCanvasResolution

def heatmapFromWeights(weightsObj, drawFully):
    print("calculating heatmap from weights")
    isFullyDrawn = drawFully
    heatmapNormalData = []
    heatmapNodeData = []
    # create keyarray
    keyArray = []
    for key in weightsObj:
        if(key.find('h') != -1):
            keyArray.append(key)
    keyArray = sorted(keyArray)
    keyArray = ['input']+keyArray+['output']
    layerObjs = createNetworkStruct(weightsObj,keyArray)

    heatmapdata = {}
    weightValueMin = 0
    weightValueMax = 0
    for i in range(1,len(keyArray)):
        lastLN = layerObjs[i - 1]['heatmapNodes']
        currLN = layerObjs[i]['heatmapNodes']
        # nextLN = layerObjs[i + 1]['heatmapNodes']
        # repeat connectionCount times -> amount of connections per layer
        for j in range(0,len(currLN)):
            # print('Progress: ' + (j * 100.0 / len(currLN) + '%')
            for k in range(0,len(lastLN)):
                try:
                    weightValue = weightsObj[keyArray[i]][j][k]
                    if(weightValue < weightValueMin):
                        weightValueMin = weightValue
                    elif(weightValue > weightValueMax):
                        weightValueMax = weightValue
                    heatmapNormalConnections, heatmapNodeConnections = createConnectionBetweenCurrLayers(currLN[j], lastLN[k], weightValue, isFullyDrawn)
                    heatmapNormalData.extend(heatmapNormalConnections)
                    heatmapNodeData.extend(heatmapNodeConnections)

                except Exception:
                    print('i: ' + str(i) + ' j: ' +str(j)+ ' k: '+str(k))
    
    # convert weights to percentages
    for i in range(len(heatmapNormalData)):
        heatmapNormalData[i][2] = (heatmapNormalData[i][2]-weightValueMin)/abs(weightValueMax - weightValueMin)
    for i in range(len(heatmapNodeData)):
        heatmapNodeData[i][2] = (heatmapNodeData[i][2]-weightValueMin)/abs(weightValueMax - weightValueMin)

    heatmapdata['heatmapNormalData'] = heatmapNormalData
    heatmapdata['heatmapNodeData'] = heatmapNodeData
    heatmapdata['weightValueMin'] = weightValueMin
    heatmapdata['weightValueMax'] = weightValueMax
    print('calculation done')
    return heatmapdata

def createConnectionBetweenCurrLayers(firstNode, secondNode, weightValue, isFullyDrawn):
    heatmapNormalConnections = highlightConnection(firstNode, secondNode, weightValue, isFullyDrawn)
    heatmapNodeConnections = highlightNode(firstNode, weightValue)
    return heatmapNormalConnections, heatmapNodeConnections


def highlightConnection(currNode, nextNode, value, isFullyDrawn):
        tempHeatmapEdges = []
        if(isFullyDrawn):
            # ignore the first and last point because those are in the nodes itself
            for i in range(0,density+1):
                tempx = 1.0 * currNode[0] + (i * 1.0 / (1.0 * density)) * (nextNode[0] - currNode[0])
                tempy = 1.0 * currNode[1] + (i * 1.0 / (1.0 * density)) * (nextNode[1] - currNode[1])
                # value should change here
                tempHeatmapEdges.append([tempx, tempy, value])
        else:
            # ignore the first and last point because those are in the nodes itself
            for i in range(1,density):
                tempx = 1.0 * currNode[0] + (i * 1.0 / (1.0 * density)) * (nextNode[0] - currNode[0])
                tempy = 1.0 * currNode[1] + (i * 1.0 / (1.0 * density)) * (nextNode[1] - currNode[1])
                # value should change here
                tempHeatmapEdges.append([tempx, tempy, value])


        return tempHeatmapEdges

def highlightNode(currNode, value):
        tempHeatmapEdges = []
        tempx = currNode[0]
        tempy = currNode[1]
        tempHeatmapEdges.append([tempx, tempy, value])
        return tempHeatmapEdges

def createNetworkStruct(weightsObj,keyArray):
    # anzahl layer
    layercount = len(weightsObj.keys())
    angleSpan = 150.0
    areaPartAngle = angleSpan / layercount
    layerObjs = []
    for i in range(0,layercount):
        layerObj = {
            'layerID': i,
            'size': 1.0 / (len(weightsObj[keyArray[i]]) * 2 + 1), # nodes + free spaces in between + one freespace
            'nodeCount': len(weightsObj[keyArray[i]]),
            'layerAngle': 180.0 - (areaPartAngle * i), # angle of the entire layer
            'nodesAngle': 180 - ((areaPartAngle * i) - 0.5 * areaPartAngle) # angle bisector from layerpart
        }
        layerObj['heatmapNodes'] = createNodeCoordinates(layerObj)
        layerObjs.append(layerObj)
    return layerObjs

def createNodeCoordinates(layer):
    # definiere einen kreis mit mittelpunkt des knotens und radius % der gesamtlaenge des alphamap zwischenraumes
    diameterOfNodes = radiusRange * layer['size']
    radiusOfNodes = diameterOfNodes / 2.0
    tempHeatmapNodes = []
    layerOffset = calcOffsetBasedOnAngle(layer['nodesAngle'])
    for i in range(1,layer['nodeCount']+1): # Achtung <=
        # radiusInner as minimum offset + nodesizes * i + radius to get to the center of the current node
        radiusToCenterOfNode = radiusInner + diameterOfNodes * i + radiusOfNodes
        randomOffsetX = (random.random() * 20) - 10
        randomOffsetY = (random.random() * 20) - 10
        xCenter = radiusToCenterOfNode * math.cos(layer['nodesAngle'] * (math.pi / 180)) + randomOffsetX
        yCenter = radiusToCenterOfNode * math.sin(layer['nodesAngle'] * (math.pi / 180)) + randomOffsetY
        centerOfNode = [xCenter + pointcenter[0] - layerOffset, heatmapCanvasHeight - (yCenter + pointcenter[1])]
        # expand around point. this will be the reference to
        tempHeatmapNodes.append(centerOfNode)
    return tempHeatmapNodes

def calcOffsetBasedOnAngle(angle):
    offset = 0
    if (angle > 170):
        offset = 20
    else:
        offset = 0
    return offset

#if __name__ == "__main__":
 #   pass
