import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';

//import { simpleheat } from 'simpleheat/simpleheat.js';

import { AppRoutingModule } from './app-routing.module';
import { MaterialModule } from './material.module';

import { SceneComponent } from './scene/scene.component';
import { BrainComponent } from './scene/brain/brain.component';
import { MoleculeComponent } from './scene/molecule/molecule.component';

import { AppComponent } from './app.component';
import { OrdinalPipe } from './ordinal.pipe';

@NgModule({
  declarations: [
    AppComponent,
    SceneComponent,
    BrainComponent,
    MoleculeComponent,
    OrdinalPipe
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    FlexLayoutModule,
    AppRoutingModule,
    MaterialModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
