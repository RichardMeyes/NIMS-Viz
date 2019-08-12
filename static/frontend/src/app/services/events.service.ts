import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { NeuralNetworkSettings } from '../models/create-nn.model';

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
  updateWeights: Subject<boolean>;

  constructor() {
    this.updateTopology = new Subject();
    this.updateWeights = new Subject();
  }
}