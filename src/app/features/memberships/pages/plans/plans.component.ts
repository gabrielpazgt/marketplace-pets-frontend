import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SeoService } from '../../../../core/services/seo.service';
import { Plan, PlanId, MembershipsService } from '../../services/memberships.service';

export interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  standalone: false,
  selector: 'mp-memberships-plans',
  templateUrl: './plans.component.html',
  styleUrls: ['./plans.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0px', opacity: 0, overflow: 'hidden' })),
      state('expanded', style({ height: '*', opacity: 1, overflow: 'hidden' })),
      transition('collapsed <=> expanded', animate('220ms ease')),
    ]),
  ],
})
export class PlansComponent implements OnInit, OnDestroy {
  plans: Plan[] = [];
  currentPlan: PlanId = 'free';
  readonly billingCycle: 'monthly' = 'monthly';

  // ROI Calculator
  roiSpend = 2000;
  get roiSavingsPerYear(): number { return Math.round(this.roiSpend * 0.05 * 12); }
  get roiMembershipCostPerYear(): number { return 75 * 12; }
  get roiNet(): number { return this.roiSavingsPerYear - this.roiMembershipCostPerYear; }

  // FAQ
  activeFaqIndex: number | null = null;
  readonly faqs: FaqItem[] = [
    {
      question: '¿Qué es la membresía Premium de Aumakki?',
      answer: 'La membresía Premium te da acceso a descuentos automáticos del 5% en todos los productos, atención prioritaria por WhatsApp, acceso anticipado a lanzamientos y promociones exclusivas, y mucho más.',
    },
    {
      question: '¿Cuánto cuesta la membresía Premium?',
      answer: 'La membresía Premium de Aumakki cuesta Q75 al mes. Los miembros ahorran en promedio Q300 al año en sus compras de productos para mascotas.',
    },
    {
      question: '¿Puedo cancelar cuando quiero?',
      answer: 'Sí. Puedes cancelar tu membresía Premium en cualquier momento desde tu perfil de cuenta. No hay contratos ni penalizaciones por cancelación.',
    },
    {
      question: '¿Necesito membresía para comprar en Aumakki?',
      answer: 'No. Puedes comprar como invitado o con tu cuenta registrada en el plan Gratuito. La membresía Premium agrega beneficios adicionales pero no es requerida.',
    },
    {
      question: '¿Cómo funciona el 5% de descuento?',
      answer: 'El descuento se aplica automáticamente al hacer checkout en todos los productos. No necesitas ingresar ningún código — simplemente inicia sesión con tu cuenta Premium y el precio ya refleja el descuento.',
    },
    {
      question: '¿Hay período de prueba?',
      answer: 'Hoy puedes iniciar con el plan Gratuito sin ningún costo ni compromiso. Cuando estés listo, puedes actualizar a Premium en cualquier momento desde tu perfil.',
    },
  ];

  readonly benefits = [
    {
      icon: 'bolt',
      title: '5% de descuento en todo',
      description: 'Aplicado automáticamente al hacer checkout — sin códigos, en todos los productos.',
      badge: 'El más amado',
      highlight: true,
    },
    {
      icon: 'support_agent',
      title: 'Atención prioritaria',
      description: 'Respuesta rápida de nuestro equipo por WhatsApp. Sin esperas, solo soluciones.',
      highlight: false,
    },
    {
      icon: 'notifications_active',
      title: 'Acceso anticipado',
      description: 'Compra antes que todos en lanzamientos exclusivos y temporadas de oferta.',
      highlight: false,
    },
    {
      icon: 'cake',
      title: 'Cumpleaños de tu mascota',
      description: 'Cada año, una sorpresa especial para tu compañero peludo en su día especial.',
      highlight: false,
    },
    {
      icon: 'assignment_return',
      title: 'Devoluciones extendidas',
      description: '60 días para devolver tu pedido, el doble que el plan gratuito.',
      highlight: false,
    },
    {
      icon: 'flash_on',
      title: 'Checkout ágil',
      description: 'Tus datos guardados y el proceso simplificado para comprar más rápido.',
      highlight: false,
    },
  ];

  private readonly subscriptions = new Subscription();

  constructor(
    private svc: MembershipsService,
    private cdr: ChangeDetectorRef,
    private seo: SeoService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Membresía Premium para mascotas | Aumakki',
      description: 'Ahorra más en cada pedido con la membresía Premium de Aumakki. 5% de descuento automático, atención prioritaria y beneficios exclusivos para tus mascotas.',
      url: '/memberships/plans',
      keywords: ['membresía Aumakki', 'descuentos mascotas Guatemala', 'beneficios tienda de mascotas'],
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Membresía Aumakki',
        url: this.seo.absoluteUrl('/memberships/plans'),
      },
    });

    this.svc.refreshPlans();
    this.svc.refreshCurrentPlan();

    this.subscriptions.add(
      this.svc.plans$.subscribe((plans) => {
        this.plans = [...plans];
        this.cdr.markForCheck();
      })
    );

    this.subscriptions.add(
      this.svc.currentPlan$.subscribe((plan) => {
        this.currentPlan = plan;
        this.cdr.markForCheck();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  isCurrentPlan(planId: PlanId): boolean {
    return this.currentPlan === planId;
  }

  getPlanPrice(plan: Plan): number {
    return this.svc.priceFor(plan.id, this.billingCycle);
  }

  selectPlan(planId: PlanId): void {
    if (planId === 'premium') {
      this.router.navigate(['/memberships/checkout']);
      return;
    }
    // Free plan: no action needed (already free by default)
  }

  toggleFaq(index: number): void {
    this.activeFaqIndex = this.activeFaqIndex === index ? null : index;
    this.cdr.markForCheck();
  }

  scrollToPlans(): void {
    document.getElementById('planes')?.scrollIntoView({ behavior: 'smooth' });
  }
}
