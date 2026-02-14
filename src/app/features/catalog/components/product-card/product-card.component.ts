import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() loading = false;

  get discount(): number | null {
    return this.product.oldPrice ? Math.round(100 - (this.product.price * 100) / this.product.oldPrice) : null;
  }
}
