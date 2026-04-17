import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { OpsFinances } from '../../../../core/models/storefront.models';

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Tarjeta', bank: 'Transferencia', cod: 'Contra entrega', other: 'Otro',
};

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

@Component({
  standalone: false,
  selector: 'mp-ops-finances',
  templateUrl: './ops-finances.component.html',
  styleUrls: ['./ops-finances.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpsFinancesComponent implements OnInit {
  private api = inject(StorefrontApiService);
  private cdr = inject(ChangeDetectorRef);

  // Monthly view
  finances: OpsFinances | null = null;
  loading = false;
  error = '';
  year = new Date().getFullYear();
  month = new Date().getMonth() + 1; // 1-12

  // Annual view
  viewMode: 'monthly' | 'annual' = 'monthly';
  annualData: (OpsFinances | null)[] = [];
  annualLoading = false;
  annualYear = new Date().getFullYear();

  readonly MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  readonly MONTHS_SHORT = MONTHS_SHORT;

  ngOnInit(): void {
    this.load();
  }

  setViewMode(mode: 'monthly' | 'annual'): void {
    this.viewMode = mode;
    if (mode === 'annual' && !this.annualData.length) {
      this.loadAnnual();
    }
    this.cdr.markForCheck();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();
    this.api.getOpsFinances(this.year, this.month).subscribe({
      next: (res) => { this.finances = res.data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'No se pudo cargar el resumen financiero.'; this.loading = false; this.cdr.markForCheck(); },
    });
  }

  loadAnnual(): void {
    this.annualLoading = true;
    this.annualData = [];
    this.cdr.markForCheck();

    const requests = Array.from({ length: 12 }, (_, i) =>
      this.api.getOpsFinances(this.annualYear, i + 1).pipe(
        catchError(() => of({ data: null }))
      )
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        this.annualData = results.map(r => r.data);
        this.annualLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.annualLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  prevMonth(): void {
    if (this.month === 1) { this.month = 12; this.year--; }
    else { this.month--; }
    this.load();
  }

  nextMonth(): void {
    const now = new Date();
    if (this.year === now.getFullYear() && this.month === now.getMonth() + 1) return;
    if (this.month === 12) { this.month = 1; this.year++; }
    else { this.month++; }
    this.load();
  }

  prevYear(): void {
    this.annualYear--;
    this.annualData = [];
    this.loadAnnual();
  }

  nextYear(): void {
    if (this.annualYear >= new Date().getFullYear()) return;
    this.annualYear++;
    this.annualData = [];
    this.loadAnnual();
  }

  get isCurrentMonth(): boolean {
    const now = new Date();
    return this.year === now.getFullYear() && this.month === now.getMonth() + 1;
  }

  get isCurrentYear(): boolean {
    return this.annualYear >= new Date().getFullYear();
  }

  get monthLabel(): string {
    return `${this.MONTHS[this.month - 1]} ${this.year}`;
  }

  get annualTotals(): OpsFinances {
    const rows = this.annualData.filter(Boolean) as OpsFinances[];
    return {
      year: this.annualYear,
      month: 0,
      grossRevenue: rows.reduce((s, r) => s + r.grossRevenue, 0),
      netRevenue: rows.reduce((s, r) => s + r.netRevenue, 0),
      totalDiscounts: rows.reduce((s, r) => s + r.totalDiscounts, 0),
      shippingRevenue: rows.reduce((s, r) => s + r.shippingRevenue, 0),
      ordersCount: rows.reduce((s, r) => s + r.ordersCount, 0),
      avgOrderValue: rows.length ? rows.reduce((s, r) => s + r.grossRevenue, 0) / rows.reduce((s, r) => s + r.ordersCount, 0) : 0,
      membershipOrdersCount: rows.reduce((s, r) => s + r.membershipOrdersCount, 0),
      byPaymentKind: [],
      commissions: [],
    };
  }

  paymentLabel(kind: string): string {
    return PAYMENT_LABELS[kind] ?? kind;
  }

  get totalCommissions(): number {
    return (this.finances?.commissions || []).reduce((acc, c) => acc + c.totalCommission, 0);
  }

  isCurrentMonthIndex(i: number): boolean {
    const now = new Date();
    return this.annualYear === now.getFullYear() && i === now.getMonth();
  }

  exportCSV(): void {
    if (!this.finances) return;
    const f = this.finances;
    const summaryRows = [
      ['Resumen Financiero', this.monthLabel],
      [],
      ['Concepto', 'Valor (Q)'],
      ['Ingresos brutos', f.grossRevenue],
      ['Descuentos aplicados', -f.totalDiscounts],
      ['Ingresos por envíos', f.shippingRevenue],
      ['Ingresos netos', f.netRevenue],
      ['Número de órdenes', f.ordersCount],
      ['AOV (Valor promedio de orden)', f.avgOrderValue],
      ['Órdenes con membresía', f.membershipOrdersCount],
      [],
      ['Por método de pago'],
      ['Método', '# Órdenes', 'Revenue (Q)'],
      ...f.byPaymentKind.map(pk => [this.paymentLabel(pk.kind), pk.count, pk.revenue]),
      [],
      ['Comisiones de afiliados'],
      ['Influencer', 'Cupón', '# Órdenes', 'Comisión total (Q)'],
      ...f.commissions.map(c => [c.influencerName, c.couponCode, c.ordersCount, c.totalCommission]),
      ['', 'TOTAL', '', this.totalCommissions],
    ];
    this.downloadCsv(summaryRows, `finanzas-${this.year}-${String(this.month).padStart(2, '0')}.csv`);
  }

  exportAnnualCSV(): void {
    const rows: any[][] = [
      [`Resumen Anual ${this.annualYear}`],
      [],
      ['Mes', 'Ing. Brutos (Q)', 'Descuentos (Q)', 'Envíos (Q)', 'Ing. Netos (Q)', 'Órdenes', 'AOV (Q)'],
    ];

    this.annualData.forEach((f, i) => {
      if (!f) { rows.push([this.MONTHS[i], '-', '-', '-', '-', '-', '-']); return; }
      rows.push([
        this.MONTHS[i],
        f.grossRevenue.toFixed(2),
        f.totalDiscounts.toFixed(2),
        f.shippingRevenue.toFixed(2),
        f.netRevenue.toFixed(2),
        f.ordersCount,
        f.avgOrderValue.toFixed(2),
      ]);
    });

    const t = this.annualTotals;
    rows.push([]);
    rows.push(['TOTAL', t.grossRevenue.toFixed(2), t.totalDiscounts.toFixed(2), t.shippingRevenue.toFixed(2), t.netRevenue.toFixed(2), t.ordersCount, t.avgOrderValue.toFixed(2)]);

    this.downloadCsv(rows, `finanzas-anual-${this.annualYear}.csv`);
  }

  private downloadCsv(rows: any[][], filename: string): void {
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
