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

  vizTopology: any;
  vizWeights: any;
  selectedFile: any;

  showTestNetwork: boolean;

  destroyed = new Subject<void>();

  constructor(
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.showTestNetwork = false;

    this.dataService.vizTopology
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.vizTopology = val; });

    this.dataService.vizWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        this.vizWeights = val;
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

  public ngOnDestroy() {
    this.destroyed.next();
  }
}
