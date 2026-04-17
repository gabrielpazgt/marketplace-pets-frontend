import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { OpsOrder, StorefrontOrderStatusLog } from '../../../../core/models/storefront.models';

const STATUS_ICONS: Record<string, string> = {
  pending: '🕐', paid: '💳', processing: '⚙️',
  shipped: '📦', delivered: '✅', cancelled: '✖️', refunded: '↩️',
};

@Component({
  standalone: false,
  selector: 'mp-ops-order-detail',
  templateUrl: './ops-order-detail.component.html',
  styleUrls: ['./ops-order-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpsOrderDetailComponent implements OnInit {
  private api = inject(StorefrontApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  order: OpsOrder | null = null;
  loading = true;
  error = '';
  updatingStatus = false;
  statusSuccess = '';
  statusError = '';

  selectedStatus = '';
  note = '';

  readonly STATUS_OPTIONS = [
    { value: 'pending',    label: 'Pendiente' },
    { value: 'processing', label: 'Procesando' },
    { value: 'confirmed',  label: 'Confirmado / Pagado' },
    { value: 'shipped',    label: 'Enviado' },
    { value: 'delivered',  label: 'Entregado' },
    { value: 'cancelled',  label: 'Cancelado' },
  ];

  readonly STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente', paid: 'Pago confirmado', processing: 'Procesando',
    confirmed: 'Confirmado', shipped: 'Enviado', delivered: 'Entregado',
    cancelled: 'Cancelado', refunded: 'Reembolsado',
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/gx-ops/orders']); return; }

    this.api.getOpsOrder(id).subscribe({
      next: (res) => {
        this.order = res.data;
        this.selectedStatus = res.data.statusOrder;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudo cargar el pedido.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  updateStatus(): void {
    if (!this.order || this.updatingStatus || !this.selectedStatus) return;
    this.updatingStatus = true;
    this.statusSuccess = '';
    this.statusError = '';
    this.cdr.markForCheck();

    this.api.updateOpsOrderStatus(this.order.id, this.selectedStatus, this.note || undefined).subscribe({
      next: (res) => {
        if (this.order) {
          // Add optimistic log entry to timeline
          const newLog: StorefrontOrderStatusLog = {
            id: Date.now(),
            status: res.data.statusOrder,
            note: this.note || null,
            changedBy: null,
            createdAt: new Date().toISOString(),
          };
          this.order = {
            ...this.order,
            statusOrder: res.data.statusOrder,
            statusLogs: [...(this.order.statusLogs || []), newLog],
          };
        }
        this.updatingStatus = false;
        this.statusSuccess = 'Estado actualizado correctamente.';
        this.note = '';
        this.cdr.markForCheck();
      },
      error: () => {
        this.updatingStatus = false;
        this.statusError = 'No se pudo actualizar el estado.';
        this.cdr.markForCheck();
      },
    });
  }

  get timelineSteps(): StorefrontOrderStatusLog[] {
    return (this.order?.statusLogs || []);
  }

  statusIcon(s: string): string { return STATUS_ICONS[s] || '●'; }
  statusLabel(s: string): string { return this.STATUS_LABELS[s] ?? s; }
  statusClass(s: string): string { return `status--${s}`; }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  }
}
