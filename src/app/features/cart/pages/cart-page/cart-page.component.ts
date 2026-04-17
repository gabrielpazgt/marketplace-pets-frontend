import { Component } from '@angular/core';
import { CartStateService } from '../../services/cart-state.service';

@Component({
  standalone: false,
  selector: 'app-cart-page',
  templateUrl: './cart-page.component.html',
  styleUrls: ['./cart-page.component.scss']
})
export class CartPageComponent {
  items$ = this.cart.items$;
  itemCount$ = this.cart.itemCount$;
  subtotal$ = this.cart.subtotal$;
  busy$ = this.cart.busy$;
  threshold$ = this.cart.freeThreshold$;

  constructor(private cart: CartStateService) {}

  setQty(id: string, qty: number): void {
    this.cart.setQty(id, qty);
  }

  remove(id: string): void {
    this.cart.remove(id);
  }
}
