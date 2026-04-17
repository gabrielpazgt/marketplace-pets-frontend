import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthUser } from '../../../../auth/services/auth.service';
import { SeoService } from '../../../../core/services/seo.service';
import { MembershipsService } from '../../services/memberships.service';

export type CheckoutStep = 'gate' | 'plan' | 'payment';

@Component({
  standalone: false,
  selector: 'mp-memberships-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent implements OnInit {
  step: CheckoutStep = 'gate';
  submitting = false;
  submitError: string | null = null;

  user: AuthUser | null = null;

  readonly plan = {
    name: 'Aumakki Premium',
    billing: 'Plan Mensual',
    price: 75,
    perks: [
      { icon: 'percent', label: '5% de descuento en productos' },
      { icon: 'support_agent', label: 'Atención prioritaria por WhatsApp' },
      { icon: 'notifications_active', label: 'Acceso anticipado a lanzamientos' },
      { icon: 'cake', label: 'Regalo en el cumpleaños de tu mascota' },
      { icon: 'assignment_return', label: 'Devoluciones extendidas (60 días)' },
      { icon: 'flash_on', label: 'Checkout ágil con datos guardados' },
    ],
  };

  payForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private memberships: MembershipsService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Obtener membresía Premium | Aumakki',
      description: 'Activa tu membresía Premium de Aumakki y empieza a ahorrar en cada compra.',
      url: '/memberships/checkout',
      noindex: true,
    });

    this.user = this.auth.user;
    this.step = this.auth.isLoggedIn ? 'plan' : 'gate';

    this.payForm = this.fb.group({
      cardName:   ['', [Validators.required, Validators.minLength(3)]],
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
      expiry:     ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
      cvv:        ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    });
  }

  goToPayment(): void {
    this.step = 'payment';
    this.cdr.markForCheck();
  }

  goBack(): void {
    this.step = 'plan';
    this.submitError = null;
    this.cdr.markForCheck();
  }

  submitPayment(): void {
    if (this.payForm.invalid || this.submitting) return;

    this.submitting = true;
    this.submitError = null;
    this.cdr.markForCheck();

    this.memberships.selectPlan('premium').subscribe({
      next: () => {
        this.router.navigate(['/memberships/success']);
      },
      error: () => {
        this.submitting = false;
        this.submitError = 'Ocurrió un error al procesar tu pago. Intenta de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }

  formatCardNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 16);
    this.payForm.get('cardNumber')?.setValue(input.value, { emitEvent: false });
  }

  formatExpiry(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) val = val.slice(0, 2) + '/' + val.slice(2);
    input.value = val;
    this.payForm.get('expiry')?.setValue(val, { emitEvent: false });
  }

  formatCvv(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 4);
    this.payForm.get('cvv')?.setValue(input.value, { emitEvent: false });
  }

  isInvalid(field: string): boolean {
    const c = this.payForm.get(field);
    return !!(c && c.invalid && (c.dirty || c.touched));
  }
}
