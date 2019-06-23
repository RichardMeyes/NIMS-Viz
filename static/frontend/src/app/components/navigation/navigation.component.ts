import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router'
import { BackendCommunicationService } from 'src/app/backendCommunication/backend-communication.service';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent implements OnInit {
  constructor( public router: Router ) { }

  ngOnInit() {
  }
}
