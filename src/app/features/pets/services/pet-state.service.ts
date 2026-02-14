// src/app/features/pets/services/pets-state.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Pet, PetDraft } from '../models/pet.models';

const STORAGE_KEY = 'mp_pets';

function uid() {
  return 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

@Injectable({ providedIn: 'root' })
export class PetsStateService {
  private _pets$ = new BehaviorSubject<Pet[]>(this.read());
  readonly pets$ = this._pets$.asObservable();

  listByUser(userId: string) {
    return this._pets$.value.filter(p => p.userId === userId);
  }

  getById(id: string) {
    return this._pets$.value.find(p => p.id === id) ?? null;
  }

  add(userId: string, draft: PetDraft) {
    const now = new Date().toISOString();
    const pet: Pet = { id: uid(), userId, createdAt: now, updatedAt: now, ...draft };
    const next = [...this._pets$.value, pet];
    this.persist(next);
    return pet;
  }

  update(id: string, patch: Partial<PetDraft>) {
    const next = this._pets$.value.map(p => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p);
    this.persist(next);
  }

  remove(id: string) {
    const next = this._pets$.value.filter(p => p.id !== id);
    this.persist(next);
  }

  private read(): Pet[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    try { return raw ? JSON.parse(raw) as Pet[] : []; } catch { return []; }
  }
  private persist(next: Pet[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    this._pets$.next(next);
  }
}
