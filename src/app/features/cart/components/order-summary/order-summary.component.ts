import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, combineLatest, map, take } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CartStateService } from '../../services/cart-state.service';

@Component({
  standalone: false,
  selector: 'app-order-summary',
  templateUrl: './order-summary.component.html',
  styleUrls: ['./order-summary.component.scss']
})
export class OrderSummaryComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private couponAction: 'apply' | 'clear' | null = null;

  busy$ = this.cart.busy$;
  subtotal$ = this.cart.subtotal$;
  discount$ = this.cart.discount$;
  shippingEstimate$ = combineLatest([this.subtotal$, this.discount$]).pipe(
    map(([subtotal, discount]) => {
      const effective = Math.max(0, Number(subtotal || 0) - Number(discount || 0));
      if (effective <= 0) return 0;
      if (effective >= this.cart.freeThreshold) return 0;
      return 25;
    })
  );
  total$ = combineLatest([this.subtotal$, this.discount$, this.shippingEstimate$]).pipe(
    map(([subtotal, discount, shipping]) => Math.max(0, Number(subtotal || 0) - Number(discount || 0) + Number(shipping || 0)))
  );
  coupon$ = this.cart.coupon$;

  hasItems$ = this.cart.itemCount$.pipe(map((n) => n > 0));

  form = this.fb.nonNullable.group({ code: '' });
  statusMessage = '';
  statusType: 'success' | 'error' = 'success';

  constructor(
    private cart: CartStateService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    combineLatest([this.busy$, this.cart.error$, this.coupon$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([busy, error, couponCode]) => {
        if (busy || !this.couponAction) {
          return;
        }

        if (error) {
          this.statusType = 'error';
          this.statusMessage = error;
          this.couponAction = null;
          return;
        }

        this.statusType = 'success';
        this.statusMessage =
          this.couponAction === 'apply' && couponCode
            ? 'Cupón aplicado correctamente.'
            : 'Cupón eliminado.';
        this.couponAction = null;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  apply() {
    const code = (this.form.controls.code.value || '').trim();
    this.statusMessage = '';
    this.couponAction = code ? 'apply' : 'clear';
    this.cart.applyCoupon(code || null);
  }

  clearCoupon() {
    this.statusMessage = '';
    this.couponAction = 'clear';
    this.cart.applyCoupon(null);
    this.form.reset({ code: '' });
  }

  checkout() {
    this.cart.itemCount$.pipe(take(1)).subscribe((n) => {
      if (n > 0) {
        this.router.navigate(['/checkout']);
      } else {
        this.router.navigate(['/cart']);
      }
    });
  }
}
