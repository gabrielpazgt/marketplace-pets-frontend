import { Component } from '@angular/core';
import { combineLatest, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../../auth/services/auth.service';
import { StorefrontProduct } from '../../../../core/models/storefront.models';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { CartStateService } from '../../services/cart-state.service';

@Component({
  standalone: false,
  selector: 'app-cart-recommendations',
  templateUrl: './cart-recommendations.component.html',
  styleUrls: ['./cart-recommendations.component.scss']
})
export class CartRecommendationsComponent {
  readonly recommendations$ = combineLatest([this.cart.cart$, this.auth.user$]).pipe(
    map(([cart, user]) => ({
      signature: (cart.items || [])
        .map((item) => `${item.product?.id || 0}:${item.qty || 0}`)
        .sort()
        .join('|'),
      hasItems: (cart.items || []).length > 0,
      isLoggedIn: Boolean(user?.id),
    })),
    distinctUntilChanged((prev, next) => prev.signature === next.signature && prev.isLoggedIn === next.isLoggedIn),
    switchMap((state) => {
      if (!state.hasItems) {
        return of([] as StorefrontProduct[]);
      }

      const request$ = state.isLoggedIn
        ? this.storefrontApi.listMyCartRecommendations(4)
        : this.storefrontApi.listGuestCartRecommendations(this.cart.getGuestSessionKey(), 4);

      return request$.pipe(
        map((response) => response.data || []),
        catchError(() => of([] as StorefrontProduct[]))
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor(
    private storefrontApi: StorefrontApiService,
    private cart: CartStateService,
    private auth: AuthService
  ) {}

  image(product: StorefrontProduct): string {
    const media = product.images?.[0];
    const url =
      media?.formats?.['medium']?.url ||
      media?.formats?.['small']?.url ||
      media?.formats?.['thumbnail']?.url ||
      media?.url ||
      '';

    return this.storefrontApi.resolveMediaUrl(url) || 'assets/images/products/placeholder.png';
  }

  add(product: StorefrontProduct): void {
    this.cart.addItem(product.id, 1);
  }
}
