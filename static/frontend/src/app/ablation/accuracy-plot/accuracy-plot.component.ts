import { Component, OnInit, ViewChild, OnDestroy, } from '@angular/core';
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

  selectedFile;

  constructor(
    private dataService: DataService,
    private networkService: NetworkService
  ) { }

  ngOnInit() {
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

          this.accTest(false, this.selectedFile, layers, units);
        }
      });
  }

  accTest(isFull, selectedFile, layers, units) {
    const network = selectedFile.split('\\')[1]
      .split('.')[0];

    this.networkService.ablationTest(network, layers, units)
      .pipe(take(1))
      .subscribe((val: any) => {
        val['class specific accuracy'].unshift(0);
        val['class specific accuracy'] = val['class specific accuracy'].map(acc => acc * 100);

        if (isFull) {
          this.barChartData = {
            labels: val.labels,
            datasets: [{
              label: 'Full Network',
              backgroundColor: 'rgba(205, 92, 92, .5)',
              borderColor: 'rgba(205, 92, 92, 1)',
              borderWidth: 1,
              data: val['class specific accuracy']
            }]
          };
        } else {
          if (this.barChartData.datasets[1]) {
            this.barChartData.datasets[1] = {
              label: 'Ablated Network',
              backgroundColor: 'rgba(70, 130, 180, .5)',
              borderColor: 'rgba(70, 130, 180, 1)',
              borderWidth: 1,
              data: val['class specific accuracy']
            };
          } else {
            this.barChartData.datasets.push({
              label: 'Ablated Network',
              backgroundColor: 'rgba(70, 130, 180, .5)',
              borderColor: 'rgba(70, 130, 180, 1)',
              borderWidth: 1,
              data: val['class specific accuracy']
            });
          }
        }

        this.plotAccuracies(isFull);
        this.dataService.testResult.next(val);
      });
  }

  plotAccuracies(isFull) {
    if (isFull) {
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
          }
        }
      });
    } else {
      this.chart.update();
    }
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
