import { NeuralNetworkSettings } from './create-nn.model';

export class SavedNetworks {
    constructor(
        public fileName: string,
        public nnSettings: NeuralNetworkSettings,
        public viewName: string
    ) { }
}
