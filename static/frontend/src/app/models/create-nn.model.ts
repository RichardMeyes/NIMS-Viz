// export class CreateNN {
//     sources: SelectForm[];
//     selectedSource: number;

//     batchSizeTest: number;
//     batchSizeTrain: number;
//     numBatches: number;
//     epoch: number;

//     firstChannel: number;
//     lastChannel: number;
//     commonChannels: number[];

//     convLayers: ConvLayer[];
//     fcLayers: number[];

//     learningRates: SelectForm[];
//     activation: SelectForm[];
//     selectedLearningRates: number;


//     constructor() {
//         this.sources = [
//             new SelectForm('MNIST', 'MNIST')
//         ];
//         this.selectedSource = 0;

//         this.batchSizeTest = 64;
//         this.batchSizeTrain = 64;
//         this.numBatches = 150;
//         this.epoch = 5;

//         this.firstChannel = 1;
//         this.lastChannel = 64;
//         this.commonChannels = [32, 32];

//         // this.convLayers = [
//         //     new ConvLayer(this.firstChannel, this.commonChannels[0], 5, 1, 2),
//         //     new ConvLayer(this.commonChannels[0], this.commonChannels[1], 5, 1, 2),
//         //     new ConvLayer(this.commonChannels[1], this.lastChannel, 5, 1, 2)
//         // ];
//         // this.fcLayers = [20, 15, 10];

//         this.learningRates = [
//             new SelectForm('0.000001', '0.000001'),
//             new SelectForm('0.00001', '0.00001'),
//             new SelectForm('0.0001', '0.0001'),
//             new SelectForm('0.001', '0.001'),
//             new SelectForm('0.01', '0.01'),
//             new SelectForm('0.03', '0.03'),
//             new SelectForm('0.1', '0.1'),
//             new SelectForm('0.3', '0.3'),
//             new SelectForm('1', '1'),
//             new SelectForm('3', '3'),
//             new SelectForm('10', '10')
//         ];
//         this.activation = [
//             new SelectForm('relu', 'Rectified Linear Unit'),
//             new SelectForm('softmax', 'Softmax')
//         ];
//         this.selectedLearningRates = 0;
//     }
// }
//############################################################ 
/**
 * Channel is a Helping Class that links the number of the channels for the ConvLayers
 */
class Channel {
    constructor(public value: number) { }
}

/**
 * Holds the settings for Neural Network creation
 */
export class NeuralNetworkSettings {

    /**
     * list of ConvLayers
     */
    private _convLayers: ConvLayer[] = [];
    /**
     * Getter of the ConvLayer list
     */
    public get convLayers(): ConvLayer[] {
        return this._convLayers;
    }

    /**
     * List of DenseLayers
     */
    private _denseLayers: DenseLayer[] = [];
    /**
     * Getter of the DenseLayer list
     */
    public get denseLayers(): DenseLayer[] {
        return this._denseLayers;
    }

    /**
     * Configurations of neural network settings.
     */
    public configurations: {
        batchTrain: number,
        batchTest: number,
        epoch: number,
        learningRate: number
    };

    /**
     * Object Attribute that gets x, y and z axis for the Input.
     * The z axis is also the Channel output for the first ConvLayer
     */
    public inputSize: { x: number, y: number, z: Channel }

    /**
     * Sets the inputSize to Default x = 0, y = 0, z = Channel.value = 0
     */
    constructor() {
        this.configurations = {
            batchTrain: 64,
            batchTest: 64,
            epoch: 5,
            learningRate: 0.01
        };
        this.inputSize = { x: 0, y: 0, z: new Channel(0) };
    }

    /**
     * Adds a ConvLayer to the ConvLayer List and links the outChannel from the last ConvLayer to the InChannel of the new ConvLayer
     */
    public addConvLayer() {
        if (this._convLayers.length > 0) {
            const chainChannel = this._convLayers[this._convLayers.length - 1].outChannel;
            const layer = new ConvLayer(chainChannel, new Channel(0));
            this._convLayers.push(layer);
        } else {
            const layer = new ConvLayer(this.inputSize.z, new Channel(0));
            this._convLayers.push(layer);
        }
    }

    /**
     * Deletes a ConvLayer from the ConvLayer List
     * It also modifie the Channel Chain if the deleted Layer isn't the Last one
     * @param id id of the ConvLayer that should be deleted
     */
    public deleteConvLayer(id: number) {
        if (id !== this._convLayers.length - 1) {
            const chainChannel = this._convLayers[id - 1].outChannel;
            this._convLayers[id + 1].inChannel = chainChannel;
        }
        this._convLayers.splice(id, 1);
    }

    /**
     * Adds a DenseLayer to the denseLayer List
     * @param layer the DenseLayer that should be added to the DenseLayer List
     */
    public addDenseLayer(layer: DenseLayer) {
        this._denseLayers.push(layer);
    }

    /**
     * Deletes a DenseLayer from the denseLayer List
     * @param id Id of the DenseLayer that should be deleted from the denseLayer List
     */
    public deleteDenseLayer(id: number) {
        this._denseLayers.splice(id, 1);
    }

    /**
     * Convert all setting Information of the Neural Network to a JSON string
     * !!! Not implemented yet!!!! 
     */
    public toJSON() {
        return;
    }
}

/**
 * Enums of possible Activations
 */
export enum Activation {
    none = 'none',
    relu = 'relu',
    rrelu = 'rrelu',
    hardtanh = 'hardtanh',
    sigmoid = 'sigmoid',
    tanh = 'tanh',
    elu = 'elu',
    celu = 'celu',
    selu = 'selu',
    glu = 'glu',
    leakyRelu = 'leakyRelu',
    logSigmoid = 'logSigmoid',
    softplus = 'softplus',
    softmax = 'softmax',
    logSoftmax = 'logSoftmax',
}

/**
 * Parent Class of all Layers Contains all shared attributes
 */
export class Layer {
    /**
     * 
     * @param activation Activation function of the Layer
     */
    constructor(public activation: Activation) {
    }
}

/**
 * ConvLayer Class extends from Layer
 */
export class ConvLayer extends Layer {
    /**
     * 
     * @param inChannel Type is Channel: Number of Incoming Channel size 
     * @param outChannel Type is Channel: Number of Outgoing Channel size
     * @param kernelSize Number of Kernel Size
     * @param stride Number of stride
     * @param padding Number of padding
     * @param activation Activation Function
     */
    constructor(
        public inChannel: Channel,
        public outChannel: Channel,
        public kernelSize: number = 0,
        public stride: number = 0,
        public padding: number = 0,
        public activation: Activation = Activation.none
    ) { super(activation) }
}

/**
 * DenseLayer class extends from Layer
 */
export class DenseLayer extends Layer {
    /**
     * 
     * @param size Number of Nodes in the fully Connected Layer
     * @param activation Activation function
     */
    constructor(
        public size: number = 0,
        public activation: Activation = Activation.none
    ) { super(activation) }
}
