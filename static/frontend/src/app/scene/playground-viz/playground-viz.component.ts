import { Component, OnInit, Input, OnChanges, ViewChild, HostListener, EventEmitter, SimpleChanges, OnDestroy } from '@angular/core';

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
  unsubscribe: Subject<any> = new Subject();

  zoom; currTransform;
  svg; svgWidth; svgHeight;
  vizContainer;

  conMenuItems; conMenuConfig;
  conMenuSelected;

  topology; weights;
  layerSpacing; nodeRadius;
  minMaxDiffs; activities;

  detachedNodes;

  @ViewChild('container') container;
  @Input() inputTopology;
  @Input() inputWeights;

  destroyed = new Subject<void>();

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.svgWidth = window.innerWidth;
    this.svgHeight = window.innerHeight - (this.toolbarHeight + this.tabsHeight);
    this.draw(undefined);
  }

  constructor(
    private dataService: DataService
  ) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.inputTopology && changes.inputTopology.firstChange) { return; }
    this.draw(changes);
  }

  ngOnInit() {
    this.dataService.toolbarHeight
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.toolbarHeight = val; });
    this.tabsHeight = this.dataService.tabsHeight;

    this.svgWidth = window.innerWidth;
    this.svgHeight = window.innerHeight - (this.toolbarHeight + this.tabsHeight);
    this.nodeRadius = 10;

    this.activities = [];

    this.dataService.selectedFile
      .pipe(takeUntil(this.destroyed))
      .subscribe(() => { this.detachedNodes = []; });
  }

  draw(changes: SimpleChanges) {
    if ((changes && changes.inputTopology) || (!changes && this.inputTopology)) {
      this.activities = [];
      this.resetViz();

      this.setupTopology();
      this.bindTopology(0);

      if (changes) { this.inputWeights = undefined; }
    }

    if ((changes && changes.inputWeights) || (!changes && this.inputWeights)) {
      if (changes) { this.inputWeights = changes.inputWeights.currentValue; }

      if (this.inputWeights) {
        this.setupWeights();

        if (this.weights.length == this.minMaxDiffs.length) {
          this.activities = [];

          this.bindWeights(0);
          this.bindTopology(0);
        }
      }
    }
  }

  setupTopology() {
    let layers: number[] = this.inputTopology.layers.map(layer => +layer.unitCount);
    const filteredData = [];

    layers.forEach((layer, layerIndex) => {
      for (let i = 0; i < layer; i++) {
        filteredData.push({ layer: layerIndex, unit: i, unitSpacing: (this.svgHeight / layer), isOutput: false });
      }
    });
    for (let i = 0; i < 10; i++) {
      filteredData.push({ layer: layers.length, unit: i, unitSpacing: (this.svgHeight / 10), isOutput: true });
    }

    this.layerSpacing = (this.svgWidth / (layers.length + 1));
    this.topology = filteredData;
  }

  setupWeights() {
    let filteredData;
    let diffsPerEpoch;

    this.weights = [];
    this.minMaxDiffs = [];

    Object.keys(this.inputWeights).forEach((epoch, epochIndex) => {
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
                unitSpacing: (this.svgHeight / +destination.length),
                targetUnitSpacing: (this.svgHeight / +this.inputWeights[epoch][layer].length)
              });
            });
          });
        }
      });

      this.activities = [];

      this.weights.push(filteredData);
      this.minMaxDiffs.push(diffsPerEpoch);

    });

  }

  bindWeights(currEpoch: number) {
    const line = this.vizContainer.selectAll('line')
      .data(this.weights[currEpoch]);

    const self = this;
    const enterSel = line.enter()
      .append('line')
      .attr('class', 'line')
      .attr('x1', function (d, i) {
        const x1: number = (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return x1;
      })
      .attr('y1', function (d, i) {
        const y1: number = (d.unitSpacing * d.source) + (d.unitSpacing / 2);
        return y1;
      })
      .attr('x2', function (d, i) {
        const x1: number = (self.layerSpacing * (d.layer + 1)) + (self.layerSpacing / 2);
        return x1;
      })
      .attr('y2', function (d, i) {
        const y1: number = (d.targetUnitSpacing * d.target) + (d.targetUnitSpacing / 2);
        return y1;
      })
      .attr('stroke', function (d) { return self.generateColor(d, 'weights', currEpoch); })
      .attr('stroke-opacity', function (d) { return self.generateOpacity(d, 'weights'); });

    line
      .merge(enterSel)
      .transition()
      .duration(250)
      .attr('stroke', function (d) { return self.generateColor(d, 'weights', currEpoch); })
      .attr('stroke-opacity', function (d) { return self.generateOpacity(d, 'weights'); });

    const exitSel = line.exit()
      .transition()
      .duration(250)
      .attr('style', function (d) { return 'stroke:#fff; stroke-width:0'; })
      .remove();
  }

  bindTopology(currEpoch: number) {
    const circles = this.vizContainer.selectAll('circle')
      .data(this.topology);

    const self = this;
    const enterSel = circles.enter()
      .append('circle')
      .attr('class', 'circle')
      .attr('cx', function (d, i) {
        const cx: number = (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return cx;
      })
      .attr('cy', function (d, i) {
        const cy: number = (d.unitSpacing * d.unit) + (d.unitSpacing / 2);
        return cy;
      })
      .attr('r', this.nodeRadius)
      .attr('fill', function (d) { return self.generateColor(d, 'topology', currEpoch); })
      .attr('opacity', function (d) { return self.generateOpacity(d, 'topology'); })
      .on('contextmenu', function (d, i) {
        d3.event.preventDefault();
        d3.select('.context-menu').remove();

        self.conMenuSelected = d;

        if (!d.isOutput) {
          self.setupConMenu();
          self.bindConMenu(d3.mouse(this)[0], d3.mouse(this)[1]);
        }
      });

    circles
      .merge(enterSel)
      .transition()
      .duration(250)
      .attr('r', this.nodeRadius)
      .attr('fill', function (d) { return self.generateColor(d, 'topology', currEpoch); })
      .attr('opacity', function (d) { return self.generateOpacity(d, 'topology'); });

    const exitSel = circles.exit()
      .transition()
      .duration(250)
      .attr('r', 0)
      .remove();
  }

  generateColor(d, mode: string, currEpoch: number): string {
    let color = '#373737';
    let activity = 0;
    let recordActivities = false;

    if (mode === 'weights') {
      let range = Math.abs(this.minMaxDiffs[currEpoch].maxDiff - this.minMaxDiffs[currEpoch].minDiff);
      let valuePercentage = d.value / range;

      if (valuePercentage > .5) {
        // color = '#E57373';
        color = '#EF5350';
        activity = 1;
        recordActivities = true;
      } else if (valuePercentage > .35) {
        color = '#EF9A9A';
        activity = 0.5;
        recordActivities = true;
      }

      if (recordActivities) {
        this.activities.push({
          layer: d.layer,
          source: d.source,
          target: d.target,
          activity: activity
        });
      }

      for (let i = 0; i < this.detachedNodes.length; i++) {
        if ((this.detachedNodes[i].layer === d.layer && this.detachedNodes[i].unit === d.source) ||
          ((this.detachedNodes[i].layer - 1) === d.layer && this.detachedNodes[i].unit === d.target)) {
          color = '#373737';
          break;
        }
      }
    }

    if (mode === 'topology') {
      for (let i = 0; i < this.activities.length; i++) {
        if ((this.activities[i].layer == d.layer && this.activities[i].source == d.unit) ||
          (this.activities[i].layer == d.layer - 1 && this.activities[i].target == d.unit)) {
          switch (this.activities[i].activity) {
            case 1: {
              color = 'rgba(229, 115, 115, .35)';
              break;
            }
            case 0.5: {
              color = 'rgba(229, 115, 115, .175)';
              break;
            }
          }
          break;
        }
      }

      for (let i = 0; i < this.detachedNodes.length; i++) {
        if (this.detachedNodes[i].layer === d.layer && this.detachedNodes[i].unit === d.unit) {
          color = '#373737';
          break;
        }
      }
    }

    return color;
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

        self.bindWeights(0);
        self.bindTopology(0);
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
