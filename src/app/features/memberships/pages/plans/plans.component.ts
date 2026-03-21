import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Plan, PlanId, MembershipsService } from '../../services/memberships.service';

@Component({
  standalone: false,
  selector: 'mp-memberships-plans',
  templateUrl: './plans.component.html',
  styleUrls: ['./plans.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlansComponent implements OnInit, OnDestroy {
  plans: Plan[] = [];
  currentPlan: PlanId = 'free';
  readonly billingCycle: 'monthly' = 'monthly';
  saving = false;

  private readonly subscriptions = new Subscription();

  constructor(
    private svc: MembershipsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
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
    if (this.saving || this.currentPlan === planId) return;

    this.saving = true;
    this.cdr.markForCheck();

    this.svc.selectPlan(planId).subscribe({
      next: (tier) => {
        this.currentPlan = tier;
        this.saving = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }
}
