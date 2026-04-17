import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../auth/services/auth.service';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { PetsStateService } from '../../services/pet-state.service';
import { PetFormComponent } from './pet-form.component';

describe('PetFormComponent', () => {
  let component: PetFormComponent;
  let fixture: ComponentFixture<PetFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PetFormComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
            },
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate'),
          },
        },
        {
          provide: PetsStateService,
          useValue: {
            getById: () => null,
            pets$: of([]),
            add: () => of(null),
            update: () => of(null),
          },
        },
        {
          provide: AuthService,
          useValue: {
            userId: null,
            isLoggedIn: false,
          },
        },
        {
          provide: StorefrontApiService,
          useValue: {
            getPetTaxonomy: () => of({ data: { catalogAnimals: [] } }),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PetFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
