import { Component, OnInit, AfterViewInit, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router'

import { BackendCommunicationService } from 'src/app/backendCommunication/backend-communication.service';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit {
  // mocked values for showing the feature, have to be changed later
  public values = ["value1", "value2", "value3"];
  public selectedNetwork = "No Network Selected";

  private _showAddNetwork = false;
  /**
   * Emits a toogle event for add Network
   */
  @Output() emitAddNetwork = new EventEmitter<boolean>()

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

  public toogleAddNetwork() {
    this._showAddNetwork = !this._showAddNetwork
    this.emitAddNetwork.emit(this._showAddNetwork)
  }
}
