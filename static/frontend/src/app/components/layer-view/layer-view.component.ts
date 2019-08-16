import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { EventsService } from 'src/app/services/events.service';
import * as d3 from 'd3';
import { debounceTime, takeUntil, concatMap, filter } from 'rxjs/operators';
import { NeuralNetworkSettings } from 'src/app/models/create-nn.model';
import { LayerDefaultSettings, LayerTopology, LayerEdge, EpochSlider, WeightedEdges, WeightedTopology } from 'src/app/models/layer-view.model';
import { DataService } from 'src/app/services/data.service';
import { Subject } from 'rxjs';
import { BackendCommunicationService } from 'src/app/backendCommunication/backend-communication.service';
import { SavedNetworks } from 'src/app/models/saved-networks.model';
import { ActiveSideMenu } from 'src/app/models/navigation.model';

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

  activeSideMenu = ActiveSideMenu;

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
   * SVG groups configurations.
   */
  graphGroup; tooltipGroup; legendGroup;

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
   * Tooltip configurations.
   */
  selectedUnit: WeightedTopology;
  untrainedWeights;
  tooltipTexts: string[]; tooltipConfig;
  classifyResult; //nanti check frontend lama, ambil dari subject

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
        }),
        concatMap(nnWeights => {
          this.lastNNWeights = nnWeights;
          this.updateWeights(true);

          return this.backend.loadWeights(this.dataService.selectedNetwork.fileName.replace('.json', '_untrained.json'));
        })
      )
      .subscribe(untrainedWeights => {
        this.untrainedWeights = untrainedWeights;
      });

    this.eventsService.updateLayerView
      .pipe(
        takeUntil(this.destroyed),
        filter((selectedNetwork: SavedNetworks) => {
          this.resetViz();

          if (selectedNetwork) {
            return true;
          } else {
            return false;
          }
        }),
        concatMap((selectedNetwork: SavedNetworks) => {
          this.lastNNSettings = selectedNetwork.nnSettings;

          this.setupTopology();
          this.bindTopology();


          this.epochSlider = {
            currEpoch: (this.dataService.activeSideMenu === ActiveSideMenu.NetworkAblator) ?
              selectedNetwork.nnSettings.configurations.epoch : 1,
            maxEpoch: selectedNetwork.nnSettings.configurations.epoch,
            isPlaying: false
          };


          return this.backend.loadWeights(selectedNetwork.fileName.replace('.json', '_untrained.json'));
        }),
        concatMap(untrainedWeights => {
          this.untrainedWeights = untrainedWeights;
          return this.backend.loadWeights(this.dataService.selectedNetwork.fileName);
        })
      )
      .subscribe(nnWeights => {
        this.lastNNWeights = nnWeights;
        if (this.dataService.activeSideMenu !== ActiveSideMenu.NetworkAblator) {
          this.updateWeights(true);
        }
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

    rects.on('mouseover', function (d) {
      self.selectedUnit = Object.assign({}, d);
      self.selectedUnit.layer -= 1;

      if (self.selectedUnit.layer >= 0) {
        self.setupConvTooltip();
        self.bindConvTooltip(d3.mouse(this)[0], d3.mouse(this)[1]);
      }

      d3.select(this)
        .classed('focused', true);
    });

    rects.on('mouseout', function (d) {
      d3.selectAll('.filters-comparison').remove();
      d3.select(this)
        .classed('focused', false);
    });


    let circles = this.graphGroup.selectAll('circle')
      .data(this.topology.filter(nodes => !nodes.isConv));

    circles = circles.enter()
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


    if (this.dataService.activeSideMenu === ActiveSideMenu.NetworkAblator) {
      circles.on('mouseover', function (d) {
        self.showMLPTooltip(d, self, this);
      });
      circles.on('mouseout', this.removeMLPTooltip);
    }
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

    enterCircles.on('mouseover', function (d) {
      self.showMLPTooltip(d, self, this);
    });
    enterCircles.on('mouseout', this.removeMLPTooltip);

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
   * Setups the tooltip of conv layers.
   */
  setupConvTooltip() {
    const self = this;
    this.tooltipTexts = [
      `Conv Layer ${this.selectedUnit.layer + 1} - Unit ${this.selectedUnit.unit + 1}`,
      `Incoming Filters`,
      `Before`,
      `After`
    ];

    this.tooltipConfig = {
      outerFrame: {
        width: 0,
        height: 0,
        margin: 5,
        cornerRad: 7.5,
        fill: '#2b2b2b'
      },
      title: {
        margin: 15,
        color: '#ffffff',
        dimension: []
      },
      featureMapFrame: {
        width: 177,
        height: 177,
        margin: 15,
        fill: 'black'
      },
      weightsFrame: {
        width: 300,
        height: 60,
        margin: 15,
        fill: 'black'
      },
      filtersFrame: {
        width: 25,
        height: 25,
        numElements: 10
      },
      color: d3.interpolateLab('black', 'white')
    };

    this.graphGroup.selectAll('.tmp')
      .data(this.tooltipTexts)
      .enter()
      .append('text')
      .text(d => d)
      .attr('class', 'tmp')
      .each(function (d, i) {
        const bbox = this.getBBox();
        const dimension = {
          width: bbox.width,
          height: bbox.height
        };

        self.tooltipConfig.title.dimension[i] = dimension;
      });
    d3.selectAll('.tmp').remove();

    this.tooltipConfig.outerFrame.width = this.tooltipConfig.featureMapFrame.width +
      2 * this.tooltipConfig.featureMapFrame.margin +
      this.tooltipConfig.weightsFrame.width +
      .75 * this.tooltipConfig.weightsFrame.margin;
    this.tooltipConfig.outerFrame.height =
      this.tooltipConfig.title.dimension[0].height +
      2 * this.tooltipConfig.title.margin +
      this.tooltipConfig.featureMapFrame.height +
      .2 * this.tooltipConfig.featureMapFrame.height;
  }

  /**
   * Bind conv tooltip to svg.
   * @param mouseX Mouse's X coordinate.
   * @param mouseY Mouse's Y coordinate.
   */
  bindConvTooltip(mouseX, mouseY) {
    const self = this;

    const currEpoch = `epoch_${this.epochSlider.maxEpoch - 1}`;
    const incomingFilters = `c${this.selectedUnit.layer}`;


    this.tooltipConfig.quadrantAdjustment = {
      x: this.tooltipConfig.outerFrame.margin,
      y: this.tooltipConfig.outerFrame.margin
    };
    if (mouseX > this.svgWidth / 2) {
      this.tooltipConfig.quadrantAdjustment.x *= -1;
      this.tooltipConfig.quadrantAdjustment.x += -1 * this.tooltipConfig.outerFrame.width;
    }
    if (mouseY > this.svgHeight / 2) {
      this.tooltipConfig.quadrantAdjustment.y *= -1;
      this.tooltipConfig.quadrantAdjustment.y += -1 * this.tooltipConfig.outerFrame.height;
    }


    const filtersComparison = this.tooltipGroup.append('g')
      .attr('class', 'filters-comparison');

    filtersComparison.append('rect')
      .attr('x', mouseX + this.tooltipConfig.quadrantAdjustment.x)
      .attr('y', mouseY + this.tooltipConfig.quadrantAdjustment.y)
      .attr('width', this.tooltipConfig.outerFrame.width)
      .attr('height', this.tooltipConfig.outerFrame.height)
      .attr('rx', this.tooltipConfig.outerFrame.cornerRad)
      .attr('ry', this.tooltipConfig.outerFrame.cornerRad)
      .style('fill', this.tooltipConfig.outerFrame.fill);

    filtersComparison.selectAll('text')
      .data(this.tooltipTexts)
      .enter()
      .append('text')
      .text(d => d)
      .attr('x', (d, i) => {
        let centerAligned = 0;
        let leftSpacing = 0;

        if (i === 0) {
          centerAligned += this.tooltipConfig.outerFrame.width / 2;
          centerAligned -= this.tooltipConfig.title.dimension[0].width / 2;
          centerAligned -= this.tooltipConfig.title.margin;
        }
        if (i > 0) {
          leftSpacing += this.tooltipConfig.featureMapFrame.width;
          leftSpacing += this.tooltipConfig.featureMapFrame.margin;
        }

        return mouseX +
          this.tooltipConfig.quadrantAdjustment.x +
          this.tooltipConfig.title.margin +
          centerAligned +
          leftSpacing;
      })
      .attr('y', (d, i) => {
        let totalTitles = this.tooltipConfig.title.margin;

        if (i > 0) {
          totalTitles = 2 * this.tooltipConfig.title.margin;
        }
        for (let j = 0; j <= i; j++) {
          totalTitles += this.tooltipConfig.title.dimension[j].height;
        }
        if (d === 'After') {
          totalTitles += this.tooltipConfig.weightsFrame.height;
          totalTitles += .5 * this.tooltipConfig.weightsFrame.margin;
        }

        return mouseY +
          this.tooltipConfig.quadrantAdjustment.y +
          totalTitles;
      })
      .attr('fill', this.tooltipConfig.title.color);


    this.tooltipConfig.featureMapData = [];
    if (this.classifyResult) {
      const classifyResultCloned = JSON.parse(JSON.stringify(this.classifyResult));
      this.tooltipConfig.featureMapData.push(classifyResultCloned['nodes_dict'][incomingFilters][this.selectedUnit.unit]);
      this.tooltipConfig.featureMap = {
        width: this.tooltipConfig.featureMapFrame.width / this.tooltipConfig.featureMapData[0].length,
        height: this.tooltipConfig.featureMapFrame.height / this.tooltipConfig.featureMapData[0].length,
        numElements: this.tooltipConfig.featureMapData[0].length
      };
    } else {
      this.tooltipConfig.featureMapData.push([undefined]);
    }

    this.tooltipConfig.data = [];
    const untrainedWeightsCloned = JSON.parse(JSON.stringify(this.untrainedWeights));
    const inputWeightsCloned = JSON.parse(JSON.stringify(this.lastNNWeights));
    this.tooltipConfig.data.push(untrainedWeightsCloned.epoch_0[incomingFilters][this.selectedUnit.unit]);
    this.tooltipConfig.data.push(inputWeightsCloned[currEpoch][incomingFilters][this.selectedUnit.unit]);

    // this.tooltipConfig.filtersFrame = {
    //   width: this.tooltipConfig.weightsFrame.width / Math.ceil(Math.sqrt(this.tooltipConfig.data[0].length)),
    //   height: this.tooltipConfig.weightsFrame.height / Math.ceil(Math.sqrt(this.tooltipConfig.data[0].length)),
    //   numElements: Math.ceil(Math.sqrt(this.tooltipConfig.data[0].length))
    // };

    this.tooltipConfig.filter = {
      width: this.tooltipConfig.filtersFrame.width / this.tooltipConfig.data[0][0].length,
      height: this.tooltipConfig.filtersFrame.height / this.tooltipConfig.data[0][0].length,
      numElements: this.tooltipConfig.data[0][0].length
    };

    // d3 workaround - attr's index starts from 1 instead of 0
    if (this.classifyResult) {
      this.tooltipConfig.featureMapData[0].forEach(featureMap => { featureMap.unshift('d3 workaround'); });
    }
    this.tooltipConfig.data.forEach((data, dataIndex) => {
      this.tooltipConfig.data[dataIndex] = this.tooltipConfig.data[dataIndex].slice(0, 20);
      data.forEach(filterRow => {
        filterRow.forEach(filter => {
          filter.unshift('d3 workaround');
        });
      });
    });


    const featureMaps = filtersComparison.selectAll('.feature-maps')
      .data(this.tooltipConfig.featureMapData)
      .enter()
      .append('g')
      .attr('class', 'feature-maps');

    featureMaps.append('rect')
      .attr('x', () =>
        mouseX +
        this.tooltipConfig.quadrantAdjustment.x +
        this.tooltipConfig.featureMapFrame.margin
      )
      .attr('y', () => {
        const totalTitles = 2 * this.tooltipConfig.title.margin +
          this.tooltipConfig.title.dimension[0].height;

        return mouseY +
          this.tooltipConfig.quadrantAdjustment.y +
          totalTitles;
      })
      .attr('width', this.tooltipConfig.featureMapFrame.width)
      .attr('height', this.tooltipConfig.featureMapFrame.height)
      .style('fill', this.tooltipConfig.featureMapFrame.fill);

    if (this.classifyResult) {
      const featureMapRows = featureMaps.selectAll('.feature-map-rows')
        .data(d => d)
        .enter()
        .append('g')
        .attr('class', 'feature-map-rows');

      featureMapRows.append('rect')
        .attr('x', function () {
          return +d3.select(this.parentNode.parentNode).select('rect').attr('x');
        })
        .attr('y', function (d, i) {
          const rectYValue = +d3.select(this.parentNode.parentNode).select('rect').attr('y');
          const yPosition = i * self.tooltipConfig.featureMap.height;

          return rectYValue + yPosition;
        })
        .attr('width', this.tooltipConfig.featureMapFrame.width)
        .attr('height', this.tooltipConfig.featureMap.height);

      featureMapRows.selectAll('rect')
        .data(d => d)
        .enter()
        .append('rect')
        .attr('x', function (d, i) {
          const rectXValue = +d3.select(this.parentNode).select('rect').attr('x');
          const xPosition = (i - 1) * self.tooltipConfig.featureMap.width;

          return rectXValue + xPosition;
        })
        .attr('y', function (d, i) {
          return +d3.select(this.parentNode).select('rect').attr('y');
        })
        .attr('width', this.tooltipConfig.featureMap.width)
        .attr('height', this.tooltipConfig.featureMap.height)
        .style('fill', d => this.tooltipConfig.color(Math.round(d * 100) / 100));
    }


    const comparisonItem = filtersComparison.selectAll('.comparison-item')
      .data(this.tooltipConfig.data)
      .enter()
      .append('g')
      .attr('class', 'comparison-item');

    comparisonItem.append('rect')
      .attr('x', (d, i) =>
        mouseX +
        this.tooltipConfig.quadrantAdjustment.x +
        this.tooltipConfig.featureMapFrame.width +
        2 * this.tooltipConfig.featureMapFrame.margin
      )
      .attr('y', (d, i) => {
        let totalTitles = 2 * this.tooltipConfig.title.margin;
        let totalContent = 0;

        for (let j = 0; j < this.tooltipConfig.title.dimension.length; j++) {
          if (i === 0 && j === this.tooltipConfig.title.dimension.length - 1) {
            break;
          }
          totalTitles += this.tooltipConfig.title.dimension[j].height;
        }

        totalContent += this.defaultSettings.filterGutter;

        if (i === 1) {
          totalContent += this.tooltipConfig.weightsFrame.height;
          totalContent += .5 * this.tooltipConfig.weightsFrame.margin;
        }

        return mouseY +
          this.tooltipConfig.quadrantAdjustment.y +
          totalTitles +
          totalContent;
      })
      .attr('width', this.tooltipConfig.weightsFrame.width)
      .attr('height', this.tooltipConfig.weightsFrame.height)
      .attr('fill', 'transparent');


    const filtersFrames = comparisonItem.selectAll('.filters-frames')
      .data(d => d)
      .enter()
      .append('g')
      .attr('class', 'filters-frames');

    filtersFrames.append('rect')
      .attr('x', function (d, i) {
        const rectXValue = +d3.select(this.parentNode.parentNode).select('rect').attr('x');
        const xPosition = (i % self.tooltipConfig.filtersFrame.numElements) *
          self.tooltipConfig.filtersFrame.width;
        const xGutter = (i % self.tooltipConfig.filtersFrame.numElements) *
          self.defaultSettings.filterGutter;

        return rectXValue + xPosition + xGutter;
      })
      .attr('y', function (d, i) {
        const rectYValue = +d3.select(this.parentNode.parentNode).select('rect').attr('y');
        const yPosition = Math.floor(i / self.tooltipConfig.filtersFrame.numElements) *
          self.tooltipConfig.filtersFrame.height;
        const yGutter = Math.floor(i / self.tooltipConfig.filtersFrame.numElements) *
          self.defaultSettings.filterGutter;

        return rectYValue + yPosition + yGutter;
      })
      .attr('width', this.tooltipConfig.filtersFrame.width)
      .attr('height', this.tooltipConfig.filtersFrame.height);


    const filtersRows = filtersFrames.selectAll('.filters-rows')
      .data(d => d)
      .enter()
      .append('g')
      .attr('class', 'filters-rows');

    filtersRows.append('rect')
      .attr('x', function () {
        return +d3.select(this.parentNode.parentNode).select('rect').attr('x');
      })
      .attr('y', function (d, i) {
        const rectYValue = +d3.select(this.parentNode.parentNode).select('rect').attr('y');
        const yPosition = i * self.tooltipConfig.filter.height;

        return rectYValue + yPosition;
      })
      .attr('width', this.tooltipConfig.filtersFrame.width)
      .attr('height', this.tooltipConfig.filter.height);

    filtersRows.selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
      .attr('x', function (d, i) {
        const rectXValue = +d3.select(this.parentNode).select('rect').attr('x');
        const xPosition = (i - 1) * self.tooltipConfig.filter.width;

        return rectXValue + xPosition;
      })
      .attr('y', function () {
        return +d3.select(this.parentNode).select('rect').attr('y');
      })
      .attr('width', this.tooltipConfig.filter.width)
      .attr('height', this.tooltipConfig.filter.height)
      .style('fill', d => this.tooltipConfig.color(Math.round(d * 100) / 100));


    // // console.clear();

    // // console.log('Incoming Weights before training:', this.untrainedWeights[incomingFilters][this.conMenuSelected.unit]);
    // // console.log('Incoming Weights after training:', this.inputWeights[incomingFilters][this.conMenuSelected.unit]);
  }

  /**
   * Setups the tooltip of mlp units.
   */
  setupMLPTooltip() {
    const self = this;
    this.tooltipTexts = [
      `FC Layer ${this.selectedUnit.layer + 1} - Unit ${this.selectedUnit.unit + 1}`,
      `Incoming Weights`,
      `Before`,
      `After`,
      `Outgoing Weights`,
      `Before`,
      `After`
    ];

    this.tooltipConfig = {
      outerFrame: {
        width: 0,
        height: 0,
        margin: 5,
        cornerRad: 7.5,
        fill: '#2b2b2b'
      },
      title: {
        margin: 15,
        color: '#ffffff',
        dimension: []
      },
      weightsFrame: {
        width: 84,
        height: 84,
        margin: 15,
        fill: 'whitesmoke'
      },
      positiveColor: d3.interpolateLab('whitesmoke', 'indianred'),
      negativeColor: d3.interpolateLab('whitesmoke', 'royalblue')
    };

    this.tooltipGroup.selectAll('.tmp')
      .data(this.tooltipTexts)
      .enter()
      .append('text')
      .text(d => d)
      .attr('class', 'tmp')
      .each(function (d, i) {
        const bbox = this.getBBox();
        const dimension = {
          width: bbox.width,
          height: bbox.height
        };

        self.tooltipConfig.title.dimension[i] = dimension;
      });
    d3.selectAll('.tmp').remove();

    this.tooltipConfig.outerFrame.width = 2 * this.tooltipConfig.weightsFrame.width +
      2.75 * this.tooltipConfig.weightsFrame.margin;
    this.tooltipConfig.outerFrame.height =
      this.tooltipConfig.title.dimension.map(dimension => dimension.height).reduce((a, b) => a + b) +
      2 * this.tooltipConfig.title.margin +
      2 * this.tooltipConfig.weightsFrame.height;
  }

  /**
   * Bind MLP tooltip to svg.
   * @param mouseX Mouse's X coordinate.
   * @param mouseY Mouse's Y coordinate.
   */
  bindMLPTooltip(mouseX, mouseY) {
    const self = this;


    const currEpoch = `epoch_${this.epochSlider.currEpoch - 1}`;
    const incomingWeights = (this.selectedUnit.layer === 0) ?
      'input' : `h${this.selectedUnit.layer}`;
    const outgoingWeights = (this.selectedUnit.layer + 1 === this.lastNNSettings.denseLayers.length - 1) ?
      'output' : `h${this.selectedUnit.layer + 1}`;

    const outgoingWeightsBefore = [];
    const outgoingWeightsAfter = [];
    this.untrainedWeights.epoch_0[outgoingWeights].forEach(element => {
      outgoingWeightsBefore.push(element[this.selectedUnit.unit]);
    });
    this.lastNNWeights[currEpoch][outgoingWeights].forEach(element => {
      outgoingWeightsAfter.push(element[this.selectedUnit.unit]);
    });

    this.tooltipConfig.quadrantAdjustment = {
      x: this.tooltipConfig.outerFrame.margin,
      y: this.tooltipConfig.outerFrame.margin
    };
    if (mouseX > this.svgWidth / 2) {
      this.tooltipConfig.quadrantAdjustment.x *= -1;
      this.tooltipConfig.quadrantAdjustment.x += -1 * this.tooltipConfig.outerFrame.width;
    }
    if (mouseY > this.svgHeight / 2) {
      this.tooltipConfig.quadrantAdjustment.y *= -1;
      this.tooltipConfig.quadrantAdjustment.y += -1 * this.tooltipConfig.outerFrame.height;
    }


    const weightsComparison = this.tooltipGroup.append('g')
      .attr('class', 'weights-comparison');

    weightsComparison.append('rect')
      .attr('x', mouseX + this.tooltipConfig.quadrantAdjustment.x)
      .attr('y', mouseY + this.tooltipConfig.quadrantAdjustment.y)
      .attr('width', this.tooltipConfig.outerFrame.width)
      .attr('height', this.tooltipConfig.outerFrame.height)
      .attr('rx', this.tooltipConfig.outerFrame.cornerRad)
      .attr('ry', this.tooltipConfig.outerFrame.cornerRad)
      .style('fill', this.tooltipConfig.outerFrame.fill);


    weightsComparison.selectAll('text')
      .data(this.tooltipTexts)
      .enter()
      .append('text')
      .text(d => d)
      .attr('x', (d, i) => {
        let centerAligned = 0;
        if (i === 0 || d === 'Before' || d === 'After') {
          if (i === 0) {
            centerAligned += this.tooltipConfig.outerFrame.width / 2;
          } else if (d === 'Before') {
            centerAligned += this.tooltipConfig.outerFrame.width / 4;
          } else if (d === 'After') {
            centerAligned += 3 * this.tooltipConfig.outerFrame.width / 4;
          }

          centerAligned -= this.tooltipConfig.title.dimension[i].width / 2;
          centerAligned -= this.tooltipConfig.title.margin;
        }


        return mouseX +
          this.tooltipConfig.quadrantAdjustment.x +
          this.tooltipConfig.title.margin +
          centerAligned;
      })
      .attr('y', (d, i) => {
        let totalTitles = this.tooltipConfig.title.margin;
        let totalContent = 0;

        if (i > 0) {
          totalTitles = 2 * this.tooltipConfig.title.margin;
        }
        for (let j = 0; j <= i; j++) {
          totalTitles += this.tooltipConfig.title.dimension[j].height;
        }
        if (d === 'After') {
          totalTitles -= this.tooltipConfig.title.dimension[i].height;
        }

        if (i > 3) {
          totalTitles -= this.tooltipConfig.title.dimension[3].height;
          totalContent += this.tooltipConfig.weightsFrame.height;
          totalContent += .75 * this.tooltipConfig.weightsFrame.margin;
        }


        return mouseY +
          this.tooltipConfig.quadrantAdjustment.y +
          totalTitles +
          totalContent;
      })
      .attr('fill', this.tooltipConfig.title.color);


    this.tooltipConfig.data = [];
    this.tooltipConfig.data.push([...this.untrainedWeights.epoch_0[incomingWeights][this.selectedUnit.unit]]);
    this.tooltipConfig.data.push([...this.lastNNWeights[currEpoch][incomingWeights][this.selectedUnit.unit]]);
    this.tooltipConfig.data.push([...outgoingWeightsBefore]);
    this.tooltipConfig.data.push([...outgoingWeightsAfter]);

    this.tooltipConfig.weights = [];
    this.tooltipConfig.data.forEach(data => {
      this.tooltipConfig.weights.push({
        min: Math.min(...data),
        max: Math.max(...data),
        width: this.tooltipConfig.weightsFrame.width / Math.ceil(Math.sqrt(data.length)),
        height: this.tooltipConfig.weightsFrame.height / Math.ceil(Math.sqrt(data.length)),
        numElements: Math.ceil(Math.sqrt(data.length))
      });
    });

    // d3 workaround - attr's index starts from 1 instead of 0
    this.tooltipConfig.data.forEach(data => { data.unshift('d3 workaround'); });

    const comparisonItem = weightsComparison.selectAll('.comparison-item')
      .data(this.tooltipConfig.data)
      .enter()
      .append('g')
      .attr('class', 'comparison-item');

    comparisonItem.append('rect')
      .attr('x', (d, i) =>
        mouseX +
        this.tooltipConfig.quadrantAdjustment.x +
        (i % 2) * this.tooltipConfig.weightsFrame.width +
        (i % 2 * .75 + 1) * this.tooltipConfig.weightsFrame.margin
      )
      .attr('y', (d, i) => {
        let totalTitles = 2 * this.tooltipConfig.title.margin +
          this.tooltipConfig.title.dimension[0].height;
        let totalContent = Math.floor(i / 2) * this.tooltipConfig.weightsFrame.height +
          .25 * this.tooltipConfig.weightsFrame.margin;


        for (let j = 0; j < this.tooltipConfig.title.dimension.length; j++) {
          if (Math.floor(i / 2) === 0 && j > 2) { break; }

          if (j % 3 === 0) { continue; }
          if (j % 3 === 1 || j % 3 === 2) { totalTitles += this.tooltipConfig.title.dimension[j].height; }
        }

        if (Math.floor(i / 2) === 1) {
          totalContent += .75 * this.tooltipConfig.weightsFrame.margin;
        }

        return mouseY +
          this.tooltipConfig.quadrantAdjustment.y +
          totalTitles +
          totalContent;
      })
      .attr('width', this.tooltipConfig.weightsFrame.width)
      .attr('height', this.tooltipConfig.weightsFrame.height)
      .style('fill', this.tooltipConfig.weightsFrame.fill);


    let tempIndex = -1;
    comparisonItem.selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
      .attr('x', function (d, i) {
        if (i === 1) { tempIndex++; }

        const currIndex = tempIndex % self.tooltipConfig.data.length;
        const rectXValue = +d3.select(this.parentNode).select('rect').attr('x');
        const xPosition = ((i - 1) % self.tooltipConfig.weights[currIndex].numElements) *
          self.tooltipConfig.weights[currIndex].width;

        return rectXValue + xPosition;
      })
      .attr('y', function (d, i) {
        if (i === 1) { tempIndex++; }

        const currIndex = tempIndex % self.tooltipConfig.data.length;
        const rectYValue = +d3.select(this.parentNode).select('rect').attr('y');
        const yPosition = Math.floor((i - 1) / self.tooltipConfig.weights[currIndex].numElements) *
          self.tooltipConfig.weights[currIndex].height;

        return rectYValue + yPosition;
      })
      .attr('width', (d, i) => {
        if (i === 1) { tempIndex++; }
        const currIndex = tempIndex % this.tooltipConfig.data.length;

        return this.tooltipConfig.weights[currIndex].width;
      })
      .attr('height', (d, i) => {
        if (i === 1) { tempIndex++; }
        const currIndex = tempIndex % this.tooltipConfig.data.length;

        return this.tooltipConfig.weights[currIndex].height;
      })
      .style('fill', (d, i) => {
        if (i === 1) { tempIndex++; }

        const currIndex = tempIndex % this.tooltipConfig.data.length;
        let scaledValue = 0;

        if (d > 0) {
          scaledValue = d / this.tooltipConfig.weights[currIndex].max;
          return this.tooltipConfig.positiveColor(scaledValue);
        } else if (d < 0) {
          scaledValue = d / this.tooltipConfig.weights[currIndex].min;
          return this.tooltipConfig.negativeColor(scaledValue);
        }
      });


    // console.clear();

    // console.log('Incoming Weights before training:', this.untrainedWeights.epoch_0[incomingWeights][this.selectedUnit.unit]);
    // console.log('Incoming Weights after training:', this.lastNNWeights[currEpoch][incomingWeights][this.selectedUnit.unit]);
    // console.log('Outgoing Weights before training:', outgoingWeightsBefore);
    // console.log('Outgoing Weights after training:', outgoingWeightsAfter);
  }

  /**
   * Resets visualization
   */
  resetViz() {
    if (this.container) {
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
      this.tooltipGroup = this.svg.append('g');
      this.legendGroup = this.svg.append('g');

      const self = this;
      this.zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on('zoom', () => {
          self.graphGroup.attr('transform', d3.event.transform);
        })
        .on('end', () => { this.currTransform = d3.event.transform; });
      this.svg.call(this.zoom);

      this.svg.on('contextmenu', () => { d3.event.preventDefault(); });

      if (this.dataService.activeSideMenu === this.activeSideMenu.NetworkAblator) {
        this.drawLegend();
      }
    }
  }

  /**
   * Viz container is resized.
   */
  containerResized() {
    this.eventsService.updateLayerView.next(this.dataService.selectedNetwork);
  }

  /**
   * A callback to show mlp'S tooltip.
   * @param d The D3-bounded data.
   * @param self Reference to LayerViewComponent.
   * @param currCircle Reference to the selected circle.
   */
  showMLPTooltip(d, self, currCircle) {
    self.selectedUnit = Object.assign({}, d);
    self.selectedUnit.layer -= (self.lastNNSettings.convLayers.length + 1);

    if (!d.isOutput) {
      self.setupMLPTooltip();
      self.bindMLPTooltip(d3.mouse(currCircle)[0], d3.mouse(currCircle)[1]);
    }

    d3.select(currCircle)
      .classed('focused', true);
  }

  /**
   * A callback to remove mlp'S tooltip.
   * @param d The D3-bounded data.
   */
  removeMLPTooltip(d) {
    d3.selectAll('.weights-comparison').remove();
    d3.select(this)
      .classed('focused', false);
  }

  /**
   * Draws legend when ablation mode is active.
   */
  drawLegend() {
    const self = this;
    const legendConfig = {
      outerFrame: {
        width: 125,
        height: 70,
        margin: 15,
        cornerRad: 7.5,
        fill: '#2b2b2b'
      },
      item: {
        margin: 10
      },
      data: ['ablated', 'not ablated']
    };

    const legend = this.legendGroup.attr('class', 'legend');

    legend.append('rect')
      .attr('x', legendConfig.outerFrame.margin)
      .attr('y', legendConfig.outerFrame.margin)
      .attr('width', legendConfig.outerFrame.width)
      .attr('height', legendConfig.outerFrame.height)
      .attr('rx', legendConfig.outerFrame.cornerRad)
      .attr('ry', legendConfig.outerFrame.cornerRad)
      .style('fill', legendConfig.outerFrame.fill);

    legend.selectAll('.legend-circles')
      .data(legendConfig.data)
      .enter()
      .append('circle')
      .attr('class', function (d) {
        let className = 'legend-circles';
        if (d === 'ablated') { className += ' legend-ablated'; }
        return className;
      })
      .attr('cx', function () {
        const rectXValue = +d3.select(this.parentNode).select('rect').attr('x');

        return rectXValue +
          legendConfig.item.margin +
          self.defaultSettings.nodeRadius;
      })
      .attr('cy', function (d, i) {
        const rectYValue = +d3.select(this.parentNode).select('rect').attr('y');

        return rectYValue +
          (i + 1) * legendConfig.item.margin +
          (i * 2 + 1) * self.defaultSettings.nodeRadius;
      })
      .attr('r', this.defaultSettings.nodeRadius)
      .attr('fill', this.defaultSettings.color);

    legend.selectAll('text')
      .data(legendConfig.data)
      .enter()
      .append('text')
      .text(d => d)
      .attr('x', function (d, i) {
        const rectXValue = +d3.select(this.parentNode).select('rect').attr('x');

        return rectXValue +
          2 * legendConfig.item.margin +
          2 * self.defaultSettings.nodeRadius +
          3;
      })
      .attr('y', function (d, i) {
        const rectYValue = +d3.select(this.parentNode).select('rect').attr('y');

        return rectYValue +
          (i + 1) * legendConfig.item.margin +
          (i * 2 + 1) * self.defaultSettings.nodeRadius +
          5;
      })
      .attr('fill', 'whitesmoke');
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
