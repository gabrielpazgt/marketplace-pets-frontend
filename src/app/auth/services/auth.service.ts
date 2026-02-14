// src/app/core/services/auth.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

const STORAGE_KEY = 'mp_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user$ = new BehaviorSubject<AuthUser | null>(this.readUser());
  readonly user$ = this._user$.asObservable();

  get user(): AuthUser | null { return this._user$.value; }
  get isLoggedIn(): boolean { return !!this._user$.value; }
  get userId(): string | null { return this._user$.value?.id ?? null; }

  // Helpers para el demo (ajústalo a tu flujo real de login/register)
  loginMock(user: AuthUser) { localStorage.setItem(STORAGE_KEY, JSON.stringify(user)); this._user$.next(user); }
  logout() { localStorage.removeItem(STORAGE_KEY); this._user$.next(null); }

  private readUser(): AuthUser | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    try { return raw ? JSON.parse(raw) as AuthUser : null; } catch { return null; }
  }
}
