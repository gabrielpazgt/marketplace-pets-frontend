import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PaymentKind } from '../../models/checkout.models';
import { CheckoutStateService } from '../../services/checkout-state.service';

type CardBrand = 'visa' | 'mastercard' | 'amex' | 'other';

@Component({
  standalone: false,
  selector: 'mp-checkout-payment',
  templateUrl: './checkout-payment.component.html',
  styleUrls: ['./checkout-payment.component.scss']
})
export class CheckoutPaymentComponent {
  kind: PaymentKind = 'card';
  cardBrand: CardBrand = 'other';
  processing = false;

  form = this.fb.group({
    kind: new FormControl<PaymentKind>('card', { nonNullable: true, validators: [Validators.required] }),
    billingSame: new FormControl<boolean>(true, { nonNullable: true }),
    card: this.fb.group({
      holder: ['', [Validators.required, this.holderValidator.bind(this)]],
      number: ['', [Validators.required, this.cardNumberValidator.bind(this)]],
      exp: ['', [Validators.required, this.expValidator.bind(this)]],
      cvc: ['', [Validators.required, this.cvcValidator.bind(this)]],
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

  constructor(
    private fb: FormBuilder,
    private state: CheckoutStateService,
    private router: Router
  ) {
    const snap = this.state.snapshot;
    if (snap.paymentKind) this.kind = snap.paymentKind;

    if (snap.card) {
      const digits = String(snap.card.number || '').replace(/\D/g, '').slice(0, 19);
      this.cardBrand = this.detectCardBrand(digits);
      this.form.get('card')?.patchValue({
        ...snap.card,
        number: this.formatCardNumber(digits, this.cardBrand),
      });
    }

    if (typeof snap.billingSameAsShipping === 'boolean') {
      this.form.get('billingSame')?.setValue(!!snap.billingSameAsShipping);
    }

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

  get kindCtrl() {
    return this.form.get('kind') as FormControl<PaymentKind>;
  }

  get brandLabel(): string {
    return {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'Amex',
      other: 'Tarjeta'
    }[this.cardBrand];
  }

  get brandClass(): string {
    return `brand-${this.cardBrand}`;
  }

  get cardPlaceholder(): string {
    return this.cardBrand === 'amex'
      ? '3782 822463 10005'
      : '4242 4242 4242 4242';
  }

  get expectedDigitsLabel(): string {
    if (this.cardBrand === 'amex') return '15 digitos (Amex)';
    if (this.cardBrand === 'visa' || this.cardBrand === 'mastercard') return '16 digitos';
    return '16 digitos';
  }

  get cvcPlaceholder(): string {
    return this.cardBrand === 'amex' ? '1234' : '123';
  }

  onKindChange() {
    const kind = this.kindCtrl.value as PaymentKind;
    this.kind = kind;
    this.state.setPaymentKind(kind);
  }

  onCardInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 19);

    this.cardBrand = this.detectCardBrand(digits);

    const maxDigits = this.cardBrand === 'amex' ? 15 : 16;
    const clamped = digits.slice(0, maxDigits);
    const formatted = this.formatCardNumber(clamped, this.cardBrand);

    this.form.get('card.number')?.setValue(formatted, { emitEvent: false });
    this.form.get('card.cvc')?.updateValueAndValidity({ emitEvent: false });
  }

  onHolderInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const sanitized = input.value
      .replace(/[^A-Za-z�������������� ]/g, '')
      .replace(/\s{2,}/g, ' ');
    this.form.get('card.holder')?.setValue(sanitized, { emitEvent: false });
  }

  onExpInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 4);

    let mm = digits.slice(0, 2);
    const yy = digits.slice(2, 4);

    if (digits.length === 1 && Number(mm) > 1) {
      mm = `0${mm}`;
    }

    if (digits.length >= 2 && Number(mm) > 12) {
      mm = '12';
    }

    const formatted = digits.length > 2 ? `${mm}/${yy}` : mm;
    this.form.get('card.exp')?.setValue(formatted, { emitEvent: false });
  }

  onCvcInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const max = this.cardBrand === 'amex' ? 4 : 3;
    const digits = input.value.replace(/\D/g, '').slice(0, max);
    this.form.get('card.cvc')?.setValue(digits, { emitEvent: false });
  }

  onBillingSameChange() {
    const same = !!this.form.get('billingSame')?.value;
    this.state.setBillingSame(same);
  }

  payNow() {
    const kind = this.kindCtrl.value as PaymentKind;
    this.state.setPaymentKind(kind);

    if (kind === 'card') {
      const cardGroup = this.form.get('card');
      if (!cardGroup || cardGroup.invalid) {
        cardGroup?.markAllAsTouched();
        return;
      }

      this.state.setCardInfo({
        ...(cardGroup.getRawValue() as any),
        brand: this.cardBrand,
      });
    } else {
      this.state.setCardInfo(undefined);
    }

    const same = !!this.form.get('billingSame')?.value;
    const billing = this.form.get('billing');

    if (!billing) return;

    if (!same) {
      billing.get('line1')?.setValidators([Validators.required]);
      billing.get('department')?.setValidators([Validators.required]);
      billing.get('municipality')?.setValidators([Validators.required]);
      billing.updateValueAndValidity();

      if (billing.invalid) {
        billing.markAllAsTouched();
        return;
      }

      this.state.setBillingAddress(billing.getRawValue() as any);
    } else {
      billing.get('line1')?.clearValidators();
      billing.get('department')?.clearValidators();
      billing.get('municipality')?.clearValidators();
      billing.updateValueAndValidity({ emitEvent: false });
      this.state.setBillingAddress(undefined);
    }

    this.processing = true;
    setTimeout(() => {
      this.processing = false;
      this.router.navigate(['checkout/review']);
    }, 2000);
  }

  back() {
    this.router.navigate(['checkout/shipping']);
  }

  private detectCardBrand(raw: string): CardBrand {
    const digits = raw.replace(/\D/g, '');
    if (/^4/.test(digits)) return 'visa';
    if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'mastercard';
    if (/^3[47]/.test(digits)) return 'amex';
    return 'other';
  }

  private formatCardNumber(digits: string, brand: CardBrand): string {
    if (brand === 'amex') {
      const p1 = digits.slice(0, 4);
      const p2 = digits.slice(4, 10);
      const p3 = digits.slice(10, 15);
      return [p1, p2, p3].filter(Boolean).join(' ');
    }

    return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
  }

  private cardNumberValidator(control: AbstractControl): ValidationErrors | null {
    const digits = String(control.value || '').replace(/\D/g, '');
    if (!digits) return null;

    const brand = this.detectCardBrand(digits);
    const validLength = brand === 'amex' ? digits.length === 15 : digits.length === 16;

    if (!validLength) return { invalidCard: true };
    return null;
  }

  private holderValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value || '').trim();
    if (!value) return null;

    // Nombre en tarjeta: solo letras (incluye acentos) y espacios.
    const validPattern = /^[A-Za-z�������������� ]+$/;
    if (!validPattern.test(value)) return { invalidHolder: true };

    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length < 4) return { invalidHolder: true };
    return null;
  }

  private cvcValidator(control: AbstractControl): ValidationErrors | null {
    const digits = String(control.value || '').replace(/\D/g, '');
    if (!digits) return null;

    const isAmex = this.cardBrand === 'amex';
    if (isAmex && digits.length !== 4) return { invalidCvc: true };
    if (!isAmex && digits.length !== 3) return { invalidCvc: true };
    return null;
  }

  private expValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value || '');
    if (!value) return null;

    const match = value.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
    if (!match) return { invalidExp: true };

    const month = Number(match[1]);
    const yy = Number(match[2]);

    const now = new Date();
    const currentYY = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;

    if (yy < currentYY) return { invalidExp: true };
    if (yy === currentYY && month < currentMonth) return { invalidExp: true };
    return null;
  }
}
