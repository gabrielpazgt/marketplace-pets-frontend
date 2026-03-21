import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CartItem } from '../../models/cart.model';

@Component({
  standalone: false,
  selector: 'app-cart-item',
  templateUrl: './cart-item.component.html',
  styleUrls: ['./cart-item.component.scss']
})
export class CartItemComponent implements OnChanges {
  @Input() item!: CartItem;
  @Input() busy = false;

  @Output() qtyChange = new EventEmitter<number>();
  @Output() remove = new EventEmitter<void>();

  localQty = 1;
  pending = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item'] && this.item) {
      this.localQty = Math.max(1, Number(this.item.qty || 1));
      this.pending = false;
    }
  }

  dec(): void {
    if (this.busy) return;
    this.setLocalQty(this.localQty - 1);
  }

  inc(): void {
    if (this.busy) return;
    this.setLocalQty(this.localQty + 1);
  }

  onQtyInput(event: Event): void {
    if (this.busy) return;
    const raw = Number((event.target as HTMLInputElement).value || this.localQty);
    this.setLocalQty(raw);
  }

  confirmQty(): void {
    if (this.busy || !this.pending) return;
    this.qtyChange.emit(this.localQty);
    this.pending = false;
  }

  resetQty(): void {
    this.localQty = Math.max(1, Number(this.item.qty || 1));
    this.pending = false;
  }

  get lineTotal(): number {
    return this.item.price * this.item.qty;
  }

  private setLocalQty(value: number): void {
    const min = 1;
    const max = Math.max(1, Number(this.item.stock || 1));
    const normalized = Math.min(max, Math.max(min, Math.floor(Number(value || min))));
    this.localQty = normalized;
    this.pending = normalized !== Number(this.item.qty || 1);
  }
}
