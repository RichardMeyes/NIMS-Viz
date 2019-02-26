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

  destroyed = new Subject<void>();

  constructor(
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.dataService.vizTopology
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.vizTopology = val; });

    this.dataService.vizWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.vizWeights = val; });
  }

  public ngOnDestroy() {
    this.destroyed.next();
  }
}
