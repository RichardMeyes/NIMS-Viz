import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { EventsService } from 'src/app/services/events.service';
import * as d3 from 'd3';
import { debounceTime, takeUntil, concatMap } from 'rxjs/operators';
import { NeuralNetworkSettings } from 'src/app/models/create-nn.model';
import { LayerDefaultSettings, LayerTopology, LayerEdge, EpochSlider, WeightedEdges, WeightedTopology } from 'src/app/models/layer-view.model';
import { DataService } from 'src/app/services/data.service';
import { Subject } from 'rxjs';
import { BackendCommunicationService } from 'src/app/backendCommunication/backend-communication.service';
import { SavedNetworks } from 'src/app/models/saved-networks.model';

/**
 * Component for network graph visualization
 */
@Component({
  selector: 'app-layer-view',
  templateUrl: './layer-view.component.html',
  styleUrls: ['./layer-view.component.scss']
})
export class LayerViewComponent implements OnInit, OnDestroy {
  /**
   * Visualization's container.
   */
  @ViewChild('container', { static: false }) container: ElementRef;

  /**
   * SVG configurations.
   */
  svg; svgWidth: number; svgHeight: number;
  zoom; currTransform;

  /**
   * Configurations for centering the visualization.
   */
  minWidthHeight: number;
  topMargin: number; leftMargin: number;

  /**
   * Graph's elements configurations.
   */
  graphGroup;

  /**
   * Graph's design configurations.
   */
  defaultSettings: LayerDefaultSettings;
  layerSpacing: number;
  topology: LayerTopology[]; edges: LayerEdge[];

  /**
   * Graph's weights configurations.
   */
  wTopology: WeightedTopology[]; wEdges: WeightedEdges[];
  minMaxDiffs; activities;
  // selectedFilter;

  /**
   * Cached NN settings and weights for resizing purpose.
   */
  lastNNSettings: NeuralNetworkSettings;
  lastNNWeights;

  /**
   * Epoch slider configurations.
   */
  epochSlider: EpochSlider;
  animationIntervals;

  /**
   * Flag to unsubscribe.
   */
  destroyed = new Subject<void>();

  constructor(
    private eventsService: EventsService,
    public dataService: DataService,
    private backend: BackendCommunicationService
  ) { }

  ngOnInit() {
    this.defaultSettings = new LayerDefaultSettings();
    this.epochSlider = new EpochSlider();
    this.animationIntervals = [];

    this.eventsService.updateTopology
      .pipe(
        takeUntil(this.destroyed),
        debounceTime(500)
      )
      .subscribe(nnSettings => {
        this.lastNNSettings = nnSettings;

        this.resetViz();

        this.setupTopology();
        this.bindTopology();
      });

    this.eventsService.updateWeights
      .pipe(
        takeUntil(this.destroyed),
        concatMap((epochSlider: EpochSlider) => {
          this.epochSlider = epochSlider;
          return this.backend.loadWeights(this.dataService.selectedNetwork.fileName);
        })
      )
      .subscribe(nnWeights => {
        this.lastNNWeights = nnWeights;
        this.updateWeights(true);
      });

    this.eventsService.updateLayerView
      .pipe(
        takeUntil(this.destroyed),
        concatMap((selectedNetwork: SavedNetworks) => {
          this.lastNNSettings = selectedNetwork.nnSettings;

          this.resetViz();
          this.setupTopology();
          this.bindTopology();


          this.epochSlider = {
            currEpoch: 1,
            maxEpoch: selectedNetwork.nnSettings.configurations.epoch,
            isPlaying: false
          };


          return this.backend.loadWeights(selectedNetwork.fileName);
        })
      )
      .subscribe(nnWeights => {
        this.lastNNWeights = nnWeights;
        this.updateWeights(true);
      });
  }

  /**
   * Reshape nn settings to graph topology.
   */
  setupTopology() {
    const convLayers: number[] = [];
    const layers: number[] = [];
    const filteredTopology: LayerTopology[] = [];
    const filteredEdges: LayerEdge[] = [];

    let unitsPerColumn;
    const unitSpacing = { otherColumns: 0, lastColumn: 0 };
    const targetUnitSpacing = { otherColumns: 0, lastColumn: 0 };

    if (this.lastNNSettings.convLayers.length > 0) {
      convLayers.push(this.lastNNSettings.convLayers[0].inChannel.value);
      convLayers.push(...this.lastNNSettings.convLayers.map(convLayer => +convLayer.outChannel.value));
    }
    if (this.lastNNSettings.denseLayers.length > 0) {
      layers.push(...this.lastNNSettings.denseLayers.map(layer => +layer.size));
    }


    unitsPerColumn = Math.floor((this.minWidthHeight + this.defaultSettings.unitGutter) /
      (this.defaultSettings.rectSide + this.defaultSettings.unitGutter));
    unitSpacing.otherColumns = this.minWidthHeight / unitsPerColumn;
    targetUnitSpacing.otherColumns = this.minWidthHeight / unitsPerColumn;
    convLayers.forEach((convLayer, convLayerIndex) => {
      let nextLayer = layers[0];
      if (convLayerIndex < convLayers.length - 1) {
        nextLayer = convLayers[convLayerIndex + 1];
      }

      const totalColumns = { layer: 1, nextLayer: 1 };
      const column = { layer: -1, nextLayer: -1 };
      if (convLayer > unitsPerColumn) { totalColumns.layer = Math.ceil(convLayer / unitsPerColumn); }
      if (nextLayer > unitsPerColumn) { totalColumns.nextLayer = Math.ceil(nextLayer / unitsPerColumn); }

      if (totalColumns.layer % 2 === 1) {
        column.layer = Math.floor(totalColumns.layer / 2) * -1 - 1;
      } else {
        column.layer = (totalColumns.layer - 1) / 2 * -1 - 1;
      }

      unitSpacing.lastColumn = this.minWidthHeight / unitsPerColumn;
      if (convLayer % unitsPerColumn !== 0) { unitSpacing.lastColumn = this.minWidthHeight / (convLayer % unitsPerColumn); }

      for (let i = 0; i < convLayer; i++) {
        let currUnitSpacing = unitSpacing.otherColumns;
        if (i % unitsPerColumn === 0) { column.layer++; }
        if (Math.floor(i / unitsPerColumn) + 1 === totalColumns.layer) { currUnitSpacing = unitSpacing.lastColumn; }

        filteredTopology.push({
          layer: convLayerIndex,
          unit: i,
          column: column.layer,
          unitSpacing: currUnitSpacing,
          unitsPerColumn,
          isOutput: false,
          isConv: true
        });


        if (totalColumns.nextLayer % 2 === 1) {
          column.nextLayer = Math.floor(totalColumns.nextLayer / 2) * -1 - 1;
        } else {
          column.nextLayer = (totalColumns.nextLayer - 1) / 2 * -1 - 1;
        }

        targetUnitSpacing.lastColumn = this.minWidthHeight / unitsPerColumn;
        if (nextLayer % unitsPerColumn !== 0) { targetUnitSpacing.lastColumn = this.minWidthHeight / (nextLayer % unitsPerColumn); }

        for (let j = 0; j < nextLayer; j++) {
          let targetCurrUnitSpacing = targetUnitSpacing.otherColumns;
          if (j % unitsPerColumn === 0) { column.nextLayer++; }
          if (Math.floor(j / unitsPerColumn) + 1 === totalColumns.nextLayer) { targetCurrUnitSpacing = targetUnitSpacing.lastColumn; }

          filteredEdges.push({
            layer: convLayerIndex,
            source: i,
            target: j,
            column: column.layer,
            targetColumn: column.nextLayer,
            unitSpacing: currUnitSpacing,
            targetUnitSpacing: targetCurrUnitSpacing,
            unitsPerColumn
          });
        }
      }
    });

    unitsPerColumn = Math.floor((this.minWidthHeight + this.defaultSettings.unitGutter) /
      (this.defaultSettings.nodeRadius * 2 + this.defaultSettings.unitGutter));
    unitSpacing.otherColumns = this.minWidthHeight / unitsPerColumn;
    targetUnitSpacing.otherColumns = this.minWidthHeight / unitsPerColumn;
    layers.forEach((layer, layerIndex) => {
      const nextLayer = layers[layerIndex + 1];
      const isOutput = (layerIndex < layers.length - 1) ? false : true;

      const totalColumns = { layer: 1, nextLayer: 1 };
      const column = { layer: -1, nextLayer: -1 };
      if (layer > unitsPerColumn) { totalColumns.layer = Math.ceil(layer / unitsPerColumn); }
      if (nextLayer > unitsPerColumn) { totalColumns.nextLayer = Math.ceil(nextLayer / unitsPerColumn); }

      if (totalColumns.layer % 2 === 1) {
        column.layer = Math.floor(totalColumns.layer / 2) * -1 - 1;
      } else {
        column.layer = (totalColumns.layer - 1) / 2 * -1 - 1;
      }

      unitSpacing.lastColumn = this.minWidthHeight / unitsPerColumn;
      if (layer % unitsPerColumn !== 0) { unitSpacing.lastColumn = this.minWidthHeight / (layer % unitsPerColumn); }

      for (let i = 0; i < layer; i++) {
        let currUnitSpacing = unitSpacing.otherColumns;
        if (i % unitsPerColumn === 0) { column.layer++; }
        if (Math.floor(i / unitsPerColumn) + 1 === totalColumns.layer) { currUnitSpacing = unitSpacing.lastColumn; }

        filteredTopology.push({
          layer: convLayers.length + layerIndex,
          unit: i,
          column: column.layer,
          unitSpacing: currUnitSpacing,
          unitsPerColumn,
          isOutput,
          isConv: false
        });

        if (!isOutput) {
          if (totalColumns.nextLayer % 2 === 1) {
            column.nextLayer = Math.floor(totalColumns.nextLayer / 2) * -1 - 1;
          } else {
            column.nextLayer = (totalColumns.nextLayer - 1) / 2 * -1 - 1;
          }

          targetUnitSpacing.lastColumn = this.minWidthHeight / unitsPerColumn;
          if (nextLayer % unitsPerColumn !== 0) { targetUnitSpacing.lastColumn = this.minWidthHeight / (nextLayer % unitsPerColumn); }

          for (let j = 0; j < nextLayer; j++) {
            let targetCurrUnitSpacing = targetUnitSpacing.otherColumns;
            if (j % unitsPerColumn === 0) { column.nextLayer++; }
            if (Math.floor(j / unitsPerColumn) + 1 === totalColumns.nextLayer) { targetCurrUnitSpacing = targetUnitSpacing.lastColumn; }

            filteredEdges.push({
              layer: convLayers.length + layerIndex,
              source: i,
              target: j,
              column: column.layer,
              targetColumn: column.nextLayer,
              unitSpacing: currUnitSpacing,
              targetUnitSpacing: targetCurrUnitSpacing,
              unitsPerColumn
            });
          }
        }
      }
    });


    this.layerSpacing = this.minWidthHeight / (convLayers.length + layers.length);
    this.topology = filteredTopology;
    this.edges = filteredEdges;
  }

  /**
   * Draw the topology.
   */
  bindTopology() {
    const self = this;


    const line = this.graphGroup.selectAll('.edges')
      .data(this.edges);

    line.enter()
      .append('line')
      .attr('class', 'edges')
      .attr('x1', function (d) {
        const x1: number = self.leftMargin +
          self.layerSpacing * d.layer +
          (self.defaultSettings.nodeRadius * 2 + self.defaultSettings.unitGutter) * d.column +
          self.layerSpacing / 2;
        return x1;
      })
      .attr('y1', function (d) {
        const y1: number = self.topMargin +
          d.unitSpacing * (d.source % d.unitsPerColumn) +
          d.unitSpacing / 2;
        return y1;
      })
      .attr('x2', function (d) {
        const x2: number = self.leftMargin +
          self.layerSpacing * (d.layer + 1) +
          (self.defaultSettings.nodeRadius * 2 + self.defaultSettings.unitGutter) * d.targetColumn +
          self.layerSpacing / 2;
        return x2;
      })
      .attr('y2', function (d) {
        const y2: number = self.topMargin +
          d.targetUnitSpacing * (d.target % d.unitsPerColumn) +
          d.targetUnitSpacing / 2;
        return y2;
      });


    let rects = this.graphGroup.selectAll('rect')
      .data(this.topology.filter(nodes => nodes.isConv));

    rects = rects.enter()
      .append('rect')
      .attr('class', 'rect')
      .attr('x', function (d) {
        const x: number = self.leftMargin +
          self.layerSpacing * d.layer +
          (self.defaultSettings.rectSide + self.defaultSettings.unitGutter) * d.column +
          self.layerSpacing / 2 -
          0.5 * self.defaultSettings.rectSide;
        return x;
      })
      .attr('y', function (d) {
        const y: number = self.topMargin +
          d.unitSpacing * (d.unit % d.unitsPerColumn) +
          d.unitSpacing / 2 -
          0.5 * self.defaultSettings.rectSide;
        return y;
      })
      .attr('width', this.defaultSettings.rectSide)
      .attr('height', this.defaultSettings.rectSide)
      .attr('fill', this.defaultSettings.color)
      .attr('fill-opacity', this.defaultSettings.nodeOpacity);


    const circles = this.graphGroup.selectAll('circle')
      .data(this.topology.filter(nodes => !nodes.isConv));

    circles.enter()
      .append('circle')
      .attr('class', 'circle')
      .attr('cx', function (d) {
        const cx: number = self.leftMargin +
          self.layerSpacing * d.layer +
          (self.defaultSettings.nodeRadius * 2 + self.defaultSettings.unitGutter) * d.column +
          self.layerSpacing / 2;
        return cx;
      })
      .attr('cy', function (d) {
        const cy: number = self.topMargin +
          d.unitSpacing * (d.unit % d.unitsPerColumn) +
          d.unitSpacing / 2;
        return cy;
      })
      .attr('r', this.defaultSettings.nodeRadius)
      .attr('fill', this.defaultSettings.color)
      .attr('fill-opacity', this.defaultSettings.nodeOpacity);
  }

  /**
   * Update the weights visualization on current-epoch change.
   */
  updateWeights(runAnimation: boolean) {
    this.activities = [];
    this.setupWeights();
    this.bindWeights(runAnimation);
  }

  /**
   * Reshape the trained weights to graph topology.
   */
  setupWeights() {
    const filteredData: WeightedEdges[] = [];
    const currEpoch = `epoch_${this.epochSlider.currEpoch - 1}`;
    let diffsPerEpoch;

    const unitsPerColumn = Math.floor((this.minWidthHeight + this.defaultSettings.unitGutter) /
      (this.defaultSettings.nodeRadius * 2 + this.defaultSettings.unitGutter));
    const unitSpacing = { otherColumns: this.minWidthHeight / unitsPerColumn, lastColumn: 0 };
    const targetUnitSpacing = { otherColumns: this.minWidthHeight / unitsPerColumn, lastColumn: 0 };

    Object.keys(this.lastNNWeights[currEpoch]).forEach((layer, layerIndex) => {
      if (!layer.startsWith('c') && layer !== 'input') {
        if (!diffsPerEpoch) { diffsPerEpoch = { min: 0, max: 0 }; }

        const totalColumns = { layer: 1, nextLayer: 1 };
        const column = { layer: -1, nextLayer: -1 };
        if (this.lastNNWeights[currEpoch][layer][0].length > unitsPerColumn) {
          totalColumns.layer = Math.ceil(this.lastNNWeights[currEpoch][layer][0].length / unitsPerColumn);
        }
        if (this.lastNNWeights[currEpoch][layer].length > unitsPerColumn) {
          totalColumns.nextLayer = Math.ceil(this.lastNNWeights[currEpoch][layer].length / unitsPerColumn);
        }

        if (totalColumns.nextLayer % 2 === 1) {
          column.nextLayer = Math.floor(totalColumns.nextLayer / 2) * -1 - 1;
        } else {
          column.nextLayer = (totalColumns.nextLayer - 1) / 2 * -1 - 1;
        }

        targetUnitSpacing.lastColumn = this.minWidthHeight / unitsPerColumn;
        if (this.lastNNWeights[currEpoch][layer].length % unitsPerColumn !== 0) {
          targetUnitSpacing.lastColumn = this.minWidthHeight / (this.lastNNWeights[currEpoch][layer].length % unitsPerColumn);
        }

        this.lastNNWeights[currEpoch][layer].forEach((destination, destinationIndex) => {
          let targetCurrUnitSpacing = targetUnitSpacing.otherColumns;
          if (destinationIndex % unitsPerColumn === 0) { column.nextLayer++; }
          if (Math.floor(destinationIndex / unitsPerColumn) + 1 === totalColumns.nextLayer) {
            targetCurrUnitSpacing = targetUnitSpacing.lastColumn;
          }

          if (totalColumns.layer % 2 === 1) {
            column.layer = Math.floor(totalColumns.layer / 2) * -1 - 1;
          } else {
            column.layer = (totalColumns.layer - 1) / 2 * -1 - 1;
          }

          unitSpacing.lastColumn = this.minWidthHeight / unitsPerColumn;
          if (destination.length % unitsPerColumn !== 0) {
            unitSpacing.lastColumn = this.minWidthHeight / (destination.length % unitsPerColumn);
          }

          destination.forEach((source, sourceIndex) => {
            let currUnitSpacing = unitSpacing.otherColumns;
            if (sourceIndex % unitsPerColumn === 0) { column.layer++; }
            if (Math.floor(sourceIndex / unitsPerColumn) + 1 === totalColumns.layer) { currUnitSpacing = unitSpacing.lastColumn; }

            if (source < diffsPerEpoch.min) { diffsPerEpoch.min = source; }
            if (source > diffsPerEpoch.max) { diffsPerEpoch.max = source; }

            filteredData.push({
              layer: layerIndex,
              source: sourceIndex,
              target: destinationIndex,
              column: column.layer,
              targetColumn: column.nextLayer,
              // unitSpacing: (this.minWidthHeight / +destination.length),
              // targetUnitSpacing: (this.minWidthHeight / +this.inputWeights[currEpoch][layer].length),
              unitSpacing: currUnitSpacing,
              targetUnitSpacing: targetCurrUnitSpacing,
              unitsPerColumn,
              value: source,
              stroke: this.defaultSettings.color
            });
          });
        });
      }
    });

    this.wTopology = [];
    this.wEdges = filteredData;
    this.minMaxDiffs = diffsPerEpoch;

    this.wEdges.forEach(el => { el.stroke = this.generateWeightsColor(el); });
    this.topology.forEach(el => {
      const nodeColor = this.generateNodesColor(el);
      this.wTopology.push(Object.assign({}, el, { fill: nodeColor.color, opacity: nodeColor.opacity }));
    });

    this.wEdges = this.wEdges.filter(weight => weight.stroke !== this.defaultSettings.color);
  }

  /**
   * Draw the weights.
   * @param runAnimation a boolean to determine whether to play animation.
   */
  bindWeights(runAnimation: boolean) {
    d3.selectAll('.weights').remove();
    d3.selectAll('circle').remove();
    const self = this;


    const line = this.graphGroup.selectAll('.weights')
      .data(this.wEdges);

    let enterWeights = line.enter()
      .append('line')
      .attr('class', 'weights')
      .attr('x1', function (d) {
        const x1: number = self.leftMargin +
          self.layerSpacing * d.layer +
          (self.defaultSettings.nodeRadius * 2 + self.defaultSettings.unitGutter) * d.column +
          self.layerSpacing / 2;
        return x1;
      })
      .attr('y1', function (d) {
        const y1: number = self.topMargin +
          d.unitSpacing * (d.source % d.unitsPerColumn) +
          d.unitSpacing / 2;
        return y1;
      })
      .attr('x2', function (d) {
        const x2: number = self.leftMargin +
          self.layerSpacing * d.layer +
          (self.defaultSettings.nodeRadius * 2 + self.defaultSettings.unitGutter) * d.column +
          self.layerSpacing / 2;
        return x2;
      })
      .attr('y2', function (d) {
        const y2: number = self.topMargin +
          d.unitSpacing * (d.source % d.unitsPerColumn) +
          d.unitSpacing / 2;
        return y2;
      })
      .attr('stroke', function (d) { return d.stroke; });

    if (runAnimation) {
      enterWeights = enterWeights.transition()
        .duration(2.5 * this.defaultSettings.animationDuration)
        .delay(function (d) {
          // const nodesDelay = self.defaultSettings.duration * (d.layer + 1);
          // const weightsDelay = 2.5 * self.defaultSettings.duration * d.layer;
          const nodesDelay = self.defaultSettings.animationDuration * (d.layer + 1 - self.lastNNSettings.convLayers.length - 1);
          const weightsDelay = 2.5 * self.defaultSettings.animationDuration * (d.layer - self.lastNNSettings.convLayers.length - 1);
          return nodesDelay + weightsDelay;
        });
    }
    enterWeights
      .attr('x2', function (d) {
        const x2: number = self.leftMargin +
          self.layerSpacing * (d.layer + 1) +
          (self.defaultSettings.nodeRadius * 2 + self.defaultSettings.unitGutter) * d.targetColumn +
          self.layerSpacing / 2;
        return x2;
      })
      .attr('y2', function (d) {
        const y2: number = self.topMargin +
          d.targetUnitSpacing * (d.target % d.unitsPerColumn) +
          d.targetUnitSpacing / 2;
        return y2;
      });


    const circles = this.graphGroup.selectAll('circle')
      .data(this.wTopology.filter(nodes => !nodes.isConv));

    let enterCircles = circles.enter()
      .append('circle')
      .attr('class', 'circle')
      .attr('cx', function (d) {
        const cx: number = self.leftMargin +
          self.layerSpacing * d.layer +
          (self.defaultSettings.nodeRadius * 2 + self.defaultSettings.unitGutter) * d.column +
          self.layerSpacing / 2;
        return cx;
      })
      .attr('cy', function (d) {
        const cy: number = self.topMargin +
          d.unitSpacing * (d.unit % d.unitsPerColumn) +
          d.unitSpacing / 2;
        return cy;
      })
      .attr('r', this.defaultSettings.nodeRadius)
      .attr('fill', this.defaultSettings.color)
      .attr('fill-opacity', this.defaultSettings.nodeOpacity)
      .attr('stroke', this.defaultSettings.color)
      .attr('stroke-width', this.defaultSettings.nodeStroke);

    if (runAnimation) {
      enterCircles = enterCircles.transition()
        .duration(this.defaultSettings.animationDuration)
        .delay(function (d) {
          // const nodesDelay = self.defaultSettings.duration * d.layer;
          // const weightsDelay = 2.5 * self.defaultSettings.duration * d.layer;
          const nodesDelay = self.defaultSettings.animationDuration * (d.layer - self.lastNNSettings.convLayers.length - 1);
          const weightsDelay = 2.5 * self.defaultSettings.animationDuration * (d.layer - self.lastNNSettings.convLayers.length - 1);
          return nodesDelay + weightsDelay;
        });
    }
    enterCircles
      .attr('fill', function (d) { return d.fill; })
      .attr('fill-opacity', function (d) { return d.opacity; })
      .attr('stroke', function (d) { return (d.fill === '#373737') ? d.fill : '#F44336'; })
      .attr('stroke-width', .15 * this.defaultSettings.nodeRadius);
  }

  /**
   * Generates color of the edges
   * @param el the edges
   * @returns  the color of the edges
   */
  generateWeightsColor(el) {
    let color = this.defaultSettings.color;
    let activity = 0;
    let recordActivities = false;

    const range = Math.abs(this.minMaxDiffs.max - this.minMaxDiffs.min);
    const valuePercentage = (el.value - this.minMaxDiffs.min) / range;

    if (valuePercentage > .9) {
      color = '#EF5350';
      activity = valuePercentage;
      recordActivities = true;
    } else if (valuePercentage > .85) {
      color = '#EF9A9A';
      activity = valuePercentage;
      recordActivities = true;
    }

    if (recordActivities) {
      this.activities.push({
        layer: el.layer,
        source: el.source,
        target: el.target,
        activity
      });
    }

    return color;
  }

  /**
   * Generates color of the nodes
   * @param el the nodes
   * @returns the color and the opacity of the nodes
   */
  generateNodesColor(el) {
    const allActivities = [];

    let color = this.defaultSettings.color;
    let opacity = 1;

    for (let i = 0; i < this.activities.length; i++) {
      if ((this.activities[i].layer === el.layer && this.activities[i].source === el.unit) ||
        (this.activities[i].layer === el.layer - 1 && this.activities[i].target === el.unit)) {
        if (this.activities[i].activity > .9) {
          color = '#EF5350';
        } else if (this.activities[i].activity > .85) {
          color = '#EF9A9A';
        }

        allActivities.push(this.activities[i].activity);
      }
    }

    if (allActivities.length > 0) {
      opacity = allActivities.reduce((a, b) => a + b) / allActivities.length;
    }

    return { color, opacity };
  }

  /**
   * Toggles epoch animation.
   */
  toggleAnimation() {
    this.epochSlider.isPlaying = !this.epochSlider.isPlaying;

    if (this.epochSlider.isPlaying) {
      const runAnimation = () => {
        if (this.epochSlider.currEpoch < this.epochSlider.maxEpoch) {
          this.epochSlider.currEpoch++;
        } else {
          this.epochSlider.currEpoch = 1;
        }
        this.updateWeights(true);
      };
      runAnimation();

      this.animationIntervals.push(setInterval(runAnimation, 4.5 * this.defaultSettings.animationDuration *
        (this.lastNNSettings.denseLayers.length - 1) + 150
      ));
    } else {
      this.animationIntervals.forEach(animationInterval => {
        clearInterval(animationInterval);
      });
      this.animationIntervals = [];
    }
  }

  /**
   * Resets visualization
   */
  resetViz() {
    this.svgWidth = this.container.nativeElement.offsetWidth;
    this.svgHeight = this.container.nativeElement.offsetHeight;

    this.minWidthHeight = Math.min(this.svgWidth, this.svgHeight);
    this.topMargin = (this.svgHeight - this.minWidthHeight) / 2;
    this.leftMargin = (this.svgWidth - this.minWidthHeight) / 2;


    if (this.svg) { this.svg.remove(); }
    this.svg = d3.select(this.container.nativeElement)
      .append('svg')
      .attr('width', this.svgWidth)
      .attr('height', this.svgHeight);
    this.graphGroup = this.svg.append('g');

    const self = this;
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', () => {
        self.graphGroup.attr('transform', d3.event.transform);
      })
      .on('end', () => { this.currTransform = d3.event.transform; });
    this.svg.call(this.zoom);

    this.svg.on('contextmenu', () => { d3.event.preventDefault(); });
  }

  /**
   * Viz container is resized.
   */
  containerResized() {
    if (this.lastNNSettings) {
      this.resetViz();

      this.setupTopology();
      this.bindTopology();
      this.updateWeights(false);
    }
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
