import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Brand {
  name: string;
  slug: string;
}

@Component({
  standalone: false,
  selector: 'app-brands',
  templateUrl: './brands.component.html',
  styleUrls: ['./brands.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandsComponent {
  readonly brands: Brand[] = [
    { name: 'Royal Canin',  slug: 'royal-canin' },
    { name: "Hill's",       slug: 'hills' },
    { name: 'Pedigree',     slug: 'pedigree' },
    { name: 'Purina',       slug: 'purina' },
    { name: 'Whiskas',      slug: 'whiskas' },
    { name: 'Eukanuba',     slug: 'eukanuba' },
    { name: 'Fancy Feast',  slug: 'fancy-feast' },
    { name: 'Iams',         slug: 'iams' },
  ];
}
