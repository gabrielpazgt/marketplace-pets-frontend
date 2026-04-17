import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { SeoService } from '../../../../core/services/seo.service';

export interface Value {
  icon: string;
  title: string;
  description: string;
  color: string;
}

export interface Milestone {
  period: string;
  title: string;
  description: string;
}

export interface Cause {
  icon: string;
  title: string;
  description: string;
}

@Component({
  standalone: false,
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutComponent implements OnInit {
  readonly impactPercent = 5;

  readonly values: Value[] = [
    {
      icon: 'pets',
      color: 'emerald',
      title: 'Bienestar animal primero',
      description: 'Cada producto y cada decisión pasa por una sola pregunta: ¿es bueno para la mascota? Sin excepciones.',
    },
    {
      icon: 'storefront',
      color: 'blue',
      title: 'Compra simple y honesta',
      description: 'Precios claros, checkout rápido y una experiencia consistente. Sin letra pequeña, sin sorpresas.',
    },
    {
      icon: 'groups',
      color: 'rose',
      title: 'Comunidad con impacto',
      description: 'Parte de nuestras ganancias se destina a fundaciones que rescatan y cuidan animales en situación vulnerable.',
    },
    {
      icon: 'verified',
      color: 'orange',
      title: 'Transparencia total',
      description: 'Compartimos nuestros compromisos, decisiones y aportes. Sabemos que la confianza se construye con hechos.',
    },
  ];

  readonly milestones: Milestone[] = [
    {
      period: 'MVP 2026',
      title: 'Base del ecommerce',
      description: 'Lanzamiento de catálogo, carrito y checkout con compra por invitado o con cuenta registrada.',
    },
    {
      period: 'Siguiente etapa',
      title: 'Personalización inteligente',
      description: 'Recomendaciones relevantes según el perfil de tus mascotas e historial de compra.',
    },
    {
      period: 'Expansión social',
      title: 'Programa de alianzas',
      description: 'Reportes periódicos de aportes y colaboraciones activas con fundaciones de rescate en Guatemala.',
    },
  ];

  readonly causes: Cause[] = [
    {
      icon: 'healing',
      title: 'Tratamientos veterinarios',
      description: 'Apoyamos el acceso a tratamientos para animales enfermos que no tienen dueño o recursos.',
    },
    {
      icon: 'restaurant',
      title: 'Alimento y refugio',
      description: 'Financiamos alimento y atención básica para animales en situación de calle en Guatemala.',
    },
    {
      icon: 'volunteer_activism',
      title: 'Esterilización y rescate',
      description: 'Contribuimos a campañas de esterilización y programas de adopción responsable.',
    },
  ];

  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Acerca de Aumakki | Ecommerce de mascotas con impacto',
      description: 'Conoce la historia, valores y compromiso de Aumakki con una experiencia de compra clara y un aporte social orientado al bienestar animal en Guatemala.',
      url: '/about',
      keywords: ['sobre Aumakki', 'tienda de mascotas Guatemala', 'bienestar animal', 'ecommerce mascotas'],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: 'Acerca de Aumakki',
        url: this.seo.absoluteUrl('/about'),
        description: 'Historia, valores y compromiso de Aumakki con el bienestar animal.',
      },
    });
  }
}
