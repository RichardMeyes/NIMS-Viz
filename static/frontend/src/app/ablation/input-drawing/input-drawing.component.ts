import { Component, OnInit, Input, OnChanges, SimpleChanges, ViewChild, OnDestroy } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil, concatMap } from 'rxjs/operators';

import { AblationService } from 'src/app/services/ablation.service';
import { DataService } from 'src/app/services/data.service';

import 'fabric';
declare const fabric: any;

@Component({
  selector: 'app-input-drawing',
  templateUrl: './input-drawing.component.html',
  styleUrls: ['./input-drawing.component.scss']
})
export class InputDrawingComponent implements OnChanges, OnInit, OnDestroy {
  @Input('clearCanvas') clearCanvasInput;
  @ViewChild('container') container;

  canvas;
  selectedFile;

  destroyed = new Subject<void>();

  constructor(
    private ablationService: AblationService,
    private dataService: DataService
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
      this.ablationService.saveDigit(blob)
        .pipe(
          takeUntil(this.destroyed),
          concatMap(() => this.ablationService.testDigit(this.dataService.selectedFile.getValue()))
        )
        .subscribe(() => {
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

  ngOnDestroy() {
    this.destroyed.next();
  }
}
