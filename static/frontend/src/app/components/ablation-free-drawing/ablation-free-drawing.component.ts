import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { DataService } from 'src/app/services/data.service';
import { take, concatMap } from 'rxjs/operators';
import { BackendCommunicationService } from 'src/app/backendCommunication/backend-communication.service';
import { TestDigitResult } from 'src/app/models/ablation.model';
import { EventsService } from 'src/app/services/events.service';

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
    public dataService: DataService,
    private eventService: EventsService
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
        .pipe(
          take(1),
          concatMap(() => {
            const koLayers: number[] = [];
            const koUnits: number[] = [];

            this.dataService.detachedNodes.forEach(element => {
              koLayers.push(element.layer - 1);
              koUnits.push(element.unit);
            });

            return this.backend.testDigit();
          })
        )
        .subscribe(testResult => {
          console.log(testResult);
          testResult.netOut = testResult.netOut.flat();
          Object.keys(testResult.nodesDict).forEach(layer => {
            testResult.nodesDict[layer] = testResult.nodesDict[layer].flat();
          });


          this.dataService.classifyResult = testResult;
          // this.eventService.updateTopology.next(this.dataService.selectedNetwork.nnSettings);
        });
    });
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

    this.dataService.classifyResult = undefined;
    if (this.dataService.selectedNetwork) {
      // this.eventService.updateTopology.next(this.dataService.selectedNetwork.nnSettings);
    }
  }

}
