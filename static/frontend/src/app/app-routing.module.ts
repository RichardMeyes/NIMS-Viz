import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { BrainViewComponent } from './brain-view/brain-view.component';
import { AblationViewComponent } from './ablation-view/ablation-view.component';
import { LayerViewComponent } from './layer-view/layer-view.component';

const routes: Routes = [
  {path: '', component: LandingPageComponent},
  {path: 'brain-view', component: BrainViewComponent},
  {path: 'ablation-view', component: AblationViewComponent},
  {path: 'layer-view', component: LayerViewComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

export const routingComponents = 
  [LandingPageComponent, 
    BrainViewComponent,
    AblationViewComponent,
    LayerViewComponent
  ];