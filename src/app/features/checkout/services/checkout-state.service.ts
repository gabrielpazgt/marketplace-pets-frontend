import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { Address, CardInfo, ContactInfo, PaymentKind, ShippingMethod } from '../models/checkout.models';
import { CartStateService } from '../../cart/services/cart-state.service';

interface CheckoutSnapshot {
  contact?: ContactInfo;
  shippingAddress?: Address;
  billingSameAsShipping?: boolean;
  billingAddress?: Address;
  shippingMethodId: ShippingMethod['id'];
  paymentKind?: PaymentKind;
  card?: CardInfo;
  step1Done: boolean;
  step2Done: boolean;
  step3Done: boolean;
  orderNumber?: string;
}

interface LastOrderSnapshot {
  orderNumber: string;
  createdAt: string;
}

interface PersistedCheckoutState {
  shippingMethodId: ShippingMethod['id'];
  orderNumber?: string;
}

@Injectable({ providedIn: 'root' })
export class CheckoutStateService {
  readonly shippingMethods: ShippingMethod[] = [
    { id: 'standard', label: 'Estandar', description: '3-5 dias habiles', price: 25, eta: '3-5 dias' },
    { id: 'express', label: 'Express', description: '1-2 dias habiles', price: 45, eta: '1-2 dias' },
  ];

  private storeKey = 'mp_checkout_v1';
  private lastOrderKey = 'mp_last_order_v1';

  private _state = new BehaviorSubject<CheckoutSnapshot>(
    this.normalizeSnapshot(
      this.load() ?? {
        shippingMethodId: 'standard',
        billingSameAsShipping: true,
        step1Done: false,
        step2Done: false,
        step3Done: false,
      }
    )
  );

  readonly state$ = this._state.asObservable();

  constructor(private cart: CartStateService) {}

  // Cart passthroughs with explicit types for strict templates.
  readonly items$ = this.cart.items$ as Observable<any[]>;
  readonly itemCount$ = this.cart.itemCount$ as Observable<number>;
  readonly cartBusy$ = this.cart.busy$ as Observable<boolean>;
  readonly cartError$ = this.cart.error$ as Observable<string | null>;
  readonly couponCode$ = this.cart.coupon$ as Observable<string | null>;
  readonly subtotal$ = this.cart.subtotal$ as Observable<number>;
  readonly discount$ = this.cart.discount$ as Observable<number>;
  readonly effectiveSubtotal$ = combineLatest([this.subtotal$, this.discount$] as const).pipe(
    map(([subtotal, discount]) => Math.max(0, subtotal - discount))
  );
  readonly freeThreshold = this.cart.freeThreshold;
  readonly freeProgress$ = this.cart.freeProgress$ as Observable<number>;
  readonly freeRemaining$ = this.cart.freeRemaining$ as Observable<number>;

  readonly shipping$ = combineLatest([this.effectiveSubtotal$, this.state$] as const).pipe(
    map(([effectiveSubtotal, state]) => {
      if (effectiveSubtotal <= 0) return 0;
      const method = this.shippingMethods.find((m) => m.id === state.shippingMethodId) || this.shippingMethods[0];
      if (method.id === 'standard' && effectiveSubtotal >= this.freeThreshold) return 0;
      return method.price;
    })
  );

  readonly total$ = combineLatest([this.subtotal$, this.discount$, this.shipping$] as const).pipe(
    map(([subtotal, discount, shipping]) => Math.max(0, subtotal - discount) + shipping)
  );

  setContactAndShipping(contact: ContactInfo, shippingAddress: Address) {
    const next = { ...this._state.value, contact, shippingAddress, step1Done: true };
    this.set(next);
  }

  setShippingMethod(id: ShippingMethod['id']) {
    if (!this.shippingMethods.some((m) => m.id === id)) return;
    const next = { ...this._state.value, shippingMethodId: id, step2Done: true };
    this.set(next);
  }

  setPaymentKind(kind: PaymentKind) {
    const next = { ...this._state.value, paymentKind: kind };
    this.set(next);
  }

  setBillingSame(flag: boolean) {
    const next = { ...this._state.value, billingSameAsShipping: flag };
    this.set(next);
  }

  setBillingAddress(address?: Address) {
    const next = { ...this._state.value, billingAddress: address };
    this.set(next);
  }

  setCardInfo(card?: CardInfo) {
    // Step 3 is considered completed once payment step is submitted,
    // even when payment type does not require card details.
    const next = { ...this._state.value, card, step3Done: true };
    this.set(next);
  }

  setOrderNumber(orderNumber: string) {
    const next = { ...this._state.value, orderNumber };
    this.set(next);
  }

  resetAfterSuccess() {
    const order = this._state.value.orderNumber;
    if (order) {
      this.saveLastOrder({
        orderNumber: order,
        createdAt: new Date().toISOString(),
      });
    }

    this.cart.refresh();
    this.set({
      shippingMethodId: 'standard',
      billingSameAsShipping: true,
      step1Done: false,
      step2Done: false,
      step3Done: false,
    });
    return order;
  }

  getLastOrder(): LastOrderSnapshot | null {
    return this.loadLastOrder();
  }

  applyCoupon(code: string | null) {
    this.cart.applyCoupon(code);
  }

  clearCoupon() {
    this.cart.clearCoupon();
  }

  get snapshot(): CheckoutSnapshot {
    return this._state.value;
  }

  private set(next: CheckoutSnapshot) {
    this._state.next(next);
    this.save(next);
  }

  private save(snapshot: CheckoutSnapshot) {
    try {
      const safe: PersistedCheckoutState = {
        shippingMethodId: snapshot.shippingMethodId,
        orderNumber: snapshot.orderNumber,
      };
      sessionStorage.setItem(this.storeKey, JSON.stringify(safe));
    } catch {}
  }

  private load(): CheckoutSnapshot | null {
    try {
      const raw = sessionStorage.getItem(this.storeKey);
      if (!raw) return null;

      const safe = JSON.parse(raw) as PersistedCheckoutState;
      return {
        shippingMethodId: safe.shippingMethodId,
        orderNumber: safe.orderNumber,
        billingSameAsShipping: true,
        step1Done: false,
        step2Done: false,
        step3Done: false,
      };
    } catch {
      return null;
    }
  }

  private saveLastOrder(data: LastOrderSnapshot) {
    try {
      sessionStorage.setItem(this.lastOrderKey, JSON.stringify(data));
    } catch {}
  }

  private loadLastOrder(): LastOrderSnapshot | null {
    try {
      const raw = sessionStorage.getItem(this.lastOrderKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private maskCard(value: string): string {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    const last4 = digits.slice(-4);
    return `**** **** **** ${last4}`;
  }

  private normalizeSnapshot(snapshot: CheckoutSnapshot): CheckoutSnapshot {
    const shippingMethodId = snapshot.shippingMethodId === 'express' ? 'express' : 'standard';
    const paymentKind =
      snapshot.paymentKind === 'card' || snapshot.paymentKind === 'bank' ? snapshot.paymentKind : undefined;

    return {
      ...snapshot,
      shippingMethodId,
      paymentKind,
      step1Done: false,
      step2Done: false,
      step3Done: false,
      contact: undefined,
      shippingAddress: undefined,
      billingAddress: undefined,
      card: undefined,
    };
  }
}
