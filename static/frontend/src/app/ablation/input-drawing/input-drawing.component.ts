import { Component, OnInit, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { AblationService } from 'src/app/services/ablation.service';

import 'fabric';
declare const fabric: any;

@Component({
  selector: 'app-input-drawing',
  templateUrl: './input-drawing.component.html',
  styleUrls: ['./input-drawing.component.scss']
})
export class InputDrawingComponent implements OnChanges, OnInit {
  @Input('clearCanvas') clearCanvasInput;
  @ViewChild('container') container;

  canvas;

  constructor(
    private ablationService: AblationService
  ) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.clearCanvasInput.currentValue) {
      this.clearCanvas();
    }
  }

  ngOnInit() {
    this.setupCanvas();
  }

  setupCanvas() {
    this.canvas = new fabric.Canvas('freeDrawing', {
      isDrawingMode: true
    });
  }

  classify() {
    this.canvas.getElement().toBlob(blob => {
      this.ablationService.saveDigit(blob).subscribe(() => {
        console.log('done');
      });
    });
  }

  clearCanvas() {
    const containerWidth = this.container.nativeElement.offsetWidth - 32;
    const containerHeight = this.container.nativeElement.offsetHeight - 32;
    const multiplier = Math.floor(Math.min(containerWidth, containerHeight) / 28);

    this.canvas.clear();
    this.canvas.backgroundColor = '#000000';
    this.canvas.freeDrawingBrush.color = '#f5f5f5';
    this.canvas.freeDrawingBrush.width = multiplier;
    this.canvas.setHeight(28 * multiplier);
    this.canvas.setWidth(28 * multiplier);
  }
}
