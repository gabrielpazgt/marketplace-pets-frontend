import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CartItem } from '../../models/cart.model';

/** Permite opcionalmente recibir precios de membresía ya calculados */
type CartItemEx = CartItem & {
  memberPrice?: number;
  memberOldPrice?: number;
};

@Component({
  selector: 'app-cart-item',
  templateUrl: './cart-item.component.html',
  styleUrls: ['./cart-item.component.scss']
})
export class CartItemComponent {
  @Input() item!: CartItemEx;
  /** Si no vienen precios de membresía, se calcula con esta tasa */
  @Input() membershipRate = 0.10; // 10%

  @Output() qtyChange = new EventEmitter<number>();
  @Output() remove = new EventEmitter<void>();

  onQty(v: number) { this.qtyChange.emit(v); }

  get lineTotal(): number { return this.item.price * this.item.qty; }

  // === Precios membresía (unidad) ===
  get memberNow(): number {
    const explicit = this.item.memberPrice;
    if (explicit != null) return Math.round(explicit);
    return Math.round(this.item.price * (1 - this.membershipRate));
  }

  get memberOld(): number | null {
    const baseOld = (this.item.memberOldPrice ?? this.item.oldPrice);
    if (!baseOld) return null;
    // si trae memberOldPrice lo respetamos; si no, lo calculamos desde oldPrice
    const explicit = this.item.memberOldPrice;
    return Math.round(explicit != null ? explicit : baseOld * (1 - this.membershipRate));
  }
}
