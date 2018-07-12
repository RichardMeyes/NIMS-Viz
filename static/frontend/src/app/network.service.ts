import { Injectable } from '@angular/core';
// import { Http } from '@angular/http';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

import { from, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import * as tfjs from '@tensorflow/tfjs';
const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/x-www-form-urlencoded',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With'
  })
};

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  // const httpOptions = {
  //   headers: new HttpHeaders({
  //     'Content-Type':  'application/json',
  //     'Authorization': 'my-auth-token'
  //   })
  // };
  // CORS headers
  // private headers = new Headers({
  //   'Content-Type': 'application/x-www-form-urlencoded',
  //   'Access-Control-Allow-Origin': '*',
  //   'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
  //   'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With'
  // });
  // private httpOptions = new RequestOptions({ headers: this.headers });
  private layers;
  private networkReductionFactor = 0.5;
  private convertedLayerObjs;
  private moleculeStruct = [];
  private heatmapCanvasResolution = 1.0; // 8.0;
  private heatmapCanvasHeight = 1024 * this.heatmapCanvasResolution;

  // angle which defines possible heatmaparea
  private angleSpan = 130.0;
  // center point in UV texture coordinates:
  private pointcenter = [438.669, 650.677];

  /* old values
  let radiusInner = 75;
  let radiusOuter = 201.953;*/
  private radiusInner = 100;
  private radiusOuter = 230;
  private radiusRange = this.radiusOuter - this.radiusInner;

  public get getLayerObj(): Object {
    return this.convertedLayerObjs;
  }
  public get getNetworkReductionFactor(): Number {
    return this.networkReductionFactor;
  }
  public get getMoleculeStruct(): any {
    return this.moleculeStruct;
  }

  constructor(private http: HttpClient) { }

  loadFromJson(): Observable<any> {
    return from(tfjs.loadModel('./assets/ann/json/model.json'))
      .pipe(map(model => this.extractWeights(model)));
  }

  private extractWeights(model: any) {
    const weights: any = [];

    model.layers.forEach(layer => {
      const info: any = { 'layer-name': layer.name, 'weights': [] };
      const kernel: any = [];
      let bias: any = [];

      if (layer.getWeights()[0]) {
        const m = layer.getWeights()[0].shape[0];
        const eachFeature = tfjs.split(layer.getWeights()[0], m, 0);
        for (let i = 0; i < m; i++) {
          kernel[i] = [];
          kernel[i] = Array.from(eachFeature[i].dataSync());
        }
      }

      if (layer.getWeights()[0]) {
        bias = Array.from(layer.getWeights()[1].dataSync());
      }

      if (kernel) { info['weights'].push(kernel); }
      if (bias) { info['weights'].push(bias); }

      weights.push(info);
    });

    return weights;
  }

  public createNetworkFromWeights(weightsParam) {
    // console.log('received layers', weightsParam);
    this.layers = weightsParam;
    const convertedNetwork = [];
    for (let i = 0; i < this.layers.length; i += 2) {
      const tempNodes = [];
      for (let j = 0; j < this.layers[i]['weights'][0].length * this.networkReductionFactor; j++) {
        const tempNode = j;
        tempNodes.push(tempNode);
      }
      convertedNetwork.push(tempNodes);
      // console.log("pushed "+(i*1.0/layers.length));
    }
    this.useNetwork(convertedNetwork);
  }

  private useNetwork(newNetwork) {
    this.convertedLayerObjs = this.divideIntoLayerAreas(newNetwork, this.angleSpan);

    this.findFittingVerticesInUVMap(this.convertedLayerObjs);
    this.buildMoleculeStruct();
    // this.createConnectionsBetweenLayers(this.convertedLayerObjs);
  }

  // cut alphamap area according to neural network properties
  private divideIntoLayerAreas(layersparam, angleSpan) {
    // console.log('creating layer areas');
    const layercount = layersparam.length;
    // angle size of the alphamaparea
    const areaPartAngle = angleSpan / layercount;
    const layerObjs = [];
    for (let i = 0; i < layercount; i++) {
      const layerObj = {
        layerID: i,
        size: 1.0 / (layersparam[i].length * 2 + 1), // nodes + free spaces in between + one freespace
        nodeCount: layersparam[i].length,
        layerAngle: 180 - (areaPartAngle * i), // angle of the entire layer
        nodesAngle: 180 - ((areaPartAngle * i) - 0.5 * areaPartAngle) // angle bisector from layerpart
      };
      layerObjs.push(layerObj);
    }
    return layerObjs;
  }

  private findFittingVerticesInUVMap(layerObjs) {
    // console.log('get center point of each node in layer');
    layerObjs.forEach(layer => {
      // definiere einen kreis mit mittelpunkt des knotens und radius % der gesamtlänge des alphamap zwischenraumes
      const diameterOfNodes = this.radiusRange * layer.size;
      const radiusOfNodes = diameterOfNodes / 2.0;
      const tempHeatmapNodes = [];
      const layerOffset = this.calcOffsetBasedOnAngle(layer.nodesAngle);
      for (let i = 1; i <= layer.nodeCount; i++) {
        // radiusInner as minimum offset + nodesizes * i + radius to get to the center of the current node
        const radiusToCenterOfNode = this.radiusInner + diameterOfNodes * i + radiusOfNodes;
        const randomOffsetX = (Math.random() * 20) - 10;
        const randomOffsetY = (Math.random() * 20) - 10;
        const xCenter = radiusToCenterOfNode * Math.cos(layer.nodesAngle * (Math.PI / 180)) + randomOffsetX;
        const yCenter = radiusToCenterOfNode * Math.sin(layer.nodesAngle * (Math.PI / 180)) + randomOffsetY;
        const centerOfNode = [xCenter + this.pointcenter[0] - layerOffset, this.heatmapCanvasHeight - (yCenter + this.pointcenter[1])];
        // expand around point. this will be the reference to
        tempHeatmapNodes.push(centerOfNode);
      }
      // add nodes converted to heatmap coordinates to each layer
      layer['heatmapNodes'] = tempHeatmapNodes;
    });
  }

  private calcOffsetBasedOnAngle(angle: Number) {
    // console.log("angle",angle);
    let offset = 0;
    if (angle > 170) {
      offset = 20;
    } else {
      offset = 0;
    }
    return offset;
  }

  private buildMoleculeStruct() {
    for (let i = 0; i < this.convertedLayerObjs.length; i++) {
      const tempLayerObj = {
        atoms: [],
        bonds: []
      };
      // nodes [x,y]
      for (let j = 0; j < this.convertedLayerObjs[i]['heatmapNodes'].length; j++) {
        const tempAtom = {
          x: this.convertedLayerObjs[i]['heatmapNodes'][j][0],
          y: this.convertedLayerObjs[i]['heatmapNodes'][j][1],
          z: 0 // j
        };
        tempLayerObj.atoms.push(tempAtom);

        if (this.convertedLayerObjs[i + 1] !== undefined) {
          for (let k = 0; k < this.convertedLayerObjs[i + 1]['heatmapNodes'].length; k++) {
            const tempBond = {
              source: j,
              target: k
            };
            tempLayerObj.bonds.push(tempBond);
          }
        }
      }
      this.moleculeStruct.push(tempLayerObj);

    }
  }

  public asyncCalcHeatmap(layers) {
    const body = `layers=${layers}&` + `layerObjs=${this.getLayerObj}`;

    /**
    * Posts to the server, maps the response to the handlerFunction (extractData)
    * and catches errors with the handleError function
    */
    return this.http.post('/calc/heatmap', body, httpOptions)
      .pipe(
        catchError(this.handleError)
      );
    // .map((res: Response) => this.extractData(res))
    // .catch((error: any) => this.handleError(error));
  }

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    // return an observable with a user-facing error message
    return throwError(
      'Something bad happened; please try again later.');
  }

}
