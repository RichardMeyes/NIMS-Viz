import { Injectable } from '@angular/core';
import { NeuralNetworkSettings } from '../models/create-nn.model';

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
  selectedNetwork: string;

  constructor() {
    this.nnSettings = new NeuralNetworkSettings();
  }
}
