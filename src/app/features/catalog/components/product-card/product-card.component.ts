import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MembershipsService } from '../../../memberships/services/memberships.service';
import { Product, ProductVariantRef } from '../../models/product.model';

@Component({
  standalone: false,
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() loading = false;
  @Output() addToCart = new EventEmitter<string | undefined>();

  selectedVariantId = '';

  constructor(private memberships: MembershipsService) {}

  get selectedVariant(): ProductVariantRef | null {
    if (!this.product?.variants?.length) return null;
    return this.product.variants.find(v => v.id === this.selectedVariantId) ?? this.product.variants[0];
  }

  get activePrice(): number {
    return this.selectedVariant?.price ?? this.product?.price ?? 0;
  }

  get activeOldPrice(): number | undefined {
    const variantCap = this.selectedVariant?.compareAtPrice;
    return variantCap ?? this.product?.oldPrice;
  }

  get activeStock(): number {
    if (this.selectedVariant) {
      return typeof this.selectedVariant.stock === 'number' ? this.selectedVariant.stock : (this.product?.stock ?? 0);
    }
    return this.product?.stock ?? 0;
  }

  get discount(): number | null {
    const price = this.activePrice;
    const old = this.activeOldPrice;
    if (!old || price <= 0 || old <= price) return null;
    return Math.round(((old - price) / old) * 100);
  }

  get membershipDiscountPct(): number {
    return this.memberships.getPlan('premium').productDiscountPct;
  }

  get membershipPrice(): number {
    return this.memberships.priceWithMembership(this.activePrice, 'premium');
  }

  selectVariant(variantId: string): void {
    this.selectedVariantId = variantId;
  }
}
