import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { EventsService } from 'src/app/services/events.service';
import { takeUntil, take } from 'rxjs/operators';
import { TestResult } from 'src/app/models/ablation.model';
import { BackendCommunicationService } from 'src/app/backendCommunication/backend-communication.service';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-ablation-mapping',
  templateUrl: './ablation-mapping.component.html',
  styleUrls: ['./ablation-mapping.component.scss']
})
export class AblationMappingComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvas;

  /**
   * Spinner status.
   */
  showSpinner: boolean;

  /**
   * The TSNE coordinate.
   */
  tSNECoor: number[][];

  /**
   * Color labels on full network.
   */
  colorLabels: number[];

  /**
   * Chart configurations.
   */
  chart; chartData;

  /**
     * Flag to unsubscribe.
     */
  destroyed = new Subject<void>();

  constructor(
    private backend: BackendCommunicationService,
    private eventService: EventsService
  ) { }

  ngOnInit() {
    this.showSpinner = false;

    this.backend.getTSNECoordinate()
      .pipe(take(1))
      .subscribe((tSNECoor: number[][]) => {
        this.tSNECoor = tSNECoor;
      });

    this.eventService.testNetwork
      .pipe(
        takeUntil(this.destroyed)
      )
      .subscribe(() => {
        this.showSpinner = true;
      });

    this.eventService.updateAblationCHarts
      .pipe(
        takeUntil(this.destroyed)
      )
      .subscribe((ablationTestResult: TestResult) => {
        if (ablationTestResult.isInitChart) { this.colorLabels = ablationTestResult.colorLabels.slice(); }


        const coloredCoor = [[], [], [], []];
        const labels = [[], [], [], []];

        ablationTestResult.colorLabels.forEach((element, elementIndex) => {

          if (ablationTestResult.isInitChart || (!ablationTestResult.isInitChart && this.colorLabels[elementIndex] === element)) {
            if (element === 1) {
              coloredCoor[0].push(this.tSNECoor[elementIndex]);
              labels[0].push(ablationTestResult.classLabels[elementIndex]);
            } else if (element === 0) {
              coloredCoor[1].push(this.tSNECoor[elementIndex]);
              labels[1].push(ablationTestResult.classLabels[elementIndex]);
            }
          } else {
            if (this.colorLabels[elementIndex] === 0 && element === 1) {
              coloredCoor[2].push(this.tSNECoor[elementIndex]);
              labels[2].push(ablationTestResult.classLabels[elementIndex]);
            } else if (this.colorLabels[elementIndex] === 1 && element === 0) {
              coloredCoor[3].push(this.tSNECoor[elementIndex]);
              labels[3].push(ablationTestResult.classLabels[elementIndex]);
            }
          }

        });

        this.chartData = {
          labels,
          datasets: [
            {
              label: 'Correctly Classified',
              backgroundColor: 'rgb(117, 117, 117)',
              pointRadius: 2,
              data: coloredCoor[0].map(coor => {
                return { x: coor[0], y: coor[1] };
              })
            },
            {
              label: 'Misclassified',
              backgroundColor: 'rgb(238, 160, 51)',
              pointRadius: 2,
              data: coloredCoor[1].map(coor => {
                return { x: coor[0], y: coor[1] };
              })
            }
          ]
        };

        if (!ablationTestResult.isInitChart) {
          this.chartData.datasets.push(
            {
              label: 'Correctly Classified After Ablation',
              backgroundColor: 'rgb(91, 184, 93)',
              pointRadius: 2,
              data: coloredCoor[2].map(coor => {
                return { x: coor[0], y: coor[1] };
              })
            }
          );
          this.chartData.datasets.push(
            {
              label: 'Misclassified After Ablation',
              backgroundColor: 'rgb(217, 84, 79)',
              pointRadius: 2,
              data: coloredCoor[3].map(coor => {
                return { x: coor[0], y: coor[1] };
              })
            }
          );
        }

        this.plotMapping(ablationTestResult.isInitChart);
      });
  }

  /**
   * Draw the chart.
   * @param isInit Status of the chart whether it is initializing or updating.
   */
  plotMapping(isInit) {
    if (isInit) {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }

      this.chart = new Chart(this.canvas.nativeElement.getContext('2d'), {
        type: 'scatter',
        data: this.chartData,
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
      this.chart.data = this.chartData;
      this.chart.update();
    }

    this.showSpinner = false;
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
