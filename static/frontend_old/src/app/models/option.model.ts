import { EpochConfig } from "./epoch-config.model";
import { HeatmapConfig } from "./heatmap-config.model";

export class Option {
    constructor(
        public epochSliderConfig: EpochConfig,
        public heatmapNormalConfig: HeatmapConfig,
        public drawFully: boolean
    ) { }
}
