import { NeuralNetworkSettings } from './neural-network.model';

export class SavedNetworks {
    constructor(
        public id: string,
        public fileName: string
    ) { }
}
