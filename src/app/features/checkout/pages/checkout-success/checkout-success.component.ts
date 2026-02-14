import { Component, OnInit } from '@angular/core';
import { CheckoutStateService } from '../../services/checkout-state.service';

@Component({
  selector: 'mp-checkout-success',
  templateUrl: './checkout-success.component.html',
  styleUrls: ['./checkout-success.component.scss']
})
export class CheckoutSuccessComponent implements OnInit {
  order?: string | null;

  constructor(private state: CheckoutStateService) {}

  ngOnInit(): void {
    this.order = this.state.snapshot.orderNumber || null;
    this.state.resetAfterSuccess();
  }
}
