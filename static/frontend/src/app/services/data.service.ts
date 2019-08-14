import { Injectable } from '@angular/core';
import { NeuralNetworkSettings } from '../models/create-nn.model';
import { SavedNetworks } from '../models/saved-networks.model';
import { ActiveSideMenu } from '../models/navigation.model';

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
   * Selected network at the moment.
   * It referes to the filename of the topology file.
   */
  selectedNetwork: SavedNetworks;

  /**
   * Currently active side menu.
   */
  activeSideMenu: ActiveSideMenu;

  constructor() {
    this.nnSettings = new NeuralNetworkSettings();
    this.selectedNetwork = {
      fileName: 'No Network Selected',
      nnSettings: undefined,
      viewName: undefined
    };
    this.activeSideMenu = ActiveSideMenu.None;
  }
}
