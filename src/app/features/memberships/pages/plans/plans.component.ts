import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MembershipsService, Plan, PlanId } from '../../services/memberships.service';

@Component({
  selector: 'mp-memberships-plans',
  templateUrl: './plans.component.html',
  styleUrls: ['./plans.component.scss']
})
export class PlansComponent implements OnInit {
  plans: Plan[] = [];
  currentPlan!: PlanId;
  preselect?: PlanId;
  annualDiscountPercent = 17;

  /** id de la card expandida (beneficios visibles) */
  expanded: PlanId | null = null;

  constructor(
    private svc: MembershipsService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.plans = this.svc.plans;
    this.currentPlan = this.svc.currentPlan;
    const qp = (this.route.snapshot.queryParamMap.get('plan') as PlanId) || undefined;
    if (qp && this.plans.some(p => p.id === qp)) {
      this.preselect = qp;
      this.expanded = qp; // abre la preselección
    }
  }

  toggle(id: PlanId) {
    this.expanded = this.expanded === id ? null : id;
  }

  isExpanded(id: PlanId) { return this.expanded === id; }

  yearlyEquivalent(planId: PlanId): number {
    const plan = this.plans.find((p) => p.id === planId);
    if (!plan) return 0;
    return plan.monthlyPrice * 10;
  }

  planTheme(id: PlanId): 'free' | 'premium' | 'vip' {
    if (id === 'vip') return 'vip';
    if (id === 'premium') return 'premium';
    return 'free';
  }

  choose(planId: PlanId) {
    if (planId === this.currentPlan) {
      this.router.navigate(['/account/membership']);
      return;
    }
    this.router.navigate(['/memberships/checkout'], { queryParams: { plan: planId }});
  }

  onKeyCard(e: KeyboardEvent, id: PlanId) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.toggle(id);
    }
  }
}
