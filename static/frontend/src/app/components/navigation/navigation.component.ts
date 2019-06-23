import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router'

import { BackendCommunicationService } from 'src/app/backendCommunication/backend-communication.service';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit {
  public values = ["value1", "value2", "value3"];
  public selectedNetwork = "No Network Selected";

  constructor( public router: Router ) { }

  ngOnInit() {
  }

  /**
   * Shows in the dropdown the selected Network
   * @param name then Name of the selected Network
   */
  public selectNetwork(name: string) {
    this.selectedNetwork = name;
  }
}
