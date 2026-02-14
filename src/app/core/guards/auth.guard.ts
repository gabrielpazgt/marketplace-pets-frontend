// src/app/core/guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../auth/services/auth.service';


@Injectable({ providedIn: 'root' })
export class AuthGuardService {
  constructor(private auth: AuthService, private router: Router) {}
  can(): boolean {
    if (this.auth.isLoggedIn) return true;
    this.router.navigate(['/auth/login']);
    return false;
  }
}

// Angular >=15 functional guard
export const AuthGuard: CanActivateFn = () => {
  return inject(AuthGuardService).can();
};
