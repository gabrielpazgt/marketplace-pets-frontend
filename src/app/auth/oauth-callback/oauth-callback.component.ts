import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: false,
  selector: 'mp-oauth-callback',
  templateUrl: './oauth-callback.component.html',
  styleUrls: ['./oauth-callback.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OAuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  error = '';
  providerName = '';

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    // Grant redirige con access_token (Google OAuth) y/o id_token (OpenID Connect)
    // Para el intercambio con Strapi necesitamos access_token
    const accessToken = params.get('access_token') || params.get('id_token');
    const errorParam = params.get('error');

    // Recuperar proveedor guardado antes del redirect
    const provider = sessionStorage.getItem('oauth_provider') || 'google';
    sessionStorage.removeItem('oauth_provider');

    this.providerName = provider === 'facebook' ? 'Facebook' : 'Google';

    if (errorParam) {
      this.error = 'El proveedor rechazó el acceso. Intenta de nuevo.';
      this.cdr.markForCheck();
      return;
    }

    if (!accessToken) {
      this.error = 'No se recibió un token de acceso válido.';
      this.cdr.markForCheck();
      return;
    }

    // Intercambiar el token del proveedor por un JWT de Strapi
    this.auth.loginWithOAuthProvider(provider, accessToken).subscribe({
      next: () => this.router.navigate(['/account/profile']),
      error: () => {
        this.error = 'No pudimos completar el inicio de sesión. Intenta de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }
}
