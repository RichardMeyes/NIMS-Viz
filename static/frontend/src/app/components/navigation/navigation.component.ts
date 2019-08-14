import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

import { BackendCommunicationService } from 'src/app/backendCommunication/backend-communication.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SavedNetworks } from 'src/app/models/saved-networks.model';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit, OnDestroy {
  // mocked values for showing the feature, have to be changed later
  public selectedNetwork = 'No Network Selected';

  private _showAddNetwork = false;
  /**
   * Emits a toogle event for add Network
   */
  @Output() emitAddNetwork = new EventEmitter<boolean>();

  /**
   * List of saved networks.
   */
  savedNetworks: SavedNetworks[];

  /**
   * Flag to unsubscribe.
   */
  destroyed = new Subject<void>();

  constructor(
    public router: Router,
    private backend: BackendCommunicationService
  ) { }

  ngOnInit() {
    this.backend.getSavedNetworks()
      .pipe(takeUntil(this.destroyed))
      .subscribe(savedNetworks => {
        this.savedNetworks = [];

        savedNetworks.forEach(savedNetwork => {
          const viewName = 'MLP_';
          const adjSavedNetwork: SavedNetworks = Object.assign({}, savedNetwork, { viewName });
          this.savedNetworks.push(adjSavedNetwork);
        });
      });
  }

  /**
   * Shows in the dropdown the selected Network
   * @param name then Name of the selected Network
   */
  public selectNetwork(selectedNetwork: SavedNetworks) {
    this.selectedNetwork = selectedNetwork.fileName;
  }

  public toogleAddNetwork() {
    this._showAddNetwork = !this._showAddNetwork
    this.emitAddNetwork.emit(this._showAddNetwork)
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
