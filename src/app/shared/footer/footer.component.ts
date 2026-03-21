import { Component, OnDestroy, OnInit } from '@angular/core';
import { take } from 'rxjs/operators';
import { StorefrontMedia } from '../../core/models/storefront.models';
import { StorefrontApiService } from '../../core/services/storefront-api.service';

type NewsletterState = 'idle' | 'success' | 'error';

@Component({
  standalone: false,
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit, OnDestroy {
  currentYear = new Date().getFullYear();

  promoText = '';
  promoCode = '';
  footerPromoImageUrl = '';
  footerPromoImageAlt = 'Publicidad destacada';
  newsletterMessage = '';
  newsletterState: NewsletterState = 'idle';

  readonly socialLinks = [
    { src: 'assets/images/logos/instagram.png', alt: 'Instagram', href: '#' },
    { src: 'assets/images/logos/facebook.png', alt: 'Facebook', href: '#' },
    { src: 'assets/images/logos/youtube.png', alt: 'YouTube', href: '#' },
    { src: 'assets/images/logos/tiktok.png', alt: 'TikTok', href: '#' },
  ];

  readonly trustPills = [
    {
      icon: '📦',
      title: 'Envios 48-72h',
      subtitle: 'A todo el pais',
    },
    {
      icon: '↩️',
      title: 'Devoluciones 30d',
      subtitle: 'Rapidas y sencillas',
    },
    {
      icon: '💵',
      title: 'Pago 100% seguro',
      subtitle: 'Proteccion en compras',
    },
  ];

  readonly footerGroups = [
    {
      title: 'Comprar',
      links: [
        { label: 'Perros', href: '/catalog/perros' },
        { label: 'Gatos', href: '/catalog/gatos' },
        { label: 'Snacks', href: '/catalog/snacks' },
        { label: 'Higiene', href: '/catalog/higiene' },
      ],
    },
    {
      title: 'Explora',
      links: [
        { label: 'Tienda', href: '/catalog' },
        { label: 'Membresias', href: '/memberships' },
        { label: 'Sobre nosotros', href: '/about' },
        { label: 'Terminos y ayuda', href: '/terms' },
      ],
    },
  ];

  private newsletterTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private storefrontApi: StorefrontApiService) {}

  ngOnInit(): void {
    this.storefrontApi
      .listPublicCoupons()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const firstCoupon = (response.data || [])[0];
          if (!firstCoupon) return;

          this.promoText = firstCoupon.displayMessage;
          this.promoCode = firstCoupon.code;
        },
        error: () => {
          this.promoText = '';
          this.promoCode = '';
        },
      });

    this.storefrontApi
      .getFooterNewsletterPromo()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const media = response.data || null;
          this.footerPromoImageUrl = this.resolvePromoImage(media);
          this.footerPromoImageAlt = media?.alternativeText || media?.name || 'Publicidad destacada';
        },
        error: () => {
          this.footerPromoImageUrl = '';
          this.footerPromoImageAlt = 'Publicidad destacada';
        },
      });
  }

  ngOnDestroy(): void {
    if (this.newsletterTimer) {
      clearTimeout(this.newsletterTimer);
      this.newsletterTimer = null;
    }
  }

  submitNewsletter(emailValue: string): void {
    const email = String(emailValue || '').trim().toLowerCase();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValid) {
      this.setNewsletterMessage('Ingresa un correo valido para suscribirte.', 'error');
      return;
    }

    this.setNewsletterMessage('Gracias. Te avisaremos sobre novedades y promociones.', 'success');
  }

  private setNewsletterMessage(message: string, state: NewsletterState): void {
    this.newsletterMessage = message;
    this.newsletterState = state;

    if (this.newsletterTimer) {
      clearTimeout(this.newsletterTimer);
    }

    this.newsletterTimer = setTimeout(() => {
      this.newsletterMessage = '';
      this.newsletterState = 'idle';
      this.newsletterTimer = null;
    }, 3000);
  }

  private resolvePromoImage(media?: StorefrontMedia | null): string {
    const rawUrl =
      media?.formats?.['medium']?.url ||
      media?.formats?.['small']?.url ||
      media?.formats?.['thumbnail']?.url ||
      media?.url ||
      '';

    return this.storefrontApi.resolveMediaUrl(rawUrl);
  }
}
