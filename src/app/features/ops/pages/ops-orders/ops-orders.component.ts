import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { OpsOrder } from '../../../../core/models/storefront.models';

const STATUS_TABS = [
  { value: '', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'processing', label: 'Procesando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
];

@Component({
  standalone: false,
  selector: 'mp-ops-orders',
  templateUrl: './ops-orders.component.html',
  styleUrls: ['./ops-orders.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpsOrdersComponent implements OnInit {
  private api = inject(StorefrontApiService);
  private cdr = inject(ChangeDetectorRef);

  readonly tabs = STATUS_TABS;
  readonly STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente', processing: 'Procesando', confirmed: 'Confirmado',
    shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado',
  };

  activeTab = '';
  orders: OpsOrder[] = [];
  loading = false;
  error = '';
  page = 1;
  totalPages = 1;

  ngOnInit(): void {
    this.loadOrders();
  }

  setTab(value: string): void {
    this.activeTab = value;
    this.page = 1;
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    this.error = '';
    this.api.listOpsOrders(this.page, 20, this.activeTab || undefined).subscribe({
      next: (res) => {
        this.orders = res.data || [];
        this.totalPages = res.meta?.pagination?.pageCount ?? 1;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudieron cargar los pedidos.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  nextPage(): void {
    if (this.page < this.totalPages) { this.page++; this.loadOrders(); }
  }

  prevPage(): void {
    if (this.page > 1) { this.page--; this.loadOrders(); }
  }

  statusLabel(s: string): string { return this.STATUS_LABELS[s] ?? s; }
  statusClass(s: string): string { return `status--${s}`; }
}
