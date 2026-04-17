import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Badge {
  icon: string;
  color: string;
  title: string;
  sub: string;
}

@Component({
  standalone: false,
  selector: 'app-features',
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesComponent {
  readonly features: Badge[] = [
    { icon: 'verified_user',    color: 'emerald', title: 'Calidad garantizada',  sub: 'Productos seleccionados con cuidado' },
    { icon: 'local_shipping',   color: 'blue',    title: 'Envío a todo GT',       sub: 'Rápido y con seguimiento' },
    { icon: 'autorenew',        color: 'purple',  title: '30 días garantía',      sub: 'Devolución sin complicaciones' },
    { icon: 'favorite',         color: 'rose',    title: 'Bienestar animal',       sub: 'Cada compra apoya una causa' },
  ];
}
