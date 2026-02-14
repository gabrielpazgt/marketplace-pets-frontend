import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

interface Order {
  id: string;            // interno
  number: string;        // visible, ej. #0001
  date: string;          // ISO
  status: OrderStatus;
  total: number;         // en GTQ (por ahora)
  itemsCount: number;
  paymentMethod: 'Tarjeta' | 'Transferencia' | 'Contra-entrega';
  addressShort: string;  // para listado
  tracking?: string;     // guía si aplica
}

@Component({
  selector: 'app-orders-history',
  templateUrl: './orders-history.component.html',
  styleUrls: ['./orders-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersHistoryComponent {

  constructor(private router: Router) {}

  // ====== Datos demo (luego conectar a servicio real) ======
  private mock(): Order[] {
    return [
      {
        id: 'o_01',
        number: '#0012',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
        status: 'delivered',
        total: 525,
        itemsCount: 3,
        paymentMethod: 'Tarjeta',
        addressShort: 'Zona 15, Guatemala',
        tracking: 'GTM-8831204'
      },
      {
        id: 'o_02',
        number: '#0011',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
        status: 'shipped',
        total: 239,
        itemsCount: 1,
        paymentMethod: 'Transferencia',
        addressShort: 'Mixco, Guatemala',
        tracking: 'GTM-8829012'
      },
      {
        id: 'o_03',
        number: '#0010',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 34).toISOString(),
        status: 'paid',
        total: 1299,
        itemsCount: 5,
        paymentMethod: 'Tarjeta',
        addressShort: 'Zona 10, Guatemala'
      },
      {
        id: 'o_04',
        number: '#0009',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
        status: 'pending',
        total: 89,
        itemsCount: 1,
        paymentMethod: 'Contra-entrega',
        addressShort: 'Villa Nueva, Guatemala'
      },
      {
        id: 'o_05',
        number: '#0008',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
        status: 'cancelled',
        total: 460,
        itemsCount: 2,
        paymentMethod: 'Tarjeta',
        addressShort: 'Antigua Guatemala'
      }
    ];
  }

  orders: Order[] = this.mock();

  // ====== Filtros & UI ======
  q = '';                         // búsqueda por número
  status: OrderStatus | 'all' = 'all';
  range: '30' | '90' | '365' | 'all' = '30';
  expandedId: string | null = null;

  get filtered(): Order[] {
    const now = Date.now();
    const cutoff =
      this.range === '30' ? now - 30 * 864e5 :
      this.range === '90' ? now - 90 * 864e5 :
      this.range === '365' ? now - 365 * 864e5 : 0;

    return this.orders
      .filter(o =>
        (this.status === 'all' || o.status === this.status) &&
        (!this.q || o.number.toLowerCase().includes(this.q.trim().toLowerCase())) &&
        (this.range === 'all' || new Date(o.date).getTime() >= cutoff)
      )
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }

  clearFilters() {
    this.q = '';
    this.status = 'all';
    this.range = '30';
  }

  // ====== Acciones ======
  toggleExpand(order: Order) {
    this.expandedId = this.expandedId === order.id ? null : order.id;
  }

  viewDetails(order: Order) {
    // Cuando exista detalle real:
    // this.router.navigate(['/account/orders', order.id]);
    alert(`Ver detalle de ${order.number} (demo)`);
  }
  downloadInvoice(order: Order) {
    alert(`Descargar factura de ${order.number} (demo)`);
  }
  reorder(order: Order) {
    alert(`Repetir compra de ${order.number} (demo)`);
  }

  // ====== Helpers de UI ======
  statusLabel(s: OrderStatus) {
    return {
      pending: 'Pendiente',
      paid: 'Pagado',
      shipped: 'Enviado',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    }[s];
  }
}
