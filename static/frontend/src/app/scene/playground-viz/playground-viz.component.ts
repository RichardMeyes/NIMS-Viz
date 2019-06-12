import { Component, OnInit, ViewChild, HostListener, OnDestroy } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil, filter, concatMap } from 'rxjs/operators';

import * as d3 from 'd3';

import { DataService } from 'src/app/services/data.service';
import { PlaygroundService } from 'src/app/playground.service';

@Component({
  selector: 'app-playground-viz',
  templateUrl: './playground-viz.component.html',
  styleUrls: ['./playground-viz.component.scss']
})
export class PlaygroundVizComponent implements OnInit, OnDestroy {
  @ViewChild('container') container;

  toolbarHeight;
  svg; svgWidth; svgHeight;
  zoom; currTransform;
  vizContainer;

  minWidthHeight;
  topMargin; leftMargin;

  selectedFile;

  inputTopology; inputWeights;

  defaultSettings;
  layerSpacing;
  topology; edges;


  weights;
  minMaxDiffs; activities;
  selectedFilter;

  destroyed = new Subject<void>();

  @HostListener('window:resize', ['$event'])
  onResize() { this.drawWeights(false); }

  constructor(
    private dataService: DataService,
    private playgroundService: PlaygroundService
  ) { }

  ngOnInit() {
    this.defaultSettings = {
      rectSide: 20,
      nodeRadius: 10,
      color: '#373737',
      nodeOpacity: .5,
      nodeStroke: 0,
      duration: 500
    };

    this.dataService.toolbarHeight
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.toolbarHeight = val; });

    this.dataService.visualize
      .pipe(
        takeUntil(this.destroyed),
        filter(val => val === true),
        concatMap(() => {
          this.selectedFile = this.dataService.selectedFile.getValue();
          return this.playgroundService.getTopology(this.selectedFile);
        }),
        concatMap(topology => {
          this.inputTopology = topology;
          this.drawTopology();

          return this.playgroundService.getWeights(this.selectedFile);
        }),
      )
      .subscribe(val => {
        this.inputWeights = val;
        this.drawWeights(true);
        console.log(this.inputTopology);
        console.log(this.inputWeights);
      });





    // this.dataService.selectedFilter
    //   .pipe(takeUntil(this.destroyed))
    //   .subscribe(val => {
    //     this.selectedFilter = val;
    //     this.highlightSelectedFilter();
    //   });
  }

  drawTopology() {
    this.resetViz();

    if (this.inputTopology) {
      this.setupTopology();
      this.bindTopology();
    }
  }

  setupTopology() {
    let convLayers: number[] = [1];
    let layers: number[] = [];
    const filteredTopology = [];
    const filteredEdges = [];

    convLayers = convLayers.concat(this.inputTopology['conv_layers'].map(conv_layer => +conv_layer.outChannel));
    layers = layers.concat(this.inputTopology['layers'].map(layer => +layer));
    layers.push(10);


    convLayers.forEach((convLayer, convLayerIndex) => {
      let nextLayer = layers[0];
      if (convLayerIndex < convLayers.length - 1) {
        nextLayer = convLayers[convLayerIndex + 1];
      }

      for (let i = 0; i < convLayer; i++) {
        filteredTopology.push({
          layer: convLayerIndex,
          unit: i,
          unitSpacing: (this.minWidthHeight / convLayer),
          isOutput: false,
          isConv: true
        });

        for (let j = 0; j < nextLayer; j++) {
          filteredEdges.push({
            layer: convLayerIndex,
            source: i,
            target: j,
            unitSpacing: (this.minWidthHeight / convLayer),
            targetUnitSpacing: (this.minWidthHeight / nextLayer)
          });
        }
      }
    });

    layers.forEach((layer, layerIndex) => {
      const nextLayer = layers[layerIndex + 1];
      const isOutput = (layerIndex < layers.length - 1) ? false : true;

      for (let i = 0; i < layer; i++) {
        filteredTopology.push({
          layer: convLayers.length + layerIndex,
          unit: i,
          unitSpacing: (this.minWidthHeight / layer),
          isOutput: isOutput,
          isConv: false
        });

        if (!isOutput) {
          for (let j = 0; j < nextLayer; j++) {
            filteredEdges.push({
              layer: convLayers.length + layerIndex,
              source: i,
              target: j,
              unitSpacing: (this.minWidthHeight / layer),
              targetUnitSpacing: (this.minWidthHeight / nextLayer)
            });
          }
        }
      }
    });


    this.layerSpacing = this.minWidthHeight / (convLayers.length + layers.length);
    this.topology = filteredTopology;
    this.edges = filteredEdges;
  }

  bindTopology() {
    const self = this;


    const line = this.vizContainer.selectAll('.edges')
      .data(this.edges);

    line.enter()
      .append('line')
      .attr('class', 'edges')
      .attr('x1', function (d) {
        const x1: number = self.leftMargin + (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return x1;
      })
      .attr('y1', function (d) {
        const y1: number = self.topMargin + (d.unitSpacing * d.source) + (d.unitSpacing / 2);
        return y1;
      })
      .attr('x2', function (d) {
        const x2: number = self.leftMargin + (self.layerSpacing * (d.layer + 1)) + (self.layerSpacing / 2);
        return x2;
      })
      .attr('y2', function (d) {
        const y2: number = self.topMargin + (d.targetUnitSpacing * d.target) + (d.targetUnitSpacing / 2);
        return y2;
      });


    let rects = this.vizContainer.selectAll('rect')
      .data(this.topology.filter(nodes => nodes.isConv));

    rects = rects.enter()
      .append('rect')
      .attr('class', 'rect')
      .attr('x', function (d) {
        const x: number = self.leftMargin + (self.layerSpacing * d.layer) + (self.layerSpacing / 2) - (0.5 * self.defaultSettings.rectSide);
        return x;
      })
      .attr('y', function (d) {
        const y: number = self.topMargin + (d.unitSpacing * d.unit) + (d.unitSpacing / 2) - (0.5 * self.defaultSettings.rectSide);
        return y;
      })
      .attr('width', this.defaultSettings.rectSide)
      .attr('height', this.defaultSettings.rectSide)
      .attr('fill', this.defaultSettings.color)
      .attr('fill-opacity', this.defaultSettings.nodeOpacity);


    const circles = this.vizContainer.selectAll('circle')
      .data(this.topology.filter(nodes => !nodes.isConv));

    circles.enter()
      .append('circle')
      .attr('class', 'circle')
      .attr('cx', function (d) {
        const cx: number = self.leftMargin + (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return cx;
      })
      .attr('cy', function (d) {
        const cy: number = self.topMargin + (d.unitSpacing * d.unit) + (d.unitSpacing / 2);
        return cy;
      })
      .attr('r', this.defaultSettings.nodeRadius)
      .attr('fill', this.defaultSettings.color)
      .attr('fill-opacity', this.defaultSettings.nodeOpacity);
  }

  drawWeights(runAnimation) {
    this.activities = [];

    if (this.inputWeights) {
      this.setupWeights();
      this.bindWeights(runAnimation);
    }
  }

  setupWeights() {
    const filteredData = [];
    const currEpoch = Object.keys(this.inputWeights)[0];
    let diffsPerEpoch;

    Object.keys(this.inputWeights[currEpoch]).forEach((layer, layerIndex) => {
      if (!layer.startsWith('c') && layer !== 'h0') {
        if (!diffsPerEpoch) { diffsPerEpoch = { min: 0, max: 0 }; }

        this.inputWeights[currEpoch][layer].forEach((destination, destinationIndex) => {
          destination.forEach((source, sourceIndex) => {
            if (source < diffsPerEpoch.min) { diffsPerEpoch.min = source; }
            if (source > diffsPerEpoch.max) { diffsPerEpoch.max = source; }

            filteredData.push({
              layer: layerIndex,
              source: sourceIndex,
              target: destinationIndex,
              value: source,
              unitSpacing: (this.minWidthHeight / +destination.length),
              targetUnitSpacing: (this.minWidthHeight / +this.inputWeights[currEpoch][layer].length)
            });
          });
        });
      }
    });

    this.weights = filteredData;
    this.minMaxDiffs = diffsPerEpoch;

    this.weights.forEach(el => { el.stroke = this.generateWeightsColor(el); });
    this.topology.forEach(el => {
      const nodeColor = this.generateNodesColor(el);
      el.fill = nodeColor.color;
      el.opacity = nodeColor.opacity;
    });

    this.weights = this.weights.filter(weight => weight.stroke !== this.defaultSettings.color);
  }

  bindWeights(runAnimation) {
    d3.selectAll('.weights').remove();
    d3.selectAll('circle').remove();
    const self = this;


    const line = this.vizContainer.selectAll('.weights')
      .data(this.weights);

    let enterWeights = line.enter()
      .append('line')
      .attr('class', 'weights')
      .attr('x1', function (d) {
        const x1: number = self.leftMargin + (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return x1;
      })
      .attr('y1', function (d) {
        const y1: number = self.topMargin + (d.unitSpacing * d.source) + (d.unitSpacing / 2);
        return y1;
      })
      .attr('x2', function (d) {
        const x2: number = self.leftMargin + (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return x2;
      })
      .attr('y2', function (d) {
        const y2: number = self.topMargin + (d.unitSpacing * d.source) + (d.unitSpacing / 2);
        return y2;
      })
      .attr('stroke', function (d) { return d.stroke; });

    if (runAnimation) {
      enterWeights = enterWeights.transition()
        .duration(2.5 * this.defaultSettings.duration)
        .delay(function (d) {
          // const nodesDelay = self.defaultSettings.duration * (d.layer + 1);
          // const weightsDelay = 2.5 * self.defaultSettings.duration * d.layer;
          const nodesDelay = self.defaultSettings.duration * (d.layer + 1 - self.inputTopology['conv_layers'].length);
          const weightsDelay = 2.5 * self.defaultSettings.duration * (d.layer - self.inputTopology['conv_layers'].length);
          return nodesDelay + weightsDelay;
        });
    }
    enterWeights
      .attr('x2', function (d) {
        const x2: number = self.leftMargin + (self.layerSpacing * (d.layer + 1)) + (self.layerSpacing / 2);
        return x2;
      })
      .attr('y2', function (d) {
        const y2: number = self.topMargin + (d.targetUnitSpacing * d.target) + (d.targetUnitSpacing / 2);
        return y2;
      });


    const circles = this.vizContainer.selectAll('circle')
      .data(this.topology.filter(nodes => !nodes.isConv));

    let enterCircles = circles.enter()
      .append('circle')
      .attr('class', 'circle')
      .attr('cx', function (d) {
        const cx: number = self.leftMargin + (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return cx;
      })
      .attr('cy', function (d) {
        const cy: number = self.topMargin + (d.unitSpacing * d.unit) + (d.unitSpacing / 2);
        return cy;
      })
      .attr('r', this.defaultSettings.nodeRadius)
      .attr('fill', this.defaultSettings.color)
      .attr('fill-opacity', this.defaultSettings.nodeOpacity)
      .attr('stroke', this.defaultSettings.color)
      .attr('stroke-width', this.defaultSettings.nodeStroke);

    if (runAnimation) {
      enterCircles = enterCircles.transition()
        .duration(this.defaultSettings.duration)
        .delay(function (d) {
          // const nodesDelay = self.defaultSettings.duration * d.layer;
          // const weightsDelay = 2.5 * self.defaultSettings.duration * d.layer;
          const nodesDelay = self.defaultSettings.duration * (d.layer - self.inputTopology['conv_layers'].length);
          const weightsDelay = 2.5 * self.defaultSettings.duration * (d.layer - self.inputTopology['conv_layers'].length);
          return nodesDelay + weightsDelay;
        });
    }
    enterCircles
      .attr('fill', function (d) { return d.fill; })
      .attr('fill-opacity', function (d) { return d.opacity; })
      .attr('stroke', function (d) { return (d.fill === '#373737') ? d.fill : '#F44336'; })
      .attr('stroke-width', .15 * this.defaultSettings.nodeRadius);
  }

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
        activity: activity
      });
    }

    return color;
  }

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

    return {
      'color': color,
      'opacity': opacity
    };
  }

  resetViz() {
    this.svgWidth = window.innerWidth;
    this.svgHeight = window.innerHeight - (this.toolbarHeight + this.dataService.tabsHeight + this.dataService.bottomMargin);

    this.minWidthHeight = Math.min(this.svgWidth, this.svgHeight);
    this.topMargin = (this.svgHeight - this.minWidthHeight) / 2;
    this.leftMargin = (this.svgWidth - this.minWidthHeight) / 2;


    if (this.svg) { this.svg.remove(); }
    this.svg = d3.select(this.container.nativeElement)
      .append('svg')
      .attr('width', this.svgWidth)
      .attr('height', this.svgHeight);
    this.vizContainer = this.svg.append('g');

    const self = this;
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', () => {
        self.vizContainer.attr('transform', d3.event.transform);
      })
      .on('end', () => { this.currTransform = d3.event.transform; });
    this.svg.call(this.zoom);

    this.svg.on('contextmenu', () => { d3.event.preventDefault(); });
  }

  // highlightSelectedFilter() {
  //   let selectedConvLayer; let selectedUnit; let selectedWeight;
  //   let highlightedTopology; let highlightedWeight;

  //   if (this.selectedFilter) {
  //     [selectedConvLayer, selectedUnit, selectedWeight] = [...this.selectedFilter.split('-')];

  //     for (let i = 0; i < this.topology.length; i++) {
  //       if (this.topology[i].isConv &&
  //         this.topology[i].layer === +selectedConvLayer.substring(1) &&
  //         this.topology[i].unit === +selectedUnit) {
  //         highlightedTopology = this.topology[i];
  //         break;
  //       }
  //     }

  //     if (selectedWeight) {
  //       const layer = +selectedConvLayer.substring(1) - 1;
  //       if (layer >= 0) {
  //         for (let i = 0; i < this.edges.length; i++) {
  //           if (this.edges[i].layer === layer &&
  //             this.edges[i].source === +selectedWeight &&
  //             this.edges[i].target === +selectedUnit) {
  //             highlightedWeight = this.edges[i];
  //             break;
  //           }
  //         }
  //       }
  //     }

  //     this.selectedFilter = [this.selectedFilter];

  //     console.clear();
  //     console.log(selectedConvLayer, selectedUnit, selectedWeight);
  //     console.log(highlightedTopology);
  //     console.log(this.topology);
  //     console.log(this.edges);
  //   }

  //   if (this.vizContainer) {
  //     if (this.selectedFilter) {
  //       this.selectedFilter = [this.selectedFilter];
  //     } else {
  //       this.selectedFilter = [];
  //     }
  //     const rects = this.vizContainer.selectAll('.highlightedRect')
  //       .data(this.selectedFilter, d => d);

  //     rects.exit()
  //       .remove();

  //     if (highlightedTopology) {
  //       rects.enter()
  //         .append('rect')
  //         .attr('class', 'highlightedRect')
  //         .attr('x', () => {
  //           const x: number = this.leftMargin +
  //             (this.layerSpacing * highlightedTopology.layer) +
  //             (this.layerSpacing / 2) -
  //             (0.5 * this.defaultSettings.rectSide);
  //           return x;
  //         })
  //         .attr('y', () => {
  //           const y: number = this.topMargin +
  //             (highlightedTopology.unitSpacing * highlightedTopology.unit) +
  //             (highlightedTopology.unitSpacing / 2) -
  //             (0.5 * this.defaultSettings.rectSide);
  //           return y;
  //         })
  //         .attr('width', this.defaultSettings.rectSide)
  //         .attr('height', this.defaultSettings.rectSide)
  //         .attr('fill', 'whitesmoke')
  //         .attr('fill-opacity', this.defaultSettings.nodeOpacity)
  //         .attr('stroke', this.defaultSettings.color)
  //         .attr('stroke-width', this.defaultSettings.nodeStroke);
  //     }


  //     if (selectedWeight) {
  //       selectedWeight = [selectedWeight];
  //     } else {
  //       selectedWeight = [];
  //     }
  //     const line = this.vizContainer.selectAll('.highlightedEdges')
  //       .data(selectedWeight, d => d);

  //     line.exit()
  //       .remove();

  //     if (highlightedWeight) {
  //       line.enter()
  //         .append('line')
  //         .attr('class', 'highlightedEdges')
  //         .attr('x1', (d) => {
  //           const x1: number = this.leftMargin + (this.layerSpacing * highlightedWeight.layer) + (this.layerSpacing / 2);
  //           return x1;
  //         })
  //         .attr('y1', (d) => {
  //           const y1: number = this.topMargin +
  //             (highlightedWeight.unitSpacing * highlightedWeight.source) +
  //             (highlightedWeight.unitSpacing / 2);
  //           return y1;
  //         })
  //         .attr('x2', (d) => {
  //           const x2: number = this.leftMargin + (this.layerSpacing * (highlightedWeight.layer + 1)) + (this.layerSpacing / 2);
  //           return x2;
  //         })
  //         .attr('y2', (d) => {
  //           const y2: number = this.topMargin +
  //             (highlightedWeight.targetUnitSpacing * highlightedWeight.target) +
  //             (highlightedWeight.targetUnitSpacing / 2);
  //           return y2;
  //         })
  //         .attr('stroke', 'whitesmoke');
  //     }
  //   }
  // }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
