import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  standalone: false,
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent implements OnInit {
  readonly impactPercent = 5;

  readonly values = [
    {
      title: 'Bienestar animal primero',
      description: 'Seleccionamos productos y decisiones pensando en salud, seguridad y calidad de vida para perros, gatos y otras mascotas.'
    },
    {
      title: 'Compra simple y transparente',
      description: 'Queremos un ecommerce claro: precios entendibles, checkout rápido y una experiencia consistente en cualquier pantalla.'
    },
    {
      title: 'Comunidad con impacto',
      description: 'No solo vendemos productos; también buscamos devolver valor a organizaciones que rescatan y cuidan animales.'
    }
  ];

  readonly milestones = [
    {
      period: 'MVP 2026',
      title: 'Base del ecommerce',
      description: 'Lanzamiento de catálogo, carrito y checkout con compra por invitado o con cuenta.'
    },
    {
      period: 'Siguiente etapa',
      title: 'Mejoras de personalización',
      description: 'Recomendaciones más relevantes según las mascotas y el historial de compra.'
    },
    {
      period: 'Expansión social',
      title: 'Programa de alianzas',
      description: 'Reporte periódico de aportes y colaboraciones activas con fundaciones de rescate.'
    }
  ];

  readonly causes = [
    'Tratamientos para animales enfermos',
    'Alimento y atención para animales en calle',
    'Campañas de esterilización y rescate'
  ];
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Sobre Aumakki | Ecommerce de mascotas con impacto',
      description: 'Conoce la historia, valores y compromiso de Aumakki con una experiencia de compra clara y un aporte social orientado al bienestar animal.',
      url: '/about',
      keywords: ['sobre Aumakki', 'tienda de mascotas', 'ecommerce mascotas Guatemala', 'bienestar animal'],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: 'Sobre Aumakki',
        url: this.seo.absoluteUrl('/about'),
        description: 'Conoce la historia, valores y compromiso de Aumakki con el bienestar animal.',
      },
    });
  }
}
