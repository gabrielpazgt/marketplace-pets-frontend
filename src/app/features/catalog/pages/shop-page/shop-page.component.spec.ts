import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../../auth/services/auth.service';
import { SeoService } from '../../../../core/services/seo.service';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { CartStateService } from '../../../cart/services/cart-state.service';
import { PetsStateService } from '../../../pets/services/pet-state.service';
import { CatalogService } from '../../services/catalog.service';
import { ShopPageComponent } from './shop-page.component';

describe('ShopPageComponent', () => {
  let component: ShopPageComponent;
  let fixture: ComponentFixture<ShopPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShopPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({}),
              queryParams: {},
            },
            paramMap: of(convertToParamMap({})),
            queryParamMap: of(convertToParamMap({})),
          },
        },
        {
          provide: Router,
          useValue: {
            url: '/catalog',
            navigate: jasmine.createSpy('navigate'),
          },
        },
        { provide: CatalogService, useValue: {} },
        { provide: CartStateService, useValue: {} },
        { provide: PetsStateService, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: SeoService, useValue: {} },
        {
          provide: StorefrontApiService,
          useValue: {
            getPetTaxonomy: () => of({ data: { species: [] } }),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ShopPageComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
