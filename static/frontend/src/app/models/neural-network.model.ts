import { environment } from 'src/environments/environment';

export enum Convolution {
    Conv2d = 'conv2d'
}

export enum Pooling {
    MaxPool2d = 'maxPool2d'
}

/**
 * Channel is a Helping Class that links the number of the channels for the ConvLayers
 */
export class Channel {
    constructor(public value: number) { }
}

export class TrainingSettings {
    constructor(
        public batchSize: number = 64,
        public epochs: number = 1,
        public learningRate: number = 0.001,
        public loss: string = 'crossEntropy',
        public optimizer: string = 'sgd'
    ) { }
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
     * Sets the inputSize to Default x = 0, y = 0, z = Channel.value = 0
     * @param [inputSize] Object Attribute that gets x, y and z axis for the Input.
     * The z axis is also the Channel output for the first ConvLayer
     * @param [name] Name of the Network that will be saved in the database
     */
    constructor(
        public inputSize = { x: 28, y: 28, z: new Channel(1) },
        public name = 'Network Name'
    ) {
    }

    /**
     * Adds a ConvLayer to the ConvLayer List and links the outChannel from the last ConvLayer to the InChannel of the new ConvLayer
     */
    public addConvLayer() {
        if (this._convLayers.length > 0) {
            let i = 1;
            // gets the leatest convlayer and ignores the pooling layer
            while (this._convLayers[this._convLayers.length - i].type !== Convolution.Conv2d) {
                i++;
            }
            const chainChannel = this._convLayers[this._convLayers.length - i].outChannel;
            const layer = new ConvLayer(Convolution.Conv2d, chainChannel, new Channel(0));
            this._convLayers.push(layer);
        } else {
            const layer = new ConvLayer(Convolution.Conv2d, this.inputSize.z, new Channel(0));
            this._convLayers.push(layer);
        }
    }

    /**
     * Adds a MaxPoolingLayer
     */
    public addMaxPooling() {
        if (this._convLayers.length > 0) {
            const inChain = this._convLayers[this._convLayers.length - 1].inChannel;
            const outChain = this._convLayers[this._convLayers.length - 1].outChannel;
            const poolLayer = new ConvLayer(Pooling.MaxPool2d, inChain, outChain, 2, 2);
            this._convLayers.push(poolLayer);
        }
    }

    /**
     * Deletes a ConvLayer from the ConvLayer List
     * It also modifie the Channel Chain if the deleted Layer isn't the Last one
     * @param id id of the ConvLayer that should be deleted
     */
    public deleteConvLayer(id: number) {
        if (id !== this._convLayers.length - 1) {
            const chainChannel = id > 0 ? this._convLayers[id - 1].outChannel : this.inputSize.z;
            let i = 1;
            while (id + i <= this._convLayers.length - 1 && this._convLayers[id + i].type !== Convolution.Conv2d) {
                i++;
            }
            this._convLayers[id + i].inChannel = chainChannel;
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
     * @param type Type of the Layer
     * @param activation Activation function of the Layer
     */
    constructor(public type: string, public activation: Activation) {
    }
}

/**
 * ConvLayer Class extends from Layer
 */
export class ConvLayer extends Layer {
    /**
     *
     * @param type Type of the Layer
     * @param inChannel Type is Channel: Number of Incoming Channel size 
     * @param outChannel Type is Channel: Number of Outgoing Channel size
     * @param kernelSize Number of Kernel Size
     * @param stride Number of stride
     * @param padding Number of padding
     * @param activation Activation Function
     */
    constructor(
        public type: string,
        public inChannel: Channel,
        public outChannel: Channel,
        public kernelSize: number = 0,
        public stride: number = 1,
        public padding: number = 0,
        public activation: Activation = Activation.none
    ) { super(type, activation); }
}

/**
 * DenseLayer class extends from Layer
 */
export class DenseLayer extends Layer {
    /**
     *
     * @param type Type of the Layer
     * @param size Number of Nodes in the fully Connected Layer
     * @param activation Activation function
     */
    constructor(
        public type: string,
        public size: number = 0,
        public activation: Activation = Activation.none
    ) { super(type, activation); }
}

export interface NeuralNetworkSettingsJSON {
    name: string;

    inputSize: {
        x: number,
        y: number,
        z: Channel
    };

    convLayers: ConvLayer[];
    denseLayers: DenseLayer[];
}

export interface TrainingSettingsJSON {
    batchSize: number;
    epochs: number;
    learningrate: number;
    loss: string;
    optimizer: string;
}
