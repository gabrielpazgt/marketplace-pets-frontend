import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CheckoutStateService } from '../../services/checkout-state.service';
import { ShippingMethod } from '../../models/checkout.models';

@Component({
  selector: 'mp-checkout-shipping',
  templateUrl: './checkout-shipping.component.html',
  styleUrls: ['./checkout-shipping.component.scss']
})
export class CheckoutShippingComponent {
  constructor(public state: CheckoutStateService, private router: Router) {}

  select(id: ShippingMethod['id']) {
    this.state.setShippingMethod(id);
  }

  getPrice(id: ShippingMethod['id'], subtotal: number): number {
    const method = this.state.shippingMethods.find((x) => x.id === id)!;
    const s = Number(subtotal ?? 0);
    if (method.id === 'standard' && s >= this.state.freeThreshold) return 0;
    return method.price;
  }

  next() {
    this.router.navigate(['checkout/payment']);
  }

  back() {
    this.router.navigate(['checkout/contact']);
  }
}
