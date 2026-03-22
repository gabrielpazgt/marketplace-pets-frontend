import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  standalone: false,
  selector: 'mp-memberships-success',
  templateUrl: './success.component.html',
  styleUrls: ['./success.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuccessComponent implements OnInit {
  constructor(private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Confirmacion de membresia | Aumakki',
      description: 'Confirmacion de compra de membresia en Aumakki.',
      url: '/memberships/success',
      noindex: true,
    });
  }
}
