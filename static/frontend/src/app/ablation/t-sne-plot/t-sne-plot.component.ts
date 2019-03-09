import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Chart } from 'chart.js';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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

  tSNECoor;
  testResult;

  constructor(
    private dataService: DataService,
    private networkService: NetworkService
  ) { }

  ngOnInit() {
    this.networkService.getTSNECoordinate()
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { if (val) { this.tSNECoor = val; } });

    this.dataService.testResult
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        if (val) {
          this.scatterChartData = {
            datasets: [{
              label: 'Correctly Classified',
              backgroundColor: 'rgba(66, 66, 66, .5)',
              borderColor: 'rgba(66, 66, 66, 1)',
              data: this.tSNECoor.map(coor => {
                return { x: coor[0], y: coor[1] };
              })
            }]
          };

          this.plotCoor();
        }
      });
  }

  plotCoor() {
    this.chart = new Chart(this.canvas.nativeElement.getContext('2d'), {
      type: 'scatter',
      data: this.scatterChartData,
      // options: {
      //   title: {
      //     display: true,
      //     text: ''
      //   }
      // }
    });
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
