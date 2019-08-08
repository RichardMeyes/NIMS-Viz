import { HeatmapConfig } from './heatmap-config.model';

export class Option {
    constructor(
        public heatmapNormalConfig: HeatmapConfig,
        public drawFully: boolean
    ) { }
}
