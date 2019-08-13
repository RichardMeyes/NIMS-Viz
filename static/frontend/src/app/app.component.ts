import { Component, Input } from '@angular/core';
import { DataService } from './services/data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';
  public createModel: boolean;

  constructor(
    private dataService: DataService
  ) { }

  public toggleCreateModel(state: boolean) {
    this.createModel = state;
    this.dataService.showSideMenu = state;
  }
}
