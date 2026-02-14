import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { CheckoutRoutingModule } from './checkout-routing.module';

import { CheckoutShellComponent } from './components/checkout-shell/checkout-shell.component';
import { OrderSummaryComponent } from './components/order-summary/order-summary.component';

import { CheckoutContactComponent } from './pages/checkout-contact/checkout-contact.component';
import { CheckoutShippingComponent } from './pages/checkout-shipping/checkout-shipping.component';
import { CheckoutPaymentComponent } from './pages/checkout-payment/checkout-payment.component';
import { CheckoutReviewComponent } from './pages/checkout-review/checkout-review.component';
import { CheckoutSuccessComponent } from './pages/checkout-success/checkout-success.component';

@NgModule({
  declarations: [
    CheckoutShellComponent,
    OrderSummaryComponent,
    CheckoutContactComponent,
    CheckoutShippingComponent,
    CheckoutPaymentComponent,
    CheckoutReviewComponent,
    CheckoutSuccessComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    CheckoutRoutingModule
  ]
})
export class CheckoutModule {}
