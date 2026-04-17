import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { AuthService, AuthUser } from '../../../../auth/services/auth.service';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  standalone: false,
  selector: 'mp-memberships-success',
  templateUrl: './success.component.html',
  styleUrls: ['./success.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuccessComponent implements OnInit {
  user: AuthUser | null = null;

  readonly benefits = [
    { icon: 'percent',              label: '5% de descuento automático' },
    { icon: 'support_agent',        label: 'Atención prioritaria WhatsApp' },
    { icon: 'notifications_active', label: 'Acceso anticipado a lanzamientos' },
    { icon: 'cake',                 label: 'Regalo de cumpleaños para tu mascota' },
    { icon: 'assignment_return',    label: 'Devoluciones extendidas 60 días' },
    { icon: 'flash_on',             label: 'Checkout ágil con datos guardados' },
  ];

  constructor(
    private auth: AuthService,
    private seo: SeoService,
  ) {}

  ngOnInit(): void {
    this.seo.setPage({
      title: '¡Ya sos miembro Premium! | Aumakki',
      description: 'Confirmación de membresía Premium activada en Aumakki.',
      url: '/memberships/success',
      noindex: true,
    });

    this.user = this.auth.user;
  }
}
