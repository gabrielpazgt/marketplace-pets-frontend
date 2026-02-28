import { Component, OnInit } from '@angular/core';
import { CheckoutStateService } from '../../services/checkout-state.service';

@Component({
  selector: 'mp-checkout-success',
  templateUrl: './checkout-success.component.html',
  styleUrls: ['./checkout-success.component.scss']
})
export class CheckoutSuccessComponent implements OnInit {
  order?: string | null;
  copied = false;

  constructor(private state: CheckoutStateService) {}

  ngOnInit(): void {
    const currentOrder = this.state.snapshot.orderNumber || null;
    const persistedOrder = this.state.getLastOrder()?.orderNumber || null;

    this.order = currentOrder || persistedOrder;

    if (currentOrder) {
      this.state.resetAfterSuccess();
    }
  }

  async copyOrder() {
    if (!this.order) return;
    try {
      await navigator.clipboard.writeText(this.order);
      this.copied = true;
      setTimeout(() => (this.copied = false), 1600);
    } catch {
      this.copied = false;
    }
  }
}
