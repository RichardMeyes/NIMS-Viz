import { Component, OnInit, Input, OnChanges, ViewChild, HostListener, Output, EventEmitter, SimpleChanges } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import * as d3 from "d3";

@Component({
  selector: 'app-playground-viz',
  templateUrl: './playground-viz.component.html',
  styleUrls: ['./playground-viz.component.scss']
})
export class PlaygroundVizComponent implements OnInit, OnChanges {
  currEpoch: string;
  toolbarHeight: number;
  unsubscribe: Subject<any> = new Subject();

  zoom;
  svg; svgWidth; svgHeight;
  vizContainer;

  topology; weights;
  layerSpacing; nodeRadius;
  minMaxDiffs; activities;

  runningAnimation;

  @ViewChild("container") container;
  @Input() vizOptions;
  @Input() inputTopology;
  @Input() inputWeights;
  @Output() endofVisualization: EventEmitter<boolean>;

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    // TO BE IMPLEMENTED
  }

  constructor() {
    this.endofVisualization = new EventEmitter<boolean>();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.inputTopology && changes.inputTopology.firstChange) { return; }

    if (this.inputTopology) {
      this.activities = [];
      this.resetViz();

      this.setupTopology();
      this.bindTopology(0);
    }

    if (this.inputWeights) {
      this.setupWeights();
      this.runAnimation();
    }
  }

  ngOnInit() {
    this.svgWidth = window.innerWidth;
    this.svgHeight = window.innerHeight * 0.5;
    this.nodeRadius = 10;

    this.activities = [];
  }

  setupTopology() {
    let layers: number[] = this.inputTopology.layers.map(layer => +layer.unitCount);
    const filteredData = [];

    layers.forEach((layer, layerIndex) => {
      for (let i = 0; i < layer; i++) {
        filteredData.push({ layer: layerIndex, unit: i, unitSpacing: (this.svgHeight / layer) });
      }
    });
    for (let i = 0; i < 10; i++) {
      filteredData.push({ layer: layers.length, unit: i, unitSpacing: (this.svgHeight / 10) });
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
      diffsPerEpoch;
      this.currEpoch = `Epoch ${+epoch.split('_').pop() + 1}`;

      Object.keys(this.inputWeights[epoch]).forEach((layer, layerIndex) => {
        if (layer != "input" && layer != 'output') {
          diffsPerEpoch = { minDiff: 0, maxDiff: 0 };

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

  runAnimation() {
    if (this.weights.length == this.minMaxDiffs.length) {
      for (let i = 0; i < this.weights.length; i++) {
        this.runningAnimation.push(setTimeout(() => {
          this.activities = [];

          this.bindWeights(i);
          this.bindTopology(i);

          if (i == this.weights.length - 1) this.endofVisualization.emit(true);
        }, 1500 * i));
      }
    }
    else {
      this.currEpoch = "Something is wrong with the calculation. Please try again.";
      this.endofVisualization.emit(true);
    }
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
      .attr('stroke', function (d) { return self.generateColor(d, "weights", currEpoch);; });

    line
      .merge(enterSel)
      .transition()
      .duration(250)
      .attr('stroke', function (d) { return self.generateColor(d, "weights", currEpoch);; });

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
      .append("circle")
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
      .attr('fill', function (d) { return self.generateColor(d, "topology", currEpoch); });

    circles
      .merge(enterSel)
      .transition()
      .duration(250)
      .attr('r', this.nodeRadius)
      .attr('fill', function (d) { return self.generateColor(d, "topology", currEpoch); });

    const exitSel = circles.exit()
      .transition()
      .duration(250)
      .attr('r', 0)
      .remove();
  }

  generateColor(d, mode: string, currEpoch: number): string {
    let color = "#EEEEEE";
    let activity = 0;
    let recordActivities = false;

    if (mode == "weights") {
      let range = Math.abs(this.minMaxDiffs[currEpoch].maxDiff - this.minMaxDiffs[currEpoch].minDiff);
      let valuePercentage = d.value / range;

      if (valuePercentage > .5) {
        color = "#E57373";
        activity = 1;
        recordActivities = true;
      }
      else if (valuePercentage > .35) {
        color = "#FFCDD2";
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
    }

    if (mode == "topology") {
      for (let i = 0; i < this.activities.length; i++) {
        if ((this.activities[i].layer == d.layer && this.activities[i].source == d.unit) || (this.activities[i].layer == d.layer - 1 && this.activities[i].target == d.unit)) {
          switch (this.activities[i].activity) {
            case 1: {
              color = "rgba(229, 115, 115, .35)";
              break;
            }
            case 0.5: {
              color = "rgba(229, 115, 115, .175)";
              break;
            }
          }
          break;
        }
      }
    }

    return color;
  }

  resetViz() {
    if (this.runningAnimation) this.runningAnimation.forEach(element => { clearTimeout(element); });
    this.runningAnimation = [];

    if (this.svg) this.svg.remove();
    this.svg = d3.select(this.container.nativeElement)
      .append('svg')
      .attr('width', window.innerWidth)
      .attr('height', window.innerHeight * 0.5);
    this.vizContainer = this.svg.append("g");

    this.currEpoch = "";

    const self = this;
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on("zoom", () => { self.vizContainer.attr("transform", d3.event.transform); });
    this.svg.call(this.zoom);
  }
}
