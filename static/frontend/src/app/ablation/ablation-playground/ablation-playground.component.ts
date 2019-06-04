import { Component, OnInit, ViewChild, OnDestroy, HostListener } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DataService } from 'src/app/services/data.service';

import * as d3 from 'd3';

@Component({
  selector: 'app-ablation-playground',
  templateUrl: './ablation-playground.component.html',
  styleUrls: ['./ablation-playground.component.scss']
})
export class AblationPlaygroundComponent implements OnInit, OnDestroy {
  @ViewChild('container') container;

  defaultSettings;
  inputTopology; inputFilterWeights; inputWeights;

  svg; svgWidth; svgHeight;
  zoom; currTransform;
  vizContainer;

  minWidthHeight;
  topMargin; leftMargin;

  topology; edges;
  weights; untrainedWeights;

  layerSpacing;
  minMaxDiffs; activities;

  conMenuSelected;
  tooltipConfig; tooltipTexts;

  detachedNodes;

  destroyed = new Subject<void>();


  @HostListener('window:resize', ['$event'])
  onResize(event) { this.draw(false); }

  constructor(
    private dataService: DataService
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
    this.inputFilterWeights = {};
    this.detachedNodes = [];

    this.dataService.vizTopology
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        this.inputTopology = val;
        this.draw(true);
      });

    this.dataService.vizWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        if (val) {

          Object.keys(val).forEach(key => {
            if (key.startsWith('c')) {
              this.inputFilterWeights[key] = val[key];
              delete val[key];
            }
          });
          this.inputWeights = val;

          this.draw(true);
        }
      });

    this.dataService.untrainedWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.untrainedWeights = val; });
  }

  draw(runAnimation) {
    this.activities = [];
    this.resetViz();

    if (this.inputTopology) {
      this.setupTopology();
      this.bindTopology();
    }

    if (this.inputTopology && this.inputWeights) {
      this.setupWeights();
      this.bindWeights(runAnimation);
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
      })
      .attr('stroke', this.defaultSettings.color);


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
      .attr('fill-opacity', this.defaultSettings.nodeOpacity)
      .attr('stroke', this.defaultSettings.color)
      .attr('stroke-width', this.defaultSettings.nodeStroke);

    rects.on('mouseover', function (d) {
      self.conMenuSelected = Object.assign({}, d);
      self.conMenuSelected.layer -= 1;

      if (self.conMenuSelected.layer >= 0) {
        self.setupShowFilters();
        self.showFilters(d3.mouse(this)[0], d3.mouse(this)[1]);
      }

      d3.select(this)
        .attr('stroke', 'whitesmoke')
        .attr('stroke-width', .5);
    });

    rects.on('mouseout', function (d) {
      d3.selectAll('.filters-comparison').remove();

      d3.select(this)
        .attr('stroke', self.defaultSettings.color)
        .attr('stroke-width', self.defaultSettings.nodeStroke);
    });


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
      .attr('fill-opacity', this.defaultSettings.nodeOpacity)
      .attr('stroke', this.defaultSettings.color)
      .attr('stroke-width', this.defaultSettings.nodeStroke);
  }

  setupWeights() {
    const filteredData = [];
    const diffsPerEpoch = { minDiff: 0, maxDiff: 0 };

    Object.keys(this.inputWeights).forEach((layer, layerIndex) => {
      if (layer !== 'h0') {
        this.inputWeights[layer].forEach((destination, destinationIndex) => {
          destination.forEach((source, sourceIndex) => {
            if (sourceIndex === 0) {
              diffsPerEpoch.minDiff = source;
              diffsPerEpoch.maxDiff = source;
            } else {
              if (source < diffsPerEpoch.minDiff) { diffsPerEpoch.minDiff = source; }
              if (source > diffsPerEpoch.maxDiff) { diffsPerEpoch.maxDiff = source; }
            }

            filteredData.push({
              layer: (this.inputTopology['conv_layers'].length + 1) + (layerIndex - 1),
              source: sourceIndex,
              target: destinationIndex,
              value: source,
              unitSpacing: (this.minWidthHeight / +destination.length),
              targetUnitSpacing: (this.minWidthHeight / +this.inputWeights[layer].length)
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

    enterCircles.on('mouseover', function (d) {
      self.conMenuSelected = Object.assign({}, d);
      self.conMenuSelected.layer -= (self.inputTopology['conv_layers'].length + 1);

      if (!d.isOutput && !d.isConv) {
        self.setupShowWeights();
        self.showWeights(d3.mouse(this)[0], d3.mouse(this)[1]);
      }
    });

    enterCircles.on('mouseout', function (d) {
      if (!d.isOutput && !d.isConv) { d3.selectAll('.weights-comparison').remove(); }
    });

    enterCircles.on('click', function (d) {
      d3.event.stopPropagation();
      d3.select('.context-menu').remove();
      self.conMenuSelected = d;

      if (!d.isOutput && !d.isConv) { self.modifyNodes(); }
    });

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

    const range = Math.abs(this.minMaxDiffs.maxDiff - this.minMaxDiffs.minDiff);
    const valuePercentage = el.value / range;

    if (valuePercentage > .5) {
      color = '#EF5350';
      activity = valuePercentage;
      recordActivities = true;
    } else if (valuePercentage > .35) {
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

    for (let i = 0; i < this.detachedNodes.length; i++) {
      if ((this.detachedNodes[i].layer === el.layer && this.detachedNodes[i].unit === el.source) ||
        ((this.detachedNodes[i].layer - 1) === el.layer && this.detachedNodes[i].unit === el.target)) {
        color = this.defaultSettings.color;
        break;
      }
    }

    return color;
  }

  generateNodesColor(el) {
    const allActivities = [];

    let color = this.defaultSettings.color;
    let opacity = 1;

    for (let i = 0; i < this.activities.length; i++) {
      if ((this.activities[i].layer == el.layer && this.activities[i].source == el.unit) ||
        (this.activities[i].layer == el.layer - 1 && this.activities[i].target == el.unit)) {
        color = '#FF7373';
        allActivities.push(this.activities[i].activity);
      }
    }

    if (allActivities.length > 0) {
      opacity = allActivities.reduce((a, b) => a + b) / allActivities.length;
    }

    for (let i = 0; i < this.detachedNodes.length; i++) {
      if (this.detachedNodes[i].layer === el.layer && this.detachedNodes[i].unit === el.unit) {
        color = this.defaultSettings.color;
        break;
      }
    }

    return {
      'color': color,
      'opacity': opacity
    };
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
      titles: {
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

        self.tooltipConfig.titles.dimension[i] = dimension;
      });
    d3.selectAll('.tmp').remove();

    this.tooltipConfig.outerFrame.width = 2 * this.tooltipConfig.weightsFrame.width +
      2.75 * this.tooltipConfig.weightsFrame.margin;
    this.tooltipConfig.outerFrame.height =
      this.tooltipConfig.titles.dimension.map(dimension => dimension.height).reduce((a, b) => a + b) +
      2 * this.tooltipConfig.titles.margin +
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

          centerAligned -= this.tooltipConfig.titles.dimension[i].width / 2;
          centerAligned -= this.tooltipConfig.titles.margin;
        }


        return mouseX +
          this.tooltipConfig.quadrantAdjustment.x +
          this.tooltipConfig.titles.margin +
          centerAligned;
      })
      .attr('y', (d, i) => {
        let totalTitles = this.tooltipConfig.titles.margin;
        let totalContent = 0;

        if (i > 0) {
          totalTitles = 2 * this.tooltipConfig.titles.margin;
        }
        for (let j = 0; j <= i; j++) {
          totalTitles += this.tooltipConfig.titles.dimension[j].height;
        }
        if (d === 'After') {
          totalTitles -= this.tooltipConfig.titles.dimension[i].height;
        }

        if (i > 3) {
          totalTitles -= this.tooltipConfig.titles.dimension[3].height;
          totalContent += this.tooltipConfig.weightsFrame.height;
          totalContent += .75 * this.tooltipConfig.weightsFrame.margin;
        }


        return mouseY +
          this.tooltipConfig.quadrantAdjustment.y +
          totalTitles +
          totalContent;
      })
      .attr('fill', this.tooltipConfig.titles.color);


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
        let totalTitles = 2 * this.tooltipConfig.titles.margin +
          this.tooltipConfig.titles.dimension[0].height;
        let totalContent = Math.floor(i / 2) * this.tooltipConfig.weightsFrame.height +
          .25 * this.tooltipConfig.weightsFrame.margin;


        for (let j = 0; j < this.tooltipConfig.titles.dimension.length; j++) {
          if (Math.floor(i / 2) === 0 && j > 2) { break; }

          if (j % 3 === 0) { continue; }
          if (j % 3 === 1 || j % 3 === 2) { totalTitles += this.tooltipConfig.titles.dimension[j].height; }
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

  modifyNodes() {
    if (this.detachedNodes.length === 0) {
      this.detachedNodes.push(this.conMenuSelected);
    } else {
      for (let i = 0; i < this.detachedNodes.length; i++) {
        if (this.detachedNodes[i].layer === this.conMenuSelected.layer && this.detachedNodes[i].unit === this.conMenuSelected.unit) {
          this.detachedNodes.splice(i, 1);
          break;
        } else if (i === this.detachedNodes.length - 1) {
          this.detachedNodes.push(this.conMenuSelected);
          break;
        }
      }
    }

    this.setupWeights();
    this.bindWeights(false);
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
      titles: {
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
      color: d3.interpolateLab('white', 'black')
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

        self.tooltipConfig.titles.dimension[i] = dimension;
      });
    d3.selectAll('.tmp').remove();

    this.tooltipConfig.outerFrame.width = 2 * this.tooltipConfig.weightsFrame.width +
      2.75 * this.tooltipConfig.weightsFrame.margin;
    this.tooltipConfig.outerFrame.height =
      this.tooltipConfig.titles.dimension.map(dimension => dimension.height).reduce((a, b) => a + b) +
      2 * this.tooltipConfig.titles.margin +
      this.tooltipConfig.weightsFrame.height;
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
        if (i === 0 || d === 'Before' || d === 'After') {
          if (i === 0) {
            centerAligned += this.tooltipConfig.outerFrame.width / 2;
          } else if (d === 'Before') {
            centerAligned += this.tooltipConfig.outerFrame.width / 4;
          } else if (d === 'After') {
            centerAligned += 3 * this.tooltipConfig.outerFrame.width / 4;
          }

          centerAligned -= this.tooltipConfig.titles.dimension[i].width / 2;
          centerAligned -= this.tooltipConfig.titles.margin;
        }


        return mouseX +
          this.tooltipConfig.quadrantAdjustment.x +
          this.tooltipConfig.titles.margin +
          centerAligned;
      })
      .attr('y', (d, i) => {
        let totalTitles = this.tooltipConfig.titles.margin;
        let totalContent = 0;

        if (i > 0) {
          totalTitles = 2 * this.tooltipConfig.titles.margin;
        }
        for (let j = 0; j <= i; j++) {
          totalTitles += this.tooltipConfig.titles.dimension[j].height;
        }
        if (d === 'After') {
          totalTitles -= this.tooltipConfig.titles.dimension[i].height;
        }

        if (i > 3) {
          totalTitles -= this.tooltipConfig.titles.dimension[3].height;
          totalContent += this.tooltipConfig.weightsFrame.height;
          totalContent += .75 * this.tooltipConfig.weightsFrame.margin;
        }


        return mouseY +
          this.tooltipConfig.quadrantAdjustment.y +
          totalTitles +
          totalContent;
      })
      .attr('fill', this.tooltipConfig.titles.color);


    this.tooltipConfig.data = [];
    this.tooltipConfig.data.push([...this.untrainedWeights[incomingFilters][this.conMenuSelected.unit]]);
    this.tooltipConfig.data.push([...this.inputFilterWeights[incomingFilters][this.conMenuSelected.unit]]);
    this.tooltipConfig.data.forEach((data, dataIndex) => {
      data.forEach((filter, filterIndex) => {
        this.tooltipConfig.data[dataIndex][filterIndex] = filter.flat();
      });
    });

    this.tooltipConfig.filtersFrame = {
      width: this.tooltipConfig.weightsFrame.width / Math.ceil(Math.sqrt(this.tooltipConfig.data[0].length)),
      height: this.tooltipConfig.weightsFrame.height / Math.ceil(Math.sqrt(this.tooltipConfig.data[0].length)),
      numElements: Math.ceil(Math.sqrt(this.tooltipConfig.data[0].length))
    };

    this.tooltipConfig.filter = {
      width: this.tooltipConfig.filtersFrame.width / Math.ceil(Math.sqrt(this.tooltipConfig.data[0][0].length)),
      height: this.tooltipConfig.filtersFrame.height / Math.ceil(Math.sqrt(this.tooltipConfig.data[0][0].length)),
      numElements: Math.ceil(Math.sqrt(this.tooltipConfig.data[0][0].length))
    };

    // d3 workaround - attr's index starts from 1 instead of 0
    this.tooltipConfig.data.forEach(data => {
      data.forEach(filter => {
        filter.unshift('d3 workaround');
      });
    });

    const comparisonItem = filtersComparison.selectAll('.comparison-item')
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
        let totalTitles = 2 * this.tooltipConfig.titles.margin +
          this.tooltipConfig.titles.dimension[0].height;
        let totalContent = Math.floor(i / 2) * this.tooltipConfig.weightsFrame.height +
          .25 * this.tooltipConfig.weightsFrame.margin;


        for (let j = 0; j < this.tooltipConfig.titles.dimension.length; j++) {
          if (Math.floor(i / 2) === 0 && j > 2) { break; }

          if (j % 3 === 0) { continue; }
          if (j % 3 === 1 || j % 3 === 2) { totalTitles += this.tooltipConfig.titles.dimension[j].height; }
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

    filtersFrames.selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
      .attr('x', function (d, i) {
        const rectXValue = +d3.select(this.parentNode).select('rect').attr('x');
        const xPosition = ((i - 1) % self.tooltipConfig.filter.numElements) *
          self.tooltipConfig.filter.width;

        return rectXValue + xPosition;
      })
      .attr('y', function (d, i) {
        const rectYValue = +d3.select(this.parentNode).select('rect').attr('y');
        const yPosition = Math.floor((i - 1) / self.tooltipConfig.filter.numElements) *
          self.tooltipConfig.filter.height;

        return rectYValue + yPosition;
      })
      .attr('width', this.tooltipConfig.filter.width)
      .attr('height', this.tooltipConfig.filter.height)
      .style('fill', d => this.tooltipConfig.color(d));


    // console.clear();

    // console.log('Incoming Weights before training:', this.untrainedWeights[incomingFilters][this.conMenuSelected.unit]);
    // console.log('Incoming Weights after training:', this.inputFilterWeights[incomingFilters][this.conMenuSelected.unit]);
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
        d3.select('.context-menu').remove();
      })
      .on('end', () => { this.currTransform = d3.event.transform; });
    this.svg.call(this.zoom);

    this.svg.on('contextmenu', () => { d3.event.preventDefault(); });
  }

  showMe() {
    console.clear();
    console.log('source topology:', this.inputTopology);
    console.log('source weights:', this.inputWeights);
    console.log('source filter weights:', this.inputFilterWeights);

    console.log('untrained weights', this.untrainedWeights);

    console.log('filtered topology:', this.topology);
    console.log('filtered weights (trained):', this.weights);
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
