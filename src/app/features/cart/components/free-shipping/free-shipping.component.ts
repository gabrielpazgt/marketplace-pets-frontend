import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-free-shipping',
  templateUrl: './free-shipping.component.html',
  styleUrls: ['./free-shipping.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FreeShippingComponent {
  /** Umbral para envío gratis (ej. 500) */
  @Input() target = 500;
  /** Subtotal actual del carrito */
  @Input() subtotal = 0;

  /** 0..1 -> usado por CSS como scaleX */
  get ratio(): number {
    const t = this.target || 1;
    return Math.max(0, Math.min(1, this.subtotal / t));
  }

  /** ¿ya alcanzó envío gratis? */
  get isDone(): boolean {
    return this.subtotal >= this.target;
  }

  /** Q restantes (solo para el texto) */
  get remaining(): number {
    return Math.max(0, Math.ceil(this.target - this.subtotal));
  }
}
