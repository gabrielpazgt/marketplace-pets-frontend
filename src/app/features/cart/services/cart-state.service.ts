import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject, forkJoin, of } from 'rxjs';
import { catchError, distinctUntilChanged, finalize, map, tap } from 'rxjs/operators';
import { AuthService } from '../../../auth/services/auth.service';
import { AppHttpError } from '../../../core/models/http.models';
import {
  StorefrontCart,
  StorefrontCartItem,
  StorefrontVariantSelection,
  StrapiItemResponse,
} from '../../../core/models/storefront.models';
import { StorefrontApiService } from '../../../core/services/storefront-api.service';
import { CartItem } from '../models/cart.model';

const GUEST_SESSION_KEY_STORAGE = 'mp_guest_cart_session';

const EMPTY_CART: StorefrontCart = {
  id: 0,
  sessionKey: null,
  currency: 'GTQ',
  subtotal: 0,
  discountTotal: 0,
  shippingTotal: 0,
  grandTotal: 0,
  membershipApplied: false,
  statusCart: 'active',
  coupon: null,
  items: [],
};

export interface CartNotification {
  type: 'success' | 'error';
  message: string;
}

type CartRequestResult = StrapiItemResponse<StorefrontCart> & {
  __failed?: boolean;
};

@Injectable({ providedIn: 'root' })
export class CartStateService {
  private readonly freeShippingThreshold = 500;

  private readonly cartSubject = new BehaviorSubject<StorefrontCart>(EMPTY_CART);
  private readonly busySubject = new BehaviorSubject<boolean>(false);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly notifySubject = new Subject<CartNotification>();

  readonly cart$ = this.cartSubject.asObservable();
  readonly busy$ = this.busySubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly notifications$ = this.notifySubject.asObservable();

  readonly items$: Observable<CartItem[]> = this.cart$.pipe(
    map((cart) => (cart.items || []).map((item) => this.toUiItem(item)))
  );

  readonly coupon$: Observable<string | null> = this.cart$.pipe(
    map((cart) => cart.coupon?.code || null)
  );

  readonly itemCount$ = this.cart$.pipe(
    map((cart) => (cart.items || []).reduce((acc, item) => acc + Number(item.qty || 0), 0))
  );

  readonly subtotal$ = this.cart$.pipe(map((cart) => Number(cart.subtotal || 0)));
  readonly discount$ = this.cart$.pipe(map((cart) => Number(cart.discountTotal || 0)));
  readonly shipping$ = this.cart$.pipe(map((cart) => Number(cart.shippingTotal || 0)));
  readonly total$ = this.cart$.pipe(map((cart) => Number(cart.grandTotal || 0)));

  readonly freeThreshold = this.freeShippingThreshold;
  readonly freeThreshold$ = this.cart$.pipe(
    map((cart) => {
      const backendValue = Number(cart.shippingPolicy?.freeShippingThreshold);
      if (Number.isFinite(backendValue) && backendValue >= 0) {
        return backendValue;
      }

      return this.freeShippingThreshold;
    })
  );
  readonly freeProgress$ = this.cart$.pipe(
    map((cart) => {
      const backendValue = Number(cart.shippingPolicy?.progressPct);
      if (Number.isFinite(backendValue)) {
        return Math.max(0, Math.min(100, backendValue));
      }

      const threshold = this.resolveFreeThreshold(cart);
      const subtotal = Number(cart.subtotal || 0);
      const discount = Number(cart.discountTotal || 0);
      const effective = Math.max(0, subtotal - discount);
      return threshold > 0 ? Math.min(100, Math.floor((effective / threshold) * 100)) : 100;
    })
  );
  readonly freeRemaining$ = this.cart$.pipe(
    map((cart) => {
      const backendValue = Number(cart.shippingPolicy?.amountToFreeShipping);
      if (Number.isFinite(backendValue)) {
        return Math.max(0, backendValue);
      }

      const threshold = this.resolveFreeThreshold(cart);
      const subtotal = Number(cart.subtotal || 0);
      const discount = Number(cart.discountTotal || 0);
      const effective = Math.max(0, subtotal - discount);
      return Math.max(0, threshold - effective);
    })
  );

  private previousUserId: number | null = null;

  constructor(
    private storefrontApi: StorefrontApiService,
    private auth: AuthService
  ) {
    this.auth.user$
      .pipe(
        map((user) => user?.id ?? null),
        distinctUntilChanged()
      )
      .subscribe((userId) => {
        const wasGuest = this.previousUserId === null;
        const isNowLoggedIn = userId !== null;

        if (wasGuest && isNowLoggedIn) {
          // User just logged in — migrate guest cart items if a session exists
          const sessionKey = localStorage.getItem(GUEST_SESSION_KEY_STORAGE);
          if (sessionKey) {
            this.storefrontApi.adoptGuestCart(sessionKey).subscribe({
              next: (res) => this.updateCart(res.data),
              error: () => this.refresh(),
            });
          } else {
            this.refresh();
          }
        } else {
          this.refresh();
        }

        this.previousUserId = userId;
      });
  }

  refresh(): void {
    this.runCartRequest(this.getCurrentCartRequest());
  }

  getGuestSessionKey(): string {
    return this.ensureGuestSessionKey();
  }

  hydrateFromBackend(cart: StorefrontCart): void {
    this.updateCart(cart);
  }

  addItem(productId: number | string, qty = 1, notes?: string, variant?: Record<string, unknown>): void {
    this.addItem$(productId, qty, notes, variant).subscribe();
  }

  addItem$(
    productId: number | string,
    qty = 1,
    notes?: string,
    variant?: Record<string, unknown>
  ): Observable<StorefrontCart> {
    const safeQty = Math.max(1, Math.floor(Number(qty || 1)));
    const payload = {
      productId,
      qty: safeQty,
      notes,
      variant,
    };

    if (this.auth.isLoggedIn) {
      return this.executeCartRequest(
        this.storefrontApi.addMyCartItem(payload),
        'Producto agregado al carrito.'
      );
    }

    const sessionKey = this.ensureGuestSessionKey();
    return this.executeCartRequest(
      this.storefrontApi.addGuestCartItem(sessionKey, payload),
      'Producto agregado al carrito.'
    );
  }

  setQty(itemId: string, qty: number): void {
    const normalizedQty = Math.max(0, Math.floor(Number(qty || 0)));
    const currentItem = (this.cartSubject.value.items || []).find((item) => String(item.id) === String(itemId));
    if (currentItem && Number(currentItem.qty || 0) === normalizedQty) {
      return;
    }

    if (this.auth.isLoggedIn) {
      this.runCartRequest(this.storefrontApi.updateMyCartItem(itemId, { qty: normalizedQty }));
      return;
    }

    const sessionKey = this.ensureGuestSessionKey();
    this.runCartRequest(this.storefrontApi.updateGuestCartItem(sessionKey, itemId, { qty: normalizedQty }));
  }

  remove(itemId: string): void {
    if (this.auth.isLoggedIn) {
      this.runCartRequest(this.storefrontApi.removeMyCartItem(itemId), 'Producto eliminado del carrito.');
      return;
    }

    const sessionKey = this.ensureGuestSessionKey();
    this.runCartRequest(this.storefrontApi.removeGuestCartItem(sessionKey, itemId), 'Producto eliminado del carrito.');
  }

  applyCoupon(code: string | null): void {
    const trimmed = (code || '').trim();
    if (!trimmed) {
      this.clearCoupon();
      return;
    }

    if (this.auth.isLoggedIn) {
      this.runCartRequest(this.storefrontApi.applyMyCoupon(trimmed));
      return;
    }

    const sessionKey = this.ensureGuestSessionKey();
    this.runCartRequest(this.storefrontApi.applyGuestCoupon(sessionKey, trimmed));
  }

  clearCoupon(): void {
    if (this.auth.isLoggedIn) {
      this.runCartRequest(this.storefrontApi.clearMyCoupon());
      return;
    }

    const sessionKey = this.ensureGuestSessionKey();
    this.runCartRequest(this.storefrontApi.clearGuestCoupon(sessionKey));
  }

  clear(): void {
    const itemIds = (this.cartSubject.value.items || []).map((item) => String(item.id));
    if (!itemIds.length) {
      return;
    }

    this.busySubject.next(true);
    const requests = itemIds.map((id) => this.getRemoveRequest(id));

    forkJoin(requests)
      .pipe(
        finalize(() => this.busySubject.next(false))
      )
      .subscribe({
        next: (responses) => {
          const latest = responses[responses.length - 1];
          if (latest?.data) {
            this.updateCart(latest.data);
          } else {
            this.refresh();
          }
        },
        error: () => this.refresh(),
      });
  }

  private getRemoveRequest(itemId: string): Observable<StrapiItemResponse<StorefrontCart>> {
    if (this.auth.isLoggedIn) {
      return this.storefrontApi.removeMyCartItem(itemId);
    }

    const sessionKey = this.ensureGuestSessionKey();
    return this.storefrontApi.removeGuestCartItem(sessionKey, itemId);
  }

  private getCurrentCartRequest(): Observable<StrapiItemResponse<StorefrontCart>> {
    if (this.auth.isLoggedIn) {
      return this.storefrontApi.getMyCart();
    }

    const sessionKey = this.readGuestSessionKey();
    return this.storefrontApi.getGuestCart(sessionKey || undefined);
  }

  private runCartRequest(
    request$: Observable<StrapiItemResponse<StorefrontCart>>,
    successMessage?: string
  ): void {
    this.executeCartRequest(request$, successMessage).subscribe();
  }

  private executeCartRequest(
    request$: Observable<StrapiItemResponse<StorefrontCart>>,
    successMessage?: string
  ): Observable<StorefrontCart> {
    this.busySubject.next(true);
    this.errorSubject.next(null);

    return request$
      .pipe(
        catchError((error: AppHttpError) => {
          const message = error?.message || 'No se pudo actualizar el carrito.';
          this.errorSubject.next(message);
          this.notifySubject.next({ type: 'error', message });
          return of<CartRequestResult>({ data: this.cartSubject.value, __failed: true });
        }),
        map((response: CartRequestResult) => ({
          cart: (response?.data || EMPTY_CART) as StorefrontCart,
          failed: Boolean(response?.__failed),
        })),
        tap(({ cart, failed }) => {
          this.updateCart(cart);
          if (!failed && successMessage) {
            this.notifySubject.next({ type: 'success', message: successMessage });
          }
        }),
        map(({ cart }) => cart),
        finalize(() => this.busySubject.next(false))
      );
  }

  private updateCart(next: StorefrontCart): void {
    const safe = next || EMPTY_CART;
    this.cartSubject.next({
      ...safe,
      items: safe.items || [],
    });

    if (!this.auth.isLoggedIn && safe.sessionKey) {
      localStorage.setItem(GUEST_SESSION_KEY_STORAGE, safe.sessionKey);
    }
  }

  private readGuestSessionKey(): string {
    return (localStorage.getItem(GUEST_SESSION_KEY_STORAGE) || '').trim();
  }

  private ensureGuestSessionKey(): string {
    const existing = this.readGuestSessionKey();
    if (existing) return existing;

    const generated = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    localStorage.setItem(GUEST_SESSION_KEY_STORAGE, generated);
    return generated;
  }

  private toUiItem(item: StorefrontCartItem): CartItem {
    const product = item.product;
    const image = this.resolveCartItemImage(item);

    return {
      id: String(item.id),
      slug: product?.slug || `item-${item.id}`,
      name: product?.name || 'Producto',
      image,
      brand: product?.brand?.name || undefined,
      price: Number(item.unitPrice || product?.price || 0),
      oldPrice: Number(product?.compareAtPrice || 0) > Number(item.unitPrice || product?.price || 0)
        ? Number(product?.compareAtPrice || 0)
        : undefined,
      qty: Number(item.qty || 1),
      stock: Math.max(1, Number(product?.stock || item.qty || 1)),
      attrs: this.resolveVariantAttributes(item.variant),
    };
  }

  private resolveCartItemImage(item: StorefrontCartItem): string {
    const media = item.product?.images?.[0];
    const url =
      media?.formats?.['small']?.url ||
      media?.formats?.['thumbnail']?.url ||
      media?.url ||
      '';

    const resolved = this.storefrontApi.resolveMediaUrl(url);
    return resolved || 'assets/images/products/placeholder.png';
  }

  private resolveVariantAttributes(variant: StorefrontVariantSelection | null | undefined): string[] {
    if (!variant || typeof variant !== 'object') return [];

    const label = String(variant['label'] || variant['presentation'] || variant['size'] || '').trim();
    if (label) {
      return [label];
    }

    return Object.entries(variant)
      .filter(([key]) => !['id', 'sku'].includes(key))
      .map(([key, value]) => `${key}: ${String(value)}`)
      .filter((entry) => entry.trim().length > 0);
  }

  private resolveFreeThreshold(cart: StorefrontCart): number {
    const backendValue = Number(cart.shippingPolicy?.freeShippingThreshold);
    if (Number.isFinite(backendValue) && backendValue >= 0) {
      return backendValue;
    }

    return this.freeShippingThreshold;
  }
}

