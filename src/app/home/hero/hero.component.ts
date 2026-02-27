import { Component, Input } from '@angular/core';

type Cta = { label: string; link: string; variant?: 'primary' | 'ghost' };
type Feature = { img: string; title: string; caption?: string };

@Component({
  selector: 'app-hero',
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss']
})
export class HeroComponent {
  @Input() title = 'Todo para tu mascota, en un solo lugar';
  @Input() subtitle = 'Precios justos, entregas rápidas y recomendaciones según el perfil de tu mascota.';

  @Input() promo: { text: string } = { text: 'Envío gratis en compras > Q500' };

  @Input() ctas: Cta[] = [
    { label: 'Comprar Ahora', link: '/catalog', variant: 'primary' },
    { label: 'Registra tus mascotas',  link: '/c/gatos',  variant: 'ghost' },
  ];

  @Input() quickTags = [
    { label: 'Higiene', link: '/c/higiene' },
    { label: 'Snacks',  link: '/c/snacks' },
    { label: 'Juguetes',link: '/c/juguetes' }
  ];

  /** Tus íconos PNG */
  @Input() features: Feature[] = [
    { img: 'assets/icons/hero/delivery.png', title: 'Envíos 48–72h',    caption: 'A todo el país' },
    { img: 'assets/icons/hero/refund.png',   title: 'Devoluciones 30d', caption: 'Rápidas y sencillas' },
    { img: 'assets/icons/hero/payment.png',  title: 'Pago 100% seguro', caption: 'Protección en compras' },
  ];

  /** Imagen del hero */
  @Input() image = {
    alt: 'Mascota descansando con productos premium',
    webpLg: 'assets/images/cart/dog-sleep.webp',
    webp:   'assets/images/cart/dog-sleep.webp',
    srcLg:  'assets/images/cart/dog-sleep.png',
    src:    'assets/images/cart/dog-sleep.png'
  };
}
