import { Component, OnInit, ViewChild, OnDestroy, HostListener } from '@angular/core';

import { Subject, from } from 'rxjs';
import { takeUntil, filter, concatMap } from 'rxjs/operators';

import { DataService } from 'src/app/services/data.service';
import { PlaygroundService } from 'src/app/playground.service';

import * as d3 from 'd3';

@Component({
  selector: 'app-ablation-playground',
  templateUrl: './ablation-playground.component.html',
  styleUrls: ['./ablation-playground.component.scss']
})
export class AblationPlaygroundComponent implements OnInit, OnDestroy {
  @ViewChild('container') container;

  svg; svgWidth; svgHeight;
  zoom; currTransform;
  vizContainer;

  minWidthHeight;
  topMargin; leftMargin;

  selectedFile;

  inputTopology; inputWeights;
  untrainedWeights;

  defaultSettings;
  layerSpacing;
  topology; edges;

  conMenuSelected;
  tooltipConfig; tooltipTexts;
  classifyResult;

  detachedNodes;

  destroyed = new Subject<void>();

  @HostListener('window:resize', ['$event'])
  onResize(event) { this.drawTopology(); }

  constructor(
    private dataService: DataService,
    private playgroundService: PlaygroundService
  ) { }

  ngOnInit() {
    this.defaultSettings = {
      rectSide: 20,
      nodeRadius: 10,
      color: '#4C516D',
      nodeOpacity: .5,
      nodeStroke: 0,
      duration: 500,
      unitGutter: 5
    };
    this.detachedNodes = [];

    this.dataService.visualize
      .pipe(
        takeUntil(this.destroyed),
        filter(val => val === true),
        concatMap(() => {
          this.selectedFile = this.dataService.selectedFile;
          const untrainedFile = this.selectedFile.replace('.json', '_untrained.json');

          return this.playgroundService.getUntrainedWeights(untrainedFile);
        }),
        concatMap(untrainedWeights => {
          this.untrainedWeights = untrainedWeights;
          return this.playgroundService.getTopology(this.selectedFile);
        }),
        concatMap(topology => {
          this.inputTopology = topology;
          this.drawTopology();

          return this.playgroundService.getWeights(this.selectedFile);
        })
      )
      .subscribe(val => {
        const allKeys = Object.keys(val).sort();
        this.inputWeights = val[allKeys[allKeys.length - 1]];
      });

    this.dataService.classifyResult
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        this.classifyResult = val;
        this.drawTopology();

        console.clear();
        console.log(this.classifyResult);
      });

    this.dataService.resetNetwork
      .pipe(takeUntil(this.destroyed))
      .subscribe(() => {
        this.detachedNodes = [];
        this.dataService.detachedNodes = this.detachedNodes;

        d3.selectAll('.ablated')
          .classed('ablated', false);
      });





    // this.inputFilterWeights = {};

  }

  drawTopology() {
    // this.activities = [];
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

    let unitsPerColumn;
    const unitSpacing = { otherColumns: 0, lastColumn: 0 };
    const targetUnitSpacing = { otherColumns: 0, lastColumn: 0 };

    convLayers = convLayers.concat(this.inputTopology['conv_layers'].map(conv_layer => +conv_layer.outChannel));
    layers = layers.concat(this.inputTopology['layers'].map(layer => +layer));
    layers.push(10);


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
          unitsPerColumn: unitsPerColumn,
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
            unitsPerColumn: unitsPerColumn
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
          unitsPerColumn: unitsPerColumn,
          isOutput: isOutput,
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
              unitsPerColumn: unitsPerColumn
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


    let rects = this.vizContainer.selectAll('rect')
      .data(this.topology.filter(nodes => nodes.isConv));

    rects = rects.enter()
      .append('rect')
      .attr('class', function (d) {
        self.conMenuSelected = Object.assign({}, d);

        let className = 'rect';
        const ablated = self.findAblated();

        if (ablated !== -1) { className += ' ablated'; }

        return className;
      })
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
      self.conMenuSelected = Object.assign({}, d);
      self.conMenuSelected.layer -= 1;

      if (self.conMenuSelected.layer >= 0) {
        self.setupShowFilters();
        self.showFilters(d3.mouse(this)[0], d3.mouse(this)[1]);
      }

      d3.select(this)
        .classed('focused', true);
    });

    rects.on('mouseout', function (d) {
      d3.selectAll('.filters-comparison').remove();
      d3.select(this)
        .classed('focused', false);
    });

    rects.on('click', function (d) {
      d3.event.stopPropagation();
      self.conMenuSelected = Object.assign({}, d);

      if (self.conMenuSelected.layer >= 0) {
        const ablated = self.findAblated();

        if (ablated === -1) {
          self.detachedNodes.push(self.conMenuSelected);
        } else {
          self.detachedNodes.splice(ablated, 1);
        }

        self.dataService.detachedNodes = self.detachedNodes;
        d3.select(this)
          .classed('ablated', !d3.select(this).classed('ablated'));
      }
    });


    let circles = this.vizContainer.selectAll('circle')
      .data(this.topology.filter(nodes => !nodes.isConv));

    circles = circles.enter()
      .append('circle')
      .attr('class', function (d) {
        self.conMenuSelected = Object.assign({}, d);

        let className = 'circle';
        const ablated = self.findAblated();

        if (ablated !== -1) { className += ' ablated'; }

        return className;
      })
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

    circles.on('mouseover', function (d) {
      self.conMenuSelected = Object.assign({}, d);
      self.conMenuSelected.layer -= (self.inputTopology['conv_layers'].length + 1);

      if (!d.isOutput) {
        self.setupShowWeights();
        self.showWeights(d3.mouse(this)[0], d3.mouse(this)[1]);
      }

      d3.select(this)
        .classed('focused', true);
    });

    circles.on('mouseout', function (d) {
      d3.selectAll('.weights-comparison').remove();
      d3.select(this)
        .classed('focused', false);
    });

    circles.on('click', function (d) {
      d3.event.stopPropagation();
      self.conMenuSelected = Object.assign({}, d);

      if (!d.isOutput) {
        const ablated = self.findAblated();

        if (ablated === -1) {
          self.detachedNodes.push(self.conMenuSelected);
        } else {
          self.detachedNodes.splice(ablated, 1);
        }

        self.dataService.detachedNodes = self.detachedNodes;
        d3.select(this)
          .classed('ablated', !d3.select(this).classed('ablated'));
      }
    });
  }

  setupShowFilters() {
    const self = this;
    this.tooltipTexts = [
      `Conv Layer ${this.conMenuSelected.layer + 1} - Unit ${this.conMenuSelected.unit + 1}`,
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
        width: 117,
        height: 117,
        margin: 15,
        fill: 'black'
      },
      weightsFrame: {
        width: 150,
        height: 30,
        margin: 15,
        fill: 'black'
      },
      filtersFrame: {
        width: 15,
        height: 15,
        numElements: 10
      },
      color: d3.interpolateLab('black', 'white')
    };

    this.vizContainer.selectAll('.tmp')
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

  showFilters(mouseX, mouseY) {
    const self = this;
    const incomingFilters = `c${this.conMenuSelected.layer}`;


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


    const filtersComparison = this.vizContainer.append('g')
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
      this.tooltipConfig.featureMapData.push(classifyResultCloned['nodes_dict'][incomingFilters][this.conMenuSelected.unit]);
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
    const inputWeightsCloned = JSON.parse(JSON.stringify(this.inputWeights));
    this.tooltipConfig.data.push(untrainedWeightsCloned[incomingFilters][this.conMenuSelected.unit]);
    this.tooltipConfig.data.push(inputWeightsCloned[incomingFilters][this.conMenuSelected.unit]);

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

        return rectXValue + xPosition;
      })
      .attr('y', function (d, i) {
        const rectYValue = +d3.select(this.parentNode.parentNode).select('rect').attr('y');
        const yPosition = Math.floor(i / self.tooltipConfig.filtersFrame.numElements) *
          self.tooltipConfig.filtersFrame.height;

        return rectYValue + yPosition;
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


    // console.clear();

    // console.log('Incoming Weights before training:', this.untrainedWeights[incomingFilters][this.conMenuSelected.unit]);
    // console.log('Incoming Weights after training:', this.inputWeights[incomingFilters][this.conMenuSelected.unit]);
  }

  setupShowWeights() {
    const self = this;
    this.tooltipTexts = [
      `FC Layer ${this.conMenuSelected.layer + 1} - Unit ${this.conMenuSelected.unit + 1}`,
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

    this.vizContainer.selectAll('.tmp')
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

  showWeights(mouseX, mouseY) {
    const self = this;

    const incomingWeights = `h${this.conMenuSelected.layer}`;
    const outgoingWeights = (this.conMenuSelected.layer === this.inputTopology['layers'].length - 1) ?
      'output' : `h${this.conMenuSelected.layer + 1}`;

    const outgoingWeightsBefore = [];
    const outgoingWeightsAfter = [];
    this.untrainedWeights[outgoingWeights].forEach(element => {
      outgoingWeightsBefore.push(element[this.conMenuSelected.unit]);
    });
    this.inputWeights[outgoingWeights].forEach(element => {
      outgoingWeightsAfter.push(element[this.conMenuSelected.unit]);
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


    const weightsComparison = this.vizContainer.append('g')
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
    this.tooltipConfig.data.push([...this.untrainedWeights[incomingWeights][this.conMenuSelected.unit]]);
    this.tooltipConfig.data.push([...this.inputWeights[incomingWeights][this.conMenuSelected.unit]]);
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

    // console.log('Incoming Weights before training:', this.untrainedWeights[incomingWeights][this.conMenuSelected.unit]);
    // console.log('Incoming Weights after training:', this.inputWeights[incomingWeights][this.conMenuSelected.unit]);
    // console.log('Outgoing Weights before training:', outgoingWeightsBefore);
    // console.log('Outgoing Weights after training:', outgoingWeightsAfter);
  }

  findAblated() {
    let ablated = -1;

    if (this.detachedNodes.length > 0) {
      for (let i = 0; i < this.detachedNodes.length; i++) {
        if (this.detachedNodes[i].layer === this.conMenuSelected.layer && this.detachedNodes[i].unit === this.conMenuSelected.unit) {
          ablated = i;
          break;
        }
      }
    }

    return ablated;
  }

  resetViz() {
    this.svgWidth = this.container.nativeElement.offsetWidth;
    this.svgHeight = Math.max(this.container.nativeElement.offsetHeight - 60, 0);

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

    this.drawLegend();
  }

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

    const legend = this.svg.append('g')
      .attr('class', 'legend');

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
      .attr('fill', this.defaultSettings.color)
      .attr('fill-opacity', this.defaultSettings.nodeOpacity);

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


























  // weights;


  // minMaxDiffs; activities;



  // inputFilterWeights;















  // setupWeights() {
  //   const filteredData = [];
  //   const diffsPerEpoch = { minDiff: 0, maxDiff: 0 };

  //   Object.keys(this.inputWeights).forEach((layer, layerIndex) => {
  //     if (layer !== 'h0') {
  //       this.inputWeights[layer].forEach((destination, destinationIndex) => {
  //         destination.forEach((source, sourceIndex) => {
  //           if (sourceIndex === 0) {
  //             diffsPerEpoch.minDiff = source;
  //             diffsPerEpoch.maxDiff = source;
  //           } else {
  //             if (source < diffsPerEpoch.minDiff) { diffsPerEpoch.minDiff = source; }
  //             if (source > diffsPerEpoch.maxDiff) { diffsPerEpoch.maxDiff = source; }
  //           }

  //           filteredData.push({
  //             layer: (this.inputTopology['conv_layers'].length + 1) + (layerIndex - 1),
  //             source: sourceIndex,
  //             target: destinationIndex,
  //             value: source,
  //             unitSpacing: (this.minWidthHeight / +destination.length),
  //             targetUnitSpacing: (this.minWidthHeight / +this.inputWeights[layer].length)
  //           });
  //         });
  //       });
  //     }
  //   });

  //   this.weights = filteredData;
  //   this.minMaxDiffs = diffsPerEpoch;

  //   this.weights.forEach(el => { el.stroke = this.generateWeightsColor(el); });
  //   this.topology.forEach(el => {
  //     const nodeColor = this.generateNodesColor(el);
  //     el.fill = nodeColor.color;
  //     el.opacity = nodeColor.opacity;
  //   });

  //   this.weights = this.weights.filter(weight => weight.stroke !== this.defaultSettings.color);
  // }

  // bindWeights(runAnimation) {
  //   d3.selectAll('.weights').remove();
  //   d3.selectAll('circle').remove();
  //   const self = this;


  //   const line = this.vizContainer.selectAll('.weights')
  //     .data(this.weights);

  //   let enterWeights = line.enter()
  //     .append('line')
  //     .attr('class', 'weights')
  //     .attr('x1', function (d) {
  //       const x1: number = self.leftMargin + (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
  //       return x1;
  //     })
  //     .attr('y1', function (d) {
  //       const y1: number = self.topMargin + (d.unitSpacing * d.source) + (d.unitSpacing / 2);
  //       return y1;
  //     })
  //     .attr('x2', function (d) {
  //       const x2: number = self.leftMargin + (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
  //       return x2;
  //     })
  //     .attr('y2', function (d) {
  //       const y2: number = self.topMargin + (d.unitSpacing * d.source) + (d.unitSpacing / 2);
  //       return y2;
  //     })
  //     .attr('stroke', function (d) { return d.stroke; });

  //   if (runAnimation) {
  //     enterWeights = enterWeights.transition()
  //       .duration(2.5 * this.defaultSettings.duration)
  //       .delay(function (d) {
  //         // const nodesDelay = self.defaultSettings.duration * (d.layer + 1);
  //         // const weightsDelay = 2.5 * self.defaultSettings.duration * d.layer;
  //         const nodesDelay = self.defaultSettings.duration * (d.layer + 1 - self.inputTopology['conv_layers'].length);
  //         const weightsDelay = 2.5 * self.defaultSettings.duration * (d.layer - self.inputTopology['conv_layers'].length);
  //         return nodesDelay + weightsDelay;
  //       });
  //   }

  //   enterWeights
  //     .attr('x2', function (d) {
  //       const x2: number = self.leftMargin + (self.layerSpacing * (d.layer + 1)) + (self.layerSpacing / 2);
  //       return x2;
  //     })
  //     .attr('y2', function (d) {
  //       const y2: number = self.topMargin + (d.targetUnitSpacing * d.target) + (d.targetUnitSpacing / 2);
  //       return y2;
  //     });


  //   const circles = this.vizContainer.selectAll('circle')
  //     .data(this.topology.filter(nodes => !nodes.isConv));

  //   let enterCircles = circles.enter()
  //     .append('circle')
  //     .attr('class', 'circle')
  //     .attr('cx', function (d) {
  //       const cx: number = self.leftMargin + (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
  //       return cx;
  //     })
  //     .attr('cy', function (d) {
  //       const cy: number = self.topMargin + (d.unitSpacing * d.unit) + (d.unitSpacing / 2);
  //       return cy;
  //     })
  //     .attr('r', this.defaultSettings.nodeRadius)
  //     .attr('fill', this.defaultSettings.color)
  //     .attr('fill-opacity', this.defaultSettings.nodeOpacity)
  //     .attr('stroke', this.defaultSettings.color)
  //     .attr('stroke-width', this.defaultSettings.nodeStroke);

  //   // enterCircles.on('mouseover', function (d) {
  //   //   self.conMenuSelected = Object.assign({}, d);
  //   //   self.conMenuSelected.layer -= (self.inputTopology['conv_layers'].length + 1);

  //   //   if (!d.isOutput && !d.isConv) {
  //   //     self.setupShowWeights();
  //   //     self.showWeights(d3.mouse(this)[0], d3.mouse(this)[1]);
  //   //   }
  //   // });

  //   // enterCircles.on('mouseout', function (d) {
  //   //   if (!d.isOutput && !d.isConv) { d3.selectAll('.weights-comparison').remove(); }
  //   // });

  //   // enterCircles.on('click', function (d) {
  //   //   d3.event.stopPropagation();
  //   //   self.conMenuSelected = d;

  //   //   if (!d.isOutput && !d.isConv) { self.modifyNodes(); }
  //   // });

  //   if (runAnimation) {
  //     enterCircles = enterCircles.transition()
  //       .duration(this.defaultSettings.duration)
  //       .delay(function (d) {
  //         // const nodesDelay = self.defaultSettings.duration * d.layer;
  //         // const weightsDelay = 2.5 * self.defaultSettings.duration * d.layer;
  //         const nodesDelay = self.defaultSettings.duration * (d.layer - self.inputTopology['conv_layers'].length);
  //         const weightsDelay = 2.5 * self.defaultSettings.duration * (d.layer - self.inputTopology['conv_layers'].length);
  //         return nodesDelay + weightsDelay;
  //       });
  //   }

  //   enterCircles
  //     .attr('fill', function (d) { return d.fill; })
  //     .attr('fill-opacity', function (d) { return d.opacity; })
  //     .attr('stroke', function (d) { return (d.fill === '#373737') ? d.fill : '#F44336'; })
  //     .attr('stroke-width', .15 * this.defaultSettings.nodeRadius);
  // }

  // generateWeightsColor(el) {
  //   let color = this.defaultSettings.color;
  //   let activity = 0;
  //   let recordActivities = false;

  //   const range = Math.abs(this.minMaxDiffs.maxDiff - this.minMaxDiffs.minDiff);
  //   const valuePercentage = el.value / range;

  //   if (valuePercentage > .5) {
  //     color = '#EF5350';
  //     activity = valuePercentage;
  //     recordActivities = true;
  //   } else if (valuePercentage > .35) {
  //     color = '#EF9A9A';
  //     activity = valuePercentage;
  //     recordActivities = true;
  //   }

  //   if (recordActivities) {
  //     this.activities.push({
  //       layer: el.layer,
  //       source: el.source,
  //       target: el.target,
  //       activity: activity
  //     });
  //   }

  //   for (let i = 0; i < this.detachedNodes.length; i++) {
  //     if ((this.detachedNodes[i].layer === el.layer && this.detachedNodes[i].unit === el.source) ||
  //       ((this.detachedNodes[i].layer - 1) === el.layer && this.detachedNodes[i].unit === el.target)) {
  //       color = this.defaultSettings.color;
  //       break;
  //     }
  //   }

  //   return color;
  // }

  // generateNodesColor(el) {
  //   const allActivities = [];

  //   let color = this.defaultSettings.color;
  //   let opacity = 1;

  //   for (let i = 0; i < this.activities.length; i++) {
  //     if ((this.activities[i].layer == el.layer && this.activities[i].source == el.unit) ||
  //       (this.activities[i].layer == el.layer - 1 && this.activities[i].target == el.unit)) {
  //       color = '#FF7373';
  //       allActivities.push(this.activities[i].activity);
  //     }
  //   }

  //   if (allActivities.length > 0) {
  //     opacity = allActivities.reduce((a, b) => a + b) / allActivities.length;
  //   }

  //   for (let i = 0; i < this.detachedNodes.length; i++) {
  //     if (this.detachedNodes[i].layer === el.layer && this.detachedNodes[i].unit === el.unit) {
  //       color = this.defaultSettings.color;
  //       break;
  //     }
  //   }

  //   return {
  //     'color': color,
  //     'opacity': opacity
  //   };
  // }





}
