import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { CartStateService } from '../../cart/services/cart-state.service';



@Injectable({ providedIn: 'root' })
export class CheckoutGuard implements CanActivate {
  constructor(private cart: CartStateService, private router: Router) {}

  canActivate() {
    return combineLatest([this.cart.busy$, this.cart.itemCount$]).pipe(
      filter(([busy]) => !busy),
      take(1),
      map(([, count]) => {
        const n = Number(count ?? 0);
        if (n > 0) return true;
        this.router.navigateByUrl('/cart');
        return false;
      })
    );
  }
}
