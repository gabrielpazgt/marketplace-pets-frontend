import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  MembershipsService,
  Plan,
  PlanId,
  BillingCycle,
} from '../../services/memberships.service';

@Component({
  selector: 'mp-memberships-success',
  templateUrl: './success.component.html',
  styleUrls: ['./success.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuccessComponent {
  private router = inject(Router);
  private ms = inject(MembershipsService);

  // del navigation state: transactionId, plan y cycle
  state = this.router.getCurrentNavigation()?.extras.state as
    | { transactionId?: string; plan?: PlanId; cycle?: BillingCycle }
    | undefined;

  txId = this.state?.transactionId;
  plan: Plan | null = (() => {
    const pid = this.state?.plan ?? this.ms.currentPlan;
    try { return this.ms.getPlan(pid as PlanId); } catch { return null; }
  })();
  cycle: BillingCycle = this.state?.cycle ?? 'monthly';

  get totalQ(): number {
    if (!this.plan) return 0;
    return this.ms.priceFor(this.plan.id, this.cycle);
  }
}
