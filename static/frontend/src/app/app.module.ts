import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NgProgressModule } from '@ngx-progressbar/core';
import { NgProgressHttpModule } from '@ngx-progressbar/http';

// import { simpleheat } from 'simpleheat/simpleheat.js';

import { AppRoutingModule } from './app-routing.module';
import { MaterialModule } from './material.module';

import { SceneComponent } from './scene/scene.component';
import { BrainComponent } from './scene/brain/brain.component';
// import { MoleculeComponent } from './scene/molecule/molecule.component';
import { PlaygroundVizComponent } from './scene/playground-viz/playground-viz.component';

import { AppComponent } from './app.component';
import { OrdinalPipe } from './ordinal.pipe';

// import { MqttModule, IMqttServiceOptions } from 'ngx-mqtt';

// export const MQTT_SERVICE_OPTIONS: IMqttServiceOptions = {
//   hostname: 'localhost',
//   port: 9001,
//   path: '/mqtt'
// };

@NgModule({
  declarations: [
    AppComponent,
    SceneComponent,
    BrainComponent,
    // MoleculeComponent,
    PlaygroundVizComponent,
    OrdinalPipe
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    AppRoutingModule,
    MaterialModule,
    HttpClientModule,
    NgProgressModule.forRoot(),
    NgProgressHttpModule.forRoot()
    // MqttModule.forRoot(MQTT_SERVICE_OPTIONS)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
