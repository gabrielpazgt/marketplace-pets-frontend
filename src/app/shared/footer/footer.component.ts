import { Component, OnDestroy } from '@angular/core';

type NewsletterState = 'idle' | 'success' | 'error';

@Component({
  standalone: false,
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnDestroy {
  currentYear = new Date().getFullYear();
  newsletterMessage = '';
  newsletterState: NewsletterState = 'idle';

  readonly socialLinks = [
    { iconSrc: 'assets/images/logos/instagram.png', alt: 'Instagram', href: '#' },
    { iconSrc: 'assets/images/logos/tiktok.svg', alt: 'TikTok', href: '#' },
    { iconSrc: 'assets/images/logos/facebook.png', alt: 'Facebook', href: '#' },
    { iconSrc: 'assets/images/logos/youtube.png', alt: 'YouTube', href: '#' },
  ];

  readonly trustPills = [
    { icon: 'verified_user', title: 'Productos aprobados por veterinarios' },
    { icon: 'local_shipping', title: 'Envío gratis arriba de Q49' },
    { icon: 'sync', title: 'Devoluciones de 30 días' },
    { icon: 'workspace_premium', title: 'Calidad garantizada' },
  ];

  readonly footerGroups = [
    {
      title: 'Tienda',
      links: [
        { label: 'Todos los productos', href: '/catalog' },
        { label: 'Perros', href: '/catalog/perros' },
        { label: 'Gatos', href: '/catalog/gatos' },
        { label: 'Aves', href: '/catalog/aves' },
        { label: 'Reptiles', href: '/catalog/reptiles' },
      ],
    },
    {
      title: 'Cuenta',
      links: [
        { label: 'Mi cuenta', href: '/account/profile' },
        { label: 'Mis mascotas', href: '/account/pets' },
        { label: 'Mis pedidos', href: '/account/orders' },
        { label: 'Membresía', href: '/account/membership' },
      ],
    },
    {
      title: 'Soporte',
      links: [
        { label: 'Centro de ayuda', href: '/terms' },
        { label: 'Contáctanos', href: '/about' },
        { label: 'Envíos', href: '/terms' },
        { label: 'Cambios y devoluciones', href: '/terms' },
      ],
    },
    {
      title: 'Empresa',
      links: [
        { label: 'Acerca de Aumakki', href: '/about' },
        { label: 'Blog', href: '/about' },
        { label: 'Misión', href: '/about' },
        { label: 'Afiliados', href: '/about' },
      ],
    },
  ];

  private newsletterTimer: ReturnType<typeof setTimeout> | null = null;

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
      this.setNewsletterMessage('Ingresa un correo válido para suscribirte.', 'error');
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
}
