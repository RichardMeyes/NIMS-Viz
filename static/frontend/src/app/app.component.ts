import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'frontend';
  public createModel: boolean;

  public toggleCreateModel(state: boolean) {
    this.createModel = state;
  }
}
