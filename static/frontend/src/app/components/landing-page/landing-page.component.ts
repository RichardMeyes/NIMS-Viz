import { Component, OnInit, AfterViewInit } from '@angular/core';
import { BackendCommunicationService } from 'src/app/backendCommunication/backend-communication.service';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.scss']
})
export class LandingPageComponent implements OnInit, AfterViewInit {
  public testCom: string;
  
  constructor( private backend: BackendCommunicationService ) { }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.backend.testCommunication().subscribe(
      c => this.testCom = c, 
      err => this.testCom = err.name
    );
  }

}
