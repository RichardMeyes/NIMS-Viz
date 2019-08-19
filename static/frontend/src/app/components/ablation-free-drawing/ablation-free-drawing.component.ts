import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { DataService } from 'src/app/services/data.service';
import { take } from 'rxjs/operators';
import { BackendCommunicationService } from 'src/app/backendCommunication/backend-communication.service';

import 'fabric';
declare const fabric: any;

@Component({
  selector: 'app-ablation-free-drawing',
  templateUrl: './ablation-free-drawing.component.html',
  styleUrls: ['./ablation-free-drawing.component.scss']
})
export class AblationFreeDrawingComponent implements OnInit, AfterViewInit {
  @ViewChild('container', { static: false }) container;

  canvas;

  constructor(
    private backend: BackendCommunicationService,
    public dataService: DataService
  ) { }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.setupCanvas();
    this.clearCanvas();
  }

  /**
   * Init the canvas.
   */
  setupCanvas() {
    this.canvas = new fabric.Canvas('freeDrawing', {
      isDrawingMode: true
    });
  }

  /**
   * Classify the free-drawing drawing.
   */
  classify() {
    this.canvas.getElement().toBlob(blob => {
      this.backend.saveDigit(blob)
        .pipe(take(1))
        .subscribe();
    });

    console.log(this.dataService.detachedNodes);




    // concatMap(() => this.playgroundService.getTopology(this.dataService.selectedFile)),
    // concatMap(val => {
    //   const layers = [];
    //   const units = [];

    //         this.dataService.detachedNodes.forEach(element => {
    //           layers.push(element.layer - 1);
    //           units.push(element.unit);
    //         });

    //         return this.ablationService.testDigit(val, this.dataService.selectedFile, layers, units);
    //       })
    //     )
    //     .subscribe(val => {
    //       Object.keys(val['nodes_dict']).forEach(key => {
    //         val['nodes_dict'][key] = val['nodes_dict'][key].flat();
    //       });
    //       this.dataService.classifyResult.next(val);
    //     });
    // });
  }

  /**
   * Clears canvas.
   */
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
