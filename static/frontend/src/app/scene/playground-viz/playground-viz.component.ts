import { Component, OnInit, ViewChild } from '@angular/core';
import * as d3 from "d3";

@Component({
  selector: 'app-playground-viz',
  templateUrl: './playground-viz.component.html',
  styleUrls: ['./playground-viz.component.scss']
})
export class PlaygroundVizComponent implements OnInit {
  @ViewChild('playCanvas') private playCanvasRef;
  private get canvas(): HTMLCanvasElement {
    return this.playCanvasRef.nativeElement;
  }

  context;
  data = [];
  numElements = 100;
  custom;
  groupSpacing: number;
  cellSpacing: number;
  offsetTop: number;
  cellSize: number;

  constructor() { }

  ngOnInit() {
    this.test();
  }

  test() {
    this.context = this.canvas.getContext("2d");

    d3.range(this.numElements).forEach((el) => { this.data.push({ value: el }); });
    let customBase = document.createElement('custom');
    this.custom = d3.select(customBase);

    this.groupSpacing = 4;
    this.cellSpacing = 2;
    this.offsetTop = this.canvas.height / 5;
    this.cellSize = Math.floor((this.canvas.width - 11 * this.groupSpacing) / 100) - this.cellSpacing;

    this.bind();

    let self = this;
    let t = d3.timer((elapsed) => {
      self.draw();
      if (elapsed > 300) t.stop();
    });

  }

  bind() {
    let colourScale = d3.scaleSequential(d3.interpolateSpectral).domain(d3.extent(this.data, function (d) { return d.value; }));
    let join = this.custom.selectAll('custom.rect')
      .data(this.data);

    let self = this;
    var enterSel = join.enter()
      .append('custom')
      .attr('class', 'rect')
      .attr('x', function (d, i) {
        var x0 = Math.floor(i / 100) % 10, x1 = Math.floor(i % 10);
        return self.groupSpacing * x0 + (self.cellSpacing + self.cellSize) * (x1 + x0 * 10);
      })
      .attr('y', function (d, i) {
        var y0 = Math.floor(i / 1000), y1 = Math.floor(i % 100 / 10);
        return self.groupSpacing * y0 + (self.cellSpacing + self.cellSize) * (y1 + y0 * 10);
      })
      .attr('width', this.cellSize)
      .attr('height', this.cellSize)
      .attr('fillStyle', function (d) { return colourScale(d.value); });

    join
      .merge(enterSel)
      .transition()
      .attr('width', this.cellSize)
      .attr('height', this.cellSize)
      .attr('fillStyle', function (d) { return colourScale(d.value); });

    let exitSel = join.exit()
      .transition()
      .attr('width', 0)
      .attr('height', 0)
      .remove();
  }

  draw() {
    this.context.fillStyle = '#fff';
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    let elements = this.custom.selectAll('custom.rect');
    let self = this;
    elements.each(function (d, i) {
      var node = d3.select(this);
      self.context.fillStyle = node.attr('fillStyle');
      self.context.fillRect(node.attr('x'), node.attr('y'), node.attr('width'), node.attr('height'));
    });
  }
}
