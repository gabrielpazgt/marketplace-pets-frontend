import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-newsletter',
  templateUrl: './newsletter.component.html',
  styleUrls: ['./newsletter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsletterComponent {
  email = '';
  submitted = false;

  readonly trust = [
    { icon: 'verified_user', label: 'Compra segura' },
    { icon: 'local_shipping', label: 'Envío a toda Guatemala' },
    { icon: 'autorenew', label: '30 días garantía' },
  ];

  onSubmit(): void {
    if (this.email.trim()) {
      this.submitted = true;
    }
  }
}
