import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Playground } from '../models/playground.model';
import { Option } from '../models/option.model';
import { HeatmapConfig } from '../models/heatmap-config.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  toolbarHeight: BehaviorSubject<number>;

  activeSceneTab: number;

  playgroundData: Playground;
  optionData: Option;
  selectedFile: string;

  topology;
  epochSliderConfig;
  detachedNodes;

  ablationTestResult: Subject<any>;
  classifyResult: Subject<any>;

  trainNetwork: Subject<boolean>;
  resetPlaygroundForm: Subject<boolean>;
  applyOption: Subject<boolean>;
  resetOption: Subject<boolean>;
  visualize: Subject<boolean>;
  epochSliderChange: Subject<boolean>;
  testNetwork: Subject<boolean>;
  resetNetwork: Subject<boolean>;





  readonly tabsHeight: number;
  readonly bottomMargin: number;
  readonly heatmapNodeConfig;

  filterWeights: BehaviorSubject<any>;
  selectedFilter: BehaviorSubject<any>;

  constructor() {
    this.toolbarHeight = new BehaviorSubject(56);

    this.activeSceneTab = 0;

    this.playgroundData = new Playground();
    this.optionData = new Option(new HeatmapConfig(), false);
    this.selectedFile = undefined;

    this.topology = undefined;
    this.epochSliderConfig = undefined;
    this.detachedNodes = [];

    this.ablationTestResult = new Subject();
    this.classifyResult = new Subject();

    this.trainNetwork = new Subject();
    this.resetPlaygroundForm = new Subject();
    this.applyOption = new Subject();
    this.resetOption = new Subject();
    this.visualize = new Subject();
    this.epochSliderChange = new Subject();
    this.testNetwork = new Subject();
    this.resetNetwork = new Subject();





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

    this.filterWeights = new BehaviorSubject(null);
    this.selectedFilter = new BehaviorSubject(null);
  }
}
