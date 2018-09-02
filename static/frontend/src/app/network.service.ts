import { Injectable } from '@angular/core';
// import { Http } from '@angular/http';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';


const httpOptions = {
  headers: new HttpHeaders({
    // 'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Length, X-Requested-With'
  })
};

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  constructor(private http: HttpClient) { }

  public detectFiles() {
    console.log('trying to detect files');

    return this.http.get('/setup/filesearch', httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

  public createHeatmapFromFile(filePath: string, epoch: number, weightMinMax, drawFully: boolean, newFile: boolean, density: number) {
    const jsonBody = {
      'filePath': filePath,
      'epoch': epoch,
      'drawFully': drawFully,
      'weightMinMax': weightMinMax,
      'newFile': newFile,
      'density': density
    };

    return this.http.post('/calc/heatmapfromfile', jsonBody, httpOptions)
      .pipe(
        catchError(this.handleError)
      );
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
