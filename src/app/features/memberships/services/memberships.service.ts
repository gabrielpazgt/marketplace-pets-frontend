// src/app/features/memberships/services/memberships.service.ts
import { Injectable } from '@angular/core';

export type PlanId = 'free' | 'premium' | 'vip';
export type BillingCycle = 'monthly' | 'yearly'; // yearly = 2 meses gratis (ejemplo)

export interface Plan {
  id: PlanId;
  name: string;
  monthlyPrice: number;  // Q
  badgeColor: string;
  perks: string[];
  highlight?: string;
}

export interface PurchasePayload {
  plan: PlanId;
  cycle: BillingCycle;
  email: string;
  fullName: string;
  cardLast4?: string;
  coupon?: string | null;
  totalQ: number;
}

@Injectable({ providedIn: 'root' })
export class MembershipsService {
  // Estado mock (podrías persistir/leer de API o localStorage)
  private _currentPlan: PlanId = (localStorage.getItem('mp_current_plan') as PlanId) || 'free';

  plans: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      monthlyPrice: 0,
      badgeColor: '#e5e7eb',
      perks: ['Acceso a la tienda', 'Promos generales', 'Soporte estándar'],
      highlight: 'Ideal para empezar'
    },
    {
      id: 'premium',
      name: 'Premium',
      monthlyPrice: 39,
      badgeColor: '#ffd9a6',
      perks: ['5% de descuento', 'Puntos x1.5', 'Envíos preferentes'],
      highlight: 'Más valor por tus compras'
    },
    {
      id: 'vip',
      name: 'VIP',
      monthlyPrice: 99,
      badgeColor: '#bde2ff',
      perks: ['7% de descuento', 'Puntos x2', 'Acceso anticipado'],
      highlight: 'Experiencia completa'
    }
  ];

  get currentPlan(): PlanId {
    return this._currentPlan;
  }

  set currentPlan(plan: PlanId) {
    this._currentPlan = plan;
    localStorage.setItem('mp_current_plan', plan);
  }

  getPlan(id: PlanId): Plan {
    const p = this.plans.find(v => v.id === id);
    if (!p) throw new Error('Plan no encontrado');
    return p;
  }

  /** Precio según ciclo. Yearly = paga 10 meses (2 gratis). */
  priceFor(planId: PlanId, cycle: BillingCycle): number {
    const plan = this.getPlan(planId);
    if (cycle === 'monthly') return plan.monthlyPrice;
    // Yearly: 10 * monthly (2 meses gratis)
    return plan.monthlyPrice * 10;
  }

  /** Cupón mock: AUMAKKI15 = 15% off */
  applyCoupon(totalQ: number, coupon?: string | null): number {
    if (!coupon) return totalQ;
    const code = coupon.trim().toUpperCase();
    if (code === 'AUMAKKI15') {
      return Math.max(0, Math.round(totalQ * 0.85));
    }
    return totalQ;
  }

  /** Simula cobro y retorna id de orden + próxima fecha de cobro */
  async processPurchase(payload: PurchasePayload): Promise<{ orderId: string; nextBilling: string | null }> {
    // Aquí conectarías con tu pasarela. Simulación:
    await new Promise(r => setTimeout(r, 600));

    // Si plan de paga, próxima fecha = +1 mes (o +1 año según ciclo)
    let next = null as string | null;
    if (payload.plan !== 'free') {
      const now = new Date();
      if (payload.cycle === 'monthly') now.setMonth(now.getMonth() + 1);
      else now.setFullYear(now.getFullYear() + 1);
      next = now.toISOString();
      this.currentPlan = payload.plan; // actualizar plan vigente
    } else {
      this.currentPlan = 'free';
    }

    return {
      orderId: 'ORD-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
      nextBilling: next
    };
  }
}
