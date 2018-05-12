import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatCardModule, MatCheckboxModule, MatRadioModule, MatSlideToggleModule, MatCard } from '@angular/material';

@NgModule({
  imports: [
    CommonModule,
    MatCardModule, MatCheckboxModule, MatRadioModule, MatSlideToggleModule
  ],
  exports: [
    MatCardModule, MatCheckboxModule, MatRadioModule, MatSlideToggleModule
  ],
  declarations: []
})
export class MaterialModule { }
