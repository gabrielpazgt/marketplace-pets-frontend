import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  MembershipsService,
  Plan,
  PlanId,
  BillingCycle,
} from '../../services/memberships.service';

@Component({
  selector: 'mp-memberships-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private ms = inject(MembershipsService);

  planId!: PlanId;
  plan!: Plan;

  cycle: BillingCycle = 'monthly';
  subtotalQ = 0;
  totalQ = 0;
  yearlyPriceQ = 0; // para la etiqueta del select

  loading = false;
  errorMsg = '';

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    cardNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]],
    exp: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]], // MM/YY
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    cycle: ['monthly' as BillingCycle, [Validators.required]],
    accept: [false, [Validators.requiredTrue]],
  });

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap.get('plan') as PlanId | null;
    if (!qp) { this.router.navigate(['/memberships/plans']); return; }
    try {
      this.planId = qp;
      this.plan = this.ms.getPlan(this.planId);
    } catch {
      this.router.navigate(['/memberships/plans']); return;
    }

    this.yearlyPriceQ = this.ms.priceFor(this.planId, 'yearly');
    this.recalcTotals();

    this.form.get('cycle')!.valueChanges.subscribe(val => {
      this.cycle = (val as BillingCycle) ?? 'monthly';
      this.recalcTotals();
    });
  }

  private recalcTotals() {
    this.subtotalQ = this.ms.priceFor(this.planId, this.cycle);
    this.totalQ = this.subtotalQ; // sin cupones
  }

  pay() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.loading = true;
    this.errorMsg = '';

    this.ms.processPurchase({
      plan: this.planId,
      cycle: this.cycle,
      email: v.email!,
      fullName: v.fullName!,
      cardLast4: v.cardNumber!.slice(-4),
      coupon: null,
      totalQ: this.totalQ,
    })
    .then(res => {
      this.loading = false;
      this.router.navigate(['/memberships/success'], {
        state: { transactionId: res.orderId, cycle: this.cycle, plan: this.planId }
      });
    })
    .catch(() => {
      this.loading = false;
      this.errorMsg = 'Ocurrió un error al procesar el pago. Inténtalo de nuevo.';
    });
  }
}
