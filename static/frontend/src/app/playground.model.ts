export class Playground {
    problems: SelectForm[];

    // polynomial-regression
    numOfIteration: number;
    learningRates: SelectForm[];
    optimizers: SelectForm[];


    // mnist
    layers: TfjsLayer[];

    activation: SelectForm[];
    kernelInitializer: SelectForm[];
    loss: SelectForm[];
    metrics: SelectForm[];

    layerCount: number;
    mnistLayers: TfjsLayer[];

    constructor() {
        this.problems = [
            new SelectForm("polynomial-regression", "Polynomial Regression"),
            new SelectForm("mnist", "MNIST")
        ];


        // polynomial-regression
        this.numOfIteration = 75;
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
        this.optimizers = [
            new SelectForm("sgd", "Stochastic Gradient Descent"),
            new SelectForm("momentum", "Momentum"),
            new SelectForm("adagrad", "Adagrad"),
            new SelectForm("adadelta", "Adadelta"),
            new SelectForm("adam", "Adam"),
            new SelectForm("adamax", "AdaMax"),
            new SelectForm("rmsprop", "RMSprop")
        ];


        // mnist
        this.layers = [
            new TfjsLayer(new SelectForm("convolutional", "Convolutional"), [
                new TfjsLayerItem(new SelectForm("conv2d", "2D Convolutional"), false, {})
            ]),
            new TfjsLayer(new SelectForm("pooling", "Pooling"), [
                new TfjsLayerItem(new SelectForm("maxPooling2d", "2D Max Pooling"), false, {})
            ]),
            new TfjsLayer(new SelectForm("basic", "Basic"), [
                new TfjsLayerItem(new SelectForm("flatten", "Flatten"), false, {}),
                new TfjsLayerItem(new SelectForm("dense", "Dense"), false, {})
            ])
        ];

        this.layerCount = 6;
        this.mnistLayers = [
            new TfjsLayer(new SelectForm("convolutional", "Convolutional"), [
                new TfjsLayerItem(new SelectForm("conv2d", "2D Convolutional"), true, {
                    inputShape: [28, 28, 1],
                    kernelSize: 5,
                    filters: 8,
                    strides: 1,
                    activation: 'relu',
                    kernelInitializer: 'varianceScaling'
                })
            ]),
            new TfjsLayer(new SelectForm("pooling", "Pooling"), [
                new TfjsLayerItem(new SelectForm("maxPooling2d", "2D Max Pooling"), false, {
                    poolSize: [2, 2],
                    strides: [2, 2]
                })
            ]),
            new TfjsLayer(new SelectForm("convolutional", "Convolutional"), [
                new TfjsLayerItem(new SelectForm("conv2d", "2D Convolutional"), false, {
                    kernelSize: 5,
                    filters: 16,
                    strides: 1,
                    activation: 'relu',
                    kernelInitializer: 'varianceScaling'
                })
            ]),
            new TfjsLayer(new SelectForm("pooling", "Pooling"), [
                new TfjsLayerItem(new SelectForm("maxPooling2d", "2D Max Pooling"), false, {
                    poolSize: [2, 2],
                    strides: [2, 2]
                })
            ]),
            new TfjsLayer(new SelectForm("basic", "Basic"), [
                new TfjsLayerItem(new SelectForm("flatten", "Flatten"), false, {})
            ]),
            new TfjsLayer(new SelectForm("basic", "Basic"), [
                new TfjsLayerItem(new SelectForm("dense", "Dense"), false, {
                    units: 10,
                    activation: 'softmax',
                    kernelInitializer: 'varianceScaling'
                })
            ])
        ];
    }
}

class SelectForm {
    constructor(public value: string, private viewValue: string) { }
}

class TfjsLayer {
    constructor(public layerGroup: SelectForm, public layerItem: TfjsLayerItem[]) { }
}

class TfjsLayerItem {
    constructor(public layerType: SelectForm, public isInput: boolean, public layerItemConfiguration: any) { }
}