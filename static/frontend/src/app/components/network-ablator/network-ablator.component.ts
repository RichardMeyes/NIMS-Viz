import { Component, OnInit, OnDestroy } from '@angular/core';

import { BackendCommunicationService } from 'src/app/backendCommunication/backend-communication.service';

@Component({
  selector: 'app-network-ablator',
  templateUrl: './network-ablator.component.html',
  styleUrls: ['./network-ablator.component.scss']
})
export class NetworkAblatorComponent implements OnInit, OnDestroy {

  constructor(
    private backend: BackendCommunicationService
  ) { }

  ngOnInit() {
  }

  ngOnDestroy() {
    this.backend.resetAblation().subscribe();
  }

}
