import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { from, of } from 'rxjs';
import { catchError, concatMap, finalize } from 'rxjs/operators';
import { AppHttpError } from '../../../../core/models/http.models';
import { StorefrontOrder } from '../../../../core/models/storefront.models';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';

type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

interface Order {
  id: string;
  number: string;
  date: string;
  status: OrderStatus;
  total: number;
  itemsCount: number;
  paymentMethod: string;
  addressShort: string;
  tracking?: string;
  source: StorefrontOrder;
}

@Component({
  standalone: false,
  selector: 'app-orders-history',
  templateUrl: './orders-history.component.html',
  styleUrls: ['./orders-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersHistoryComponent implements OnInit {
  loading = false;
  errorMsg = '';
  orders: Order[] = [];

  q = '';
  status: OrderStatus | 'all' = 'all';
  range: '30' | '90' | '365' | 'all' = '30';
  expandedId: string | null = null;

  actionMsg = '';
  actionError = '';
  busyOrderId: string | null = null;

  constructor(
    private storefrontApi: StorefrontApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  get filtered(): Order[] {
    const now = Date.now();
    const cutoff =
      this.range === '30' ? now - 30 * 864e5 :
      this.range === '90' ? now - 90 * 864e5 :
      this.range === '365' ? now - 365 * 864e5 : 0;

    return this.orders
      .filter((order) =>
        (this.status === 'all' || order.status === this.status) &&
        (!this.q || order.number.toLowerCase().includes(this.q.trim().toLowerCase())) &&
        (this.range === 'all' || new Date(order.date).getTime() >= cutoff)
      )
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }

  clearFilters(): void {
    this.q = '';
    this.status = 'all';
    this.range = '30';
  }

  toggleExpand(order: Order): void {
    this.expandedId = this.expandedId === order.id ? null : order.id;
  }

  downloadInvoice(order: Order): void {
    const details = this.buildInvoiceText(order);
    const blob = new Blob([details], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `factura-${order.number.replace(/[^a-zA-Z0-9-]/g, '')}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  reorder(order: Order): void {
    if (this.busyOrderId) return;

    const items = (order.source.order_items || [])
      .filter((item) => item.product?.id && Number(item.qty || 0) > 0);

    if (!items.length) {
      this.actionError = 'No hay productos disponibles para repetir esta compra.';
      this.cdr.markForCheck();
      return;
    }

    this.actionMsg = '';
    this.actionError = '';
    this.busyOrderId = order.id;
    this.cdr.markForCheck();

    from(items)
      .pipe(
        concatMap((item) =>
          this.storefrontApi.addMyCartItem({
            productId: item.product!.id,
            qty: Number(item.qty || 1),
          }).pipe(catchError(() => of(null)))
        ),
        finalize(() => {
          this.busyOrderId = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => void 0,
        complete: () => {
          this.actionMsg = `Productos de ${order.number} agregados al carrito.`;
          this.router.navigate(['/cart']);
          this.cdr.markForCheck();
        },
      });
  }

  retryLoad(): void {
    this.loadOrders();
  }

  statusLabel(status: OrderStatus): string {
    return {
      pending: 'Pendiente',
      paid: 'Pagado',
      processing: 'En preparacion',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado',
      refunded: 'Reembolsado',
    }[status];
  }

  private loadOrders(): void {
    this.loading = true;
    this.errorMsg = '';
    this.actionMsg = '';
    this.actionError = '';
    this.cdr.markForCheck();

    this.storefrontApi.listMyOrders(1, 100).subscribe({
      next: (response) => {
        this.orders = (response.data || []).map((order) => this.toViewOrder(order));
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error: AppHttpError) => {
        this.loading = false;
        this.errorMsg = error?.message || 'No se pudo cargar tu historial de compras.';
        this.orders = [];
        this.cdr.markForCheck();
      },
    });
  }

  private toViewOrder(order: StorefrontOrder): Order {
    const itemsCount = (order.order_items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const shipping = this.normalizeAddress(order.shippingAddress);

    return {
      id: String(order.id),
      number: order.orderNumber || `#${order.id}`,
      date: order.createdAt,
      status: this.normalizeStatus(order.statusOrder),
      total: Number(order.grandTotal || 0),
      itemsCount,
      paymentMethod: 'N/D',
      addressShort: shipping,
      source: order,
    };
  }

  private normalizeStatus(status: string): OrderStatus {
    const allowed: OrderStatus[] = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    return allowed.includes(status as OrderStatus) ? (status as OrderStatus) : 'pending';
  }

  private normalizeAddress(address: unknown): string {
    if (!address || typeof address !== 'object') return '-';
    const source = address as Record<string, unknown>;
    const city = String(source['city'] || '').trim();
    const line = String(source['addressLine1'] || '').trim();
    const country = String(source['country'] || '').trim();

    return [line, city, country].filter(Boolean).join(', ') || '-';
  }

  private buildInvoiceText(order: Order): string {
    const source = order.source;
    const lines = [
      `Factura - ${order.number}`,
      `Fecha: ${new Date(order.date).toLocaleString('es-GT')}`,
      `Estado: ${this.statusLabel(order.status)}`,
      `Email: ${source.email}`,
      `Direccion de envio: ${order.addressShort}`,
      '',
      'Detalle:',
      ...(source.order_items || []).map((item) => {
        const name = item.nameSnapshot || item.product?.name || 'Producto';
        return `- ${name} x${item.qty} = Q${Number(item.lineTotal || 0).toFixed(2)}`;
      }),
      '',
      `Subtotal: Q${Number(source.subtotal || 0).toFixed(2)}`,
      `Descuento: Q${Number(source.discountTotal || 0).toFixed(2)}`,
      `Envio: Q${Number(source.shippingTotal || 0).toFixed(2)}`,
      `Total: Q${Number(source.grandTotal || 0).toFixed(2)}`,
    ];

    return lines.join('\n');
  }
}
