import { Component } from '@angular/core';
import { CartStateService } from '../../services/cart-state.service';

@Component({
  selector: 'app-cart-page',
  templateUrl: './cart-page.component.html',
  styleUrls: ['./cart-page.component.scss']
})
export class CartPageComponent {
  items$     = this.cart.items$;
  itemCount$ = this.cart.itemCount$;        // 👈 contador para (n)
  subtotal$  = this.cart.subtotal$;         // para la barra
  threshold  = this.cart.freeThreshold;

  constructor(private cart: CartStateService) {}

  setQty(id: string, qty: number) { this.cart.setQty(id, qty); }
  remove(id: string)               { this.cart.remove(id); }
}
