import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  toolbarHeight: BehaviorSubject<number>;
  readonly tabsHeight: number;

  epochSliderConfig: BehaviorSubject<any>;

  vizTopology: BehaviorSubject<any>;
  vizWeights: BehaviorSubject<any>;

  constructor() {
    this.toolbarHeight = new BehaviorSubject(56);
    this.tabsHeight = 49;

    this.epochSliderConfig = new BehaviorSubject(null);

    this.vizTopology = new BehaviorSubject(null);
    this.vizWeights = new BehaviorSubject(null);
  }
}
