import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoadingService } from '../services/loading.service';

@Injectable()
export class LoadingInterceptor implements HttpInterceptor {
  private readonly apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  constructor(private loading: LoadingService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.shouldTrack(req)) {
      return next.handle(req);
    }

    this.loading.show(this.resolveLabel(req));
    return next.handle(req).pipe(finalize(() => this.loading.hide()));
  }

  private shouldTrack(req: HttpRequest<unknown>): boolean {
    if (!req.url.startsWith(this.apiBaseUrl)) {
      return false;
    }

    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
  }

  private resolveLabel(req: HttpRequest<unknown>): string {
    if (req.url.includes('/cart/coupon')) return 'Aplicando cupón...';
    if (req.url.includes('/cart/items') && req.method === 'POST') return 'Agregando producto...';
    if (req.url.includes('/cart/items') && req.method === 'PATCH') return 'Actualizando carrito...';
    if (req.url.includes('/cart/items') && req.method === 'DELETE') return 'Eliminando producto...';
    if (req.url.includes('/checkout')) return 'Procesando pedido...';
    return 'Cargando...';
  }
}
