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

  // selected file

  constructor() {
    this.nnSettings = new NeuralNetworkSettings();
  }
}
