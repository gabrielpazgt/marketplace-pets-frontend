import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MembershipsRoutingModule } from './memberships-routing.module';
import { PlansComponent } from './pages/plans/plans.component';


@NgModule({
  declarations: [
    PlansComponent
  ],
  imports: [
    CommonModule,
    MembershipsRoutingModule
  ]
})
export class MembershipsModule { }
