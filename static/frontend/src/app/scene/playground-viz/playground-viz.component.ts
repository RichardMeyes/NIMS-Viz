import { Component, OnInit, ViewChild, HostListener, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import * as d3 from 'd3';

import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-playground-viz',
  templateUrl: './playground-viz.component.html',
  styleUrls: ['./playground-viz.component.scss']
})
export class PlaygroundVizComponent implements OnInit, OnDestroy {
  toolbarHeight;
  minWidthHeight;

  zoom; currTransform;
  svg; svgWidth; svgHeight;
  vizContainer;

  conMenuItems; conMenuConfig;
  conMenuSelected;

  topology; edges; weights;
  topMargin; leftMargin;
  layerSpacing;
  minMaxDiffs; activities;

  detachedNodes;

  defaultSettings;

  @ViewChild('container') container;
  inputTopology;
  inputWeights;
  untrainedWeights;

  destroyed = new Subject<void>();

  @HostListener('window:resize', ['$event'])
  onResize(event) { this.draw(false); }

  constructor(
    private dataService: DataService,
    private router: Router
  ) { }

  ngOnInit() {
    this.dataService.toolbarHeight
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.toolbarHeight = val; });

    this.dataService.vizTopology
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        this.inputTopology = val;
        this.draw(true);
      });

    this.dataService.vizWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        this.inputWeights = val;
        this.draw(true);
      });

    this.detachedNodes = [];
    if (this.router.url.includes('ablation')) {
      this.dataService.selectedFile
        .pipe(takeUntil(this.destroyed))
        .subscribe(val => {
          if (val) { this.detachedNodes = []; }
        });

      this.dataService.untrainedWeights
        .pipe(takeUntil(this.destroyed))
        .subscribe(val => { this.untrainedWeights = val; });
    }

    this.defaultSettings = {
      nodeRadius: 10,
      color: '#373737',
      nodeOpacity: .5,
      nodeStroke: 0,
      duration: 500
    };

    this.dataService.testNetwork
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        if (val) { this.dataService.detachedNodes.next(this.detachedNodes); }
      });

    this.dataService.resetNetwork
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        if (val) {
          this.detachedNodes = [];
          this.draw(false);
        }
      });
  }

  draw(runAnimation) {
    if (this.defaultSettings) {
      this.activities = [];
      this.resetViz();

      if (this.inputTopology) {
        this.setupTopology();
        this.bindTopology();
      }

      if (this.inputWeights) {
        this.setupWeights();
        this.bindWeights(runAnimation);
      }
    }
  }

  setupTopology() {
    const layers: number[] = this.inputTopology.fcLayers.map(layer => +layer.unitCount);
    layers.push(10);
    const filteredTopology = [];
    const filteredEdges = [];

    layers.forEach((layer, layerIndex) => {
      const nextLayer = layers[layerIndex + 1];
      const isOutput = (layerIndex < layers.length - 1) ? false : true;

      for (let i = 0; i < layer; i++) {
        filteredTopology.push({ layer: layerIndex, unit: i, unitSpacing: (this.minWidthHeight / layer), isOutput: isOutput });


        if (!isOutput) {
          for (let j = 0; j < nextLayer; j++) {
            filteredEdges.push({
              layer: layerIndex,
              source: i,
              target: j,
              unitSpacing: (this.minWidthHeight / layer),
              targetUnitSpacing: (this.minWidthHeight / nextLayer)
            });
          }
        }
      }
    });

    this.layerSpacing = this.minWidthHeight / layers.length;
    this.topology = filteredTopology;
    this.edges = filteredEdges;
  }

  setupWeights() {
    const filteredData = [];
    const diffsPerEpoch = { minDiff: 0, maxDiff: 0 };
    const currEpoch = Object.keys(this.inputWeights)[0];

    Object.keys(this.inputWeights[currEpoch]).forEach((layer, layerIndex) => {
      if (layer !== 'input') {
        this.inputWeights[currEpoch][layer].forEach((destination, destinationIndex) => {
          destination.forEach((source, sourceIndex) => {
            if (sourceIndex === 0) {
              diffsPerEpoch.minDiff = source;
              diffsPerEpoch.maxDiff = source;
            } else {
              if (source < diffsPerEpoch.minDiff) { diffsPerEpoch.minDiff = source; }
              if (source > diffsPerEpoch.maxDiff) { diffsPerEpoch.maxDiff = source; }
            }

            filteredData.push({
              layer: (layerIndex - 1),
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

  bindTopology() {
    d3.selectAll('.edges').remove();
    d3.selectAll('circle').remove();
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


    const circles = this.vizContainer.selectAll('circle')
      .data(this.topology);

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
          const nodesDelay = self.defaultSettings.duration * (d.layer + 1);
          const weightsDelay = 2.5 * self.defaultSettings.duration * d.layer;
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
      .data(this.topology);

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

    if (this.router.url.includes('ablation')) {

      enterCircles.on('mouseover', function (d) {
        self.conMenuSelected = d;

        if (!d.isOutput) {
          self.showWeights(d3.mouse(this)[0], d3.mouse(this)[1]);
        }
      });

      enterCircles.on('mouseout', function (d) {
        if (!d.isOutput) { d3.selectAll('.weights-comparison').remove(); }
      });

      enterCircles.on('click', function (d) {
        d3.event.stopPropagation();
        d3.select('.context-menu').remove();
        self.conMenuSelected = d;

        if (!d.isOutput) { self.modifyNodes(); }
      });

      enterCircles.on('contextmenu', function (d) {
        d3.select('.context-menu').remove();
        self.conMenuSelected = d;

        if (!d.isOutput) {
          self.setupConMenu();
          self.bindConMenu(d3.mouse(this)[0], d3.mouse(this)[1]);
        }
      });

    }

    if (runAnimation) {
      enterCircles = enterCircles.transition()
        .duration(this.defaultSettings.duration)
        .delay(function (d) {
          const nodesDelay = self.defaultSettings.duration * d.layer;
          const weightsDelay = 2.5 * self.defaultSettings.duration * d.layer;
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

  generateOpacity(d, mode: string) {
    let opacity = 1;

    for (let i = 0; i < this.detachedNodes.length; i++) {
      if (mode === 'weights') {
        if ((this.detachedNodes[i].layer === d.layer && this.detachedNodes[i].unit === d.source) ||
          ((this.detachedNodes[i].layer - 1) === d.layer && this.detachedNodes[i].unit === d.target)) {
          opacity = 0.25;
          break;
        }
      }

      if (mode === 'topology') {
        if (this.detachedNodes[i].layer === d.layer && this.detachedNodes[i].unit === d.unit) {
          opacity = 0.25;
          break;
        }
      }
    }

    return opacity;
  }

  resetViz() {
    this.svgWidth = window.innerWidth;
    this.svgHeight = window.innerHeight - (this.toolbarHeight + this.dataService.tabsHeight + this.dataService.bottomMargin);

    if (this.router.url.includes('ablation')) {
      this.svgWidth = window.innerWidth / 2;
      this.svgHeight = window.innerHeight - (this.toolbarHeight + this.dataService.bottomMargin);
    }

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
    if (this.router.url.includes('ablation')) {
      this.svg.on('click', () => { d3.select('.context-menu').remove(); });
    }
  }

  setupConMenu() {
    this.conMenuItems = ['view details', 'detach node'];
    for (let i = 0; i < this.detachedNodes.length; i++) {
      if (this.detachedNodes[i].layer === this.conMenuSelected.layer && this.detachedNodes[i].unit === this.conMenuSelected.unit) {
        this.conMenuItems.splice(-1);
        this.conMenuItems.push('reattach node');
        break;
      }
    }


    this.conMenuConfig = {
      width: [],
      height: [],
      margin: 0.15,
      fill: '#2b2b2b',
      hover: '#414141',
      color: '#ffffff'
    };

    const self = this;
    this.vizContainer.selectAll('.tmp')
      .data(this.conMenuItems)
      .enter()
      .append('text')
      .text(function (d) { return d; })
      .attr('class', 'tmp')
      .each(function () {
        const bbox = this.getBBox();
        self.conMenuConfig.width.push(bbox.width);
        self.conMenuConfig.height.push(bbox.height);
      });
    d3.selectAll('.tmp').remove();

    this.conMenuConfig.width = Math.max(...this.conMenuConfig.width);
    this.conMenuConfig.height = Math.max(...this.conMenuConfig.height);
  }

  bindConMenu(mouseX, mouseY) {
    const self = this;


    const menuEntry = this.vizContainer.append('g')
      .attr('class', 'context-menu')
      .selectAll('.menu-entry')
      .data(this.conMenuItems)
      .enter()
      .append('g')
      .attr('class', 'menu-entry');

    menuEntry
      .on('mouseover', function () {
        d3.select(this).select('rect').style('fill', self.conMenuConfig.hover);
      })
      .on('mouseout', function () {
        d3.select(this).select('rect').style('fill', self.conMenuConfig.fill);
      })
      .on('click', function (menu, menuIndex) {
        if (menuIndex === 0) {
          // self.showWeights();
        } else if (menuIndex === 1) {
          self.modifyNodes();
        }
      });


    menuEntry.append('rect')
      .attr('x', mouseX)
      .attr('y', (d, i) => {
        const margin = this.conMenuConfig.height * this.conMenuConfig.margin * 3;
        return mouseY + i * (this.conMenuConfig.height + margin);
      })
      .attr('width', () => {
        const margin = this.conMenuConfig.width * this.conMenuConfig.margin * 3;
        return this.conMenuConfig.width + margin;
      })
      .attr('height', () => {
        const margin = this.conMenuConfig.height * this.conMenuConfig.margin * 3;
        return this.conMenuConfig.height + margin;
      })
      .style('fill', this.conMenuConfig.fill);


    menuEntry.append('text')
      .text(function (d) { return d; })
      .attr('x', () => {
        const margin = this.conMenuConfig.width * this.conMenuConfig.margin * 1.5;
        return mouseX + margin;
      })
      .attr('y', (d, i) => {
        const margin = this.conMenuConfig.height * this.conMenuConfig.margin * 3;
        return mouseY + (i * (self.conMenuConfig.height + margin));
      })
      .attr('dy', this.conMenuConfig.height)
      .attr('fill', this.conMenuConfig.color);
  }

  showWeights(mouseX, mouseY) {
    const selectedLayer = (this.conMenuSelected.layer === 0) ? 'input' : `h${this.conMenuSelected.layer}`;

    console.clear();

    console.log('Selected layer:', selectedLayer);
    console.log('Selected unit:', this.conMenuSelected.unit);

    console.log('Weights before training:', this.untrainedWeights[selectedLayer][this.conMenuSelected.unit]);
    console.log('Weights after training:', this.inputWeights['epoch_0'][selectedLayer][this.conMenuSelected.unit]);

    console.log(d3.interpolateLab('steelblue', 'brown')(0.5));
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

  ngOnDestroy() {
    this.destroyed.next();
  }
}
