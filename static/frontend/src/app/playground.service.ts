import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PlaygroundService {
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With'
    })
  };

  constructor(private http: HttpClient) { }

  getTopology(selectedFile: string) {
    const jsonBody = { 'selectedFile': selectedFile.replace('\\', '/').replace('weights', 'topologies') };
    return this.http.post('/getTopology', jsonBody, this.httpOptions);
  }

  getUntrainedWeights(selectedFile: string) {
    const jsonBody = { 'selectedFile': selectedFile.replace('\\', '/') };
    return this.http.post('/getUntrainedWeights', jsonBody, this.httpOptions);
  }

  getWeights(selectedFile: string) {
    const jsonBody = { 'selectedFile': selectedFile.replace('\\', '/') };
    return this.http.post('/getWeights', jsonBody, this.httpOptions);
  }

  visualize(selectedFile: string, currEpoch: number) {
    const jsonBody = {
      'selectedFile': selectedFile.replace("\\", "/"),
      'currEpoch': currEpoch
    };

    return this.http.post('/getAllWeights', jsonBody, this.httpOptions);
  }

  arrayOne(n: number): any[] {
    return Array.apply(null, Array(n)).map(Number.prototype.valueOf, 0);
  }

}
