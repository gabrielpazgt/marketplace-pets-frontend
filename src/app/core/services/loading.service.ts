import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly showDelayMs = 220;
  private readonly visibleSubject = new BehaviorSubject<boolean>(false);
  private readonly labelSubject = new BehaviorSubject<string>('Cargando...');

  readonly isLoading$ = this.visibleSubject.asObservable();
  readonly label$ = this.labelSubject.asObservable();

  private pendingRequests = 0;
  private showTimer: ReturnType<typeof setTimeout> | null = null;

  show(label = 'Cargando...'): void {
    this.pendingRequests += 1;
    this.labelSubject.next(label);

    if (this.visibleSubject.value || this.showTimer) {
      return;
    }

    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      if (this.pendingRequests > 0) {
        this.visibleSubject.next(true);
      }
    }, this.showDelayMs);
  }

  hide(): void {
    this.pendingRequests = Math.max(0, this.pendingRequests - 1);
    if (this.pendingRequests > 0) {
      return;
    }

    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }

    this.visibleSubject.next(false);
    this.labelSubject.next('Cargando...');
  }
}
