import { Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';

const OPS_ROLES = ['admin', 'operator', 'superadmin'];
const OPS_ROUTE  = '/gx-ops';

@Injectable({ providedIn: 'root' })
export class RegularUserGuardService {
  constructor(private auth: AuthService, private router: Router) {}

  can(): boolean {
    const user = this.auth.user;
    if (user && OPS_ROLES.includes(user.role?.type ?? '')) {
      this.router.navigate([OPS_ROUTE]);
      return false;
    }
    return true;
  }
}

export const RegularUserGuard: CanActivateFn = () => {
  return inject(RegularUserGuardService).can();
};
