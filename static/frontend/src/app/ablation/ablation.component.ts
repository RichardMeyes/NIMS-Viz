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
  showTestNetwork: boolean;

  accFinished: boolean;
  tSNEFinished: boolean;

  destroyed = new Subject<void>();

  constructor(
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.showTestNetwork = false;
    this.showSpinner = false;

    this.dataService.selectedFile
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        if (val) {
          this.showTestNetwork = false;
          this.showSpinner = true;
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
      this.showTestNetwork = true;

      this.accFinished = false;
      this.tSNEFinished = false;
    }
  }

  tabChanged(selectedTab) {
    if (selectedTab === 1) {
      this.dataService.selectedFilter.next(null);
    } else {
      // this.dataService.selectedFilter.next(`${this.selectedConvLayer}-${this.selectedUnit}`);
    }
  }

  public ngOnDestroy() {
    this.destroyed.next();
  }

  tiles: Tile[] = [
    { text: 'One', cols: 3, rows: 1, color: 'lightblue' },
    { text: 'Two', cols: 1, rows: 2, color: 'lightgreen' },
    { text: 'Three', cols: 1, rows: 1, color: 'lightpink' },
    { text: 'Four', cols: 2, rows: 1, color: '#DDBDF1' },
  ];
}
