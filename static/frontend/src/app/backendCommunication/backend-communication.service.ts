import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

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
   * Backend URL has to be changed if the Backend is somewhere else
   */
  private _backendURL = "http://127.0.0.1:5000";

  /**
   * Constructor of BackendCommunication-Service
   * @param _http HTTP Module that provides HTTP communication
   */
  constructor(private _http: HttpClient) { }

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
   * @param setup list of parameters, which the NN should have
   */
  public createNetwork(setup: string[]): Observable<any> {
    return this._http.post(`${this._backendURL}/nn/MLP`, setup);
  }

  /**
   * Returns t-SNE Coordinates
   */
  public getTSNECoordinate(): Observable<any> {
    return this._http.get(`${this._backendURL}/getTSNECoordinate`);
  }
}
