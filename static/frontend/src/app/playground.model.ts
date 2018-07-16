export class Playground {
    batchSize: number;
    numBatches: number;
    epoch: number;

    mnistLayers: TfjsLayer[];

    learningRates: SelectForm[];
    activation: SelectForm[];

    layerCount: number;

    constructor() {
        this.batchSize = 64;
        this.numBatches = 150;
        this.epoch = 1000;

        this.mnistLayers = [
            new TfjsLayer(20, "relu"),
            new TfjsLayer(15, "relu"),
            new TfjsLayer(10, "relu")
        ];

        this.learningRates = [
            new SelectForm("0.0001", "0.0001"),
            new SelectForm("0.001", "0.001"),
            new SelectForm("0.01", "0.01"),
            new SelectForm("0.03", "0.03"),
            new SelectForm("0.1", "0.1"),
            new SelectForm("0.3", "0.3"),
            new SelectForm("1", "1"),
            new SelectForm("3", "3"),
            new SelectForm("10", "10")
        ];
        this.activation = [
            new SelectForm("relu", "Rectified Linear Unit"),
            new SelectForm("softmax", "Softmax")
        ];

        this.layerCount = this.mnistLayers.length;
    }
}

class SelectForm {
    constructor(public value: string, private viewValue: string) { }
}

export class TfjsLayer {
    constructor(
        public unitCount: number,
        public activation: string
    ) { }
}