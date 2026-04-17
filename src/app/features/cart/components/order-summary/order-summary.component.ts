import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, combineLatest, map, take } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CartStateService } from '../../services/cart-state.service';
import { CartItem } from '../../models/cart.model';

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
  savings$ = combineLatest([this.cart.items$, this.discount$]).pipe(
    map(([items, discount]) => this.resolveMerchandisingSavings(items) + Math.max(0, Number(discount || 0)))
  );
  shippingEstimate$ = combineLatest([this.subtotal$, this.discount$, this.cart.freeThreshold$]).pipe(
    map(([subtotal, discount, threshold]) => {
      const effective = Math.max(0, Number(subtotal || 0) - Number(discount || 0));
      if (effective <= 0) return 0;
      if (effective >= Number(threshold || 0)) return 0;
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
            ? 'Cup\u00F3n aplicado correctamente.'
            : 'Cup\u00F3n eliminado.';
        this.couponAction = null;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  apply(): void {
    const code = (this.form.controls.code.value || '').trim();
    this.statusMessage = '';
    this.couponAction = code ? 'apply' : 'clear';
    this.cart.applyCoupon(code || null);
  }

  clearCoupon(): void {
    this.statusMessage = '';
    this.couponAction = 'clear';
    this.cart.applyCoupon(null);
    this.form.reset({ code: '' });
  }

  checkout(): void {
    this.cart.itemCount$.pipe(take(1)).subscribe((n) => {
      if (n > 0) {
        this.router.navigate(['/checkout']);
      } else {
        this.router.navigate(['/cart']);
      }
    });
  }

  private resolveMerchandisingSavings(items: CartItem[]): number {
    return (items || []).reduce((total, item) => {
      const oldPrice = Number(item.oldPrice || 0);
      const price = Number(item.price || 0);
      const qty = Math.max(1, Number(item.qty || 1));
      if (oldPrice <= price) return total;
      return total + ((oldPrice - price) * qty);
    }, 0);
  }
}
