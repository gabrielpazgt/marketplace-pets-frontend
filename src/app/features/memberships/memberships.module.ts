import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MembershipsRoutingModule } from './memberships-routing.module';
import { PlansComponent } from './pages/plans/plans.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { SuccessComponent } from './pages/success/success.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'


@NgModule({
  declarations: [
    PlansComponent,
    CheckoutComponent,
    SuccessComponent
  ],
  imports: [
    CommonModule,
    MembershipsRoutingModule,
    FormsModule,
    ReactiveFormsModule,
  ]
})
export class MembershipsModule { }
