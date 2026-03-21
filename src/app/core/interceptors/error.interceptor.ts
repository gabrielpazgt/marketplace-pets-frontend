import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { StrapiErrorResponse } from '../models/auth.models';
import { AppHttpError } from '../models/http.models';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        const normalized = this.normalizeError(req, error);
        return throwError(() => normalized);
      })
    );
  }

  private normalizeError(req: HttpRequest<unknown>, error: HttpErrorResponse): AppHttpError {
    const payload = error.error as Partial<StrapiErrorResponse> | { message?: string } | string | null;

    if (payload && typeof payload === 'object' && 'error' in payload && payload.error?.message) {
      const translated = this.translateStrapiMessage(req.url, payload.error.message);
      return {
        status: payload.error.status ?? error.status,
        name: payload.error.name ?? 'ApplicationError',
        message: translated,
        details: payload.error.details,
      };
    }

    if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string') {
      return {
        status: error.status,
        name: error.name,
        message: this.translateStrapiMessage(req.url, payload.message),
      };
    }

    if (typeof payload === 'string' && payload.trim()) {
      return {
        status: error.status,
        name: error.name,
        message: this.translateStrapiMessage(req.url, payload),
      };
    }

    if (error.status === 0) {
      return {
        status: 0,
        name: 'NetworkError',
        message: 'No se pudo conectar con el servidor. Verifica que Strapi esté encendido.',
      };
    }

    if (error.status === 401) {
      return {
        status: 401,
        name: 'Unauthorized',
        message: 'Tu sesión no es válida o expiró. Inicia sesión nuevamente.',
      };
    }

    if (error.status >= 500) {
      return {
        status: error.status,
        name: 'ServerError',
        message: 'Error interno del servidor. Inténtalo de nuevo en unos minutos.',
      };
    }

    return {
      status: error.status,
      name: error.name,
      message: error.message || 'Ocurrió un error inesperado.',
    };
  }

  private translateStrapiMessage(url: string, message: string): string {
    const normalized = (message || '').trim();
    const normalizedLower = normalized.toLowerCase();

    if (url.includes('/api/auth/local') && normalizedLower === 'invalid identifier or password') {
      return 'Correo/usuario o contraseña incorrectos.';
    }

    if (url.includes('/api/auth/local/register') && (normalizedLower.includes('already taken') || normalizedLower.includes('already exists'))) {
      return 'Este correo o usuario ya está en uso.';
    }

    if (url.includes('/api/auth/reset-password') && normalizedLower === 'incorrect code provided') {
      return 'El enlace de recuperación no es válido o ya venció.';
    }

    if (url.includes('/api/auth/reset-password') && normalizedLower === 'passwords do not match') {
      return 'Las contraseñas no coinciden.';
    }

    return normalized;
  }
}
