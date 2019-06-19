import { Component, OnInit, ViewChild, OnDestroy, Output, EventEmitter, } from '@angular/core';
import { Chart } from 'chart.js';

import { Subject } from 'rxjs';
import { takeUntil, take, concatMap, filter } from 'rxjs/operators';

import { DataService } from 'src/app/services/data.service';
import { NetworkService } from 'src/app/network.service';
import { PlaygroundService } from 'src/app/playground.service';

@Component({
  selector: 'app-accuracy-plot',
  templateUrl: './accuracy-plot.component.html',
  styleUrls: ['./accuracy-plot.component.scss']
})
export class AccuracyPlotComponent implements OnInit, OnDestroy {
  @ViewChild('canvas') canvas;
  @Output() finished: EventEmitter<boolean>;

  selectedFile;
  topology;

  networkResultsCorrectData;
  chart; barChartData;

  destroyed = new Subject<void>();

  constructor(
    private dataService: DataService,
    private playgroundService: PlaygroundService,
    private networkService: NetworkService
  ) {
    this.finished = new EventEmitter<boolean>();
  }

  ngOnInit() {
    this.dataService.visualize
      .pipe(
        takeUntil(this.destroyed),
        filter(val => val === true),
        concatMap(() => {
          this.selectedFile = this.dataService.selectedFile;
          return this.playgroundService.getTopology(this.selectedFile);
        })
      )
      .subscribe(topology => {
        this.topology = topology;
        this.accTest(true, [], []);
      });

    this.dataService.testNetwork
      .pipe(
        takeUntil(this.destroyed),
        filter(val => val === true)
      )
      .subscribe(() => {
        const layers = [];
        const units = [];

        this.dataService.detachedNodes.forEach(element => {
          layers.push(element.layer - 1);
          units.push(element.unit);
        });

        if (layers.length === 0 && units.length === 0) {
          this.accTest(true, layers, units);
        } else {
          this.accTest(false, layers, units);
        }
      });
  }

  accTest(isInit, layers, units) {
    const filename = this.selectedFile.split('\\')[1]
      .split('.')[0];

    this.networkService.ablationTest(this.topology, filename, layers, units)
      .pipe(take(1))
      .subscribe((val: any) => {
        val['class specific accuracy'] = val['class specific accuracy'].map(acc => acc * 100);
        val['class specific accuracy'].unshift(val['averaged accuracy']);

        if (isInit) {
          this.networkResultsCorrectData = val['class specific accuracy'];

          const networkResultsCorrect = {
            label: 'Correctly Classified',
            backgroundColor: 'rgb(117, 117, 117)',
            borderWidth: 1,
            data: val['class specific accuracy'],
            stack: 'results'
          };

          const networkResultsMisclassified = {
            label: 'Misclassified',
            backgroundColor: 'rgb(238, 160, 51)',
            borderWidth: 1,
            data: val['class specific accuracy'].map(acc => 100 - acc),
            stack: 'results'
          };

          this.barChartData = {
            labels: val.labels,
            datasets: [networkResultsCorrect, networkResultsMisclassified]
          };
        } else {
          this.barChartData.datasets[0].data = val['class specific accuracy'];
          this.barChartData.datasets[1].data = val['class specific accuracy'].map(acc => 100 - acc);

          const networkChangesData = [[], []];
          this.networkResultsCorrectData.forEach((result, resultIndex) => {
            const changes = result - val['class specific accuracy'][resultIndex];
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

          if (this.barChartData.datasets[2] && this.barChartData.datasets[3]) {
            this.barChartData.datasets[2] = networkChangesGain;
            this.barChartData.datasets[3] = networkChangesLoss;
          } else {
            this.barChartData.datasets.push(networkChangesGain);
            this.barChartData.datasets.push(networkChangesLoss);
          }
        }

        this.plotAccuracies(isInit);
        this.dataService.ablationTestResult.next(val);
      });
  }

  plotAccuracies(isInit) {
    if (isInit) {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }

      this.chart = new Chart(this.canvas.nativeElement.getContext('2d'), {
        type: 'bar',
        data: this.barChartData,
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

    this.finished.emit(true);
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
