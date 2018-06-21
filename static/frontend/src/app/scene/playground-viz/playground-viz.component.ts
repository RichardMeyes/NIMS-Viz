import { Component, ViewChild, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import * as d3 from "d3";
import { Observable, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

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

  rawChangesTopology: Subject<SimpleChanges>;
  rawChangesWeights: Subject<SimpleChanges>;

  constructor() {
    this.rawChangesTopology = new Subject();
    this.playCanvasWidth = window.innerWidth;
    this.nodeRadius = 5;
  }

  ngOnInit() {
    this.canvas.width = this.playCanvasWidth;
    this.rawChangesTopology.pipe(debounceTime(500)).subscribe(
      filteredChanges => { this.setup(filteredChanges); }
    )
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.topology) {
      if (changes.topology.firstChange) this.setup(changes);
      else this.rawChangesTopology.next(changes);
    }

    if (changes.weights) {
      if (changes.weights.currentValue && changes.weights.currentValue.length > 0){

      }
    }
    console.log(changes);
  }

  setup(filteredChanges: SimpleChanges) {
    this.context = this.canvas.getContext("2d");
    let layers = filteredChanges.topology.currentValue.layers;
    let customBase = document.createElement('base');
    this.base = d3.select(customBase);

    this.filteredLayerCount = 0;
    let filteredData = [];
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
        let cx: number = (self.layerSpacing * d.layer) + (self.layerSpacing / 2) - self.nodeRadius;
        return cx;
      })
      .attr('cy', function (d, i) {
        let cy: number = (d.unitSpacing * d.unit) + (d.unitSpacing / 2) - self.nodeRadius;
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
    let join = this.base.selectAll('base.circle')
      .data(filteredData);

    let self = this;
    let enterSel = join.enter()
      .append('base')
      .attr('class', 'circle')
      .attr('cx', function (d, i) {
        let cx: number = (self.layerSpacing * d.layer) + (self.layerSpacing / 2) - self.nodeRadius;
        return cx;
      })
      .attr('cy', function (d, i) {
        let cy: number = (d.unitSpacing * d.unit) + (d.unitSpacing / 2) - self.nodeRadius;
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
  }
}
