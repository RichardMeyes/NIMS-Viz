import { Component, OnInit, OnDestroy } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import { NetworkService } from '../network.service';
import { DataService } from '../services/data.service';

@Component({
  selector: 'app-builder',
  templateUrl: './builder.component.html',
  styleUrls: ['./builder.component.scss']
})
export class BuilderComponent implements OnInit, OnDestroy {
  epochCounter;
  destroyed = new Subject<void>();

  constructor(
    private dataService: DataService,
    private networkService: NetworkService
  ) { }

  ngOnInit() {
    this.dataService.trainNetwork
      .pipe(
        takeUntil(this.destroyed),
        filter(val => val === true)
      )
      .subscribe(() => {
        this.epochCounter = undefined;
      });

    this.networkService.onMessage()
      .pipe(takeUntil(this.destroyed))
      .subscribe((message: JSON) => {
        this.epochCounter = +Object.keys(message['resultWeights'])[0].split('_')[1] + 1;
      });
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
