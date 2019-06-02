import { Component, OnInit } from '@angular/core';
import 'fabric';
declare const fabric: any;

@Component({
  selector: 'app-input-drawing',
  templateUrl: './input-drawing.component.html',
  styleUrls: ['./input-drawing.component.scss']
})
export class InputDrawingComponent implements OnInit {
  canvas;

  constructor() { }

  ngOnInit() {
    this.setupCanvas();
    this.clearCanvas();
  }

  setupCanvas() {
    this.canvas = new fabric.Canvas('freeDrawing', {
      isDrawingMode: true
    });
  }

  clearCanvas() {
    this.canvas.clear();
    this.canvas.backgroundColor = '#000000';
    this.canvas.freeDrawingBrush.color = '#f5f5f5';
    this.canvas.setHeight(252);
    this.canvas.setWidth(252);
  }
}
