/**
 * Layer-view's default settings.
 */
export class LayerDefaultSettings {
    constructor(
        public rectSide: number = 20,
        public nodeRadius: number = 10,
        public color: string = '#3D59AB',
        public nodeOpacity: number = .5,
        public nodeStroke: number = 0,
        public animationDuration: number = 500,
        public unitGutter: number = 5
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
