import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap, take, tap } from 'rxjs/operators';
import { AuthService } from '../../../auth/services/auth.service';
import {
  StorefrontPet,
  StorefrontPetPayload,
  StorefrontPetTaxonomy,
  StorefrontTaxonomyItem,
} from '../../../core/models/storefront.models';
import { StorefrontApiService } from '../../../core/services/storefront-api.service';
import { Pet, PetDraft, Species, Size, Sex } from '../models/pet.models';

const FRONT_TO_BACK_SIZE: Record<Size, string> = {
  small: 'small',
  medium: 'medium',
  large: 'large',
};

const BACK_TO_FRONT_SIZE: Record<string, Size> = {
  toy: 'small',
  small: 'small',
  medium: 'medium',
  large: 'large',
  giant: 'large',
};

const SPECIES_SLUG_PRIORITY: Record<Species, string[]> = {
  dog: ['perro', 'dog'],
  cat: ['gato', 'cat'],
  bird: ['ave', 'bird'],
  fish: ['pez', 'peces', 'fish', 'acuario'],
  reptile: ['reptil', 'reptiles', 'reptile', 'tortuga', 'turtle'],
  'small-pet': ['pequena-mascota', 'pequenas-mascotas', 'small-pet', 'small', 'hamster', 'conejo', 'cobayo'],
  other: ['other'],
};

const SPECIES_NAME_PRIORITY: Record<Species, string[]> = {
  dog: ['perro', 'dog'],
  cat: ['gato', 'cat'],
  bird: ['ave', 'bird'],
  fish: ['pez', 'peces', 'fish', 'acuario'],
  reptile: ['reptil', 'reptiles', 'reptile', 'tortuga', 'turtle'],
  'small-pet': ['pequena mascota', 'pequenas mascotas', 'small pet', 'hamster', 'conejo', 'cobayo'],
  other: ['other'],
};

@Injectable({ providedIn: 'root' })
export class PetsStateService {
  private readonly petsSubject = new BehaviorSubject<Pet[]>([]);
  readonly pets$ = this.petsSubject.asObservable();

  private taxonomy: StorefrontPetTaxonomy | null = null;

  constructor(
    private storefrontApi: StorefrontApiService,
    private auth: AuthService
  ) {
    this.auth.user$.subscribe(() => {
      this.refresh();
    });

    this.refresh();
  }

  refresh(): void {
    if (!this.auth.isLoggedIn) {
      this.taxonomy = null;
      this.petsSubject.next([]);
      return;
    }

    this.ensureTaxonomy$()
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.storefrontApi.listMyPets().subscribe({
            next: (response) => {
              const userId = this.auth.userId || 'self';
              const mapped = (response.data || []).map((pet) => this.fromApiPet(pet, userId));
              this.petsSubject.next(mapped);
            },
            error: () => {
              this.petsSubject.next([]);
            },
          });
        },
        error: () => {
          this.petsSubject.next([]);
        },
      });
  }

  listByUser(userId: string): Pet[] {
    if (!this.auth.userId || userId !== this.auth.userId) return [];
    return this.petsSubject.value;
  }

  getById(id: string): Pet | null {
    return this.petsSubject.value.find((pet) => pet.id === id) ?? null;
  }

  add(_userId: string, draft: PetDraft): Observable<Pet | null> {
    if (!this.auth.isLoggedIn) return of(null);

    return this.ensureTaxonomy$().pipe(
      take(1),
      map(() => this.toApiPayload(draft)),
      switchMap((payload) => this.storefrontApi.createMyPet(payload)),
      map((response) => {
        const userId = this.auth.userId || 'self';
        return this.fromApiPet(response.data, userId);
      }),
      tap((created) => {
        this.petsSubject.next([created, ...this.petsSubject.value]);
      }),
      catchError(() => of(null))
    );
  }

  update(id: string, patch: Partial<PetDraft>): Observable<Pet | null> {
    if (!this.auth.isLoggedIn) return of(null);

    const current = this.getById(id);
    if (!current) return of(null);

    const mergedDraft: PetDraft = {
      name: patch.name ?? current.name,
      species: patch.species ?? current.species,
      breed: patch.breed ?? current.breed,
      color: patch.color ?? current.color,
      avatarHex: patch.avatarHex ?? current.avatarHex,
      size: patch.size ?? current.size,
      ageYears: patch.ageYears ?? current.ageYears,
      sex: patch.sex ?? current.sex,
      notes: patch.notes ?? current.notes,
      lifeStage: patch.lifeStage ?? current.lifeStage,
      sterilized: patch.sterilized ?? current.sterilized,
      activity: patch.activity ?? current.activity,
      allergies: patch.allergies ?? current.allergies,
      diet: patch.diet ?? current.diet,
    };

    return this.ensureTaxonomy$().pipe(
      take(1),
      map(() => this.toApiPayload(mergedDraft)),
      switchMap((payload) => this.storefrontApi.updateMyPet(id, payload)),
      map((response) => {
        const userId = this.auth.userId || 'self';
        return this.fromApiPet(response.data, userId);
      }),
      tap((updated) => {
        this.petsSubject.next(this.petsSubject.value.map((pet) => (pet.id === id ? updated : pet)));
      }),
      catchError(() => of(null))
    );
  }

  remove(id: string): Observable<boolean> {
    if (!this.auth.isLoggedIn) return of(false);

    return this.storefrontApi.deleteMyPet(id).pipe(
      tap(() => {
        this.petsSubject.next(this.petsSubject.value.filter((pet) => pet.id !== id));
      }),
      map(() => true),
      catchError(() => of(false))
    );
  }

  private ensureTaxonomy$(): Observable<StorefrontPetTaxonomy> {
    if (this.taxonomy) return of(this.taxonomy);

    return this.storefrontApi.getPetTaxonomy().pipe(
      map((response) => response.data),
      tap((taxonomy) => {
        this.taxonomy = taxonomy;
      })
    );
  }

  private fromApiPet(pet: StorefrontPet, userId: string): Pet {
    const species = this.resolveFrontSpecies(pet.specie) ?? 'dog';
    const ageYears = this.resolveAgeYears(pet.birthdate);

    return {
      id: String(pet.id),
      userId,
      name: pet.name,
      species,
      breed: pet.breed || undefined,
      color: pet.color || undefined,
      avatarHex: pet.avatarHex || undefined,
      size: this.resolveFrontSize(pet.size),
      weightKg: Number.isFinite(Number(pet.weightKg)) ? Number(pet.weightKg) : undefined,
      ageYears,
      sex: this.resolveFrontSex(pet.sex),
      notes: pet.notes || undefined,
      createdAt: pet.createdAt || new Date().toISOString(),
      updatedAt: pet.updatedAt || new Date().toISOString(),
      lifeStage: this.resolveFrontLifeStage(pet.lifeStage),
      sterilized: typeof pet.sterilized === 'boolean' ? pet.sterilized : undefined,
      activity: this.resolveFrontActivity(pet.activity),
      allergies: Array.isArray(pet.allergies) && pet.allergies.length
        ? pet.allergies
        : this.resolveAllergiesFromHealthConditions(pet.healthConditions),
      diet: this.resolveDietFromTaxonomy(pet.dietTags),
    };
  }

  private toApiPayload(draft: PetDraft): StorefrontPetPayload {
    const payload: StorefrontPetPayload = {
      name: draft.name,
      breed: draft.breed,
      color: draft.color,
      avatarHex: draft.avatarHex,
      size: draft.size ? FRONT_TO_BACK_SIZE[draft.size] : undefined,
      weightKg: draft.weightKg,
      sex: draft.sex,
      notes: draft.notes,
      sterilized: draft.sterilized,
      activity: draft.activity,
      allergies: draft.allergies,
    };

    if (typeof draft.ageYears === 'number' && Number.isFinite(draft.ageYears)) {
      payload.birthdate = this.birthdateFromAge(draft.ageYears);
    }

    if (this.taxonomy) {
      const specieId = this.resolveSpecieId(draft.species);
      if (specieId) payload.specieId = specieId;

      const lifeStageId = this.resolveLifeStageId(draft.lifeStage, draft.species);
      if (lifeStageId) payload.lifeStageId = lifeStageId;

      if (draft.diet?.length) {
        const dietTagIds = draft.diet
          .map((diet) => this.resolveDietTagId(diet))
          .filter((id): id is number => Number.isFinite(id));

        payload.dietTagIds = Array.from(new Set(dietTagIds));
      }

      if (draft.allergies?.length) {
        const healthConditionIds = draft.allergies
          .map((allergy) => this.resolveHealthConditionId(allergy))
          .filter((id): id is number => Number.isFinite(id));

        if (healthConditionIds.length) {
          payload.healthConditionIds = Array.from(new Set(healthConditionIds));
        }
      }
    }

    return payload;
  }

  private resolveSpecieId(species: Species): number | undefined {
    const taxonomy = this.taxonomy?.species || [];
    const expectedSlugs = SPECIES_SLUG_PRIORITY[species] || [];
    const expectedNames = SPECIES_NAME_PRIORITY[species] || [];

    const bySlug = taxonomy.find((item) => expectedSlugs.includes((item.slug || '').toLowerCase()));
    if (bySlug?.id) return bySlug.id;

    const byName = taxonomy.find((item) => expectedNames.includes((item.name || '').toLowerCase()));
    return byName?.id;
  }

  private resolveLifeStageId(
    lifeStage: PetDraft['lifeStage'],
    species: Species
  ): number | undefined {
    if (!lifeStage) return undefined;

    const normalized = lifeStage.toLowerCase();
    const taxonomy = this.taxonomy?.lifeStages || [];
    const speciesIsCat = species === 'cat';

    const expectedSlugs =
      normalized === 'puppy'
        ? speciesIsCat ? ['gatito'] : ['cachorro']
        : normalized === 'adult'
          ? ['adulto', 'adult']
          : ['senior'];

    const bySlug = taxonomy.find((item) => expectedSlugs.includes((item.slug || '').toLowerCase()));
    if (bySlug?.id) return bySlug.id;

    const expectedNames =
      normalized === 'puppy'
        ? speciesIsCat ? ['gatito'] : ['cachorro']
        : normalized === 'adult'
          ? ['adulto', 'adult']
          : ['senior'];

    const byName = taxonomy.find((item) => expectedNames.includes((item.name || '').toLowerCase()));
    return byName?.id;
  }

  private resolveDietTagId(diet: string): number | undefined {
    const normalized = String(diet || '').toLowerCase();
    const taxonomy = this.taxonomy?.dietTags || [];
    const aliases: Record<string, string[]> = {
      grain_free: ['grain_free', 'grain-free', 'grain free', 'libre de granos'],
      high_protein: ['high_protein', 'high-protein', 'high protein', 'alta proteina'],
      low_calorie: ['low_calorie', 'low-calorie', 'low calorie', 'control_peso', 'control-peso', 'control de peso', 'bajas calorias'],
      urinary: ['urinary', 'cuidado_urinario', 'cuidado-urinario', 'cuidado urinario', 'salud urinaria'],
      renal: ['renal', 'soporte_renal', 'soporte-renal', 'soporte renal'],
      hypoallergenic: ['hypoallergenic', 'hipoalergenico', 'hypoallergenic'],
    };
    const candidates = aliases[normalized] || [normalized, normalized.replace(/_/g, '-'), normalized.replace(/_/g, ' ')];

    const bySlug = taxonomy.find((item) => candidates.includes((item.slug || '').toLowerCase()));
    if (bySlug?.id) return bySlug.id;

    const byName = taxonomy.find((item) => candidates.includes((item.name || '').toLowerCase()));
    return byName?.id;
  }

  private resolveHealthConditionId(raw: string): number | undefined {
    const normalized = String(raw || '').trim().toLowerCase();
    if (!normalized) return undefined;

    const taxonomy = this.taxonomy?.healthConditions || [];

    const bySlug = taxonomy.find((item) => (item.slug || '').toLowerCase() === normalized.replace(/\s+/g, '-'));
    if (bySlug?.id) return bySlug.id;

    const byName = taxonomy.find((item) => (item.name || '').toLowerCase() === normalized);
    return byName?.id;
  }

  private resolveFrontSpecies(specie?: StorefrontTaxonomyItem | null): Species | null {
    const slug = (specie?.slug || '').toLowerCase();
    const name = (specie?.name || '').toLowerCase();

    if (slug.includes('perro') || name.includes('perro') || slug === 'dog' || name === 'dog') return 'dog';
    if (slug.includes('gato') || name.includes('gato') || slug === 'cat' || name === 'cat') return 'cat';
    if (slug.includes('ave') || name.includes('ave') || slug === 'bird' || name === 'bird') return 'bird';
    if (slug.includes('pez') || name.includes('pez') || slug.includes('fish') || name.includes('fish') || slug.includes('acuario') || name.includes('acuario')) return 'fish';
    if (slug.includes('rept') || name.includes('rept') || slug.includes('tortuga') || name.includes('tortuga') || slug === 'turtle' || name === 'turtle') return 'reptile';
    if (slug.includes('hamster') || name.includes('hamster') || slug.includes('conejo') || name.includes('conejo') || slug.includes('cobayo') || name.includes('cobayo') || slug.includes('small')) return 'small-pet';
    return null;
  }

  private resolveFrontSize(size?: string | null): Size | undefined {
    if (!size) return undefined;
    const normalized = String(size).toLowerCase();
    return BACK_TO_FRONT_SIZE[normalized];
  }

  private resolveFrontSex(sex?: string | null): Sex | undefined {
    if (sex === 'male' || sex === 'female') return sex;
    return undefined;
  }

  private resolveFrontLifeStage(lifeStage?: StorefrontTaxonomyItem | null): Pet['lifeStage'] {
    const slug = (lifeStage?.slug || '').toLowerCase();
    const name = (lifeStage?.name || '').toLowerCase();

    if (slug.includes('cachorro') || slug.includes('gatito') || name.includes('cachorro') || name.includes('gatito')) {
      return 'puppy';
    }
    if (slug.includes('adult') || name.includes('adult')) return 'adult';
    if (slug.includes('senior') || name.includes('senior')) return 'senior';
    return undefined;
  }

  private resolveFrontActivity(activity?: string | null): Pet['activity'] {
    if (activity === 'low' || activity === 'medium' || activity === 'high') return activity;
    return undefined;
  }

  private resolveDietFromTaxonomy(dietTags?: StorefrontTaxonomyItem[]): Pet['diet'] {
    const result = (dietTags || [])
      .map((tag) => (tag.slug || '').toLowerCase().replace(/-/g, '_'))
      .filter(Boolean)
      .filter((slug) => [
        'grain_free',
        'high_protein',
        'low_calorie',
        'urinary',
        'renal',
        'hypoallergenic',
      ].includes(slug));

    return result as Pet['diet'];
  }

  private resolveAllergiesFromHealthConditions(conditions?: StorefrontTaxonomyItem[]): string[] | undefined {
    const list = (conditions || [])
      .map((condition) => (condition.name || '').trim())
      .filter(Boolean);

    return list.length ? list : undefined;
  }

  private resolveAgeYears(birthdate?: string | null): number | undefined {
    if (!birthdate) return undefined;

    const parsed = new Date(birthdate);
    if (Number.isNaN(parsed.getTime())) return undefined;

    const now = new Date();
    let age = now.getFullYear() - parsed.getFullYear();
    const monthDiff = now.getMonth() - parsed.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsed.getDate())) {
      age -= 1;
    }

    return Math.max(0, age);
  }

  private birthdateFromAge(ageYears: number): string {
    const now = new Date();
    const safeAge = Math.max(0, Math.min(30, Math.floor(ageYears)));
    const birth = new Date(now.getFullYear() - safeAge, now.getMonth(), now.getDate());
    return birth.toISOString().slice(0, 10);
  }
}
