import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import * as tfjs from '@tensorflow/tfjs';
import { Layers } from 'three';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  constructor() { }

  loadFromJson(): Observable<any> {
    return from(tfjs.loadModel('./assets/ann/json/model.json'))
      .pipe(map(model => this.extractWeights(model)));
  }

  private extractWeights(model: any) {
    let weights: any = [];

    model.layers.forEach(layer => {
      let info: any = { "layer-name": layer.name, "weights": [] };
      let kernel: any = [];
      let bias: any = [];

      if (layer.getWeights()[0]) {
        let m = layer.getWeights()[0].shape[0];
        let eachFeature = tfjs.split(layer.getWeights()[0], m, 0);
        for (let i = 0; i < m; i++) {
          kernel[i] = [];
          kernel[i] = Array.from(eachFeature[i].dataSync());
        }
      }

      if (layer.getWeights()[0]) {
        bias = Array.from(layer.getWeights()[1].dataSync());
      }

      if (kernel) { info["weights"].push(kernel); }
      if (bias) { info["weights"].push(bias); }

      weights.push(info);
    });

    return weights;
  }
}
