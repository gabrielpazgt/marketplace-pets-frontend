import { Component } from '@angular/core';
import { AuthService } from '../../../../auth/services/auth.service';

@Component({
  standalone: false,
  selector: 'mp-ops-shell',
  templateUrl: './ops-shell.component.html',
  styleUrls: ['./ops-shell.component.scss'],
})
export class OpsShellComponent {
  constructor(public auth: AuthService) {}

  get operatorName(): string {
    return this.auth.user?.username || 'Operador';
  }
}
