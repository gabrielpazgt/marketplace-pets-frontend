import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CheckoutStateService } from '../../services/checkout-state.service';

@Component({
  standalone: false,
  selector: 'mp-checkout-shell',
  templateUrl: './checkout-shell.component.html',
  styleUrls: ['./checkout-shell.component.scss']
})
export class CheckoutShellComponent {
  constructor(public state: CheckoutStateService, public router: Router) {}

  steps = [
    { key: 'contact',  label: 'Contacto',  icon: 'person'         },
    { key: 'shipping', label: 'Envío',      icon: 'local_shipping' },
    { key: 'payment',  label: 'Pago',       icon: 'credit_card'    },
    { key: 'review',   label: 'Revisión',   icon: 'checklist'      },
  ];

  isActive(key: string): boolean { return this.router.url.includes('/' + key); }

  isDone(key: string): boolean {
    const snap = this.state.snapshot;
    switch (key) {
      case 'contact':  return snap.step1Done;
      case 'shipping': return snap.step2Done;
      case 'payment':  return snap.step3Done;
      default: return false;
    }
  }

  progressPct() {
    const idx = this.steps.findIndex(s => this.isActive(s.key));
    const clamped = Math.max(0, idx);
    return (clamped / (this.steps.length - 1)) * 100;
  }
}
