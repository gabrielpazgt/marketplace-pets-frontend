import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CheckoutStateService } from '../../services/checkout-state.service';

@Component({
  selector: 'mp-checkout-shipping',
  templateUrl: './checkout-shipping.component.html',
  styleUrls: ['./checkout-shipping.component.scss']
})
export class CheckoutShippingComponent {
  constructor(public state: CheckoutStateService, private router: Router) {}

  select(id: any) { this.state.setShippingMethod(id); }
  getPrice(id: any, subtotal: any): number {
    const m = this.state.shippingMethods.find(x => x.id === id)!;
    const s = Number(subtotal ?? 0);
    if (m.id === 'standard' && s >= this.state.freeThreshold) return 0;
    return m.price;
  }

  next() { this.router.navigate(['checkout/payment']); }
  back() { this.router.navigate(['checkout/contact']); }
}
