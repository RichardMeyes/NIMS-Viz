import { Component, OnInit, ViewChild, OnDestroy, } from '@angular/core';
import { Chart } from 'chart.js';

import { DataService } from 'src/app/services/data.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.dataService.plotAccuracies
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        if (val) { this.plotAccuracies(); }
      });

    this.barChartData = {
      labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
      datasets: [{
        label: 'Dataset 1',
        backgroundColor: 'rgba(205, 92, 92, .5)',
        borderColor: 'rgba(205, 92, 92, 1)',
        borderWidth: 1,
        data: [
          this.randomScalingFactor(),
          this.randomScalingFactor(),
          this.randomScalingFactor(),
          this.randomScalingFactor(),
          this.randomScalingFactor(),
          this.randomScalingFactor(),
          this.randomScalingFactor()
        ]
      }, {
        label: 'Dataset 2',
        backgroundColor: 'rgba(70, 130, 180, .5)',
        borderColor: 'rgba(70, 130, 180, 1)',
        borderWidth: 1,
        data: [
          this.randomScalingFactor(),
          this.randomScalingFactor(),
          this.randomScalingFactor(),
          this.randomScalingFactor(),
          this.randomScalingFactor(),
          this.randomScalingFactor(),
          this.randomScalingFactor()
        ]
      }]

    };
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
          text: 'Chart.js Bar Chart'
        }
      }
    });
  }

  randomScalingFactor() {
    return Math.round(Math.random() * 100 + 1);
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
