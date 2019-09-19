import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

import { throwError, Observable } from 'rxjs';
import { catchError, take, map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import {
  NeuralNetworkSettingsJSON,
  NeuralNetworkSettings,
  TrainingSettingsJSON,
  Channel,
  Convolution,
  Pooling,
  ConvLayer,
  DenseLayer
} from '../models/neural-network.model';

/**
 * httpOptions copied from old project file don't know if its realy necessary.
 */
const httpOptions = {
  headers: new HttpHeaders({
    // 'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With'
  })
};

/**
 * Service that communicates with the Backend. 
 * Instructions for noobs:
 * Has to be injected into the Components that needs a Backend Communication
 */
@Injectable({
  providedIn: 'root'
})
export class BackendCommunicationService {
  /**
   * Backend url.
   */
  private _backendURL;

  /**
   * Constructor of BackendCommunication-Service
   * @param _http HTTP Module that provides HTTP communication
   */
  constructor(private _http: HttpClient) {
    if (environment.production) {
      this._backendURL = 'http://localhost/api';
    } else {
      this._backendURL = 'http://127.0.0.1:3000';
    }
  }

  /**
   * Tests the Communication with the Backend. If the Backend is listening it returns a "OK"
   */
  public testCommunication(): Observable<any> {
    return this._http.get<any>(this._backendURL);
  }

  /**
   * Get a NN with the given id.
   * @param id of the Neural Network
   */
  public getNetwork(id: string): Observable<any> {
    return this._http.get<any>(this._backendURL);
  }

  /**
   * Creats a Neural Network with given parameters
   * @param setup NN settings
   */
  public createNetwork(setup: NeuralNetworkSettingsJSON): Observable<any> {
    return this._http.post(`${this._backendURL}/createNetwork`, setup);
  }

  /**
   * Trainss a Neural Network with given parameters
   * @param setup training settings
   */
  public trainNetwork(id: string, setup: TrainingSettingsJSON): Observable<any> {
    const body = { id, setup }
    return this._http.post(`${this._backendURL}/trainNetwork`, body);
  }

  /**
   * Loads network.
   * @param selectedNetwork the filename (static/data/topologies) of the network to be loaded.
   * @returns the network's settings
   */
  loadNetwork(uuid: string): Observable<any> {
    const body = { uuid };
    return this._http.post(`${this._backendURL}/loadNetwork`, body)
      .pipe(
        take(1),
        map((network: { [key: string]: any }) => {
          const nnSettings = new NeuralNetworkSettings(
            {
              x: network.input_dim[0],
              y: network.input_dim[1],
              z: new Channel(network.input_dim[2])
            },
            network.name
          );
          Object.keys(network.epoch_0).forEach(layer => {
            if (Object.values(Convolution).includes(network.epoch_0[layer].settings.type) ||
              Object.values(Pooling).includes(network.epoch_0[layer].settings.type)
            ) {
              nnSettings.convLayers.push(new ConvLayer(
                network.epoch_0[layer].settings.type,
                new Channel(network.epoch_0[layer].settings.inChannel),
                new Channel(network.epoch_0[layer].settings.outChannel),
                network.epoch_0[layer].settings.kernelSize,
                network.epoch_0[layer].settings.stride,
                network.epoch_0[layer].settings.padding,
                network.epoch_0[layer].settings.activation
              ));
            } else {
              nnSettings.denseLayers.push(new DenseLayer(
                network.epoch_0[layer].settings.type,
                network.epoch_0[layer].settings.outChannel,
                network.epoch_0[layer].settings.activation
              ));
            }
          });

          const nnWeights = {};
          Object.keys(network).forEach(key => {
            if (key.startsWith('epoch_') && key !== 'epoch_0') {
              nnWeights[key] = network[key];
            }
          });

          return {
            nnSettings,
            maxEpoch: network.epochs,
            untrainedWeights: network.epoch_0,
            nnWeights
          };
        })
      );
  }

  /**
   * Tests the ablated network.
   * @param nnSettings The network settings.
   * @param filename The selected filename.
   * @param koLayers List of layers to be knocked out.
   * @param koUnits List of units to be knocked out.
   */
  testNetwork(nnSettings: NeuralNetworkSettings, filename: string, koLayers: number[], koUnits: number[]): Observable<any> {
    const body = {
      nnSettings,
      filename,
      koLayers,
      koUnits
    };
    return this._http.post(`${this._backendURL}/testNetwork`, body);
  }

  /**
   * Saves the free-drawing drawing.
   * @param blob Image to be saved.
   */
  saveDigit(blob) {
    const form = new FormData();
    form.append('digit', blob, 'digit.png');

    return this._http.post(`${this._backendURL}/saveDigit`, form);
  }

  /**
   * Tests the ablated network.
   * @param nnSettings The network settings.
   * @param filename The selected filename.
   * @param koLayers List of layers to be knocked out.
   * @param koUnits List of units to be knocked out.
   */
  testDigit(nnSettings: NeuralNetworkSettings, filename: string, koLayers: number[], koUnits: number[]): Observable<any> {
    const body = {
      nnSettings,
      filename,
      koLayers,
      koUnits
    };
    return this._http.post(`${this._backendURL}/testDigit`, body);
  }

  /**
   * Gets saved networks.
   * @returns list of saved networks.
   */
  getSavedNetworks(): Observable<any> {
    return this._http.get(`${this._backendURL}/getSavedNetworks`);
  }

  /**
   * Gets TSNE coordinate.
   * @returns TSNE coordinate.
   */
  getTSNECoordinate(): Observable<any> {
    return this._http.get(`${this._backendURL}/getTSNECoordinate`);
  }


  /**
   * Creates a heatmap from file
   * @param filePath given file Path
   * @param epoch number of epochs
   * @param weightMinMax maximum and minimum weights
   * @param drawFully dont know what that is ???
   * @param newFile boolean, if you want to create a new file ???
   * @param density dont know what that is ???
   * @param weights dont know what that is ???
   */
  public createHeatmapFromFile(
    filePath: string, epoch: number, weightMinMax, drawFully: boolean, newFile: boolean, density: number, weights?
  ) {
    const jsonBody = {
      'filePath': filePath,
      'epoch': epoch,
      'drawFully': drawFully,
      'weightMinMax': weightMinMax,
      'newFile': newFile,
      'density': density,
      'weights': weights
    };

    return this._http.post('/calc/heatmapfromfile', jsonBody, httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Handles errors from http requests to the backend 
   * @param error 
   */
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
