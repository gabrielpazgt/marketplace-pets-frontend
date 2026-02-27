import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';

type PlanId = 'free' | 'premium' | 'vip';
type PlanTone = 'neutral' | 'brand' | 'accent';

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  tone: PlanTone;
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

  currentPlan: PlanId = 'free';
  points = 120;

  tiers = {
    premium: 500,
    vip: 1200,
  };

  plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      price: 'Q0',
      tone: 'neutral',
      perks: [
        'Acceso a la tienda',
        'Promos generales',
        'Soporte estandar'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 'Q39/mes',
      tone: 'brand',
      perks: [
        '5% de descuento en compras',
        'Puntos de lealtad x1.5',
        'Envios preferentes',
      ]
    },
    {
      id: 'vip',
      name: 'VIP',
      price: 'Q99/mes',
      tone: 'accent',
      perks: [
        '7% de descuento en compras',
        'Puntos de lealtad x2',
        'Acceso anticipado a lanzamientos',
      ]
    },
  ];

  get userPlan(): Plan {
    return this.plans.find((p) => p.id === this.currentPlan)!;
  }

  get nextTier(): { id: PlanId; label: string; target: number } {
    if (this.currentPlan === 'free') return { id: 'premium', label: 'Premium', target: this.tiers.premium };
    if (this.currentPlan === 'premium') return { id: 'vip', label: 'VIP', target: this.tiers.vip };
    return { id: 'vip', label: 'VIP', target: this.tiers.vip };
  }

  get progressPct(): number {
    if (this.currentPlan === 'vip') return 100;
    const pct = Math.min(100, Math.round((this.points / this.nextTier.target) * 100));
    return pct;
  }

  get planToneClass(): string {
    return `tone-${this.userPlan.tone}`;
  }

  goUpgrade(to?: PlanId) {
    this.router.navigate(['/memberships'], { queryParams: to ? { plan: to } : undefined });
  }
}
