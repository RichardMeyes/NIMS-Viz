import { Component, ViewChild, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import * as d3 from "d3";
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

  context; base;
  playCanvasWidth;
  filteredLayerCount; layerSpacing; nodeRadius;
  interpolatedColor;

  changesTopology; changesWeights;
  rawChanges: Subject<SimpleChanges>;


  constructor(private playgroundService: PlaygroundService) {
    this.rawChanges = new Subject();
    this.playCanvasWidth = window.innerWidth;
    this.nodeRadius = 10;
  }

  ngOnInit() {
    this.canvas.width = this.playCanvasWidth;
    this.rawChanges.pipe(debounceTime(500)).subscribe(
      filteredChanges => {
        this.setupTopology(filteredChanges);
        this.setupWeights({ topology: undefined, weights: [] });
      }
    )
    this.playgroundService.modelWeightsEveryBatch.subscribe(weights => {
      let filteredChanges = { topology: undefined, weights: weights };
      this.setupWeights(filteredChanges);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.topology) {
      this.changesTopology = changes.topology;
      if (changes.topology.firstChange) {
        this.setupTopology({ topology: this.changesTopology, weights: undefined });
        this.setupWeights({ topology: undefined, weights: [] });
      }
      else this.rawChanges.next({ topology: this.changesTopology, weights: undefined });
    }

    // if (changes.weights) {
    //   if (changes.weights.currentValue && changes.weights.currentValue.length > 0) {
    //     this.changesWeights = changes.weights;
    //     this.rawChanges.next({ topology: this.changesTopology, weights: this.changesWeights });
    //   }
    // }
  }

  setupTopology(filteredChanges) {
    this.context = this.canvas.getContext("2d");
    let customBase = document.createElement('base');
    this.base = d3.select(customBase);

    this.interpolatedColor = d3.interpolateRgb('#3F51B5', '#F44336');

    // topology
    if (filteredChanges.topology) {
      let layers = filteredChanges.topology.currentValue.layers;

      this.filteredLayerCount = 0;
      let filteredData = [];
      for (let i = 0; i < 784; i++) {
        filteredData.push({ layer: this.filteredLayerCount, unit: i, unitSpacing: (this.canvas.height / 784) });
      }
      this.filteredLayerCount++;
      layers.forEach(layer => {
        if (layer.unitCount && layer.unitCount != 0) {
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

    let self = this;
    let t = d3.timer((elapsed) => {
      self.draw();
      if (elapsed > 300) { t.stop(); }
    }, 150);
  }

  setupWeights(filteredChanges) {
    // weights
    if (filteredChanges.weights) {
      let filteredData = [];
      let layers = filteredChanges.weights;
      let savedSourceIndex = 0;
      let layerIndexCount = 0;
      let maxWeight = 0; let minWeight = 0;

      for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
        layers[layerIndex].weights[0].forEach((source, sourceIndex) => {
          for (let targetIndex = 0; targetIndex < source.length; targetIndex++) {
            filteredData.push({ layer: layerIndexCount, isBias: 0, source: sourceIndex, target: targetIndex, value: (source[targetIndex] * Math.pow(10, 16) % 100), unitSpacing: (this.canvas.height / +layers[layerIndex].weights[0].length), targetUnitSpacing: (this.canvas.height / +layers[layerIndex].weights[1].length) });
            if (targetIndex == 0) {
              minWeight = source[targetIndex];
              maxWeight = source[targetIndex];
            }
            else {
              if (source[targetIndex] < minWeight) minWeight = source[targetIndex];
              if (source[targetIndex] > maxWeight) maxWeight = source[targetIndex];
            }
          }
          // source.forEach((target, targetIndex) => {
          //   filteredData.push({ layer: layerIndexCount, isBias: 0, source: sourceIndex, target: targetIndex, value: target, unitSpacing: (this.canvas.height / +layers[layerIndex].weights[0].length), targetUnitSpacing: (this.canvas.height / +layers[layerIndex].weights[1].length) });
          // });
          savedSourceIndex = sourceIndex;
        });
        layers[layerIndex].weights[1].forEach((target, targetIndex) => {
          // filteredData.push({ layer: layerIndex, isBias: 1, source: (savedSourceIndex + 1), target: targetIndex, value: target, unitSpacing: (this.canvas.height / +batch[layerIndex].weights[0].length) });
        });
        if (layers[layerIndex].weights[0].length > 0) layerIndexCount++;
      }


      minWeight = minWeight * Math.pow(10, 16) % 100;
      maxWeight = maxWeight * Math.pow(10, 16) % 100;
      this.interpolatedColor = d3.scaleLinear()
        .domain([minWeight, maxWeight])
        .range(["rgb(63,81,181)", "rgb(244,67,54)"]);

      this.bindWeights(filteredData);
    }

    this.draw();
    // let self = this;
    // let t = d3.timer((elapsed) => {
    //   self.draw();
    //   if (elapsed > 300) { t.stop(); }
    // }, 150);
  }

  bindTopology(filteredData) {
    let join = this.base.selectAll('base.circle')
      .data(filteredData);

    let self = this;
    let enterSel = join.enter()
      .append('base')
      .attr('class', 'circle')
      .attr('cx', function (d, i) {
        let cx: number = (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return cx;
      })
      .attr('cy', function (d, i) {
        let cy: number = (d.unitSpacing * d.unit) + (d.unitSpacing / 2);
        return cy;
      })
      .attr('r', 0);

    join
      .merge(enterSel)
      .transition()
      .attr('r', this.nodeRadius)
      .attr('fill', function (d) { return "#3F51B5" });

    let exitSel = join.exit()
      .transition()
      .attr('r', 0)
      .remove();
  }

  bindWeights(filteredData) {
    let join = this.base.selectAll('base.line')
      .data(filteredData);

    let self = this;
    let enterSel = join.enter()
      .append('base')
      .attr('class', 'line')
      .attr('x1', function (d, i) {
        let x1: number = (self.layerSpacing * d.layer) + (self.layerSpacing / 2);
        return x1;
      })
      .attr('y1', function (d, i) {
        let y1: number = (d.unitSpacing * d.source) + (d.unitSpacing / 2);
        return y1;
      })
      .attr('x2', function (d, i) {
        let x1: number = (self.layerSpacing * (d.layer + 1)) + (self.layerSpacing / 2);
        return x1;
      })
      .attr('y2', function (d, i) {
        let y1: number = (d.targetUnitSpacing * d.target) + (d.targetUnitSpacing / 2);
        return y1;
      })
      .attr('stroke', function (d) { return self.interpolatedColor(d.value) });
    // .attr('stroke', function (d) { return self.interpolatedColor((d.value + 1) / 2) });

    join
      .merge(enterSel)
      .transition()
      .attr('stroke', function (d) { return self.interpolatedColor(d.value) });
    // .attr('stroke', function (d) { return "black"});

    let exitSel = join.exit()
      .transition()
      .attr('style', function (d) { return "stroke:#fff; stroke-width:0" })
      .remove();
  }

  draw() {
    this.context.fillStyle = '#fff';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    let elements = this.base.selectAll('base.circle');
    let self = this;
    elements.each(function (d, i) {
      var node = d3.select(this);
      self.context.beginPath();
      self.context.fillStyle = node.attr('fill');
      self.context.arc(node.attr('cx'), node.attr('cy'), node.attr('r'), 0, 2 * Math.PI);
      self.context.fill();
    });

    elements = this.base.selectAll('base.line');
    elements.each(function (d, i) {
      var node = d3.select(this);
      self.context.beginPath();
      self.context.strokeStyle = node.attr("stroke");
      self.context.moveTo(node.attr("x1"), node.attr("y1"));
      self.context.lineTo(node.attr("x2"), node.attr("y2"));
      self.context.stroke();
    });
  }
}
