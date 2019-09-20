/**
 * Layer-view's default settings.
 */
export class LayerDefaultSettings {
    constructor(
        public rectSide: number = 20,
        public nodeRadius: number = 10,
        public color: string = '#3D59AB',
        public classifiedColor: string = '#EF5350',
        public nodeOpacity: number = .5,
        public nodeStroke: number = 0,
        public animationDuration: number = 500,
        public unitGutter: number = 5,
        public filterGutter: number = 5
    ) { }
}

/**
 * Layer-view's topology.
 */
export class LayerTopology {
    constructor(
        public layer: number,
        public unit: number,
        public column: number,
        public unitSpacing: number,
        public unitsPerColumn: number,
        public isOutput: boolean,
        public isConv: boolean
    ) { }
}

/**
 * Layer view's weighted topology.
 */
export class WeightedTopology extends LayerTopology {
    constructor(
        public layer: number,
        public unit: number,
        public column: number,
        public unitSpacing: number,
        public unitsPerColumn: number,
        public isOutput: boolean,
        public isConv: boolean,
        public fill: string,
        public opacity: number,
        public totalPoolingLayers: number
    ) {
        super(
            layer,
            unit,
            column,
            unitSpacing,
            unitsPerColumn,
            isOutput,
            isConv
        );
    }
}

/**
 * Layer-view's edge.
 */
export class LayerEdge {
    constructor(
        public layer: number,
        public source: number,
        public target: number,
        public column: number,
        public targetColumn: number,
        public unitSpacing: number,
        public targetUnitSpacing: number,
        public unitsPerColumn: number
    ) { }
}

/**
 * Layer view's weighted edges.
 */
export class WeightedEdges extends LayerEdge {
    constructor(
        public layer: number,
        public source: number,
        public target: number,
        public column: number,
        public targetColumn: number,
        public unitSpacing: number,
        public targetUnitSpacing: number,
        public unitsPerColumn: number,
        public value: number,
        public stroke: string,
        public totalPoolingLayers: number
    ) {
        super(
            layer,
            source,
            target,
            column,
            targetColumn,
            unitSpacing,
            targetUnitSpacing,
            unitsPerColumn);
    }
}

/**
 * Layer view's epoch slider configurations.
 */
export class EpochSlider {
    constructor(
        public currEpoch: number = 1,
        public maxEpoch: number = 1,
        public isPlaying: boolean = false
    ) { }
}
