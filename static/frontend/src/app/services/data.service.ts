import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Playground } from '../models/playground.model';
import { Option } from '../models/option.model';
import { HeatmapConfig } from '../models/heatmap-config.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  toolbarHeight: BehaviorSubject<number>;
  readonly tabsHeight: number;

  readonly heatmapNodeConfig;
  createHeatmap: BehaviorSubject<any>;

  playgroundData: BehaviorSubject<Playground>;
  selectedFile: BehaviorSubject<string>;
  optionData: BehaviorSubject<Option>;

  vizTopology: BehaviorSubject<any>;
  vizWeights: BehaviorSubject<any>;

  activeSceneTab: BehaviorSubject<number>;

  lastTraining: BehaviorSubject<any>;

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
    this.createHeatmap = new BehaviorSubject(null);

    this.playgroundData = new BehaviorSubject(new Playground());
    this.selectedFile = new BehaviorSubject(null);
    this.optionData = new BehaviorSubject(new Option(null, new HeatmapConfig(), false));

    this.vizTopology = new BehaviorSubject(null);
    this.vizWeights = new BehaviorSubject(null);

    this.activeSceneTab = new BehaviorSubject(0);

    this.lastTraining = new BehaviorSubject(null);
  }
}
