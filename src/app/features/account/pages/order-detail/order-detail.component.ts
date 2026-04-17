import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { from, of } from 'rxjs';
import { catchError, concatMap, finalize } from 'rxjs/operators';
import { StorefrontOrder, StorefrontOrderStatusLog } from '../../../../core/models/storefront.models';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { resolveApiBaseUrl } from '../../../../core/config/api-base-url';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pedido confirmado',
  paid: 'Pago confirmado',
  processing: 'Preparando pedido',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  pending: 'Tu pedido fue recibido exitosamente',
  paid: 'Tu pago fue confirmado',
  processing: 'Tu pedido está siendo empacado',
  shipped: 'Tu paquete salió de nuestro centro',
  delivered: 'Entregado en la dirección indicada',
};

const STATUS_ICONS: Record<string, string> = {
  pending: 'schedule',
  paid: 'check_circle',
  processing: 'inventory_2',
  shipped: 'local_shipping',
  delivered: 'verified',
  cancelled: 'cancel',
  refunded: 'undo',
};

const STATUS_ORDER = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

@Component({
  standalone: false,
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailComponent implements OnInit {
  loading = false;
  errorMsg = '';
  order: StorefrontOrder | null = null;

  reordering = false;
  reorderMsg = '';
  reorderError = '';
  copiedNumber = false;
  private readonly apiBase = resolveApiBaseUrl();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storefrontApi: StorefrontApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  statusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
  }

  statusDescription(status: string): string {
    return STATUS_DESCRIPTIONS[status] || '';
  }

  statusIcon(status: string): string {
    return STATUS_ICONS[status] || 'help_outline';
  }

  resolveImageUrl(url: string): string {
    if (!url) return '';
    return url.startsWith('http') ? url : `${this.apiBase}${url}`;
  }

  get shippingMethodLabel(): string {
    const total = this.order?.shippingTotal || 0;
    if (total === 0) return 'Envío estándar (gratis)';
    if (total <= 30) return 'Envío estándar';
    if (total <= 55) return 'Envío express';
    return 'Entrega mismo día';
  }

  async copyOrderNumber(): Promise<void> {
    const num = this.order?.orderNumber || String(this.order?.id || '');
    if (!num) return;
    try {
      await navigator.clipboard.writeText(num);
      this.copiedNumber = true;
      this.cdr.markForCheck();
      setTimeout(() => { this.copiedNumber = false; this.cdr.markForCheck(); }, 2500);
    } catch { /* ignore */ }
  }

  /** Timeline entries: logs + projected future steps */
  get timelineSteps(): Array<{ status: string; log: StorefrontOrderStatusLog | null; isFuture: boolean }> {
    const logs = this.order?.statusLogs || [];
    const isCancelledOrRefunded = ['cancelled', 'refunded'].includes(this.order?.statusOrder || '');

    if (isCancelledOrRefunded) {
      return logs.map(log => ({ status: log.status, log, isFuture: false }));
    }

    const doneStatuses = new Set(logs.map(l => l.status));
    const logByStatus = new Map(logs.map(l => [l.status, l]));

    return STATUS_ORDER.map(status => ({
      status,
      log: logByStatus.get(status) || null,
      isFuture: !doneStatuses.has(status),
    }));
  }

  get currentStatus(): string {
    return this.order?.statusOrder || '';
  }

  get shippingAddress(): Record<string, unknown> {
    return (this.order?.shippingAddress || {}) as Record<string, unknown>;
  }

  get formattedAddress(): string {
    const a = this.shippingAddress;
    const parts = [
      String(a['fullName'] || a['firstName'] || ''),
      String(a['addressLine1'] || a['line1'] || ''),
      String(a['city'] || a['municipality'] || ''),
      String(a['department'] || ''),
      String(a['country'] || 'Guatemala'),
    ].filter(Boolean);
    return parts.join(', ') || '-';
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  }

  downloadInvoice(): void {
    if (!this.order) return;
    const o = this.order;
    const lines = [
      `Factura - ${o.orderNumber || '#' + o.id}`,
      `Fecha: ${new Date(o.createdAt).toLocaleString('es-GT')}`,
      `Estado: ${this.statusLabel(o.statusOrder)}`,
      `Email: ${o.email}`,
      `Dirección de envío: ${this.formattedAddress}`,
      '',
      'Detalle:',
      ...(o.order_items || []).map(item => `- ${item.nameSnapshot} x${item.qty} = Q${Number(item.lineTotal).toFixed(2)}`),
      '',
      `Subtotal:  Q${Number(o.subtotal || 0).toFixed(2)}`,
      `Descuento: Q${Number(o.discountTotal || 0).toFixed(2)}`,
      `Envío:     Q${Number(o.shippingTotal || 0).toFixed(2)}`,
      `Total:     Q${Number(o.grandTotal || 0).toFixed(2)}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura-${String(o.orderNumber || o.id).replace(/[^a-zA-Z0-9-]/g, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  reorder(): void {
    if (!this.order || this.reordering) return;
    const items = (this.order.order_items || []).filter(i => i.product?.id && Number(i.qty || 0) > 0);
    if (!items.length) {
      this.reorderError = 'No hay productos disponibles para repetir.';
      this.cdr.markForCheck();
      return;
    }
    this.reordering = true;
    this.reorderMsg = '';
    this.reorderError = '';
    this.cdr.markForCheck();

    from(items)
      .pipe(
        concatMap(item =>
          this.storefrontApi.addMyCartItem({ productId: item.product!.id, qty: Number(item.qty || 1) })
            .pipe(catchError(() => of(null)))
        ),
        finalize(() => { this.reordering = false; this.cdr.markForCheck(); })
      )
      .subscribe({
        complete: () => {
          this.reorderMsg = 'Productos agregados al carrito.';
          this.cdr.markForCheck();
          setTimeout(() => this.router.navigate(['/cart']), 800);
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/account/orders']);
  }

  private load(id: string): void {
    this.loading = true;
    this.errorMsg = '';
    this.cdr.markForCheck();

    this.storefrontApi.getMyOrder(id).subscribe({
      next: (res) => {
        this.order = res.data;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'No se pudo cargar el detalle del pedido.';
        this.cdr.markForCheck();
      },
    });
  }
}
