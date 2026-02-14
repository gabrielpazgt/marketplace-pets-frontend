import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { Address, CardInfo, ContactInfo, PaymentKind, ShippingMethod } from '../models/checkout.models';
import { CartStateService } from '../../cart/services/cart-state.service';

// ⚠️ AJUSTA ESTE PATH a donde tengas tu CartStateService real

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

@Injectable({ providedIn: 'root' })
export class CheckoutStateService {

  readonly shippingMethods: ShippingMethod[] = [
    { id: 'standard', label: 'Estándar', description: '3–5 días hábiles', price: 25, eta: '3–5 días' },
    { id: 'express',  label: 'Express',  description: '1–2 días hábiles', price: 45, eta: '1–2 días' },
    { id: 'pickup',   label: 'Retiro en tienda', description: 'Retiro en sucursal', price: 0, eta: 'Mismo día' },
  ];

  private readonly FREE_THRESHOLD = 500;
  private storeKey = 'mp_checkout_v1';

  private _state = new BehaviorSubject<CheckoutSnapshot>(this.load() ?? {
    shippingMethodId: 'standard',
    billingSameAsShipping: true,
    step1Done: false,
    step2Done: false,
    step3Done: false,
  });

  readonly state$ = this._state.asObservable();

  constructor(private cart: CartStateService) {}

  // ---- Cart passthroughs (tipados explícitos para templates estrictos) ----
  readonly items$      = this.cart.items$ as Observable<any[]>;
  readonly itemCount$  = this.cart.itemCount$ as Observable<number>;
  readonly subtotal$   = this.cart.subtotal$ as Observable<number>;
  readonly discount$   = this.cart.discount$ as Observable<number>;
  readonly freeThreshold = this.cart.freeThreshold;
  readonly freeProgress$  = this.cart.freeProgress$ as Observable<number>;
  readonly freeRemaining$ = this.cart.freeRemaining$ as Observable<number>;

  // ---- Shipping calc (con generics para evitar errores de tuplas) ----
  readonly shipping$ = combineLatest([this.subtotal$, this.state$] as const).pipe(
    map(([subtotal, st]) => {
      const method = this.shippingMethods.find(m => m.id === st.shippingMethodId)!;
      if (method.id === 'standard' && subtotal >= this.FREE_THRESHOLD) return 0;
      return method.price;
    })
  );

  readonly total$ = combineLatest([this.subtotal$, this.discount$, this.shipping$] as const).pipe(
    map(([s, d, sh]) => Math.max(0, s - d) + sh)
  );

  // ---- State updaters ----
  setContactAndShipping(contact: ContactInfo, shippingAddress: Address) {
    const next = { ...this._state.value, contact, shippingAddress, step1Done: true };
    this.set(next);
  }

  setShippingMethod(id: ShippingMethod['id']) {
    if (!this.shippingMethods.some(m => m.id === id)) return;
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

  setBillingAddress(addr?: Address) {
    const next = { ...this._state.value, billingAddress: addr };
    this.set(next);
  }

  setCardInfo(card?: CardInfo) {
    const next = { ...this._state.value, card, step3Done: !!card };
    this.set(next);
  }

  setOrderNumber(ord: string) {
    const next = { ...this._state.value, orderNumber: ord };
    this.set(next);
  }

  resetAfterSuccess() {
    const ord = this._state.value.orderNumber;
    this.cart.clear();
    this.set({
      shippingMethodId: 'standard',
      billingSameAsShipping: true,
      step1Done: false,
      step2Done: false,
      step3Done: false,
    });
    return ord;
  }

  applyCoupon(code: string | null) { this.cart.applyCoupon(code); }
  clearCoupon() { this.cart.applyCoupon(null); }

  // ---- helpers ----
  get snapshot(): CheckoutSnapshot { return this._state.value; }

  private set(next: CheckoutSnapshot) {
    this._state.next(next);
    this.save(next);
  }

  private save(snap: CheckoutSnapshot) {
    try { localStorage.setItem(this.storeKey, JSON.stringify(snap)); } catch {}
  }

  private load(): CheckoutSnapshot | null {
    try {
      const raw = localStorage.getItem(this.storeKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
}
