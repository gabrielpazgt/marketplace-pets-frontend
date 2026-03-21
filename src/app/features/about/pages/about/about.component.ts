import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent {
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
}
