import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CheckoutShellComponent } from './components/checkout-shell/checkout-shell.component';
import { CheckoutContactComponent } from './pages/checkout-contact/checkout-contact.component';
import { CheckoutShippingComponent } from './pages/checkout-shipping/checkout-shipping.component';
import { CheckoutPaymentComponent } from './pages/checkout-payment/checkout-payment.component';
import { CheckoutReviewComponent } from './pages/checkout-review/checkout-review.component';
import { CheckoutSuccessComponent } from './pages/checkout-success/checkout-success.component';
import { CheckoutGuard } from './services/checkout.guard';

const routes: Routes = [
  {
    path: '',
    component: CheckoutShellComponent,
    canActivate: [CheckoutGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'contact' },
      { path: 'contact', component: CheckoutContactComponent },
      { path: 'shipping', component: CheckoutShippingComponent },
      { path: 'payment', component: CheckoutPaymentComponent },
      { path: 'review', component: CheckoutReviewComponent },
      { path: 'success', component: CheckoutSuccessComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CheckoutRoutingModule {}
