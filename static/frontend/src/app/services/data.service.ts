import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Playground } from '../playground.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  toolbarHeight: BehaviorSubject<number>;
  readonly tabsHeight: number;

  readonly heatmapNodeConfig;
  epochSliderConfig: BehaviorSubject<any>;
  createHeatmap: BehaviorSubject<any>;

  playgroundData: BehaviorSubject<Playground>;

  currEpoch: BehaviorSubject<string>;

  vizTopology: BehaviorSubject<any>;
  vizWeights: BehaviorSubject<any>;

  activeSceneTab: BehaviorSubject<number>;

  constructor() {
    this.toolbarHeight = new BehaviorSubject(56);
    this.tabsHeight = 49;

    this.heatmapNodeConfig = {
      radius: 4,
      blur: 0,
      minOpacity: 0.05,
      color1: '#0000ff',
      color1Trigger: 0.1,
      color2: '#ff0000',
      color2Trigger: 1.0,
      colorGradient: function () {
        const tempobj = {};
        tempobj[this.color1Trigger] = this.color1;
        tempobj[this.color2Trigger] = this.color2;
        return tempobj;
      }
    };
    this.epochSliderConfig = new BehaviorSubject(null);
    this.createHeatmap = new BehaviorSubject(null);

    this.playgroundData = new BehaviorSubject(new Playground());

    this.currEpoch = new BehaviorSubject('');

    this.vizTopology = new BehaviorSubject(null);
    this.vizWeights = new BehaviorSubject(null);

    this.activeSceneTab = new BehaviorSubject(0);
  }
}
