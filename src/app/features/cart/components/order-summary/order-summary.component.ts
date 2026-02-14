import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { combineLatest, map, take } from 'rxjs';
import { CartStateService } from '../../services/cart-state.service';

@Component({
  selector: 'app-order-summary',
  templateUrl: './order-summary.component.html',
  styleUrls: ['./order-summary.component.scss']
})
export class OrderSummaryComponent {
  // Totales normales desde el CartState
  subtotal$  = this.cart.subtotal$;
  discount$  = this.cart.discount$;
  shipping$  = this.cart.shipping$;
  total$     = this.cart.total$;
  coupon$    = this.cart.coupon$;

  /** 👉 true si hay artículos en el carrito */
  hasItems$  = this.cart.itemCount$.pipe(map(n => n > 0));

  form = this.fb.nonNullable.group({ code: '' });

  /** % de ahorro por membresía si no viene memberPrice por ítem */
  membershipRate = 0.10;

  // ====== SOLO calculamos el total de membresía (no mostramos los parciales)
  private memberSubtotal$ = this.cart.items$.pipe(
    map(items => items.reduce((acc, it: any) => {
      const memberUnit = (it.memberPrice != null)
        ? Math.round(it.memberPrice)
        : Math.round(it.price * (1 - this.membershipRate));
      return acc + memberUnit * it.qty;
    }, 0))
  );

  private memberDiscount$ = combineLatest([this.memberSubtotal$, this.cart.discountRate$]).pipe(
    map(([s, r]) => Math.round(s * (r || 0)))
  );

  private memberShipping$ = this.memberSubtotal$.pipe(
    map(s => s >= this.cart.freeThreshold ? 0 : 25)
  );

  /** Total final mostrado como "Total membresía" */
  memberTotal$ = combineLatest([this.memberSubtotal$, this.memberDiscount$, this.memberShipping$]).pipe(
    map(([s, d, sh]) => Math.max(0, s - d) + sh)
  );

  constructor(
    private cart: CartStateService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  apply() {
    const code = (this.form.controls.code.value || '').trim();
    this.cart.applyCoupon(code || null);
  }
  clearCoupon() {
    this.cart.applyCoupon(null);
    this.form.reset({ code: '' });
  }

  checkout() {
    this.cart.itemCount$.pipe(take(1)).subscribe(n => {
      if (n > 0) this.router.navigate(['/checkout']);
      else this.router.navigate(['/cart']);
    });
  }
}
