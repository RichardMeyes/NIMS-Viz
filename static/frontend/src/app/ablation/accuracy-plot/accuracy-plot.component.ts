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

  constructor(
    private dataService: DataService,
    private networkService: NetworkService
  ) { }

  ngOnInit() {
    this.dataService.plotAccuracies
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        if (val) {
          this.networkService.ablationTest()
            .pipe(take(1))
            .subscribe((anotherVal: any) => {
              this.barChartData = {
                labels: anotherVal.labels,
                datasets: [{
                  label: 'Value 1',
                  backgroundColor: 'rgba(205, 92, 92, .5)',
                  borderColor: 'rgba(205, 92, 92, 1)',
                  borderWidth: 1,
                  data: anotherVal.values1
                }, {
                  label: 'Value 2',
                  backgroundColor: 'rgba(70, 130, 180, .5)',
                  borderColor: 'rgba(70, 130, 180, 1)',
                  borderWidth: 1,
                  data: anotherVal.values2
                }]
              };

              this.plotAccuracies();
            });
        }
      });
  }

  plotAccuracies() {
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
          text: 'Test Results'
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
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
