import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { EventsService } from 'src/app/services/events.service';
import { takeUntil, concatMap, filter } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { TestResult } from 'src/app/models/ablation.model';
import { Chart } from 'chart.js';
import { DataService } from 'src/app/services/data.service';
import { BackendCommunicationService } from 'src/app/backendCommunication/backend-communication.service';

@Component({
  selector: 'app-ablation-accuracy',
  templateUrl: './ablation-accuracy.component.html',
  styleUrls: ['./ablation-accuracy.component.scss']
})
export class AblationAccuracyComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvas;

  /**
   * Spinner status.
   */
  showSpinner: boolean;

  /**
   * Test results on full network.
   */
  networkResultsCorrectData: number[];

  /**
   * Chart configurations.
   */
  chart; chartData;

  /**
   * Flag to unsubscribe.
   */
  destroyed = new Subject<void>();

  constructor(
    private eventsService: EventsService,
    private dataService: DataService,
    private backend: BackendCommunicationService
  ) { }

  ngOnInit() {
    this.showSpinner = false;

    this.eventsService.testNetwork
      .pipe(
        takeUntil(this.destroyed),
        concatMap(() => {
          return this.backend.testNetwork(
            this.dataService.selectedNetwork.id,
            ''
          );
        })
      )
      .subscribe((ablationTestResult: TestResult) => {
        ablationTestResult.isInitChart = true;
        this.eventsService.updateAblationCHarts.next(ablationTestResult);
      });

    this.eventsService.ablateNetwork
      .pipe(
        takeUntil(this.destroyed),
        concatMap(() => {
          this.showSpinner = true;

          const nodes = [];
          this.dataService.detachedNodes.forEach(detachedNode => {
            let availableIndex = -1;

            nodes.some((node, nodeIndex) => {
              if (node.layerNumber === +detachedNode.backendKey.split('_')[1]) {
                availableIndex = nodeIndex;
                return true;
              }
            });

            if (availableIndex === -1) {
              nodes.push({
                layerNumber: +detachedNode.backendKey.split('_')[1],
                ablatedWeights: [detachedNode.unit]
              });
            } else {
              nodes[availableIndex].ablatedWeights.push(detachedNode.unit);
            }

          });

          return this.backend.ablateNetwork(
            this.dataService.selectedNetwork.id,
            nodes
          );
        }),
        concatMap(() => {
          return this.backend.testNetwork(
            this.dataService.selectedNetwork.id,
            ''
          );
        })
      )
      .subscribe((ablationTestResult: TestResult) => {
        if (this.dataService.detachedNodes.length === 0) {
          ablationTestResult.isInitChart = true;
        }
        this.eventsService.updateAblationCHarts.next(ablationTestResult);
      });


    this.eventsService.updateAblationCHarts
      .pipe(
        takeUntil(this.destroyed)
      )
      .subscribe((ablationTestResult: TestResult) => {
        ablationTestResult.classSpecificAccuracy = ablationTestResult.classSpecificAccuracy.map(acc => acc * 100);
        ablationTestResult.classSpecificAccuracy.unshift(ablationTestResult.averageAccuracy);

        if (ablationTestResult.isInitChart) {
          this.networkResultsCorrectData = ablationTestResult.classSpecificAccuracy;

          const networkResultsCorrect = {
            label: 'Correctly Classified',
            backgroundColor: 'rgb(117, 117, 117)',
            borderWidth: 1,
            data: ablationTestResult.classSpecificAccuracy,
            stack: 'results'
          };

          const networkResultsMisclassified = {
            label: 'Misclassified',
            backgroundColor: 'rgb(238, 160, 51)',
            borderWidth: 1,
            data: ablationTestResult.classSpecificAccuracy.map(acc => 100 - acc),
            stack: 'results'
          };

          this.chartData = {
            labels: ablationTestResult.labels,
            datasets: [networkResultsCorrect, networkResultsMisclassified]
          };
        } else {
          this.chartData.datasets[0].data = ablationTestResult.classSpecificAccuracy;
          this.chartData.datasets[1].data = ablationTestResult.classSpecificAccuracy.map(acc => 100 - acc);

          const networkChangesData = [[], []];
          this.networkResultsCorrectData.forEach((result, resultIndex) => {
            const changes = result - ablationTestResult.classSpecificAccuracy[resultIndex];
            if (changes >= 0) {
              networkChangesData[0].push(changes);
              networkChangesData[1].push(0);
            } else {
              networkChangesData[0].push(0);
              networkChangesData[1].push(Math.abs(changes));
            }
          });

          const networkChangesLoss = {
            label: 'Misclassified After Ablation',
            backgroundColor: 'rgb(217, 84, 79)',
            borderWidth: 1,
            data: networkChangesData[0],
            stack: 'changes'
          };
          const networkChangesGain = {
            label: 'Correctly Classified After Ablation',
            backgroundColor: 'rgb(91, 184, 93)',
            borderWidth: 1,
            data: networkChangesData[1],
            stack: 'changes'
          };

          if (this.chartData.datasets[2] && this.chartData.datasets[3]) {
            this.chartData.datasets[2] = networkChangesGain;
            this.chartData.datasets[3] = networkChangesLoss;
          } else {
            this.chartData.datasets.push(networkChangesGain);
            this.chartData.datasets.push(networkChangesLoss);
          }
        }

        this.plotAccuracies(ablationTestResult.isInitChart);
      });

    this.eventsService.clearAblationCharts
      .pipe(
        takeUntil(this.destroyed),
        filter(isClear => isClear)
      )
      .subscribe(() => {
        this.clearChart();
      });
  }

  /**
   * Draw the chart.
   * @param isInit Status of the chart whether it is initializing or updating.
   */
  plotAccuracies(isInit) {
    if (isInit) {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }

      this.chart = new Chart(this.canvas.nativeElement.getContext('2d'), {
        type: 'bar',
        data: this.chartData,
        options: {
          responsive: true,
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Accuracy Test Results'
          },
          scales: {
            xAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Class Label'
              },
              stacked: true
            }],
            yAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Accuracy [%]'
              },
              stacked: true
            }]
          },
          tooltips: {
            callbacks: {
              label: (tooltipItem, data) =>
                `${Math.round(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index] * 100) / 100}%`
            }
          },
          maintainAspectRatio: false
        }
      });
    } else {
      this.chart.update();
    }

    this.showSpinner = false;
  }

  /**
   * Clears chart.
   */
  clearChart() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
