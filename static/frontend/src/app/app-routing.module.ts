import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { LayerViewComponent } from './components/layer-view/layer-view.component';

const routes: Routes = [
  {path: '', component: LandingPageComponent},
  {path: 'layer-view', component: LayerViewComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

export const routingComponents = 
  [LandingPageComponent, 
    LayerViewComponent
  ];