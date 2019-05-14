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
  destroyed = new Subject<void>();

  @ViewChild('canvas') canvas;
  chart; barChartData;

  networkResultsCorrectData;
  selectedFile; topology;

  @Output() finished: EventEmitter<boolean>;

  constructor(
    private dataService: DataService,
    private networkService: NetworkService,
    private playgroundService: PlaygroundService
  ) {
    this.finished = new EventEmitter<boolean>();
  }

  ngOnInit() {
    this.dataService.selectedFile
      .pipe(
        filter(val => {
          if (val) {
            return true;
          } else {
            return false;
          }
        }),
        concatMap(val => {
          this.selectedFile = val;
          return this.playgroundService.getTopology(this.selectedFile);
        }),
        takeUntil(this.destroyed)
      )
      .subscribe(val => {
        this.topology = val;
        this.accTest(true, [], []);
      });

    this.dataService.detachedNodes
      .pipe(takeUntil(this.destroyed))
      .subscribe((val: any) => {
        if (val) {
          const layers = [];
          const units = [];

          val.forEach(element => {
            layers.push(element.layer);
            units.push(element.unit);
          });

          if (layers.length === 0 && units.length === 0) {
            this.accTest(true, layers, units);
          } else {
            this.accTest(false, layers, units);
          }
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
            backgroundColor: 'rgba(117, 117, 117, .1)',
            borderColor: 'rgba(117, 117, 117, 1)',
            borderWidth: 1,
            data: val['class specific accuracy'],
            stack: 'results'
          };

          const networkResultsMisclassified = {
            label: 'Misclassified',
            backgroundColor: 'rgba(253, 160, 6, .1)',
            borderColor: 'rgba(253, 160, 6, 1)',
            borderWidth: 1,
            data: val['class specific accuracy'].map(acc => 100 - acc),
            stack: 'results'
          };

          this.barChartData = {
            labels: val.labels,
            datasets: [networkResultsCorrect, networkResultsMisclassified]
          };
        } else {
          // console.log('From Backend:');
          // console.log('before ablation:', this.networkResultsCorrectData);
          // console.log('after ablation:', val['class specific accuracy']);

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
            backgroundColor: 'rgba(241, 83, 110, .25)',
            borderColor: 'rgba(241, 83, 110, 1)',
            borderWidth: 1,
            data: networkChangesData[0],
            stack: 'changes'
          };
          const networkChangesGain = {
            label: 'Correctly Classified After Ablation',
            backgroundColor: 'rgba(0, 198, 137, .25)',
            borderColor: 'rgba(0, 198, 137, 1)',
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
        this.dataService.testResult.next(val);
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
