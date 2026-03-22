import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  standalone: false,
  selector: 'app-terms',
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsComponent implements OnInit {
  readonly updatedAt = 'Marzo 2026';

  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Terminos y ayuda | Aumakki',
      description: 'Consulta terminos, condiciones, soporte y lineamientos generales para comprar con confianza en Aumakki.',
      url: '/terms',
      keywords: ['terminos Aumakki', 'politicas ecommerce mascotas', 'ayuda Aumakki'],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Terminos y ayuda',
        url: this.seo.absoluteUrl('/terms'),
      },
    });
  }
}
