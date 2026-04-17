import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { AuthResponse, User } from '../../core/models/auth.models';
import { AuthApiService } from './auth-api.service';

export type AuthUser = User;

const TOKEN_STORAGE_KEY = 'mp_auth_token';
const USER_STORAGE_KEY = 'mp_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSubject = new BehaviorSubject<string | null>(this.readToken());
  private readonly userSubject = new BehaviorSubject<AuthUser | null>(this.readUser());
  private bootstrapped = false;

  readonly token$ = this.tokenSubject.asObservable();
  readonly user$ = this.userSubject.asObservable();

  constructor(private api: AuthApiService) {}

  get token(): string | null {
    return this.tokenSubject.value;
  }

  get user(): AuthUser | null {
    return this.userSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.token;
  }

  get userId(): string | null {
    return this.user?.id != null ? String(this.user.id) : null;
  }

  bootstrapSession(): Observable<void> {
    if (this.bootstrapped) return of(void 0);
    this.bootstrapped = true;

    const token = this.token;
    if (!token) return of(void 0);

    return this.api.getMe().pipe(
      tap((user) => this.persistSession(token, user)),
      map(() => void 0),
      catchError(() => {
        this.clearSession();
        return of(void 0);
      })
    );
  }

  register(email: string, password: string, username?: string): Observable<AuthUser> {
    return this.api.register(email, password, username).pipe(
      tap((res) => this.persistFromAuthResponse(res)),
      map((res) => res.user)
    );
  }

  login(identifier: string, password: string): Observable<AuthUser> {
    return this.api.login(identifier, password).pipe(
      tap((res) => this.persistFromAuthResponse(res)),
      switchMap((res) =>
        // Re-fetch user with role populated so guards and redirects can check it
        this.api.getMe().pipe(
          tap((user) => this.persistSession(res.jwt, user)),
          catchError(() => of(res.user))
        )
      )
    );
  }

  loginWithToken(jwt: string): Observable<AuthUser> {
    // Store token first so getMe() request is authorized
    this.tokenSubject.next(jwt);
    return this.api.getMe().pipe(
      tap((user) => this.persistSession(jwt, user)),
      catchError((err) => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  loginWithOAuthProvider(provider: string, accessToken: string): Observable<AuthUser> {
    return this.api.oauthExchange(provider, accessToken).pipe(
      tap((res) => this.persistSession(res.jwt, res.user)),
      switchMap((res) =>
        this.api.getMe().pipe(
          tap((user) => this.persistSession(res.jwt, user)),
          catchError(() => of(res.user))
        )
      ),
      catchError((err) => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  forgotPassword(email: string): Observable<void> {
    return this.api.forgotPassword(email).pipe(map(() => void 0));
  }

  resetPassword(code: string, password: string, passwordConfirmation: string): Observable<AuthUser> {
    return this.api.resetPassword(code, password, passwordConfirmation).pipe(
      tap((res) => this.persistFromAuthResponse(res)),
      map((res) => res.user)
    );
  }

  getMe(): Observable<AuthUser> {
    const token = this.token;
    if (!token) {
      return throwError(() => ({ status: 401, name: 'Unauthorized', message: 'No hay sesión activa.' }));
    }

    return this.api.getMe().pipe(
      tap((user) => this.persistSession(token, user))
    );
  }

  logout(): void {
    this.clearSession();
  }

  private persistFromAuthResponse(res: AuthResponse): void {
    this.persistSession(res.jwt, res.user);
  }

  private persistSession(token: string, user: AuthUser): void {
    this.tokenSubject.next(token);
    this.userSubject.next(user);
    this.safeSetLocal(TOKEN_STORAGE_KEY, token);
    this.safeSetLocal(USER_STORAGE_KEY, JSON.stringify(user));
    this.safeRemoveSession(TOKEN_STORAGE_KEY);
    this.safeRemoveSession(USER_STORAGE_KEY);
  }

  private clearSession(): void {
    this.tokenSubject.next(null);
    this.userSubject.next(null);
    this.safeRemoveLocal(TOKEN_STORAGE_KEY);
    this.safeRemoveLocal(USER_STORAGE_KEY);
    this.safeRemoveSession(TOKEN_STORAGE_KEY);
    this.safeRemoveSession(USER_STORAGE_KEY);
  }

  private readToken(): string | null {
    return this.safeGetLocal(TOKEN_STORAGE_KEY) || this.safeGetSession(TOKEN_STORAGE_KEY);
  }

  private readUser(): AuthUser | null {
    const raw = this.safeGetLocal(USER_STORAGE_KEY) || this.safeGetSession(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  private safeGetSession(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private safeSetSession(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {}
  }

  private safeRemoveSession(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  }

  private safeGetLocal(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private safeSetLocal(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  private safeRemoveLocal(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}
