import { Component, ViewChild, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { Observable, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { PlaygroundService } from '../../playground.service';

@Component({
  selector: 'app-playground-viz',
  templateUrl: './playground-viz.component.html',
  styleUrls: ['./playground-viz.component.scss']
})
export class PlaygroundVizComponent implements OnInit, OnChanges {
  @ViewChild('playCanvas') private playCanvasRef;
  private get canvas(): HTMLCanvasElement {
    return this.playCanvasRef.nativeElement;
  }

  @Input() topology: any;
  @Input() weights: any;

  context; base;
  playCanvasWidth;
  playCanvasHeight;
  filteredLayerCount; layerSpacing; nodeRadius;
  interpolatedColor;

  changesTopology; changesWeights;
  rawChanges: Subject<SimpleChanges>;


  constructor(private playgroundService: PlaygroundService) {
    this.rawChanges = new Subject();
    this.playCanvasWidth = 0.5 * window.innerWidth;
    this.playCanvasHeight = 0.5 * window.innerHeight;
    this.nodeRadius = 10;
  }

  ngOnInit() {
    this.canvas.width = this.playCanvasWidth;
    this.canvas.height = this.playCanvasHeight;
    this.rawChanges.pipe(debounceTime(500)).subscribe(
      filteredChanges => {
        this.setupTopology(filteredChanges);
        this.setupWeights(filteredChanges);
        // this.context.translate(200, 200);
      }
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.topology) {
      this.changesTopology = changes.topology;
      if (changes.topology.firstChange) {
        this.setupTopology({ topology: this.changesTopology, weights: undefined });
        this.setupWeights({ topology: undefined, weights: [] });
      } else { this.rawChanges.next({ topology: this.changesTopology, weights: undefined }); }
    }

    if (changes.weights) {
      this.changesWeights = changes.weights;
      this.rawChanges.next({ topology: this.changesTopology, weights: this.changesWeights });
    }
    // this.context.translate(200, 200);
  }

  setupTopology(filteredChanges) {
    this.context = this.canvas.getContext('2d');
    // this.context.translate(200, 200);
    const customBase = document.createElement('base');
    this.base = d3.select(customBase);

    this.interpolatedColor = d3.interpolateRgb('#3F51B5', '#F44336');

    // topology
    if (filteredChanges.topology) {
      const layers = filteredChanges.topology.currentValue.layers;

      this.filteredLayerCount = 0;
      const filteredData = [];
      for (let i = 0; i < 784; i++) {
        filteredData.push({ layer: this.filteredLayerCount, unit: i, unitSpacing: (this.canvas.height / 784) });
      }
      this.filteredLayerCount++;
      layers.forEach(layer => {
        if (layer.unitCount && layer.unitCount !== 0) {
          for (let i = 0; i < +layer.unitCount; i++) {
            filteredData.push({ layer: this.filteredLayerCount, unit: i, unitSpacing: (this.canvas.height / +layer.unitCount) });
          }
          this.filteredLayerCount++;
        }
      });
      for (let i = 0; i < 10; i++) {
        filteredData.push({ layer: this.filteredLayerCount, unit: i, unitSpacing: (this.canvas.height / 10) });
      }
      this.filteredLayerCount++;
      this.layerSpacing = (this.playCanvasWidth / this.filteredLayerCount);
      this.bindTopology(filteredData);
    }

    const self = this;
    const t = d3.timer((elapsed) => {
      self.draw();
      if (elapsed > 300) { t.stop(); }
    }, 150);
  }

  setupWeights(filteredChanges) {
    const filteredData = [];
    let maxWeight = 0; let minWeight = 0;

    if (filteredChanges.weights && filteredChanges.weights.currentValue) {
      const trainingResult = filteredChanges.weights.currentValue;

      Object.keys(trainingResult).forEach((epoch, epochIndex) => {
        setTimeout(() => {
          Object.keys(trainingResult[epoch]).forEach((layer, layerIndex) => {
            if (layer !== 'output') {
              trainingResult[epoch][layer].forEach((destination, destinationIndex) => {
                destination.forEach((source, sourceIndex) => {
                  if (sourceIndex === 0) {
                    minWeight = source;
                    maxWeight = source;
                  } else {
                    if (source < minWeight) { minWeight = source; }
                    if (source > maxWeight) { maxWeight = source; }
                  }


                  filteredData.push({
                    layer: layerIndex,
                    source: sourceIndex,
                    target: destinationIndex,
                    value: source,
                    unitSpacing: (this.canvas.height / +destination.length),
                    targetUnitSpacing: (this.canvas.height / +trainingResult[epoch][layer].length)
                  });
                });
              });
            }
          });
          this.interpolatedColor = d3.scaleLinear()
            .domain([minWeight, maxWeight])
            .range(['rgb(63,81,181)', 'rgb(244,67,54)']);


          this.bindWeights(filteredData);
          this.draw();
        }, 1500 * epochIndex);
      });
    }

    // let self = this;
    // let t = d3.timer((elapsed) => {
    //   self.draw();
    //   if (elapsed > 300) { t.stop(); }
    // }, 150);
  }

  bindTopology(filteredData) {
    const join = this.base.selectAll('base.circle')
      .data(filteredData);

    const self = this;
    const enterSel = join.enter()
      .append('base')
      .attr('class', 'circle')
      .attr('cx', function (d, i) {
        const cx: number = (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return cx;
      })
      .attr('cy', function (d, i) {
        const cy: number = (d.unitSpacing * d.unit) + (d.unitSpacing / 2);
        return cy;
      })
      .attr('r', 0);

    join
      .merge(enterSel)
      .transition()
      .attr('r', this.nodeRadius)
      .attr('fill', function (d) { return '#3F51B5'; });

    const exitSel = join.exit()
      .transition()
      .attr('r', 0)
      .remove();
  }

  bindWeights(filteredData) {
    const join = this.base.selectAll('base.line')
      .data(filteredData);

    const self = this;
    const enterSel = join.enter()
      .append('base')
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
      .attr('stroke', function (d) { return self.interpolatedColor(d.value); });
    // .attr('stroke', function (d) { return self.interpolatedColor((d.value + 1) / 2) });

    join
      .merge(enterSel)
      .transition()
      .attr('stroke', function (d) { return self.interpolatedColor(d.value); });
    // .attr('stroke', function (d) { return "black"});

    const exitSel = join.exit()
      .transition()
      .attr('style', function (d) { return 'stroke:#fff; stroke-width:0'; })
      .remove();
  }

  draw() {
    this.context.fillStyle = '#fff';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    // this.context.fillRect(0.5 * this.canvas.width, 0.5 * this.canvas.height, this.canvas.width, this.canvas.height);

    let elements = this.base.selectAll('base.circle');
    const self = this;
    elements.each(function (d, i) {
      const node = d3.select(this);
      self.context.beginPath();
      self.context.fillStyle = node.attr('fill');
      self.context.arc(node.attr('cx'), node.attr('cy'), node.attr('r'), 0, 2 * Math.PI);
      self.context.fill();
    });

    elements = this.base.selectAll('base.line');
    elements.each(function (d, i) {
      const node = d3.select(this);
      self.context.beginPath();
      self.context.strokeStyle = node.attr('stroke');
      self.context.moveTo(node.attr('x1'), node.attr('y1'));
      self.context.lineTo(node.attr('x2'), node.attr('y2'));
      self.context.stroke();
    });
  }
}
