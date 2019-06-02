import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';

import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-ablation-playground',
  templateUrl: './ablation-playground.component.html',
  styleUrls: ['./ablation-playground.component.scss']
})
export class AblationPlaygroundComponent implements OnInit, OnDestroy {
  @ViewChild('container') container;

  topology; weights;
  untrainedWeights;

  destroyed = new Subject<void>();

  constructor(
    private dataService: DataService
  ) { }

  ngOnInit() {
    this.dataService.vizTopology
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        this.topology = val;
        // this.draw(true);
      });

    this.dataService.vizWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => {
        this.weights = val;
        // this.draw(true);
      });


    this.dataService.untrainedWeights
      .pipe(takeUntil(this.destroyed))
      .subscribe(val => { this.untrainedWeights = val; });
  }

  showMe() {
    console.clear();
    console.log('topology:', this.topology);
    console.log('trained weights:', this.weights);
    console.log('untrained weights:', this.untrainedWeights);
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
