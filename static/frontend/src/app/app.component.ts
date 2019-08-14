import { Component, Input } from '@angular/core';
import { DataService } from './services/data.service';
import { ActiveSideMenu } from './models/navigation.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'frontend';
  activeSideMenu = ActiveSideMenu;

  constructor(
    public dataService: DataService
  ) { }
}
