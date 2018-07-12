"""

"""


def heatmap(layers, layerObjs):
    print("calculating heatmap")
    for i in range(len(layerObjs)-1):
        
        pass

    public startCalculation() {
        // Reset current position to zero
        this.currentPosition = 0;
        this.finishedLayers = 0;
        // Start looping
        this.asyncInterval = setInterval(
            this.calculate.bind(this),
            0
        );
    }

    public calculate() {
        // this.callCounter++;
        // console.log('called ' + this.callCounter + ' times');
        if (this.finishedLayers === this.layerObjs.length - 1) {
            clearInterval(this.asyncInterval);
            this.updatedHeatmapNormalData.emit(this.heatmapNormalData);
            this.updatedHeatmapNodeData.emit(this.heatmapNodeData);
            return;
        }
        // Check that we still have iterations left, otherwise, return
        // out of function without calling a new one.
        if (this.currentPosition >= this.layerObjs.length - 1) { return; }
        // Do computation
        this.doHeavyLifting(this.layerObjs[this.currentPosition].heatmapNodes, this.layerObjs[this.currentPosition + 1].heatmapNodes);

        // Add to counter
        this.currentPosition++;
    }

    private doHeavyLifting(currLN, nextLN) {
        // repeat connectionCount times -> amount of connections per layer
        for (let j = 0; j < currLN.length; j++) {
            for (let k = 0; k < nextLN.length; k++) {
                try {
                    const weightValue = this.layers[this.currentPosition * 2]['weights'][0]
                    [j / this.networkReductionFactor][k / this.networkReductionFactor];
                    this.createConnectionBetweenCurrLayers(currLN[j], nextLN[k], weightValue);
                } catch (error) {
                    console.error('layers', this.layers);
                    console.error('this.currentPosition', this.currentPosition);
                    console.error('j', j);
                    console.error('k', k);
                    break;
                }

            }
            const percentage = Math.round(j / currLN.length * 100);
            if (percentage % 10 === 0) {
                console.log(percentage + ' % Nodes in current Layer done');
            }
        }
        this.finishedLayers++;
        console.log(this.finishedLayers + '/' + this.layerObjs.length + ' Layers done');
        // console.log(this.finishedLayers);
    }

    private createConnectionBetweenCurrLayers(firstNode, secondNode, weightValue) {
        try {
            const heatmapNormalConnections = this.highlightConnection(
                firstNode, secondNode,
                weightValue);
            this.heatmapNormalData = this.heatmapNormalData.concat(heatmapNormalConnections);
            const heatmapNodeConnections = this.highlightNode(
                firstNode, weightValue);
            this.heatmapNodeData = this.heatmapNodeData.concat(heatmapNodeConnections);
        } catch (err) {
            console.log('weightValue', weightValue);
            console.log('err: ', err);
        }
    }

    return heatmapdata


if __name__ == "__main__":
    pass