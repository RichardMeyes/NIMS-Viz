import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AblationService {
  baseURL = 'http://127.0.0.1:5000';

  constructor(
    private http: HttpClient
  ) { }

  saveDigit(blob) {
    const form = new FormData();
    form.append('digit', blob, 'digit.png');

    return this.http.post(`${this.baseURL}/saveDigit`, form);
  }

  // public ablationTest(topology, filename, layers, units) {
  //   const body = {
  //     topology: topology,
  //     filename: filename,
  //     layers: layers,
  //     units: units
  //   };

  //   return this.http.post('/ablationTest', body, httpOptions)
  //     .pipe(catchError(this.handleError));
  // }
}
