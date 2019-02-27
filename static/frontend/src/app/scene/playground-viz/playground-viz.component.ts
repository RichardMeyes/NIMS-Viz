import { Component, OnInit, Input, OnChanges, ViewChild, HostListener, EventEmitter, SimpleChanges, OnDestroy } from '@angular/core';
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
export class PlaygroundVizComponent implements OnInit, OnChanges, OnDestroy {
  toolbarHeight; tabsHeight;
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
  @Input() inputTopology;
  @Input() inputWeights;

  destroyed = new Subject<void>();

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.svgWidth = window.innerWidth;
    this.svgHeight = window.innerHeight - (this.toolbarHeight + this.tabsHeight);

    if (this.router.url.includes('ablation')) {
      this.svgWidth = window.innerWidth / 2;
      this.svgHeight = window.innerHeight - (this.toolbarHeight);
    }

    this.minWidthHeight = Math.min(this.svgWidth, this.svgHeight);
    this.leftMargin = (this.svgWidth - this.minWidthHeight) / 2;

    this.draw();
  }

  constructor(
    private dataService: DataService,
    private router: Router
  ) { }

  ngOnChanges() { this.draw(); }

  ngOnInit() {
    this.dataService.toolbarHeight
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.toolbarHeight = val; });
    this.tabsHeight = this.dataService.tabsHeight;

    this.svgWidth = window.innerWidth;
    this.svgHeight = window.innerHeight - (this.toolbarHeight + this.tabsHeight);

    if (this.router.url.includes('ablation')) {
      this.svgWidth = window.innerWidth / 2;
      this.svgHeight = window.innerHeight - (this.toolbarHeight);
    }

    this.minWidthHeight = Math.min(this.svgWidth, this.svgHeight);
    this.topMargin = (this.svgHeight - this.minWidthHeight) / 2;
    this.leftMargin = (this.svgWidth - this.minWidthHeight) / 2;

    this.dataService.selectedFile
      .pipe(takeUntil(this.destroyed))
      .subscribe(() => { this.detachedNodes = []; });

    this.defaultSettings = {
      nodeRadius: 10,
      color: '#373737',
      nodeOpacity: .5,
      nodeStroke: 0
    };
  }

  draw() {
    this.activities = [];

    if (this.inputTopology) {
      this.resetViz();

      this.setupTopology();
      this.bindTopology();
    }

    // if ((changes && changes.inputWeights) || (!changes && this.inputWeights)) {
    //   if (changes) { this.inputWeights = changes.inputWeights.currentValue; }

    //   if (this.inputWeights) {
    //     this.setupWeights();

    //     this.bindWeights();
    //     this.bindTopology();
    //   }
    // }
  }

  setupTopology() {
    const layers: number[] = this.inputTopology.layers.map(layer => +layer.unitCount);
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
    let filteredData;
    let diffsPerEpoch; console.log(this.inputWeights);

    Object.keys(this.inputWeights).forEach((epoch) => {
      filteredData = [];
      diffsPerEpoch = { minDiff: 0, maxDiff: 0 };

      Object.keys(this.inputWeights[epoch]).forEach((layer, layerIndex) => {
        if (layer != 'input' && layer != 'output') {

          this.inputWeights[epoch][layer].forEach((destination, destinationIndex) => {
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
                targetUnitSpacing: (this.minWidthHeight / +this.inputWeights[epoch][layer].length)
              });
            });
          });
        }
      });

      this.weights = filteredData;
      this.minMaxDiffs = diffsPerEpoch;

      this.weights.forEach(el => { el.stroke = this.generateWightsColor(el); });
      this.topology.forEach(el => {
        const nodeColor = this.generateNodesColor(el);
        el.fill = nodeColor.color;
        el.opacity = nodeColor.opacity;
      });

      this.weights.sort((a, b) => {
        const strokeA = a.stroke;
        const strokeB = b.stroke;

        if (strokeA < strokeB) { return -1; }
        if (strokeA > strokeB) { return 1; }

        return 0;
      });
    });

  }

  bindWeights() {
    const line = this.vizContainer.selectAll('line')
      .data(this.weights);

    const self = this;
    const enterSel = line.enter()
      .append('line')
      .attr('class', 'line')
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
      .attr('stroke', function (d) { return d.stroke; })
      .attr('stroke-opacity', function (d) { return self.generateOpacity(d, 'weights'); });

    line
      .merge(enterSel)
      .transition()
      .duration(250)
      .attr('stroke', function (d) { return d.stroke; })
      .attr('stroke-opacity', function (d) { return self.generateOpacity(d, 'weights'); });

    const exitSel = line.exit()
      .transition()
      .duration(250)
      .attr('style', function (d) { return 'stroke:#fff; stroke-width:0'; })
      .remove();
  }

  bindTopology() {
    d3.selectAll('circle').remove();
    d3.selectAll('line').remove();


    const circles = this.vizContainer.selectAll('circle')
      .data(this.topology);

    const self = this;
    const enterSel = circles.enter()
      .append('circle')
      .attr('class', 'circle')
      .attr('cx', function (d, i) {
        const cx: number = self.leftMargin + (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return cx;
      })
      .attr('cy', function (d, i) {
        const cy: number = self.topMargin + (d.unitSpacing * d.unit) + (d.unitSpacing / 2);
        return cy;
      })
      .attr('r', this.defaultSettings.nodeRadius)
      .attr('fill', this.defaultSettings.color)
      .attr('fill-opacity', this.defaultSettings.nodeOpacity)
      .attr('stroke', this.defaultSettings.color)
      .attr('stroke-width', this.defaultSettings.nodeStroke);

    // enterSel
    //   .transition()
    //   .duration(750)
    //   .delay(function (d) { return 750 * d.layer; })
    //   .attr('fill', function (d) { return d.fill; })
    //   .attr('fill-opacity', function (d) { return d.opacity; })
    //   .attr('stroke', function (d) { return (d.fill === '#373737') ? d.fill : '#F44336'; })
    //   .attr('stroke-width', .15 * this.defaultSettings.nodeRadius);

    if (this.router.url.includes('ablation')) {
      enterSel.on('contextmenu', function (d, i) {
        d3.event.preventDefault();
        d3.select('.context-menu').remove();

        self.conMenuSelected = d;

        if (!d.isOutput) {
          self.setupConMenu();
          self.bindConMenu(d3.mouse(this)[0], d3.mouse(this)[1]);
        }
      });
    }


    const line = this.vizContainer.selectAll('line')
      .data(this.edges);

    line.enter()
      .append('line')
      .attr('class', 'line')
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
  }

  generateWightsColor(el) {
    let color = '#373737';
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
        color = '#373737';
        break;
      }
    }

    return color;
  }

  generateNodesColor(el) {
    const allActivities = [];

    let color = '#373737';
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
        color = '#373737';
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

    this.svg
      .on('click', () => { d3.select('.context-menu').remove(); });
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
      margin: 0.15
    };

    const self = this;

    this.vizContainer.selectAll('.tmp')
      .data(this.conMenuItems)
      .enter()
      .append('text')
      .text(function (d) { return d; })
      .attr('class', 'tmp')
      .each(function (d, i) {
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

    const conMenuContainer = this.vizContainer
      .append('g').attr('class', 'context-menu')
      .selectAll('tmp')
      .data(this.conMenuItems)
      .enter()
      .append('g').attr('class', 'menu-entry')
      .on('mouseover', function (d) {
        d3.select(this).select('rect')
          .style('fill', '#3a3a3a');
      })
      .on('mouseout', function (d) {
        d3.select(this).select('rect')
          .style('fill', '#424242');
      })
      .on('click', function (d) {
        if (d === 'detach node') {
          self.detachedNodes.push(self.conMenuSelected);
        } else if (d === 'reattach node') {
          for (let i = 0; i < self.detachedNodes.length; i++) {
            if (self.detachedNodes[i].layer === self.conMenuSelected.layer && self.detachedNodes[i].unit === self.conMenuSelected.unit) {
              self.detachedNodes.splice(i, 1);
              break;
            }
          }
        }

        self.setupWeights();
        self.bindWeights();
        self.bindTopology();
      });

    conMenuContainer.append('rect')
      .attr('x', mouseX)
      .attr('y', function (d, i) { return mouseY + (i * (self.conMenuConfig.height * (1 + self.conMenuConfig.margin * 2))); })
      .attr('width', this.conMenuConfig.width * (1 + this.conMenuConfig.margin * 2))
      .attr('height', this.conMenuConfig.height * (1 + this.conMenuConfig.margin * 2))
      .style('fill', '#424242');

    conMenuContainer.append('text')
      .text(function (d) { return d; })
      .attr('x', mouseX + this.conMenuConfig.width * this.conMenuConfig.margin)
      .attr('y', function (d, i) { return mouseY + (i * (self.conMenuConfig.height * (1 + self.conMenuConfig.margin * 2))); })
      .attr('dy', function (d, i) { return self.conMenuConfig.height; })
      .attr('fill', 'white');
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
