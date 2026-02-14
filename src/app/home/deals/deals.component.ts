import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Product } from '../home.models';

type PriceView = { now: number; old?: number };
type DealItem = Product & { reg: PriceView; mem: PriceView };

@Component({
  selector: 'app-deals',
  templateUrl: './deals.component.html',
  styleUrls: ['./deals.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DealsComponent implements OnChanges {
  @Input() products: Product[] | null | undefined;
  /** Si un producto no trae memberPrice, se calcula con esta tasa. */
  @Input() membershipRate = 0.10; // 10% OFF por defecto (ajústalo a tu regla real)

  /** Items listos para pintar (con precios calculados) */
  view: DealItem[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['products'] || changes['membershipRate']) {
      const list = (this.products ?? []).filter(Boolean) as Product[];
      this.view = list.map(p => this.buildItem(p));
    }
  }

  private buildItem(p: any): DealItem {
    // normal
    const price = Number(p.price) || 0;
    const oldPrice = (p.oldPrice && p.oldPrice > price) ? Number(p.oldPrice) : undefined;

    // membresía (si viene, se respeta; si no, se calcula con rate)
    const memberNow: number =
      p.memberPrice != null ? Number(p.memberPrice)
                            : Math.round(price * (1 - this.membershipRate));

    const memberOld: number | undefined =
      p.memberOldPrice != null ? Number(p.memberOldPrice)
                               : (oldPrice ? Math.round(oldPrice * (1 - this.membershipRate)) : undefined);

    return {
      ...(p as Product),
      reg: { now: price, old: oldPrice },
      mem: { now: memberNow, old: memberOld }
    };
  }
}
