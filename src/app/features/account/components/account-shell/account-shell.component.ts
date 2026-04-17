import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../../auth/services/auth.service';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';

@Component({
  standalone: false,
  selector: 'app-account-shell',
  templateUrl: './account-shell.component.html',
  styleUrl: './account-shell.component.scss'
})
export class AccountShellComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  userName = '';
  userEmail = '';
  userInitials = '';
  membershipTier = 'Free';

  constructor(
    private auth: AuthService,
    private storefrontApi: StorefrontApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.auth.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.userName = user.username || user.email.split('@')[0];
        this.userEmail = user.email;
        this.userInitials = this.userName.charAt(0).toUpperCase();
      }
    });

    if (this.auth.isLoggedIn) {
      this.storefrontApi.getMyMembership().subscribe({
        next: (res) => {
          this.membershipTier = res.data?.tier === 'premium' ? 'Premium' : 'Free';
        }
      });
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
