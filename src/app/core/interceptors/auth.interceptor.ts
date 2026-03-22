import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { resolveApiBaseUrl } from '../config/api-base-url';
import { AuthService } from '../../auth/services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly apiBaseUrl = resolveApiBaseUrl();

  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.auth.token;

    if (!token || !this.isApiRequest(req.url) || this.isPublicAuthEndpoint(req.url) || req.headers.has('Authorization')) {
      return next.handle(req);
    }

    const withAuth = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    return next.handle(withAuth);
  }

  private isApiRequest(url: string): boolean {
    return url.startsWith(this.apiBaseUrl);
  }

  private isPublicAuthEndpoint(url: string): boolean {
    return url.includes('/api/auth/local');
  }
}
