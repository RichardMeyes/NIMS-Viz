import { NeuralNetworkSettings } from './neural-network.model';

export class SavedNetworks {
    constructor(
        public fileName: string,
        public nnSettings: NeuralNetworkSettings,
        public viewName: string
    ) { }
}
