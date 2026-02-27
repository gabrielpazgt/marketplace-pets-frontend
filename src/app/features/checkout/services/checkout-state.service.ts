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

@Injectable({ providedIn: 'root' })
export class CheckoutStateService {
  readonly shippingMethods: ShippingMethod[] = [
    { id: 'standard', label: 'Estandar', description: '3-5 dias habiles', price: 25, eta: '3-5 dias' },
    { id: 'express', label: 'Express', description: '1-2 dias habiles', price: 45, eta: '1-2 dias' },
    { id: 'pickup', label: 'Retiro en tienda', description: 'Retiro en sucursal', price: 0, eta: 'Mismo dia' },
  ];

  private readonly FREE_THRESHOLD = 500;
  private storeKey = 'mp_checkout_v1';
  private lastOrderKey = 'mp_last_order_v1';
  private cipherKey = 'mp_front_checkout_key';

  private _state = new BehaviorSubject<CheckoutSnapshot>(this.load() ?? {
    shippingMethodId: 'standard',
    billingSameAsShipping: true,
    step1Done: false,
    step2Done: false,
    step3Done: false,
  });

  readonly state$ = this._state.asObservable();

  constructor(private cart: CartStateService) {}

  // Cart passthroughs with explicit types for strict templates.
  readonly items$ = this.cart.items$ as Observable<any[]>;
  readonly itemCount$ = this.cart.itemCount$ as Observable<number>;
  readonly subtotal$ = this.cart.subtotal$ as Observable<number>;
  readonly discount$ = this.cart.discount$ as Observable<number>;
  readonly freeThreshold = this.cart.freeThreshold;
  readonly freeProgress$ = this.cart.freeProgress$ as Observable<number>;
  readonly freeRemaining$ = this.cart.freeRemaining$ as Observable<number>;

  readonly shipping$ = combineLatest([this.subtotal$, this.state$] as const).pipe(
    map(([subtotal, state]) => {
      if (subtotal <= 0) return 0;
      const method = this.shippingMethods.find((m) => m.id === state.shippingMethodId)!;
      if (method.id === 'standard' && subtotal >= this.FREE_THRESHOLD) return 0;
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

    this.cart.clear();
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
    this.cart.applyCoupon(null);
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
      const safe: CheckoutSnapshot = {
        ...snapshot,
        card: snapshot.card
          ? {
              holder: snapshot.card.holder,
              number: this.maskCard(snapshot.card.number),
              exp: snapshot.card.exp,
              cvc: '',
              brand: snapshot.card.brand,
            }
          : undefined,
      };
      const encoded = this.encode(JSON.stringify(safe));
      localStorage.setItem(this.storeKey, encoded);
    } catch {}
  }

  private load(): CheckoutSnapshot | null {
    try {
      const raw = localStorage.getItem(this.storeKey);
      return raw ? JSON.parse(this.decode(raw)) : null;
    } catch {
      return null;
    }
  }

  private saveLastOrder(data: LastOrderSnapshot) {
    try {
      localStorage.setItem(this.lastOrderKey, this.encode(JSON.stringify(data)));
    } catch {}
  }

  private loadLastOrder(): LastOrderSnapshot | null {
    try {
      const raw = localStorage.getItem(this.lastOrderKey);
      return raw ? JSON.parse(this.decode(raw)) : null;
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

  private encode(value: string): string {
    const mixed = value
      .split('')
      .map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ this.cipherKey.charCodeAt(i % this.cipherKey.length)))
      .join('');
    return btoa(mixed);
  }

  private decode(value: string): string {
    const mixed = atob(value);
    return mixed
      .split('')
      .map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ this.cipherKey.charCodeAt(i % this.cipherKey.length)))
      .join('');
  }
}
