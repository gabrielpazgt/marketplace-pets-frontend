import { Component } from '@angular/core';
import { CheckoutStateService } from '../../services/checkout-state.service';

@Component({
  selector: 'mp-order-summary',
  templateUrl: './order-summary.component.html',
  styleUrls: ['./order-summary.component.scss']
})
export class OrderSummaryComponent {
  constructor(public state: CheckoutStateService) {}
  code = '';

  apply() { this.state.applyCoupon(this.code); }
  clear() { this.code = ''; this.state.clearCoupon(); }
}
