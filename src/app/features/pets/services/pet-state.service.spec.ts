import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '../../../auth/services/auth.service';
import { StorefrontApiService } from '../../../core/services/storefront-api.service';
import { StorefrontPetTaxonomy } from '../../../core/models/storefront.models';

import { PetsStateService } from './pet-state.service';

describe('PetsStateService', () => {
  let service: PetsStateService;

  const mockTaxonomy: StorefrontPetTaxonomy = {
    species: [],
    lifeStages: [],
    dietTags: [],
    healthConditions: [],
  };

  const authMock = {
    user$: new BehaviorSubject<unknown>(null),
    isLoggedIn: false,
    userId: null,
  } as unknown as AuthService;

  const storefrontMock = {
    getPetTaxonomy: () => of({ data: mockTaxonomy }),
    listMyPets: () => of({ data: [] }),
  } as unknown as StorefrontApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: StorefrontApiService, useValue: storefrontMock },
      ],
    });
    service = TestBed.inject(PetsStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
