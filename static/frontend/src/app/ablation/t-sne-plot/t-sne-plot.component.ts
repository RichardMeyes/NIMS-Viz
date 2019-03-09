import { Component, OnInit, OnDestroy } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NetworkService } from 'src/app/network.service';

@Component({
  selector: 'app-t-sne-plot',
  templateUrl: './t-sne-plot.component.html',
  styleUrls: ['./t-sne-plot.component.scss']
})
export class TSNEPlotComponent implements OnInit, OnDestroy {
  destroyed = new Subject<void>();

  constructor(
    private networkService: NetworkService
  ) { }

  ngOnInit() {
    this.networkService.getTSNECoordinate()
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        if (val) {
          console.log(val);
        }
      });
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
