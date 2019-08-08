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
  updateLayerView: Subject<NeuralNetworkSettings>;

  constructor() {
    this.updateLayerView = new Subject();
  }
}
