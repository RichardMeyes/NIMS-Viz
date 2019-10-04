import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { NeuralNetworkSettings } from '../models/neural-network.model';
import { EpochSlider } from '../models/layer-view.model';
import { SavedNetworks } from '../models/saved-networks.model';
import { TestResult } from '../models/ablation.model';

/**
 * Service of shared events.
 */
@Injectable({
  providedIn: 'root'
})
export class EventsService {

  /**
   * Update saved networks list.
   */
  updateSavedNetworksList: Subject<boolean>;

  /**
   * Update the topology of layer view.
   */
  updateTopology: Subject<NeuralNetworkSettings>;

  /**
   * Update the weights of layer view.
   */
  updateWeights: Subject<EpochSlider>;

  /**
   * Update layer view.
   */
  updateLayerView: Subject<SavedNetworks>;

  /**
   * Ablate the network.
   */
  ablateNetwork: Subject<boolean>;

  /**
   * Test the network.
   */
  testNetwork: Subject<boolean>;

  /**
   * Update ablation charts.
   */
  updateAblationCHarts: Subject<TestResult>;

  /**
   * Clear ablation charts.
   */
  clearAblationCharts: Subject<boolean>;

  constructor() {
    this.updateSavedNetworksList = new Subject();
    this.updateTopology = new Subject();
    this.updateWeights = new Subject();
    this.updateLayerView = new Subject();
    this.ablateNetwork = new Subject();
    this.testNetwork = new Subject();
    this.updateAblationCHarts = new Subject();
    this.clearAblationCharts = new Subject();
  }
}
