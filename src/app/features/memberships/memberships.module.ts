import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { SharedModule } from '../../shared/shared.module';
import { MembershipsRoutingModule } from './memberships-routing.module';
import { PlansComponent } from './pages/plans/plans.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { SuccessComponent } from './pages/success/success.component';


@NgModule({
  declarations: [
    PlansComponent,
    CheckoutComponent,
    SuccessComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MembershipsRoutingModule,
    MatIconModule,
    SharedModule,
  ]
})
export class MembershipsModule { }
