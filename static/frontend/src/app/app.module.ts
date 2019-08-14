import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule, routingComponents } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavigationComponent } from './components/navigation/navigation.component';

import { MaterialModule } from './modules/material.module'

import { HttpClientModule } from '@angular/common/http';
import { BackendCommunicationService } from './backendCommunication/backend-communication.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NetworkCreatorComponent } from './components/network-creator/network-creator.component';

import { NouisliderModule } from 'ng2-nouislider';
import { AngularResizedEventModule } from 'angular-resize-event';

@NgModule({
  declarations: [
    AppComponent,
    NavigationComponent,
    routingComponents,
    NetworkCreatorComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    MaterialModule,
    NouisliderModule,
    AngularResizedEventModule,
    FormsModule
  ],
  providers: [BackendCommunicationService],
  bootstrap: [AppComponent]
})
export class AppModule { }
