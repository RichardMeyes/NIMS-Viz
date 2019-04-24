export class Playground {
    sources: SelectForm[];
    selectedSource: number;

    batchSizeTest: number;
    batchSizeTrain: number;
    numBatches: number;
    epoch: number;

    convLayers: ConvLayer[];
    fcLayers: number[];

    learningRates: SelectForm[];
    activation: SelectForm[];
    selectedLearningRates: number;


    constructor() {
        this.sources = [
            new SelectForm('MNIST', 'MNIST')
        ];
        this.selectedSource = 0;

        this.batchSizeTest = 64;
        this.batchSizeTrain = 64;
        this.numBatches = 150;
        this.epoch = 5;

        this.convLayers = [
            new ConvLayer(1, 32, 5, 1, 2),
            new ConvLayer(32, 32, 5, 1, 2),
            new ConvLayer(32, 64, 5, 1, 2)
        ];
        this.fcLayers = [20, 15, 10];

        this.learningRates = [
            new SelectForm('0.000001', '0.000001'),
            new SelectForm('0.00001', '0.00001'),
            new SelectForm('0.0001', '0.0001'),
            new SelectForm('0.001', '0.001'),
            new SelectForm('0.01', '0.01'),
            new SelectForm('0.03', '0.03'),
            new SelectForm('0.1', '0.1'),
            new SelectForm('0.3', '0.3'),
            new SelectForm('1', '1'),
            new SelectForm('3', '3'),
            new SelectForm('10', '10')
        ];
        this.activation = [
            new SelectForm('relu', 'Rectified Linear Unit'),
            new SelectForm('softmax', 'Softmax')
        ];
        this.selectedLearningRates = 0;
    }
}

class SelectForm {
    constructor(public value: string, private viewValue: string) { }
}

export class ConvLayer {
    constructor(
        public inChannel: number,
        public outChannel: number,
        public kernelSize: number,
        public stride: number,
        public padding: number
    ) { }
}

// export class TfjsLayer {
//     constructor(
//         public unitCount: number,
//         public activation: string
//     ) { }
// }
