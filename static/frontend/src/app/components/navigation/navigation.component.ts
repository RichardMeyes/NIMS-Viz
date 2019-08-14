import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

import { BackendCommunicationService } from 'src/app/backendCommunication/backend-communication.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SavedNetworks } from 'src/app/models/saved-networks.model';
import { DataService } from 'src/app/services/data.service';
import { EventsService } from 'src/app/services/events.service';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit, OnDestroy {
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
    private backend: BackendCommunicationService,
    public dataService: DataService,
    private eventService: EventsService
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
    this.dataService.selectedNetwork = selectedNetwork;
    this.eventService.updateLayerView.next(selectedNetwork);
  }

  public toogleAddNetwork() {
    this._showAddNetwork = !this._showAddNetwork;
    this.emitAddNetwork.emit(this._showAddNetwork);
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
