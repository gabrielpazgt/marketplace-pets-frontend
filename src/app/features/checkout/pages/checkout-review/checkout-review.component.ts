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
    const method = this.state.shippingMethods.find((x) => x.id === id);
    return method ? method.label : '';
  }

  formattedShippingAddress(): string {
    const address = this.state.snapshot.shippingAddress;
    if (!address) return '-';

    const line = [address.line1, address.line2].filter(Boolean).join(', ');
    const city = [address.municipality, address.department, address.country].filter(Boolean).join(', ');
    return [line, city].filter(Boolean).join(' | ');
  }

  paymentLabel(): string {
    const kind = this.state.snapshot.paymentKind;
    if (kind === 'card') {
      const number = String(this.state.snapshot.card?.number || '').replace(/\D/g, '');
      const last4 = number.slice(-4);
      return last4 ? `Tarjeta terminada en ${last4}` : 'Tarjeta';
    }
    if (kind === 'bank') return 'Transferencia bancaria';
    if (kind === 'cod') return 'Contra entrega';
    return '-';
  }

  paymentIcon(): string {
    const kind = this.state.snapshot.paymentKind;
    if (kind === 'card') return '💳';
    if (kind === 'bank') return '🏦';
    if (kind === 'cod') return '🚚';
    return '💰';
  }

  confirm() {
    const orderNumber = this.state.snapshot.orderNumber || `MP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    this.state.setOrderNumber(orderNumber);
    this.router.navigate(['checkout/success']);
  }

  back() {
    this.router.navigate(['checkout/payment']);
  }
}
