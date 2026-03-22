import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  standalone: false,
  selector: 'mp-memberships-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Checkout de membresia | Aumakki',
      description: 'Completa tu compra de membresia en Aumakki.',
      url: '/memberships/checkout',
      noindex: true,
    });
  }
}
