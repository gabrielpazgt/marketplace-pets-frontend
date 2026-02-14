import { ChangeDetectionStrategy, Component } from '@angular/core';

type Feat = {
  title: string;
  sub: string;
  icon: string;     // ruta del PNG
  alt: string;
  fa?: string;      // fallback FA (opcional)
  _imgError?: boolean; // flag interno cuando no existe el PNG
};

@Component({
  selector: 'app-features',
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeaturesComponent {
  /** Beneficios con icono PNG (mismo set del hero) */
  features: Feat[] = [
    {
      title: 'Envíos rápidos',
      sub: '48–72h a todo el país.',
      icon: 'assets/icons/hero/delivery.png',
      alt: 'Camión de envíos'
    },
    {
      title: 'Devoluciones fáciles',
      sub: '30 días para cambiar.',
      icon: 'assets/icons/hero/refund.png',
      alt: 'Símbolo de reembolso'
    },
    {
      title: 'Pago seguro',
      sub: 'Tarjetas y transferencias.',
      icon: 'assets/icons/hero/payment.png',
      alt: 'Billetes y pago seguro'
    },
    {
      title: 'Soporte 24/7',
      sub: 'Estamos para ayudarte.',
      icon: 'assets/icons/hero/support.png', // si no existe, cae al ícono FA
      alt: 'Soporte y ayuda',
      fa: 'fa-headset'
    }
  ];
}
