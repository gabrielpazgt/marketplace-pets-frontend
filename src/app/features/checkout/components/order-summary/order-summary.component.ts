import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, combineLatest } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { StorefrontPublicCoupon } from '../../../../core/models/storefront.models';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { CheckoutStateService } from '../../services/checkout-state.service';

@Component({
  standalone: false,
  selector: 'mp-order-summary',
  templateUrl: './order-summary.component.html',
  styleUrls: ['./order-summary.component.scss']
})
export class OrderSummaryComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private couponAction: 'apply' | 'clear' | null = null;

  constructor(
    public state: CheckoutStateService,
    private storefrontApi: StorefrontApiService
  ) {}

  code = '';
  message = '';
  availableCoupons: StorefrontPublicCoupon[] = [];

  ngOnInit(): void {
    combineLatest([this.state.cartBusy$, this.state.cartError$, this.state.couponCode$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([busy, error, couponCode]) => {
        if (busy || !this.couponAction) {
          return;
        }

        if (error) {
          this.message = error;
          this.couponAction = null;
          return;
        }

        if (this.couponAction === 'apply') {
          this.message = couponCode ? 'Cupón aplicado correctamente.' : '';
        } else {
          this.message = 'Cupón eliminado.';
        }

        this.couponAction = null;
      });

    this.storefrontApi
      .listPublicCoupons()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.availableCoupons = (response.data || []).slice(0, 6);
        },
        error: () => {
          this.availableCoupons = [];
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  apply() {
    const trimmedCode = this.code.trim();
    this.message = '';
    this.couponAction = trimmedCode ? 'apply' : 'clear';
    this.state.applyCoupon(trimmedCode || null);
  }

  clear() {
    this.code = '';
    this.message = '';
    this.couponAction = 'clear';
    this.state.clearCoupon();
  }

  applyCode(code: string): void {
    this.code = code;
    this.apply();
  }
}
