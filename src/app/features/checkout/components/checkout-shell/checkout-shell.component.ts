import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CheckoutStateService } from '../../services/checkout-state.service';

@Component({
  selector: 'mp-checkout-shell',
  templateUrl: './checkout-shell.component.html',
  styleUrls: ['./checkout-shell.component.scss']
})
export class CheckoutShellComponent {
  constructor(public state: CheckoutStateService, public router: Router) {}

  steps = [
    { key: 'contact', label: 'Contacto y Envío' },
    { key: 'shipping', label: 'Método de Envío' },
    { key: 'payment', label: 'Pago' },
    { key: 'review', label: 'Revisión' },
  ];

  isActive(key: string) { return this.router.url.includes('/' + key); }

  progressPct() {
    const idx = this.steps.findIndex(s => this.isActive(s.key));
    const clamped = Math.max(0, idx);
    return (clamped / (this.steps.length - 1)) * 100;
  }
}
