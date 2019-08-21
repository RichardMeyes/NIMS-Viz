import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

import { BackendCommunicationService } from 'src/app/backendCommunication/backend-communication.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SavedNetworks } from 'src/app/models/saved-networks.model';
import { DataService } from 'src/app/services/data.service';
import { EventsService } from 'src/app/services/events.service';
import { ActiveSideMenu } from 'src/app/models/navigation.model';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit, OnDestroy {
  /**
   * List of saved networks.
   */
  savedNetworks: SavedNetworks[];

  activeSideMenu = ActiveSideMenu;

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
    this.dataService.detachedNodes = [];

    if (this.dataService.activeSideMenu === ActiveSideMenu.NetworkCreator) {
      this.dataService.activeSideMenu = ActiveSideMenu.None;
    } else {
      this.eventService.updateLayerView.next(selectedNetwork);
    }

    if (selectedNetwork === undefined) {
      this.eventService.clearAblationCharts.next(true);
    }
  }

  public toggleAddNetwork() {
    this.dataService.selectedNetwork = undefined;
    this.dataService.detachedNodes = [];

    if (this.dataService.activeSideMenu === ActiveSideMenu.NetworkCreator) {
      this.dataService.activeSideMenu = ActiveSideMenu.None;
    } else {
      this.dataService.activeSideMenu = ActiveSideMenu.NetworkCreator;
      this.eventService.updateLayerView.next(this.dataService.selectedNetwork);
    }
  }

  toggleAblation() {
    this.dataService.detachedNodes = [];
    this.dataService.classifyResult = undefined;

    if (this.dataService.activeSideMenu === ActiveSideMenu.NetworkAblator) {
      this.dataService.activeSideMenu = ActiveSideMenu.None;
    } else {
      this.dataService.activeSideMenu = ActiveSideMenu.NetworkAblator;
    }
  }

  ngOnDestroy() {
    this.destroyed.next();
  }
}
