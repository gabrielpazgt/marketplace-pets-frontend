import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MembershipsService } from '../../../memberships/services/memberships.service';
import { Product } from '../../models/product.model';

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
  @Output() addToCart = new EventEmitter<void>();

  constructor(private memberships: MembershipsService) {}

  get discount(): number | null {
    return this.product.oldPrice ? Math.round(100 - (this.product.price * 100) / this.product.oldPrice) : null;
  }

  get membershipDiscountPct(): number {
    return this.memberships.getPlan('premium').productDiscountPct;
  }

  get membershipPrice(): number {
    return this.memberships.priceWithMembership(this.product.price, 'premium');
  }
}
