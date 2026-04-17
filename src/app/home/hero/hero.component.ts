import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-hero',
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroComponent {
  @Input() image = {
    alt: 'Mascota con productos premium de Aumakki',
    src: 'assets/home/hero.webp',
    webp: 'assets/home/hero.webp',
  };
}
