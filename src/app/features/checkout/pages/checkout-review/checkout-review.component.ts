import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, map, of } from 'rxjs';
import { finalize, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../../auth/services/auth.service';
import { AppHttpError } from '../../../../core/models/http.models';
import {
  StorefrontCheckoutAddress,
  StorefrontCheckoutPayload,
} from '../../../../core/models/storefront.models';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { Address } from '../../models/checkout.models';
import { CheckoutStateService } from '../../services/checkout-state.service';
import { CartStateService } from '../../../cart/services/cart-state.service';
import { MembershipsService } from '../../../memberships/services/memberships.service';

interface UnavailableItem {
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

@Component({
  standalone: false,
  selector: 'mp-checkout-review',
  templateUrl: './checkout-review.component.html',
  styleUrls: ['./checkout-review.component.scss']
})
export class CheckoutReviewComponent {
  submitting = false;
  removingItems = false;
  errorMsg = '';
  unavailableItems: UnavailableItem[] = [];
  adjustedTotal = 0;

  readonly potentialSavings$ = this.state.subtotal$.pipe(map(s => Math.round(s * 0.05)));

  get isMember(): boolean { return this.memberships.currentPlan === 'premium'; }

  constructor(
    public state: CheckoutStateService,
    private router: Router,
    private auth: AuthService,
    private cart: CartStateService,
    private storefrontApi: StorefrontApiService,
    private memberships: MembershipsService,
  ) {}

  shippingMethodLabel(): string {
    const id = this.state.snapshot.shippingMethodId;
    const method = this.state.shippingMethods.find((x) => x.id === id);
    return method ? method.label : '';
  }

  formattedShippingAddress(): string {
    const address = this.state.snapshot.shippingAddress;
    if (!address) return '-';

    const line = [address.line1, address.line2].filter(Boolean).join(', ');
    const city = [address.municipality, address.department, address.country].filter(Boolean).join(', ');
    return [line, city].filter(Boolean).join(' | ');
  }

  paymentLabel(): string {
    const kind = this.state.snapshot.paymentKind;
    if (kind === 'card') {
      const number = String(this.state.snapshot.card?.number || '').replace(/\D/g, '');
      const last4 = number.slice(-4);
      return last4 ? `Tarjeta terminada en ${last4}` : 'Tarjeta';
    }
    if (kind === 'bank') return 'Transferencia bancaria';
    return '-';
  }

  paymentIcon(): string {
    const kind = this.state.snapshot.paymentKind;
    if (kind === 'card') return '💳';
    if (kind === 'bank') return '🏦';
    return '💰';
  }

  confirm(): void {
    if (this.submitting) return;

    const payload = this.buildCheckoutPayload();
    if (!payload) return;

    this.submitting = true;
    this.errorMsg = '';
    this.unavailableItems = [];

    const request$ = this.auth.isLoggedIn
      ? this.storefrontApi.checkoutMy(payload)
      : this.storefrontApi.checkoutGuest(this.cart.getGuestSessionKey(), payload);

    request$
      .pipe(finalize(() => { this.submitting = false; }))
      .subscribe({
        next: (response) => {
          const result = response?.data;
          const orderNumber = result?.order?.orderNumber;

          if (!orderNumber) {
            this.errorMsg = 'No se pudo confirmar el pedido. Intenta nuevamente.';
            return;
          }

          if (result?.nextCart) {
            this.cart.hydrateFromBackend(result.nextCart);
          }

          this.state.setOrderNumber(orderNumber);
          this.router.navigate(['checkout/success']);
        },
        error: (error: AppHttpError) => {
          const details = error?.details as any;
          if (details?.unavailable?.length) {
            this.unavailableItems = details.unavailable as UnavailableItem[];
            this.cart.cart$.pipe(take(1)).subscribe((currentCart) => {
              const removedTotal = this.unavailableItems.reduce((s, i) => s + (i.lineTotal || 0), 0);
              this.adjustedTotal = Math.max(0, (currentCart.grandTotal || 0) - removedTotal);
            });
          } else {
            this.errorMsg = error?.message || 'No se pudo confirmar el pedido.';
          }
        }
      });
  }

  continueWithoutUnavailable(): void {
    if (this.removingItems || !this.unavailableItems.length) return;

    this.cart.cart$.pipe(
      take(1),
      switchMap((currentCart) => {
        const itemsToRemove = (currentCart.items || []).filter((cartItem) =>
          this.unavailableItems.some((u) => u.name === cartItem.product?.name)
        );

        if (!itemsToRemove.length) return of(null);

        const removes$ = itemsToRemove.map((item) =>
          this.auth.isLoggedIn
            ? this.storefrontApi.removeMyCartItem(String(item.id))
            : this.storefrontApi.removeGuestCartItem(this.cart.getGuestSessionKey(), String(item.id))
        );

        return forkJoin(removes$);
      })
    ).subscribe({
      next: (results) => {
        if (results) {
          const lastCart = (results as any[])[results.length - 1];
          if (lastCart?.data) this.cart.hydrateFromBackend(lastCart.data);
        }
        this.unavailableItems = [];
        this.removingItems = false;
        this.confirm();
      },
      error: () => {
        this.removingItems = false;
        this.errorMsg = 'No se pudieron eliminar los productos. Ve al carrito e inténtalo manualmente.';
      }
    });
    this.removingItems = true;
  }

  back(): void {
    this.router.navigate(['checkout/payment']);
  }

  goToCart(): void {
    this.router.navigate(['/cart']);
  }

  private buildCheckoutPayload(): StorefrontCheckoutPayload | null {
    const snapshot = this.state.snapshot;
    const contact = snapshot.contact;
    const shipping = snapshot.shippingAddress;

    if (!contact || !shipping) {
      this.errorMsg = 'Completa tus datos de contacto y envio antes de confirmar.';
      return null;
    }

    const email = (contact.email || '').trim();
    if (!this.auth.isLoggedIn && !email) {
      this.errorMsg = 'El correo es requerido para finalizar como invitado.';
      return null;
    }

    const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
    if (!fullName) {
      this.errorMsg = 'Ingresa nombre y apellido para continuar.';
      return null;
    }

    const phone = (contact.phone || '').trim() || '+50200000000';
    const shippingAddress = this.toApiAddress(shipping, fullName, phone);

    const billingSource = snapshot.billingSameAsShipping === false && snapshot.billingAddress
      ? snapshot.billingAddress
      : shipping;

    const billingAddress = this.toApiAddress(billingSource, fullName, phone);

    const payload: StorefrontCheckoutPayload = {
      billingAddress,
      shippingAddress,
      shippingMethod: snapshot.shippingMethodId,
      paymentKind: snapshot.paymentKind,
    };

    if (!this.auth.isLoggedIn) {
      payload.email = email;
    }

    return payload;
  }

  private toApiAddress(source: Address, fullName: string, phone: string): StorefrontCheckoutAddress {
    const city = (source.municipality || source.department || 'Guatemala').trim();
    const addressLine1 = (source.line1 || '').trim();

    const line2Parts = [source.line2, source.references]
      .map((part) => (part || '').trim())
      .filter(Boolean);

    return {
      fullName,
      phone,
      country: this.toCountryCode(source.country),
      city,
      addressLine1,
      addressLine2: line2Parts.length ? line2Parts.join(' | ') : undefined,
    };
  }

  private toCountryCode(country: string): string {
    const normalized = (country || '').trim().toUpperCase();
    if (!normalized) return 'GT';
    if (normalized === 'GUATEMALA') return 'GT';
    if (normalized.length === 2) return normalized;
    return normalized.slice(0, 2);
  }
}
