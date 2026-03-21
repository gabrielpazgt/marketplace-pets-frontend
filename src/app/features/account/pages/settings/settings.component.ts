import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { AuthService, AuthUser } from '../../../../auth/services/auth.service';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';

type SettingsModel = {
  name: string;
  email: string;
  phone: string;
  currency: 'GTQ' | 'USD';
  timezone: string;
  newsletter: boolean;
  notifyOrders: boolean;
  notifyPromos: boolean;
  twoFactor: boolean;
};

@Component({
  standalone: false,
  selector: 'mp-account-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit, OnDestroy {
  model: SettingsModel = {
    name: 'Usuario',
    email: '',
    phone: '',
    currency: 'GTQ',
    timezone: 'America/Guatemala',
    newsletter: true,
    notifyOrders: true,
    notifyPromos: true,
    twoFactor: false,
  };

  loading = false;
  savingProfile = false;
  savingPrefs = false;
  deletingAccount = false;
  message = '';
  errorMessage = '';

  private userSub?: Subscription;

  constructor(
    private auth: AuthService,
    private storefrontApi: StorefrontApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.applyUserData(this.auth.user);
    this.userSub = this.auth.user$.subscribe((user) => this.applyUserData(user));

    if (this.auth.isLoggedIn) {
      this.loadRemoteSettings();
    }
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  saveProfile(): void {
    if (this.savingProfile || !this.auth.isLoggedIn) return;

    this.savingProfile = true;
    this.message = '';
    this.errorMessage = '';

    const [firstName, ...rest] = (this.model.name || '').trim().split(/\s+/).filter(Boolean);
    const lastName = rest.join(' ');

    this.storefrontApi
      .updateMyProfile({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: this.model.phone || undefined,
      })
      .subscribe({
        next: () => {
          this.savingProfile = false;
          this.message = 'Perfil actualizado.';
          this.cdr.markForCheck();
        },
        error: () => {
          this.savingProfile = false;
          this.errorMessage = 'No se pudo actualizar el perfil.';
          this.cdr.markForCheck();
        },
      });
  }

  savePrefs(): void {
    if (this.savingPrefs || !this.auth.isLoggedIn) return;

    this.savingPrefs = true;
    this.message = '';
    this.errorMessage = '';

    this.storefrontApi
      .updateMyPreferences({
        currency: this.model.currency,
        timeZone: this.model.timezone,
        notifications: {
          orderUpdates: this.model.notifyOrders,
          promotions: this.model.notifyPromos,
          newsletter: this.model.newsletter,
        },
        twoFactorEnabled: this.model.twoFactor,
      })
      .subscribe({
        next: () => {
          this.savingPrefs = false;
          this.message = 'Preferencias actualizadas.';
          this.cdr.markForCheck();
        },
        error: () => {
          this.savingPrefs = false;
          this.errorMessage = 'No se pudieron actualizar las preferencias.';
          this.cdr.markForCheck();
        },
      });
  }

  changePassword(): void {
    this.message = 'Para cambiar tu contrasena, usa la opcion de recuperacion desde el login.';
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  toggle2FA(): void {
    this.model.twoFactor = !this.model.twoFactor;
    this.savePrefs();
  }

  deleteAccount(): void {
    if (this.deletingAccount || !this.auth.isLoggedIn) return;

    const ok = confirm('¿Eliminar tu cuenta? Esta accion no se puede deshacer.');
    if (!ok) return;

    this.deletingAccount = true;
    this.errorMessage = '';
    this.message = '';

    this.storefrontApi.deleteMyAccount().subscribe({
      next: () => {
        this.deletingAccount = false;
        this.auth.logout();
        this.router.navigate(['/home']);
      },
      error: () => {
        this.deletingAccount = false;
        this.errorMessage = 'No se pudo eliminar la cuenta.';
        this.cdr.markForCheck();
      },
    });
  }

  private loadRemoteSettings(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      profile: this.storefrontApi.getMyProfile(),
      preferences: this.storefrontApi.getMyPreferences(),
    }).subscribe({
      next: ({ profile, preferences }) => {
        const p = profile.data;
        const fullName = p.fullName || [p.firstName, p.lastName].filter(Boolean).join(' ') || p.username;

        this.model = {
          ...this.model,
          name: fullName,
          email: p.email || this.model.email,
          phone: p.phone || '',
          currency: preferences.data?.currency || 'GTQ',
          timezone: preferences.data?.timeZone || 'America/Guatemala',
          newsletter: preferences.data?.notifications?.newsletter !== false,
          notifyOrders: preferences.data?.notifications?.orderUpdates !== false,
          notifyPromos: preferences.data?.notifications?.promotions !== false,
          twoFactor: preferences.data?.twoFactorEnabled === true,
        };

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudo cargar la configuracion.';
        this.cdr.markForCheck();
      },
    });
  }

  private applyUserData(user: AuthUser | null): void {
    if (!user) return;

    this.model = {
      ...this.model,
      name: user.username?.trim() || this.model.name,
      email: user.email?.trim() || this.model.email,
    };

    this.cdr.markForCheck();
  }
}
