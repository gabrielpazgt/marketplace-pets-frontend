import { Injectable } from '@angular/core';
import { delay, of } from 'rxjs';
import { Category, Product } from './home.models';

@Injectable()
export class HomeDataService {

  getCategories() {
    const data: Category[] = [
      { id: 1, name: 'Perros', slug: 'perros', image: 'assets/images/cats/perros.jpg' },
      { id: 2, name: 'Gatos', slug: 'gatos', image: 'assets/images/cats/gatos.jpg' },
      { id: 3, name: 'Higiene', slug: 'higiene', image: 'assets/images/cats/higiene.jpg' },
      { id: 4, name: 'Snacks', slug: 'snacks', image: 'assets/images/cats/snacks.jpg' },
      { id: 5, name: 'Juguetes', slug: 'juguetes', image: 'assets/images/cats/juguetes.jpg' },
      { id: 6, name: 'Accesorios', slug: 'accesorios', image: 'assets/images/cats/accesorios.jpg' },
    ];
    return of(data).pipe(delay(700));
  }

  getFeatured() {
    const data: Product[] = [
      { id: 101, name: 'Croquetas Premium 10kg', slug: 'croquetas-premium-10kg', price: 499, image: 'assets/images/prods/food-1.jpg', badge: 'TOP' },
      { id: 102, name: 'Arena para gato 12L', slug: 'arena-gato-12l', price: 189, image: 'assets/images/prods/sand-1.jpg', badge: 'SALE' },
      { id: 103, name: 'Cuerda mordedora', slug: 'cuerda-mordedora', price: 59, image: 'assets/images/prods/toy-1.jpg' },
      { id: 104, name: 'Arnés reflectivo', slug: 'arnes-reflectivo', price: 129, image: 'assets/images/prods/harness-1.jpg', badge: 'NEW' },
      { id: 105, name: 'Shampoo hipoalergénico', slug: 'shampoo-hipo', price: 89, image: 'assets/images/prods/shampoo-1.jpg' },
      { id: 106, name: 'Snacks dentales x7', slug: 'snacks-dentales-7', price: 39, image: 'assets/images/prods/snack-1.jpg' },
      { id: 107, name: 'Cama memory foam', slug: 'cama-memory-foam', price: 399, image: 'assets/images/prods/bed-1.jpg', badge: 'TOP' },
      { id: 108, name: 'Comedero doble antidesliz', slug: 'comedero-doble', price: 119, image: 'assets/images/prods/bowl-1.jpg' },
    ];
    return of(data).pipe(delay(900));
  }
}
