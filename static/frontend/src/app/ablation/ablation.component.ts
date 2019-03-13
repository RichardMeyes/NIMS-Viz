import { Component, OnInit, OnDestroy } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DataService } from '../services/data.service';


@Component({
  selector: 'app-ablation',
  templateUrl: './ablation.component.html',
  styleUrls: ['./ablation.component.scss']
})
export class AblationComponent implements OnInit, OnDestroy {
  selectedFile: any;

  showTestNetwork: boolean;

  destroyed = new Subject<void>();

  constructor(
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.showTestNetwork = false;

    this.dataService.vizWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        if (val) { this.showTestNetwork = true; }
      });

    this.dataService.selectedFile
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        if (val) { this.selectedFile = val; }
      });
  }

  testNetwork() {
    this.dataService.testNetwork.next(true);
  }

  resetNetwork() {
    this.dataService.resetNetwork.next(true);
  }

  public ngOnDestroy() {
    this.destroyed.next();
  }
}
