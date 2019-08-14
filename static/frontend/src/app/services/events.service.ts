import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { NeuralNetworkSettings } from '../models/create-nn.model';
import { EpochSlider } from '../models/layer-view.model';
import { SavedNetworks } from '../models/saved-networks.model';

/**
 * Service of shared events.
 */
@Injectable({
  providedIn: 'root'
})
export class EventsService {
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

  constructor() {
    this.updateTopology = new Subject();
    this.updateWeights = new Subject();
    this.updateLayerView = new Subject();
  }
}
