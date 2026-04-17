import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Step {
  icon: string;
  color: string;
  num: string;
  title: string;
  description: string;
}

@Component({
  standalone: false,
  selector: 'app-steps',
  templateUrl: './steps.component.html',
  styleUrls: ['./steps.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepsComponent {
  readonly steps: Step[] = [
    {
      icon: 'pets',
      color: 'orange',
      num: 'PASO 01',
      title: 'Elegí lo mejor',
      description: 'Explorá nuestro catálogo curado con productos seleccionados pensando en el bienestar de tu mascota.',
    },
    {
      icon: 'verified_user',
      color: 'emerald',
      num: 'PASO 02',
      title: 'Comprá con confianza',
      description: 'Checkout seguro, múltiples métodos de pago y tu pedido confirmado en segundos.',
    },
    {
      icon: 'local_shipping',
      color: 'blue',
      num: 'PASO 03',
      title: 'Recibí en tu puerta',
      description: 'Envío rápido a toda Guatemala. Los miembros Premium reciben atención prioritaria.',
    },
  ];
}
