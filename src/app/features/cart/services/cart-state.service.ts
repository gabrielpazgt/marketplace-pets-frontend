import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { CartItem } from '../models/cart.model';

@Injectable({ providedIn: 'root' })
export class CartStateService {
  // ⚠️ Mock inicial (pon tus assets reales)
  private readonly _items = new BehaviorSubject<CartItem[]>([
    { id: '1', slug: 'croquetas-premium-10kg', name: 'Croquetas Premium 10kg', image: 'assets/images/products/croquetas.png', price: 499, oldPrice: 560, qty: 1, stock: 8, attrs: ['Perro'] },
    { id: '2', slug: 'arena-gato-12l',         name: 'Arena para gato 12L',   image: 'assets/images/products/arena.png',     price: 189,               qty: 2, stock: 12, attrs: ['Gato', '12L'] },
    { id: '3', slug: 'cama-memory-foam',       name: 'Cama memory foam',      image: 'assets/images/products/cama.png',      price: 399, oldPrice: 450, qty: 1, stock: 3, attrs: ['L', 'Beige'] }
  ]);
  readonly items$ = this._items.asObservable();

  private readonly _coupon = new BehaviorSubject<string | null>(null);
  readonly coupon$ = this._coupon.asObservable();

  readonly itemCount$ = this.items$.pipe(map(list => list.reduce((a,i)=>a+i.qty,0)));
  readonly subtotal$  = this.items$.pipe(map(list => list.reduce((a,i)=>a + i.price * i.qty, 0)));

  // Cupón mock: AUMAKKI15 => 15% OFF
  readonly discountRate$ = this.coupon$.pipe(map(code => code?.toUpperCase() === 'AUMAKKI15' ? 0.15 : 0));
  readonly discount$     = combineLatest([this.subtotal$, this.discountRate$]).pipe(map(([s, r]) => Math.round(s * r)));

  // Envío: gratis desde Q500, si no Q25 fijo
  readonly shipping$ = this.subtotal$.pipe(map(s => s >= 500 ? 0 : 25));
  readonly total$    = combineLatest([this.subtotal$, this.discount$, this.shipping$]).pipe(
    map(([s, d, sh]) => Math.max(0, s - d) + sh)
  );

  readonly freeThreshold = 500;
  readonly freeProgress$ = this.subtotal$.pipe(map(s => Math.min(100, Math.floor((s / this.freeThreshold) * 100))));
  readonly freeRemaining$ = this.subtotal$.pipe(map(s => Math.max(0, this.freeThreshold - s)));

  // --- acciones ---
  setQty(id: string, qty: number) {
    const list = this._items.value.map(i => i.id === id ? { ...i, qty: Math.min(Math.max(qty, 1), i.stock) } : i);
    this._items.next(list);
  }
  remove(id: string) { this._items.next(this._items.value.filter(i => i.id !== id)); }
  applyCoupon(code: string | null) { this._coupon.next(code?.trim() || null); }
  clear() { this._items.next([]); this._coupon.next(null); }
}
