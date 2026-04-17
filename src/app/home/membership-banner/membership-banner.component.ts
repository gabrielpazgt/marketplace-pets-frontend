import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-membership-banner',
  templateUrl: './membership-banner.component.html',
  styleUrls: ['./membership-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipBannerComponent {
  readonly perks = [
    '5% de descuento automático en cada compra',
    'Atención prioritaria por WhatsApp',
    'Acceso anticipado a lanzamientos y promociones',
    'Regalo de cumpleaños para tu mascota',
  ];

  readonly stats = [
    { icon: 'percent', value: '5%', label: 'Descuento en cada pedido', sub: 'Automático en checkout' },
    { icon: 'support_agent', value: 'Q75', label: 'Al mes, sin contratos', sub: 'Cancela cuando quieras' },
    { icon: 'local_shipping', value: 'Gratis', label: 'Envío prioritario', sub: 'Para miembros Premium' },
    { icon: 'cake', value: 'Regalo', label: 'Cumpleaños de tu mascota', sub: 'Cada año, sin costo' },
  ];
}
