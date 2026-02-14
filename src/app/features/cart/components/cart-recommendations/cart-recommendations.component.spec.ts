import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CartRecommendationsComponent } from './cart-recommendations.component';

describe('CartRecommendationsComponent', () => {
  let component: CartRecommendationsComponent;
  let fixture: ComponentFixture<CartRecommendationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CartRecommendationsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CartRecommendationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
