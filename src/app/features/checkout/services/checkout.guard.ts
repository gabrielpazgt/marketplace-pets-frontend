import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { CartStateService } from '../../cart/services/cart-state.service';



@Injectable({ providedIn: 'root' })
export class CheckoutGuard implements CanActivate {
  constructor(private cart: CartStateService, private router: Router) {}

  canActivate() {
    return this.cart.itemCount$.pipe(
      map((count) => {
        const n = Number(count ?? 0);
        if (n > 0) return true;
        this.router.navigateByUrl('/cart'); // cambia si tu ruta es otra
        return false;
      })
    );
  }
}
