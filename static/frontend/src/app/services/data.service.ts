import { Injectable } from '@angular/core';
import { NeuralNetworkSettings } from '../models/create-nn.model';
import { SavedNetworks } from '../models/saved-networks.model';

/**
 * Service of shared data.
 */
@Injectable({
  providedIn: 'root'
})
export class DataService {

  /**
   * The state of showing side menu or not.
   */
  showSideMenu: boolean;

  /**
   * NN settings of network-creator form.
   */
  nnSettings: NeuralNetworkSettings;

  /**
   * Selected network at the moment.
   * It referes to the filename of the topology file.
   */
  selectedNetwork: SavedNetworks;

  constructor() {
    this.showSideMenu = false;
    this.nnSettings = new NeuralNetworkSettings();
    this.selectedNetwork = {
      fileName: 'No Network Selected',
      nnSettings: undefined,
      viewName: undefined
    };
  }
}
