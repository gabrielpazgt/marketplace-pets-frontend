import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';

const OPS_ROLES = ['admin', 'operator', 'superadmin'];

@Injectable({ providedIn: 'root' })
export class OpsGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    const user = this.auth.user;
    if (user && OPS_ROLES.includes(user.role?.type ?? '')) {
      return true;
    }
    this.router.navigate(['/home']);
    return false;
  }
}
