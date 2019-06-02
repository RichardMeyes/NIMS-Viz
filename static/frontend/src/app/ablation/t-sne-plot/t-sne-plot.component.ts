import { Component, OnInit, OnDestroy, ViewChild, Output, EventEmitter } from '@angular/core';
import { Chart } from 'chart.js';

import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

import { DataService } from 'src/app/services/data.service';
import { NetworkService } from 'src/app/network.service';

@Component({
  selector: 'app-t-sne-plot',
  templateUrl: './t-sne-plot.component.html',
  styleUrls: ['./t-sne-plot.component.scss']
})
export class TSNEPlotComponent implements OnInit, OnDestroy {
  destroyed = new Subject<void>();

  @ViewChild('canvas') canvas;
  chart; scatterChartData;

  tSNECoor; colorLabels;
  isInit;

  @Output() finished: EventEmitter<boolean>;

  constructor(
    private dataService: DataService,
    private networkService: NetworkService
  ) {
    this.finished = new EventEmitter<boolean>();
  }

  ngOnInit() {
    this.isInit = true;

    this.dataService.detachedNodes
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        if (val) {
          const layers = [];
          const units = [];

          val.forEach(element => {
            layers.push(element.layer);
            units.push(element.unit);
          });

          if (layers.length === 0 && units.length === 0) {
            this.isInit = true;
          } else {
            this.isInit = false;
          }
        }
      });

    this.networkService.getTSNECoordinate()
      .pipe(take(1))
      .subscribe(val => { if (val) { this.tSNECoor = val; } });

    this.dataService.testResult
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        if (val) {
          if (this.isInit) { this.colorLabels = val['color labels']; }

          const coloredCoor = [[], [], [], []];
          const labels = [[], [], [], []];

          val['color labels'].forEach((element, elementIndex) => {

            if (this.isInit || (!this.isInit && this.colorLabels[elementIndex] === element)) {
              if (element === 1) {
                coloredCoor[0].push(this.tSNECoor[elementIndex]);
                labels[0].push(val['class labels'][elementIndex]);
              } else if (element === 0) {
                coloredCoor[1].push(this.tSNECoor[elementIndex]);
                labels[1].push(val['class labels'][elementIndex]);
              }
            } else {
              if (this.colorLabels[elementIndex] === 0 && element === 1) {
                coloredCoor[2].push(this.tSNECoor[elementIndex]);
                labels[2].push(val['class labels'][elementIndex]);
              } else if (this.colorLabels[elementIndex] === 1 && element === 0) {
                coloredCoor[3].push(this.tSNECoor[elementIndex]);
                labels[3].push(val['class labels'][elementIndex]);
              }
            }

          });

          this.scatterChartData = {
            labels: labels,
            datasets: [
              {
                label: 'Correctly Classified',
                backgroundColor: 'rgb(117, 117, 117)',
                borderWidth: 1,
                data: coloredCoor[0].map(coor => {
                  return { x: coor[0], y: coor[1] };
                })
              },
              {
                label: 'Misclassified',
                backgroundColor: 'rgb(238, 160, 51)',
                borderWidth: 1,
                data: coloredCoor[1].map(coor => {
                  return { x: coor[0], y: coor[1] };
                })
              }
            ]
          };

          if (!this.isInit) {
            this.scatterChartData.datasets.push(
              {
                label: 'Correctly Classified After Ablation',
                backgroundColor: 'rgb(91, 184, 93)',
                borderWidth: 1,
                data: coloredCoor[2].map(coor => {
                  return { x: coor[0], y: coor[1] };
                })
              }
            );
            this.scatterChartData.datasets.push(
              {
                label: 'Misclassified After Ablation',
                backgroundColor: 'rgb(217, 84, 79)',
                borderWidth: 1,
                data: coloredCoor[3].map(coor => {
                  return { x: coor[0], y: coor[1] };
                })
              }
            );
          }

          this.plotCoor();
        }
      });
  }

  plotCoor() {
    if (this.isInit) {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }

      this.chart = new Chart(this.canvas.nativeElement.getContext('2d'), {
        type: 'scatter',
        data: this.scatterChartData,
        options: {
          responsive: true,
          title: {
            display: true,
            text: 'tSNE Visualization'
          },
          tooltips: {
            callbacks: {
              label: (tooltipItem, data) => `${data.labels[tooltipItem.datasetIndex][tooltipItem.index]}`
            }
          },
          maintainAspectRatio: false
        }
      });
    } else {
      this.chart.data = this.scatterChartData;
      this.chart.update();
    }

    this.finished.emit(true);
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
