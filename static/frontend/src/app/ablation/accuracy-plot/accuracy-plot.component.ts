import { Component, OnInit, ViewChild, OnDestroy, Output, EventEmitter, } from '@angular/core';
import { Chart } from 'chart.js';

import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

import { DataService } from 'src/app/services/data.service';
import { NetworkService } from 'src/app/network.service';

@Component({
  selector: 'app-accuracy-plot',
  templateUrl: './accuracy-plot.component.html',
  styleUrls: ['./accuracy-plot.component.scss']
})
export class AccuracyPlotComponent implements OnInit, OnDestroy {
  destroyed = new Subject<void>();

  @ViewChild('canvas') canvas;
  chart; barChartData;

  fullNetworkData;
  selectedFile;

  @Output() finished: EventEmitter<boolean>;

  constructor(
    private dataService: DataService,
    private networkService: NetworkService
  ) {
    this.finished = new EventEmitter<boolean>();
  }

  ngOnInit() {
    // Chart.pluginService.register({
    //   beforeUpdate: function (chartInstance) {
    //     for (let i = 1; i < chartInstance.data.datasets.length; i++) {
    //       chartInstance.data.datasets[i].backgroundColor = chartInstance.data.datasets[i].data.map(function (data) {
    //         return data < 0 ? 'rgba(70, 130, 180, .25)' : 'rgba(205, 92, 92, .25)';
    //       });

    //       chartInstance.data.datasets[i].borderColor = chartInstance.data.datasets[i].data.map(function (data) {
    //         return data < 0 ? 'rgba(70, 130, 180, 1)' : 'rgba(205, 92, 92, 1)';
    //       });
    //     }
    //   }
    // });

    this.dataService.selectedFile
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        if (val) {
          this.selectedFile = val;
          this.accTest(true, this.selectedFile, [], []);
        }
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
            this.accTest(true, this.selectedFile, layers, units);
          } else {
            this.accTest(false, this.selectedFile, layers, units);
          }
        }
      });
  }

  accTest(isFull, selectedFile, layers, units) {
    const network = selectedFile.split('\\')[1]
      .split('.')[0];

    this.networkService.ablationTest(network, layers, units)
      .pipe(take(1))
      .subscribe((val: any) => {
        val['class specific accuracy'] = val['class specific accuracy'].map(acc => acc * 100);
        val['class specific accuracy'].unshift(val['averaged accuracy']);

        if (isFull) {
          this.fullNetworkData = val['class specific accuracy'];

          const fullNetwork = {
            label: 'Full Network',
            backgroundColor: 'rgba(117, 117, 117, .1)',
            borderColor: 'rgba(117, 117, 117, 1)',
            borderWidth: 1,
            data: val['class specific accuracy']
          };

          this.barChartData = {
            labels: val.labels,
            datasets: [fullNetwork]
          };
        } else {
          this.barChartData.datasets[0].data = this.fullNetworkData.map((el, elIndex) =>
            el - val['class specific accuracy'][elIndex]);

          const ablatedNetwork = {
            label: 'Ablated Network',
            backgroundColor: 'rgba(205, 92, 92, .25)',
            borderColor: 'rgba(205, 92, 92, 1)',
            borderWidth: 1,
            data: val['class specific accuracy']
          };

          if (this.barChartData.datasets[1]) {
            this.barChartData.datasets[1] = ablatedNetwork;
          } else {
            this.barChartData.datasets.push(ablatedNetwork);
          }
        }

        this.plotAccuracies(isFull);
        this.dataService.testResult.next(val);
      });
  }

  plotAccuracies(isFull) {
    if (isFull) {
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
              }
            }],
            yAxes: [{
              scaleLabel: {
                display: true,
                labelString: 'Accuracy [%]'
              }
            }]
          },
          tooltips: {
            callbacks: {
              label: (tooltipItem, data) =>
                `${Math.round(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index] * 100) / 100}%`
            }
          }
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
