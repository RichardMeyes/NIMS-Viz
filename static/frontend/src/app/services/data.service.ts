import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  toolbarHeight: BehaviorSubject<number>;
  readonly tabsHeight: number;

  vizTopology: BehaviorSubject<any>;
  vizWeights: BehaviorSubject<any>;

  constructor() {
    this.toolbarHeight = new BehaviorSubject(56);
    this.tabsHeight = 49;

    this.vizTopology = new BehaviorSubject(null);
    this.vizWeights = new BehaviorSubject(null);
  }
}
