import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MembershipsService } from '../../../memberships/services/memberships.service';
import { ProductCardComponent } from './product-card.component';

describe('ProductCardComponent', () => {
  let component: ProductCardComponent;
  let fixture: ComponentFixture<ProductCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProductCardComponent],
      providers: [
        {
          provide: MembershipsService,
          useValue: {
            getPlan: () => ({ productDiscountPct: 5 }),
            priceWithMembership: () => 95,
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
    component.product = {
      id: 'prod-1',
      slug: 'croquetas-premium',
      name: 'Croquetas Premium',
      price: 100,
      oldPrice: 120,
      image: 'assets/images/products/placeholder.png',
      badge: 'NEW',
      category: 'food',
      tags: [],
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
