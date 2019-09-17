import { Injectable } from '@angular/core';
import { NeuralNetworkSettings, TrainingSettings } from '../models/neural-network.model';
import { SavedNetworks } from '../models/saved-networks.model';
import { ActiveSideMenu } from '../models/navigation.model';
import { WeightedTopology } from '../models/layer-view.model';
import { TestDigitResult } from '../models/ablation.model';

/**
 * Service of shared data.
 */
@Injectable({
  providedIn: 'root'
})
export class DataService {

  /**
   * NN settings of network-creator form.
   */
  nnSettings: NeuralNetworkSettings;

  /**
   * trainingsettings
   */
  trainingSettings: TrainingSettings;

  /**
   * Selected network at the moment.
   * It referes to the filename of the topology file.
   */
  selectedNetwork: SavedNetworks;

  /**
   * Currently active side menu.
   */
  activeSideMenu: ActiveSideMenu;

  /**
   * List of detached nodes.
   */
  detachedNodes: WeightedTopology[];

  /**
   * The result of classifying free-drawing drawing.
   */
  classifyResult: TestDigitResult;

  constructor() {
    this.nnSettings = new NeuralNetworkSettings();
    this.trainingSettings = new TrainingSettings();
    this.selectedNetwork = undefined;
    this.activeSideMenu = ActiveSideMenu.None;
    this.detachedNodes = [];
    this.classifyResult = undefined;
  }
}
