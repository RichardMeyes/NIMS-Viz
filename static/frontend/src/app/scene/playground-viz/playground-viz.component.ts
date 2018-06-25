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
  @Input() weights: any;

  context; base;
  playCanvasWidth;
  filteredLayerCount; layerSpacing; nodeRadius;

  changesTopology; changesWeights;
  rawChanges: Subject<SimpleChanges>;


  constructor(private playgroundService: PlaygroundService) {
    this.rawChanges = new Subject();
    this.playCanvasWidth = window.innerWidth;
    this.nodeRadius = 20;
  }

  ngOnInit() {
    this.canvas.width = this.playCanvasWidth;
    this.rawChanges.pipe(debounceTime(500)).subscribe(
      filteredChanges => { this.setup(filteredChanges); }
    )
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.topology) {
      this.changesTopology = changes.topology;
      if (changes.topology.firstChange) this.setup({ topology: this.changesTopology, weights: undefined });
      else this.rawChanges.next({ topology: this.changesTopology, weights: undefined });
    }

    if (changes.weights) {
      if (changes.weights.currentValue && changes.weights.currentValue.length > 0) {
        this.changesWeights = changes.weights;
        this.rawChanges.next({ topology: this.changesTopology, weights: this.changesWeights });
      }
    }
  }

  setup(filteredChanges: SimpleChanges) {
    this.context = this.canvas.getContext("2d");
    let customBase = document.createElement('base');
    this.base = d3.select(customBase);

    // topology
    if (filteredChanges.topology) {
      let layers = filteredChanges.topology.currentValue.layers;

      this.filteredLayerCount = 0;
      let filteredData = [];
      for (let i = 0; i < this.playgroundService.imageSize; i++) {
        filteredData.push({ layer: this.filteredLayerCount, unit: i, unitSpacing: (this.canvas.height / this.playgroundService.imageSize) });
      }
      this.filteredLayerCount++;
      layers.forEach(layer => {
        if (layer.units && layer.units != "") {
          for (let i = 0; i < +layer.units; i++) {
            filteredData.push({ layer: this.filteredLayerCount, unit: i, unitSpacing: (this.canvas.height / +layer.units) });
          }
          this.filteredLayerCount++;
        }
      });
      this.layerSpacing = (this.playCanvasWidth / this.filteredLayerCount);
      this.bindTopology(filteredData);
    }

    // weights
    if (filteredChanges.weights) {
      let filteredData = [];
      let batches = filteredChanges.weights.currentValue;
      let savedSourceIndex = 0;
      let layerIndexCount = 0;
      batches.forEach((batch, batchIndex) => {
        filteredData = [];
        for (let layerIndex = 0; layerIndex < batch.length; layerIndex++) {
          batch[layerIndex].weights[0].forEach((source, sourceIndex) => {
            source.forEach((target, targetIndex) => {
              filteredData.push({ layer: layerIndexCount, isBias: 0, source: sourceIndex, target: targetIndex, value: target, unitSpacing: (this.canvas.height / +batch[layerIndex].weights[0].length), targetUnitSpacing: (this.canvas.height / +batch[layerIndex].weights[1].length) });
            });
            savedSourceIndex = sourceIndex;
          });
          batch[layerIndex].weights[1].forEach((target, targetIndex) => {
            // filteredData.push({ layer: layerIndex, isBias: 1, source: (savedSourceIndex + 1), target: targetIndex, value: target, unitSpacing: (this.canvas.height / +batch[layerIndex].weights[0].length) });
          });
          if (batch[layerIndex].weights[0].length > 0) layerIndexCount++;
        }
        
        this.bindWeights(filteredData);
      });
    }

    let self = this;
    let t = d3.timer((elapsed) => {
      self.draw();
      if (elapsed > 300) { t.stop(); }
    }, 150);
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
      .attr('style', function (d) { return "stroke:#9E9E9E; stroke-width:0" });

    join
      .merge(enterSel)
      .transition()
      .attr('style', function (d) { return "stroke:#9E9E9E; stroke-width:0.5" });

    let exitSel = join.exit()
      .transition()
      .attr('style', function (d) { return "stroke:#9E9E9E; stroke-width:0" })
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
      // self.context.fillStyle = node.attr('fill');
      self.context.moveTo(node.attr("x1"), node.attr("y1"));
      self.context.lineTo(node.attr("x2"), node.attr("y2"));
      self.context.stroke();
    });
  }
}
