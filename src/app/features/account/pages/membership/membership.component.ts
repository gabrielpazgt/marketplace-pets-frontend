import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MembershipsService, Plan, PlanId } from '../../../memberships/services/memberships.service';

@Component({
  standalone: false,
  selector: 'mp-account-membership',
  templateUrl: './membership.component.html',
  styleUrls: ['./membership.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipComponent implements OnInit, OnDestroy {
  plans: Plan[] = [];
  currentPlan: PlanId = 'free';
  saving = false;
  message = '';

  private readonly subscriptions = new Subscription();

  constructor(
    private memberships: MembershipsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.memberships.refreshPlans();
    this.memberships.refreshCurrentPlan();

    this.subscriptions.add(
      this.memberships.plans$.subscribe((plans) => {
        this.plans = plans;
        this.cdr.markForCheck();
      })
    );

    this.subscriptions.add(
      this.memberships.currentPlan$.subscribe((plan) => {
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

  selectPlan(planId: PlanId): void {
    if (this.saving || this.currentPlan === planId) return;

    this.saving = true;
    this.message = '';
    this.cdr.markForCheck();

    this.memberships.selectPlan(planId).subscribe({
      next: (tier) => {
        this.currentPlan = tier;
        this.saving = false;
        this.message = tier === 'premium'
          ? 'Tu membresia Premium esta activa.'
          : 'Tu cuenta ahora usa el plan Gratuito.';
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving = false;
        this.message = 'No fue posible actualizar tu membresia.';
        this.cdr.markForCheck();
      },
    });
  }
}
