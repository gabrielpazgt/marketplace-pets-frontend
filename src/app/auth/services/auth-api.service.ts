import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { resolveApiBaseUrl } from '../../core/config/api-base-url';
import { AuthResponse, User } from '../../core/models/auth.models';

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

interface LoginPayload {
  identifier: string;
  password: string;
}

interface ForgotPasswordPayload {
  email: string;
}

interface ResetPasswordPayload {
  code: string;
  password: string;
  passwordConfirmation: string;
}

interface ForgotPasswordResponse {
  ok: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly apiBaseUrl = resolveApiBaseUrl();

  constructor(private http: HttpClient) {}

  register(email: string, password: string, username?: string): Observable<AuthResponse> {
    const payload: RegisterPayload = {
      username: this.resolveUsername(username, email),
      email: email.trim().toLowerCase(),
      password,
    };

    return this.http.post<AuthResponse>(`${this.apiBaseUrl}/api/auth/local/register`, payload);
  }

  login(identifier: string, password: string): Observable<AuthResponse> {
    const payload: LoginPayload = {
      identifier: identifier.trim(),
      password,
    };

    return this.http.post<AuthResponse>(`${this.apiBaseUrl}/api/auth/local`, payload);
  }

  forgotPassword(email: string): Observable<ForgotPasswordResponse> {
    const payload: ForgotPasswordPayload = {
      email: email.trim().toLowerCase(),
    };

    return this.http.post<ForgotPasswordResponse>(`${this.apiBaseUrl}/api/auth/forgot-password`, payload);
  }

  resetPassword(code: string, password: string, passwordConfirmation: string): Observable<AuthResponse> {
    const payload: ResetPasswordPayload = {
      code: code.trim(),
      password,
      passwordConfirmation,
    };

    return this.http.post<AuthResponse>(`${this.apiBaseUrl}/api/auth/reset-password`, payload);
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.apiBaseUrl}/api/users/me`);
  }

  private resolveUsername(username: string | undefined, email: string): string {
    const hasCustom = !!(username && username.trim());
    const candidate = hasCustom ? (username as string).trim() : (email.split('@')[0] || 'user');
    const normalized = candidate
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^[_\-.]+|[_\-.]+$/g, '');

    const base = normalized || 'user';
    if (hasCustom) return base.slice(0, 40);

    const suffix = Date.now().toString(36).slice(-4);
    return `${base}_${suffix}`.slice(0, 40);
  }
}
