import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';

type PlanId = 'free' | 'premium' | 'vip';

interface Plan {
  id: PlanId;
  name: string;
  price: string;         // mock: “Q0”, “Q39/mes”…
  badgeColor: string;    // para chip
  perks: string[];
}

@Component({
  selector: 'mp-account-membership',
  templateUrl: './membership.component.html',
  styleUrls: ['./membership.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipComponent {

  constructor(private router: Router) {}

  // --- Mock de estado del usuario ---
  currentPlan: PlanId = 'free';
  points = 120;               // puntos actuales (para la barra de progreso)
  nextBilling: string | null = null; // en free no hay facturación

  // umbrales para meta gamificada (mock)
  tiers = {
    premium: 500, // puntos para llegar a Premium
    vip: 1200,    // puntos para VIP
  };

  plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 'Q0',
      badgeColor: '#e5e7eb',
      perks: [
        'Acceso a la tienda',
        'Promos generales',
        'Soporte estándar'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 'Q39/mes',
      badgeColor: '#ffd9a6',
      perks: [
        '5% de descuento en compras',
        'Puntos de lealtad x1.5',
        'Envíos preferentes',
      ]
    },
    {
      id: 'vip',
      name: 'VIP',
      price: 'Q99/mes',
      badgeColor: '#bde2ff',
      perks: [
        '7% de descuento en compras',
        'Puntos de lealtad x2',
        'Acceso anticipado a lanzamientos',
      ]
    },
  ];

  get userPlan(): Plan { return this.plans.find(p => p.id === this.currentPlan)!; }

  get nextTier(): { id: PlanId; label: string; target: number } {
    if (this.currentPlan === 'free')   return { id: 'premium', label: 'Premium', target: this.tiers.premium };
    if (this.currentPlan === 'premium')return { id: 'vip',     label: 'VIP',     target: this.tiers.vip };
    return { id: 'vip', label: 'VIP', target: this.tiers.vip }; // ya en VIP
  }

  get progressPct(): number {
    if (this.currentPlan === 'vip') return 100;
    const pct = Math.min(100, Math.round((this.points / this.nextTier.target) * 100));
    return pct;
  }

  // CTA (navega a módulo de membresías que harás luego)
  goUpgrade(to?: PlanId) {
    // puedes pasar query params si quieres preseleccionar un plan
    this.router.navigate(['/memberships'], { queryParams: to ? { plan: to } : undefined });
  }
}
