// src/app/features/memberships/memberships-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlansComponent } from './pages/plans/plans.component';

const routes: Routes = [
  { path: 'plans', component: PlansComponent },
  { path: 'checkout', pathMatch: 'full', redirectTo: 'plans' },
  { path: 'success', pathMatch: 'full', redirectTo: 'plans' },
  { path: '', pathMatch: 'full', redirectTo: 'plans' },
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MembershipsRoutingModule {}
