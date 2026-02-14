import { Component } from '@angular/core';

@Component({
  selector: 'app-cart-recommendations',
  templateUrl: './cart-recommendations.component.html',
  styleUrls: ['./cart-recommendations.component.scss']
})
export class CartRecommendationsComponent {
  items = [
    { name: 'Snacks dentales x7', price: 39, image: 'assets/images/products/snacks.png' },
    { name: 'Cuerda mordedora',   price: 59, image: 'assets/images/products/cuerda.png' },
    { name: 'Comedero doble',     price: 119, image: 'assets/images/products/comedero.png' },
    { name: 'Shampoo hipo',       price: 89, image: 'assets/images/products/shampoo.png' },
  ];
}
