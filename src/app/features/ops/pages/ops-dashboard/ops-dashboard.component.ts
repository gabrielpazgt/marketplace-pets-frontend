import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { OpsMetricsEnhanced } from '../../../../core/models/storefront.models';

type DashPeriod = 'today' | 'week' | 'month';

@Component({
  standalone: false,
  selector: 'mp-ops-dashboard',
  templateUrl: './ops-dashboard.component.html',
  styleUrls: ['./ops-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpsDashboardComponent implements OnInit {
  private api = inject(StorefrontApiService);
  private cdr = inject(ChangeDetectorRef);

  metrics: OpsMetricsEnhanced | null = null;
  loading = true;
  error = '';
  period: DashPeriod = 'month';

  readonly PERIOD_LABELS: Record<DashPeriod, string> = {
    today: 'Hoy',
    week: 'Esta semana',
    month: 'Este mes',
  };

  readonly PERIOD_CMP_LABELS: Record<DashPeriod, string> = {
    today: 'vs ayer',
    week: 'vs semana anterior',
    month: 'vs mes anterior',
  };

  readonly STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    processing: 'Procesando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    confirmed: 'Confirmado',
  };

  ngOnInit(): void {
    this.load();
  }

  setPeriod(p: DashPeriod): void {
    if (this.period === p) return;
    this.period = p;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.api.getOpsMetricsEnhanced(this.period).subscribe({
      next: (res) => {
        this.metrics = res.data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudieron cargar las métricas.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  get periodLabel(): string { return this.PERIOD_LABELS[this.period]; }
  get cmpLabel(): string { return this.PERIOD_CMP_LABELS[this.period]; }

  statusLabel(s: string): string { return this.STATUS_LABELS[s] ?? s; }
  statusClass(s: string): string { return `status--${s}`; }

  pctChange(current: number, previous: number): number {
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  pctLabel(current: number, previous: number): string {
    const pct = this.pctChange(current, previous);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  }

  pctClass(current: number, previous: number): string {
    return this.pctChange(current, previous) >= 0 ? 'trend--up' : 'trend--down';
  }
}
