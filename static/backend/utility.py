import json

def getEpochAndWeightLimitsFromFile(filePath):
    epochMinMax = [0,0]
    epochNumbers = []
    weightMinMax = [0,0]
    with open(filePath) as json_data:
        d = json.load(json_data)
        for key in d:
            if(key.find('epoch') != -1):
                epochNumbers.append(int(key[6:]))
                getWeightsFromEpoch(d[key],weightMinMax)
    if(len(epochNumbers)>0):
        epochMinMax = [min(epochNumbers),max(epochNumbers)]
    # round values
    weightMinMax[0] = float("{0:.4f}".format(weightMinMax[0]))
    weightMinMax[1] = float("{0:.4f}".format(weightMinMax[1]))
    return epochMinMax,weightMinMax

def getWeightsFromEpoch(epoch, startMinMax):
    for key in epoch:
        if(not key.startswith("c") and key != "h0"):
            # print('key sind auch die input output values? die duerfen nicht in min/max einberechnet werden oder?')
            # print(key)
            # min and max used twice because of nested values
            currMin = min(min(epoch[key]))
            currMax = max(max(epoch[key]))
            if(currMin < startMinMax[0]):
                startMinMax[0] = currMin
            if(currMax > startMinMax[1]):
                startMinMax[1] = currMax
    return startMinMax

def loadWeightsFromFile(filePath,epoch):
    with open(filePath) as json_data:
        d = json.load(json_data)
        epochKey = 'epoch_'+str(epoch)
        return d[epochKey]

if __name__ == "__main__":
    pass