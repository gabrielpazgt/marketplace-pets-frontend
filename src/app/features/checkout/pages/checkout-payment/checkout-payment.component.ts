import { Component } from '@angular/core';
import { FormBuilder, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { CheckoutStateService } from '../../services/checkout-state.service';
import { PaymentKind } from '../../models/checkout.models';

const cardNumRegex = /^(\d{4} ?){4}$/; // 16 dígitos en grupos
const expRegex = /^(0[1-9]|1[0-2])\/(\d{2})$/;
const cvcRegex = /^\d{3,4}$/;

@Component({
  selector: 'mp-checkout-payment',
  templateUrl: './checkout-payment.component.html',
  styleUrls: ['./checkout-payment.component.scss']
})
export class CheckoutPaymentComponent {
  kind: PaymentKind = 'card';

  form = this.fb.group({
    kind: new FormControl<PaymentKind>('card', { nonNullable: true, validators: [Validators.required] }),
    billingSame: new FormControl<boolean>(true, { nonNullable: true }),
    card: this.fb.group({
      holder: ['', Validators.required],
      number: ['', [Validators.required, Validators.pattern(cardNumRegex)]],
      exp: ['', [Validators.required, Validators.pattern(expRegex)]],
      cvc: ['', [Validators.required, Validators.pattern(cvcRegex)]],
    }),
    billing: this.fb.group({
      country: ['Guatemala'],
      department: [''],
      municipality: [''],
      line1: [''],
      line2: [''],
      references: [''],
      postalCode: ['']
    })
  });

  constructor(private fb: FormBuilder, private state: CheckoutStateService, private router: Router) {
    const snap = state.snapshot;
    if (snap.paymentKind) this.kind = snap.paymentKind;
    if (snap.card) this.form.get('card')?.patchValue(snap.card);
    if (typeof snap.billingSameAsShipping === 'boolean') this.form.get('billingSame')?.setValue(!!snap.billingSameAsShipping);
    if (snap.billingAddress) {
      this.form.get('billing')?.patchValue({
        country: snap.billingAddress.country ?? 'Guatemala',
        department: snap.billingAddress.department ?? '',
        municipality: snap.billingAddress.municipality ?? '',
        line1: snap.billingAddress.line1 ?? '',
        line2: snap.billingAddress.line2 ?? '',
        references: snap.billingAddress.references ?? '',
        postalCode: snap.billingAddress.postalCode ?? ''
      });
    }
  }

  get kindCtrl() { return this.form.get('kind') as FormControl<PaymentKind>; }

  onKindChange() {
    const k = this.kindCtrl.value as PaymentKind;
    this.kind = k;
    this.state.setPaymentKind(k);
  }

  onBillingSameChange() {
    const flag = !!this.form.get('billingSame')?.value;
    this.state.setBillingSame(flag);
  }

  payNow() {
    const k = this.kindCtrl.value as PaymentKind;
    this.state.setPaymentKind(k);

    if (k === 'card') {
      const g = this.form.get('card')!;
      if (g.invalid) { g.markAllAsTouched(); return; }
      this.state.setCardInfo(g.getRawValue() as any);
    } else {
      this.state.setCardInfo(undefined);
    }

    const same = !!this.form.get('billingSame')?.value;
    if (!same) {
      const b = this.form.get('billing')!;
      b.get('line1')?.addValidators(Validators.required);
      if (b.invalid) { b.markAllAsTouched(); return; }
      this.state.setBillingAddress(b.getRawValue() as any);
    } else {
      this.state.setBillingAddress(undefined);
    }

    const ord = 'MP-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    this.state.setOrderNumber(ord);
    this.router.navigate(['checkout/review']);
  }

  back() { this.router.navigate(['checkout/shipping']); }
}
