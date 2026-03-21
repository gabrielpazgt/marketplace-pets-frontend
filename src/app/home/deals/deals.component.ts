import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MembershipsService } from '../../features/memberships/services/memberships.service';
import { Product } from '../home.models';

@Component({
  standalone: false,
  selector: 'app-deals',
  templateUrl: './deals.component.html',
  styleUrls: ['./deals.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DealsComponent {
  @Input() products: Product[] | null | undefined;

  constructor(private memberships: MembershipsService) {}

  get view(): Product[] {
    return (this.products ?? []).filter(Boolean) as Product[];
  }

  get membershipDiscountPct(): number {
    return this.memberships.getPlan('premium').productDiscountPct;
  }

  memberPrice(price: number): number {
    return this.memberships.priceWithMembership(price, 'premium');
  }
}
