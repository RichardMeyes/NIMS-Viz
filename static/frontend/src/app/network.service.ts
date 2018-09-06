import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';

import { throwError, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import * as socketIo from 'socket.io-client';

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
  private socket;

  constructor(private http: HttpClient) { }

  public initSocket(): void {
    console.log('b4 socket error');
    this.socket = socketIo('http://127.0.0.1:5000');
    console.log('this.socket', this.socket);

  }

  public send(type: string, message: JSON): void {
    switch (type) {
      case 'mlp':
        this.socket.emit('mlp', message);
        break;
      default:
        break;
    }
    // this.socket.emit('json', message);
  }

  public onMessage(): Observable<JSON> {
    return new Observable<JSON>(observer => {
      this.socket.on('json', (data: JSON) => observer.next(data));
    });
  }

  public onEvent(event: string): Observable<any> {
    return new Observable<string>(observer => {
      this.socket.on(event, () => observer.next());
    });
  }

  public detectFiles() {
    console.log('trying to detect files');

    return this.http.get('/setup/filesearch', httpOptions)
      .pipe(
        catchError(this.handleError)
      );
  }

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
