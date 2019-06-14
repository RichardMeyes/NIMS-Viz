import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BuilderComponent } from './builder/builder.component';
import { ArchiveComponent } from './archive/archive.component';
import { AblationComponent } from './ablation/ablation.component';

const routes: Routes = [
  { path: 'builder', component: BuilderComponent },
  { path: 'archive', component: ArchiveComponent },
  { path: 'ablation', component: AblationComponent },
  { path: '', redirectTo: 'builder', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
