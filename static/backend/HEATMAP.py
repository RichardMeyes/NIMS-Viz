"""
author carsten demming
"""

import math
import random

class Singleton(type):
    _instances = {}
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]

class Heatmap(metaclass=Singleton):

    def __init__(self):
        self.density = 5
        self.angle = 130.0
        self.radiusInner = 100
        self.radiusOuter = 230
        self.radiusRange = self.radiusOuter - self.radiusInner
        self.pointcenter = [438.669, 650.677]
        self.pointOffset = 10.0
        self.heatmapCanvasResolution = 1.0 # 8.0;
        self.heatmapCanvasHeight = 1024 * self.heatmapCanvasResolution
        self.layerObjs = []


    def heatmapFromWeights(self, weightsObj, weightMinMax, drawFully, createNewNodeCoordinates, density):
        #print("calculating heatmap from weights")
        # weightsobj structure => {'input':[[]],'epoch_1':[[]],...}
        self.density = int(density)
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
        if(createNewNodeCoordinates):
            self.layerObjs = self.createNetworkStruct(weightsObj,keyArray)

        heatmapdata = {}
        addedFirstLayerNodesAlready = False
        intesityForNodeInSingleView = 1.0
        for epochLayer in range(1,len(keyArray)):
            lastLN = self.layerObjs[epochLayer - 1]['heatmapNodes']
            currLN = self.layerObjs[epochLayer]['heatmapNodes']
            # repeat connectionCount times -> amount of connections per layer
            for currNodeIndex in range(0,len(currLN)):
                heatmapNodeConnections = self.highlightNode(currLN[currNodeIndex], intesityForNodeInSingleView)
                heatmapNodeData.extend(heatmapNodeConnections)
                # print('Progress: ' + (j * 100.0 / len(currLN) + '%')
                for lastNodeIndex in range(0,len(lastLN)):
                    if(not addedFirstLayerNodesAlready):
                        heatmapNodeLastConnections = self.highlightNode(lastLN[lastNodeIndex],intesityForNodeInSingleView)
                        heatmapNodeData.extend(heatmapNodeLastConnections)
                    weightValue = weightsObj[keyArray[epochLayer]][currNodeIndex][lastNodeIndex]
                    heatmapNormalConnections = self.highlightConnection(
                        currLN[currNodeIndex], lastLN[lastNodeIndex],
                        weightValue, isFullyDrawn)
                    heatmapNormalData.extend(heatmapNormalConnections)
                    
                addedFirstLayerNodesAlready = True
        
        # convert weights to percentages
        diff = abs(weightMinMax[1] - weightMinMax[0])
        for i in range(len(heatmapNormalData)):
            heatmapNormalData[i][2] = (heatmapNormalData[i][2]-weightMinMax[0])/diff
        for i in range(len(heatmapNodeData)):
            heatmapNodeData[i][2] = (heatmapNodeData[i][2]-weightMinMax[0])/diff

        heatmapdata['heatmapNormalData'] = heatmapNormalData
        heatmapdata['heatmapNodeData'] = heatmapNodeData
        # print('heatmapNormalData', heatmapNormalData[int(len(heatmapNormalData)/2)-1])
        #print('calculation done')
        return heatmapdata

    def highlightConnection(self,currNode, lastNode, value, isFullyDrawn):
            tempHeatmapEdges = []
            if(isFullyDrawn):
                for i in range(0,self.density+1):
                    tempx = 1.0 * currNode[0] + (i * 1.0 / (1.0 * self.density)) * (lastNode[0] - currNode[0])
                    tempy = 1.0 * currNode[1] + (i * 1.0 / (1.0 * self.density)) * (lastNode[1] - currNode[1])
                    tempHeatmapEdges.append([tempx, tempy, value])
            else:
                # ignore the first and last point because those are in the nodes itself
                for i in range(1,self.density):
                    tempx = 1.0 * currNode[0] + (i * 1.0 / (1.0 * self.density)) * (lastNode[0] - currNode[0])
                    tempy = 1.0 * currNode[1] + (i * 1.0 / (1.0 * self.density)) * (lastNode[1] - currNode[1])
                    tempHeatmapEdges.append([tempx, tempy, value])


            return tempHeatmapEdges

    def highlightNode(self, currNode, value):
            tempHeatmapEdges = []
            tempx = currNode[0]
            tempy = currNode[1]
            tempHeatmapEdges.append([tempx, tempy, value])
            return tempHeatmapEdges

    def createNetworkStruct(self, weightsObj,keyArray):
        # anzahl layer
        layercount = len(weightsObj.keys())
        angleSpan = 150.0
        areaPartAngle = angleSpan / layercount
        layerObjsTemp = []
        for i in range(0,layercount):
            layerObjTemp = {
                'layerID': i,
                'size': 1.0 / (len(weightsObj[keyArray[i]]) * 2 + 1), # nodes + free spaces in between + one freespace
                'nodeCount': len(weightsObj[keyArray[i]]),
                'layerAngle': 180.0 - (areaPartAngle * i), # angle of the entire layer
                'nodesAngle': 180 - ((areaPartAngle * i) - 0.5 * areaPartAngle) # angle bisector from layerpart
            }
            layerObjTemp['heatmapNodes'] = self.createNodeCoordinates(layerObjTemp)
            layerObjsTemp.append(layerObjTemp)
        return layerObjsTemp

    def createNodeCoordinates(self, layer):
        # definiere einen kreis mit mittelpunkt des knotens und radius % der gesamtlaenge des alphamap zwischenraumes
        diameterOfNodes = self.radiusRange * layer['size']
        radiusOfNodes = diameterOfNodes / 2.0
        tempHeatmapNodes = []
        layerOffset = self.calcOffsetBasedOnAngle(layer['nodesAngle'])
        for i in range(1,layer['nodeCount']+1): # Achtung <=
            # radiusInner as minimum offset + nodesizes * i + radius to get to the center of the current node
            radiusToCenterOfNode = self.radiusInner + diameterOfNodes * i + radiusOfNodes
            randomOffsetX = (random.random() * self.pointOffset) - self.pointOffset/2.0
            randomOffsetY = (random.random() * self.pointOffset) - self.pointOffset/2.0
            xCenter = radiusToCenterOfNode * math.cos(layer['nodesAngle'] * (math.pi / 180)) + randomOffsetX
            yCenter = radiusToCenterOfNode * math.sin(layer['nodesAngle'] * (math.pi / 180)) + randomOffsetY
            centerOfNode = [xCenter + self.pointcenter[0] - layerOffset, self.heatmapCanvasHeight - (yCenter + self.pointcenter[1])]
            # expand around point. this will be the reference to
            tempHeatmapNodes.append(centerOfNode)
        return tempHeatmapNodes

    def calcOffsetBasedOnAngle(self, angle):
        offset = 0
        if (angle > 170):
            offset = 20
        else:
            offset = 0
        return offset

#if __name__ == "__main__":
 #   pass
