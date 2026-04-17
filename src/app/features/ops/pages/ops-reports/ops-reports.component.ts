import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { OpsSalesReport, OpsTopProduct, OpsTopCustomer } from '../../../../core/models/storefront.models';

type ReportTab = 'sales' | 'products' | 'customers';

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Tarjeta', bank: 'Transferencia', cod: 'Contra entrega', other: 'Otro',
};

@Component({
  standalone: false,
  selector: 'mp-ops-reports',
  templateUrl: './ops-reports.component.html',
  styleUrls: ['./ops-reports.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpsReportsComponent implements OnInit {
  private api = inject(StorefrontApiService);
  private cdr = inject(ChangeDetectorRef);

  activeTab: ReportTab = 'sales';
  loading = false;
  error = '';

  // Date range — defaults: last 30 days
  private today = new Date();
  from = this.formatDate(new Date(this.today.getFullYear(), this.today.getMonth(), 1));
  to = this.formatDate(this.today);

  salesReport: OpsSalesReport | null = null;
  topProducts: OpsTopProduct[] = [];
  topCustomers: OpsTopCustomer[] = [];

  ngOnInit(): void {
    this.load();
  }

  setTab(tab: ReportTab): void {
    this.activeTab = tab;
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.cdr.markForCheck();

    if (this.activeTab === 'sales') {
      this.api.getOpsSalesReport(this.from, this.toEndOfDay(this.to)).subscribe({
        next: (res) => { this.salesReport = res.data; this.loading = false; this.cdr.markForCheck(); },
        error: () => { this.error = 'No se pudo cargar el reporte.'; this.loading = false; this.cdr.markForCheck(); },
      });
    } else if (this.activeTab === 'products') {
      this.api.getOpsTopProducts(this.from, this.toEndOfDay(this.to)).subscribe({
        next: (res) => { this.topProducts = res.data || []; this.loading = false; this.cdr.markForCheck(); },
        error: () => { this.error = 'No se pudo cargar el reporte.'; this.loading = false; this.cdr.markForCheck(); },
      });
    } else {
      this.api.getOpsTopCustomers(this.from, this.toEndOfDay(this.to)).subscribe({
        next: (res) => { this.topCustomers = res.data || []; this.loading = false; this.cdr.markForCheck(); },
        error: () => { this.error = 'No se pudo cargar el reporte.'; this.loading = false; this.cdr.markForCheck(); },
      });
    }
  }

  paymentLabel(kind: string): string {
    return PAYMENT_LABELS[kind] ?? kind;
  }

  exportSalesCSV(): void {
    if (!this.salesReport) return;
    const rows = [
      ['Fecha', 'Pedidos', 'Ingresos Brutos', 'Envíos', 'Descuentos', 'Ingresos Netos', 'AOV'],
      ...this.salesReport.periods.map(p => [
        p.period, p.ordersCount, p.grossRevenue, p.shippingRevenue, p.totalDiscounts, p.netRevenue, p.avgOrderValue,
      ]),
      ['TOTAL', this.salesReport.totals.ordersCount, this.salesReport.totals.grossRevenue,
        this.salesReport.totals.shippingRevenue, this.salesReport.totals.totalDiscounts,
        this.salesReport.totals.netRevenue, this.salesReport.totals.avgOrderValue],
    ];
    this.downloadCSV(rows, `reporte-ventas-${this.from}-${this.to}.csv`);
  }

  exportProductsCSV(): void {
    const rows = [
      ['#', 'Producto', 'SKU', 'Unidades vendidas', 'Revenue (Q)', '# Órdenes'],
      ...this.topProducts.map((p, i) => [i + 1, p.name, p.sku || '', p.totalQty, p.totalRevenue, p.ordersCount]),
    ];
    this.downloadCSV(rows, `top-productos-${this.from}-${this.to}.csv`);
  }

  exportCustomersCSV(): void {
    const rows = [
      ['#', 'Cliente', 'Email', '# Órdenes', 'Gasto total (Q)', 'Última compra'],
      ...this.topCustomers.map((c, i) => [
        i + 1, c.customerName || '', c.email, c.ordersCount, c.totalSpent,
        new Date(c.lastOrderAt).toLocaleDateString('es-GT'),
      ]),
    ];
    this.downloadCSV(rows, `top-clientes-${this.from}-${this.to}.csv`);
  }

  private downloadCSV(rows: any[][], filename: string): void {
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private toEndOfDay(date: string): string {
    return `${date}T23:59:59`;
  }
}
