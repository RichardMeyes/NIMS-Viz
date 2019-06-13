import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Playground } from '../models/playground.model';
import { Option } from '../models/option.model';
import { HeatmapConfig } from '../models/heatmap-config.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  selectedFile: BehaviorSubject<string>;
  detachedNodes: BehaviorSubject<any>;
  epochSliderConfig: BehaviorSubject<any>;

  classifyResult: Subject<any>;
  ablationTestResult: Subject<any>;

  visualize: Subject<boolean>;
  testNetwork: Subject<boolean>;
  resetNetwork: Subject<boolean>;
  epochSliderChange: Subject<boolean>;









  toolbarHeight: BehaviorSubject<number>;
  readonly tabsHeight: number;
  readonly bottomMargin: number;

  readonly heatmapNodeConfig;
  createHeatmap: BehaviorSubject<any>;

  playgroundData: BehaviorSubject<Playground>;
  optionData: BehaviorSubject<Option>;

  vizTopology: BehaviorSubject<any>;
  vizWeights: BehaviorSubject<any>;
  untrainedWeights: BehaviorSubject<any>;

  filterWeights: BehaviorSubject<any>;
  selectedFilter: BehaviorSubject<any>;




  activeSceneTab: BehaviorSubject<number>;

  lastTraining: BehaviorSubject<any>;


  constructor() {
    this.selectedFile = new BehaviorSubject(undefined);
    this.detachedNodes = new BehaviorSubject([]);
    this.epochSliderConfig = new BehaviorSubject(undefined);

    this.classifyResult = new Subject();
    this.ablationTestResult = new Subject();

    this.visualize = new Subject();
    this.testNetwork = new Subject();
    this.resetNetwork = new Subject();
    this.epochSliderChange = new Subject();









    this.toolbarHeight = new BehaviorSubject(56);
    this.tabsHeight = 49;
    this.bottomMargin = 72;

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
    this.optionData = new BehaviorSubject(new Option(null, new HeatmapConfig(), false));

    this.vizTopology = new BehaviorSubject(null);
    this.vizWeights = new BehaviorSubject(null);
    this.untrainedWeights = new BehaviorSubject(null);

    this.filterWeights = new BehaviorSubject(null);
    this.selectedFilter = new BehaviorSubject(null);


    this.activeSceneTab = new BehaviorSubject(0);

    this.lastTraining = new BehaviorSubject(null);

  }
}
