import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CartStateService } from '../../services/cart-state.service';
import { CartPageComponent } from './cart-page.component';

describe('CartPageComponent', () => {
  let component: CartPageComponent;
  let fixture: ComponentFixture<CartPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CartPageComponent],
      providers: [
        {
          provide: CartStateService,
          useValue: {
            items$: of([]),
            itemCount$: of(0),
            subtotal$: of(0),
            busy$: of(false),
            freeThreshold: 500,
            setQty: jasmine.createSpy('setQty'),
            remove: jasmine.createSpy('remove'),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CartPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
