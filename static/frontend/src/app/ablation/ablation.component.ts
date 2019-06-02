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
  showSpinner: boolean;
  showDashboard: boolean;

  accFinished: boolean;
  tSNEFinished: boolean;

  destroyed = new Subject<void>();

  constructor(
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.showSpinner = false;
    this.showDashboard = false;

    this.dataService.selectedFile
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        if (val) {
          this.showSpinner = true;
          this.showDashboard = false;
        }
      });
  }

  testNetwork() {
    this.showSpinner = true;
    this.dataService.testNetwork.next(true);
  }

  resetNetwork() {
    this.dataService.resetNetwork.next(true);
  }

  updateSpinner() {
    if (this.accFinished && this.tSNEFinished) {
      this.showSpinner = false;
      this.showDashboard = true;

      this.accFinished = false;
      this.tSNEFinished = false;
    }
  }

  public ngOnDestroy() {
    this.destroyed.next();
  }
}
