import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CheckoutStateService } from '../../services/checkout-state.service';

@Component({
  selector: 'mp-checkout-review',
  templateUrl: './checkout-review.component.html',
  styleUrls: ['./checkout-review.component.scss']
})
export class CheckoutReviewComponent {
  constructor(public state: CheckoutStateService, private router: Router) {}

  shippingMethodLabel(): string {
    const id = this.state.snapshot.shippingMethodId;
    const m = this.state.shippingMethods.find(x => x.id === id);
    return m ? m.label : '';
  }

  confirm() {
    const ord = this.state.snapshot.orderNumber || ('MP-' + Math.random().toString(36).slice(2, 8).toUpperCase());
    this.state.setOrderNumber(ord);
    this.router.navigate(['checkout/success']);
  }

  back() { this.router.navigate(['checkout/payment']); }
}
