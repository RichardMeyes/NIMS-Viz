import { Component, OnInit, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { concatMap, take } from 'rxjs/operators';

import { AblationService } from 'src/app/services/ablation.service';
import { DataService } from 'src/app/services/data.service';
import { PlaygroundService } from 'src/app/playground.service';

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
  selectedFile;

  constructor(
    private ablationService: AblationService,
    private dataService: DataService,
    private playgroundService: PlaygroundService
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
          take(1),
          concatMap(() => this.playgroundService.getTopology(this.dataService.selectedFile.getValue())),
          concatMap(val => {
            const layers = [];
            const units = [];

            this.dataService.detachedNodes.getValue().forEach(element => {
              layers.push(element.layer - 1);
              units.push(element.unit);
            });

            return this.ablationService.testDigit(val, this.dataService.selectedFile.getValue(), layers, units);
          })
        )
        .subscribe(val => {
          Object.keys(val['nodes_dict']).forEach(key => {
            val['nodes_dict'][key] = val['nodes_dict'][key].flat();
          });
          this.dataService.classifyResult.next(val);
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
