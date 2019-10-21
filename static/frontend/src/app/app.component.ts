import { Component, OnInit } from '@angular/core';

import { DataService } from './services/data.service';
import { BackendCommunicationService } from './backendCommunication/backend-communication.service';

import { ActiveSideMenu } from './models/navigation.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'frontend';
  activeSideMenu = ActiveSideMenu;

  constructor(
    public dataService: DataService,
    private backend: BackendCommunicationService
  ) { }

  ngOnInit() {
    this.backend.resetAblation().subscribe();
  }
}
