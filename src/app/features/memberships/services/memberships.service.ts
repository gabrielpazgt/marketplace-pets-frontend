import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { AuthService } from '../../../auth/services/auth.service';
import { StorefrontMembershipPlan } from '../../../core/models/storefront.models';
import { StorefrontApiService } from '../../../core/services/storefront-api.service';

export type PlanId = 'free' | 'premium';
export type BillingCycle = 'monthly';

export interface Plan {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  productDiscountPct: number;
  badgeColor: string;
  perks: string[];
  highlight?: string;
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Gratuita',
    monthlyPrice: 0,
    productDiscountPct: 0,
    badgeColor: '#e5e7eb',
    perks: [
      'Acceso completo a la tienda',
      'Checkout agil para compras rapidas',
      'Soporte estandar por canales digitales',
    ],
    highlight: 'Membresia gratuita para toda la comunidad',
  },
  {
    id: 'premium',
    name: 'Premium',
    monthlyPrice: 75,
    productDiscountPct: 5,
    badgeColor: '#fde68a',
    perks: [
      '5% de descuento en productos seleccionados',
      'Atencion prioritaria por WhatsApp',
      'Acceso temprano a lanzamientos y promos',
    ],
    highlight: 'Mas ahorro y beneficios exclusivos para tus compras',
  },
];

@Injectable({ providedIn: 'root' })
export class MembershipsService {
  private readonly plansSubject = new BehaviorSubject<Plan[]>(DEFAULT_PLANS);
  private readonly currentPlanSubject = new BehaviorSubject<PlanId>('free');

  readonly plans$ = this.plansSubject.asObservable();
  readonly currentPlan$ = this.currentPlanSubject.asObservable();

  constructor(
    private storefrontApi: StorefrontApiService,
    private auth: AuthService
  ) {
    this.refreshPlans();

    this.auth.user$
      .pipe(
        map((user) => user?.id ?? null),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.refreshCurrentPlan();
      });

    this.refreshCurrentPlan();
  }

  get plans(): Plan[] {
    return this.plansSubject.value;
  }

  get currentPlan(): PlanId {
    return this.currentPlanSubject.value;
  }

  set currentPlan(plan: PlanId) {
    this.currentPlanSubject.next(plan === 'premium' ? 'premium' : 'free');
  }

  refreshPlans(): void {
    this.storefrontApi.listMembershipPlans().subscribe({
      next: (response) => {
        const nextPlans = this.mergeWithDefaults((response.data || []).map((plan) => this.mapPlan(plan)));
        this.plansSubject.next(nextPlans);
      },
      error: () => {
        this.plansSubject.next(DEFAULT_PLANS);
      },
    });
  }

  refreshCurrentPlan(): void {
    if (!this.auth.isLoggedIn) {
      this.currentPlanSubject.next('free');
      return;
    }

    this.storefrontApi.getMyMembership().subscribe({
      next: (response) => {
        const tier = response.data?.tier === 'premium' ? 'premium' : 'free';
        this.currentPlanSubject.next(tier);

        const available = (response.data?.availablePlans || []).map((plan) => this.mapPlan(plan));
        if (available.length) {
          this.plansSubject.next(this.mergeWithDefaults(available));
        }
      },
      error: () => {
        this.currentPlanSubject.next('free');
      },
    });
  }

  selectPlan(planId: PlanId): Observable<PlanId> {
    const normalized = planId === 'premium' ? 'premium' : 'free';

    if (!this.auth.isLoggedIn) {
      this.currentPlanSubject.next(normalized);
      return of(normalized);
    }

    return this.storefrontApi.updateMyMembership({ tier: normalized }).pipe(
      map((response) => {
        const tier: PlanId = response.data?.tier === 'premium' ? 'premium' : 'free';
        this.currentPlanSubject.next(tier);
        return tier;
      })
    );
  }

  getPlan(id: PlanId): Plan {
    const plan = this.plans.find((entry) => entry.id === id);
    if (!plan) throw new Error('Plan no encontrado');
    return plan;
  }

  priceFor(planId: PlanId, _cycle: BillingCycle): number {
    return this.getPlan(planId).monthlyPrice;
  }

  priceWithMembership(basePrice: number, planId: PlanId = 'premium'): number {
    const discount = this.getPlan(planId).productDiscountPct;
    const safePrice = Number(basePrice || 0);
    if (discount <= 0) return safePrice;

    return Math.max(0, safePrice * (1 - discount / 100));
  }

  private mapPlan(plan: StorefrontMembershipPlan): Plan {
    const resolvedId = this.resolvePlanId(plan);
    const parsedDiscount = this.extractDiscountFromFeatures(plan.features || []);

    return {
      id: resolvedId,
      name: plan.name || (resolvedId === 'premium' ? 'Premium' : 'Gratuita'),
      monthlyPrice: Number(plan.price || 0),
      productDiscountPct: parsedDiscount,
      badgeColor: resolvedId === 'premium' ? '#fde68a' : '#e5e7eb',
      perks: Array.isArray(plan.features) && plan.features.length
        ? plan.features
        : this.defaultPlanById(resolvedId).perks,
      highlight: plan.description || this.defaultPlanById(resolvedId).highlight,
    };
  }

  private mergeWithDefaults(plans: Plan[]): Plan[] {
    const byId = new Map<PlanId, Plan>();

    DEFAULT_PLANS.forEach((plan) => byId.set(plan.id, plan));
    plans.forEach((plan) => byId.set(plan.id, { ...this.defaultPlanById(plan.id), ...plan }));

    return [byId.get('free') as Plan, byId.get('premium') as Plan];
  }

  private resolvePlanId(plan: StorefrontMembershipPlan): PlanId {
    const slug = (plan.slug || '').toLowerCase();
    const name = (plan.name || '').toLowerCase();
    if (slug.includes('premium') || name.includes('premium')) return 'premium';
    return 'free';
  }

  private extractDiscountFromFeatures(features: string[]): number {
    for (const feature of features || []) {
      const text = String(feature || '');
      const match = text.match(/(\d{1,2})\s*%/);
      if (match) {
        const value = Number(match[1]);
        if (Number.isFinite(value) && value > 0) return value;
      }
    }

    return 0;
  }

  private defaultPlanById(id: PlanId): Plan {
    return DEFAULT_PLANS.find((plan) => plan.id === id) as Plan;
  }

}
